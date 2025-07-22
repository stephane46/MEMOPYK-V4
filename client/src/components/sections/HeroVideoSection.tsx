import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useVideoAnalytics } from '../../hooks/useVideoAnalytics';
import { Button } from '../ui/button';

interface HeroVideo {
  id: number;
  title_fr: string;
  title_en: string;
  url_en: string;
  url_fr: string;
  order_index: number;
  is_active: boolean;
}

interface HeroText {
  id: number;
  title_fr: string;
  title_en: string;
  subtitle_fr: string;
  subtitle_en: string;
  font_size: number;
  is_active: boolean;
}

export function HeroVideoSection() {
  const { language } = useLanguage();
  const { trackVideoView } = useVideoAnalytics();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Fetch hero videos
  const { data: heroVideos = [] } = useQuery<HeroVideo[]>({
    queryKey: ['/api/hero-videos'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch hero text settings
  const { data: heroTextData = [] } = useQuery<HeroText[]>({
    queryKey: ['/api/hero-text', language],
    staleTime: 5 * 60 * 1000,
  });

  const activeVideos = heroVideos.filter(video => video.is_active)
    .sort((a, b) => a.order_index - b.order_index);
  
  const activeHeroText = heroTextData.find(text => text.is_active);
  const currentVideo = activeVideos[currentVideoIndex];

  // Auto-advance carousel every 10 seconds
  useEffect(() => {
    if (activeVideos.length > 1 && isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentVideoIndex(prev => (prev + 1) % activeVideos.length);
      }, 10000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeVideos.length, isPlaying]);

  // Track video views only when video ID changes, with debouncing
  useEffect(() => {
    if (currentVideo?.id) {
      // Use a timeout to debounce the tracking call
      const timeoutId = setTimeout(() => {
        trackVideoView(`hero-${currentVideo.id}`, 0, false);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentVideo?.id]); // Only track when video ID actually changes

  // Handle video navigation
  const goToVideo = (index: number) => {
    setCurrentVideoIndex(index);
    setIsLoading(true);
  };

  const goToPrevious = () => {
    const newIndex = currentVideoIndex === 0 ? activeVideos.length - 1 : currentVideoIndex - 1;
    goToVideo(newIndex);
  };

  const goToNext = () => {
    const newIndex = (currentVideoIndex + 1) % activeVideos.length;
    goToVideo(newIndex);
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    const video = videoRef.current;
    if (video && isPlaying) {
      video.play().catch(() => {
        // Auto-play might be blocked, that's okay
      });
    }
  };

  // Touch gesture handlers for mobile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && activeVideos.length > 1) {
      goToNext();
    }
    if (isRightSwipe && activeVideos.length > 1) {
      goToPrevious();
    }
  };

  if (!currentVideo) {
    return (
      <section className="relative h-screen bg-gradient-memopyk flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl md:text-6xl font-playfair font-bold mb-6">
            Transformez vos souvenirs en films cinématographiques
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            Chargement de la galerie vidéo...
          </p>
        </div>
      </section>
    );
  }

  const videoUrl = language === 'fr' ? currentVideo.url_fr : currentVideo.url_en;
  const fontSize = activeHeroText?.font_size || 60;

  return (
    <section 
      className="relative h-screen overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Video */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          key={videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata" // Smart Preloading: loads video info without downloading entire file
          crossOrigin="anonymous"
          onLoadedData={handleVideoLoad}
          onError={() => setIsLoading(false)}
          onCanPlay={() => {
            // Ensure video starts playing for external preview
            const video = videoRef.current;
            if (video && isPlaying) {
              video.play().catch(console.warn);
            }
          }}
        >
          <source src={`/api/video-proxy?filename=${videoUrl.split('/').pop()}`} type="video/mp4" />
        </video>
        
        {/* Video Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4 mx-auto"></div>
            <p className="text-lg">Chargement du film...</p>
          </div>
        </div>
      )}

      {/* Hero Text Content */}
      <div className="absolute inset-0 flex items-center justify-center text-center text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full">
          <h1 
            className="font-playfair font-bold mb-4 sm:mb-6 leading-tight"
            style={{ 
              fontSize: `clamp(28px, ${Math.max(32, Math.min(fontSize, 100))}px, 100px)`,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {language === 'fr' 
              ? (activeHeroText?.title_fr || "Transformez vos souvenirs en films cinématographiques")
              : (activeHeroText?.title_en || "Transform your memories into cinematic films")
            }
          </h1>
          
          <p 
            className="mb-6 sm:mb-8 text-white/90 font-poppins"
            style={{ 
              fontSize: `clamp(16px, ${Math.max(18, Math.min(fontSize * 0.4, 28))}px, 28px)`,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)' 
            }}
          >
            {language === 'fr' 
              ? (activeHeroText?.subtitle_fr || "Redonnez vie à vos moments précieux avec notre expertise cinématographique")
              : (activeHeroText?.subtitle_en || "Bring your precious moments to life with our cinematic expertise")
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-memopyk-orange hover:bg-memopyk-orange/90 text-white font-semibold px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto min-w-[200px]"
            >
              {language === 'fr' ? 'Découvrir nos films' : 'Discover our films'}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-memopyk-navy font-semibold px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto min-w-[200px]"
            >
              {language === 'fr' ? 'Commencer mon projet' : 'Start my project'}
            </Button>
          </div>
        </div>
      </div>

      {/* Video Controls */}
      {activeVideos.length > 1 && (
        <>
          {/* Navigation Arrows - Hidden on mobile */}
          <Button
            variant="ghost"
            size="lg"
            className="hidden sm:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/20 z-10"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/20 z-10"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>

          {/* Video Indicators */}
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex space-x-2 sm:space-x-3 z-10">
            {activeVideos.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  index === currentVideoIndex 
                    ? 'bg-white scale-125' 
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                onClick={() => goToVideo(index)}
              />
            ))}
          </div>
        </>
      )}

      {/* Play/Pause Control */}
      <Button
        variant="ghost"
        size="lg"
        className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 text-white hover:text-white hover:bg-white/20 z-10"
        onClick={togglePlayPause}
      >
        {isPlaying ? <Pause className="h-5 w-5 sm:h-6 sm:w-6" /> : <Play className="h-5 w-5 sm:h-6 sm:w-6" />}
      </Button>

      {/* Video Title Overlay */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8 text-white z-10">
        <p className="text-xs sm:text-sm font-poppins opacity-80">
          {language === 'fr' ? currentVideo.title_fr : currentVideo.title_en}
        </p>
        <p className="text-xs opacity-60">
          {currentVideoIndex + 1} / {activeVideos.length}
        </p>
      </div>
    </section>
  );
}