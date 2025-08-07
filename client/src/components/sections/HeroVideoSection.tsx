import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  font_size_desktop?: number;
  font_size_tablet?: number;
  font_size_mobile?: number;
  is_active: boolean;
}

export function HeroVideoSection() {
  const { language } = useLanguage();
  const { trackVideoView } = useVideoAnalytics();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Fetch hero videos
  const { data: heroVideos = [] } = useQuery<HeroVideo[]>({
    queryKey: ['/api/hero-videos'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch hero text settings - manual updates only via admin cache invalidation
  const { data: heroTextData = [] } = useQuery<HeroText[]>({
    queryKey: ['/api/hero-text', language],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - no auto-refresh, manual updates only
  });

  const activeVideos = heroVideos.filter(video => video.is_active)
    .sort((a, b) => a.order_index - b.order_index);
  
  const activeHeroText = heroTextData.find(text => text.is_active);
  const currentVideo = activeVideos[currentVideoIndex];

  // Auto-advance to next video when current video ends
  const handleVideoEnded = () => {
    if (activeVideos.length > 1) {
      setCurrentVideoIndex(prev => (prev + 1) % activeVideos.length);
    }
  };



  // Reset video index when videos change
  useEffect(() => {
    console.log(`🎬 Hero videos available: ${activeVideos.length}`, activeVideos.map(v => v.url_en));
    setCurrentVideoIndex(0);
  }, [activeVideos.length]);



  // Hero videos auto-play, so no need to track them - analytics should focus on user-initiated gallery video views

  // Handle video navigation
  const goToVideo = (index: number) => {
    console.log(`🎬 Manually switching to hero video ${index + 1} (${activeVideos[index]?.url_en})`);
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
      <section className="relative h-[80vh] sm:h-[85vh] lg:h-screen bg-gradient-memopyk flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-playfair font-bold mb-4 sm:mb-6">
            Transformez vos souvenirs en films cinématographiques
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-white/90">
            Chargement de la galerie vidéo...
          </p>
        </div>
      </section>
    );
  }

  const videoUrl = language === 'fr-FR' ? currentVideo.url_fr : currentVideo.url_en;
  // Generate responsive font sizes using device-specific values and CSS clamp
  const fontSizeDesktop = activeHeroText?.font_size_desktop || activeHeroText?.font_size || 60;
  const fontSizeTablet = activeHeroText?.font_size_tablet || Math.round(fontSizeDesktop * 0.75);
  const fontSizeMobile = activeHeroText?.font_size_mobile || Math.round(fontSizeDesktop * 0.53);
  
  // CSS clamp function for responsive scaling: clamp(min, preferred, max)
  const responsiveFontSize = `clamp(${fontSizeMobile}px, ${fontSizeTablet}px, ${fontSizeDesktop}px)`;

  return (
    <section 
      className="relative h-[80vh] sm:h-[85vh] lg:h-screen overflow-hidden bg-black"
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
          loop={activeVideos.length === 1}
          playsInline
          preload="metadata" // Smart Preloading: loads video info without downloading entire file
          crossOrigin="anonymous"
          onLoadedData={handleVideoLoad}
          onError={() => setIsLoading(false)}
          onEnded={handleVideoEnded}
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

      {/* Hero Text Content - Mobile Optimized for Better Fit */}
      <div className="absolute inset-0 flex items-center justify-center text-center text-white px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full">
          <h1 
            className="font-playfair font-bold mb-2 sm:mb-4 lg:mb-6 leading-tight"
            style={{ 
              fontSize: responsiveFontSize,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {(() => {
              const text = language === 'fr-FR' 
                ? (activeHeroText?.title_fr || "Transformez vos souvenirs\nen films cinématographiques")
                : (activeHeroText?.title_en || "Transform your memories\ninto cinematic films");
              
              // Handle multiple escaping scenarios: raw newlines, \n, \\n
              let processedText = text;
              if (processedText.includes('\\n')) {
                processedText = processedText.replace(/\\n/g, '\n');
              }
              const lines = processedText.split('\n');
              console.log('🔍 Public Site - Lines:', lines);
              
              return lines.map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < lines.length - 1 && <br />}
                </React.Fragment>
              ));
            })()}
          </h1>
          
          <p 
            className="mb-4 sm:mb-6 lg:mb-8 text-white/90 font-poppins leading-snug"
            style={{ 
              fontSize: `clamp(${Math.round(fontSizeMobile * 0.47)}px, ${Math.round(fontSizeTablet * 0.47)}px, ${Math.round(fontSizeDesktop * 0.47)}px)`,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)' 
            }}
          >
            {(() => {
              const text = language === 'fr-FR' 
                ? (activeHeroText?.subtitle_fr || "Redonnez vie à vos moments précieux\navec notre expertise cinématographique")
                : (activeHeroText?.subtitle_en || "Bring your precious moments to life\nwith our cinematic expertise");
              
              // Handle multiple escaping scenarios: raw newlines, \n, \\n
              let processedText = text;
              if (processedText.includes('\\n')) {
                processedText = processedText.replace(/\\n/g, '\n');
              }
              return processedText.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < processedText.split('\n').length - 1 && <br />}
                </React.Fragment>
              ));
            })()}
          </p>

          <div className="flex justify-center items-center">
            <Button 
              size="lg" 
              className="bg-memopyk-orange hover:bg-memopyk-orange/90 text-white font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-base lg:text-lg w-full sm:w-auto min-w-[180px] sm:min-w-[200px]"
              onClick={() => {
                const element = document.getElementById('contact');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {language === 'fr-FR' ? 'Commencer mon projet' : 'Start my project'}
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
            className="hidden sm:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-memopyk-orange hover:text-memopyk-orange hover:bg-memopyk-orange/20 z-10"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-memopyk-orange hover:text-memopyk-orange hover:bg-memopyk-orange/20 z-10"
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
                    ? 'bg-memopyk-orange scale-125' 
                    : 'bg-memopyk-orange/50 hover:bg-memopyk-orange/80'
                }`}
                onClick={() => goToVideo(index)}
              />
            ))}
          </div>
        </>
      )}




    </section>
  );
}