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
    staleTime: 0, // Immediate cache invalidation for testing
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
      <section className="relative h-[calc(100vh-4rem)] bg-gradient-memopyk flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-lg sm:text-2xl lg:text-6xl font-playfair font-bold mb-4 sm:mb-6">
            {language === 'fr-FR' ? 'Chargement...' : 'Loading...'}
          </h1>
          <p className="text-sm sm:text-lg lg:text-2xl text-white/90">
            {language === 'fr-FR' ? 'Chargement de la galerie vidéo...' : 'Loading video gallery...'}
          </p>
        </div>
      </section>
    );
  }

  const videoUrl = language === 'fr-FR' ? currentVideo.url_fr : currentVideo.url_en;


  return (
    <section 
      className="relative h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-memopyk-navy to-memopyk-dark-blue"
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
          onError={(e) => {
            console.error('🚨 Hero Video Error:', e);
            console.error('   - Video URL:', videoUrl);
            console.error('   - Proxy URL:', `/api/video-proxy?filename=${videoUrl.split('/').pop()}`);
            setIsLoading(false);
          }}
          onEnded={handleVideoEnded}
          onCanPlay={() => {
            // Ensure video starts playing for external preview
            const video = videoRef.current;
            if (video && isPlaying) {
              video.play().catch(console.warn);
            }
          }}
        >
          <source src={`/api/video-proxy?filename=${videoUrl}&cache-bust=${Date.now()}`} type="video/mp4" />
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
            className="font-playfair font-bold mb-4 sm:mb-6 lg:mb-8 leading-tight text-xl sm:text-3xl lg:text-6xl"
            style={{ 
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

              // Create different line breaks for mobile vs desktop
              const createResponsiveText = () => {
                if (language === 'fr-FR') {
                  // French text with responsive breaks
                  return (
                    <>
                      {/* Mobile: 3 lines */}
                      <span className="block sm:hidden">
                        Nous transformons<br />
                        vos photos et vidéos personnelles<br />
                        en films souvenirs inoubliables
                      </span>
                      {/* Desktop: 2 lines (admin format) */}
                      <span className="hidden sm:block">
                        {processedText.split('\n').map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            {index < processedText.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </span>
                    </>
                  );
                } else {
                  // English text with responsive breaks
                  return (
                    <>
                      {/* Mobile: 3 lines */}
                      <span className="block sm:hidden">
                        We transform<br />
                        your personal photos and videos<br />
                        into unforgettable souvenir films
                      </span>
                      {/* Desktop: 2 lines (admin format) */}
                      <span className="hidden sm:block">
                        {processedText.split('\n').map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            {index < processedText.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </span>
                    </>
                  );
                }
              };

              return createResponsiveText();
            })()}
          </h1>
          
          {/* Only render subtitle if it exists and is not empty */}
          {activeHeroText && ((language === 'fr-FR' && activeHeroText.subtitle_fr && activeHeroText.subtitle_fr.trim()) || 
                              (language === 'en-US' && activeHeroText.subtitle_en && activeHeroText.subtitle_en.trim())) && (
            <p 
              className="mb-4 sm:mb-6 lg:mb-8 text-white/90 font-poppins leading-snug text-sm sm:text-base lg:text-xl"
              style={{ 
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)' 
              }}
            >
              {(() => {
                const text = language === 'fr-FR' 
                  ? activeHeroText.subtitle_fr
                  : activeHeroText.subtitle_en;
                
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
          )}

          <div className="flex justify-center items-center mt-4 sm:mt-6 lg:mt-8">
            <Button 
              size="default" 
              className="inline-flex items-center gap-2 bg-memopyk-orange hover:bg-memopyk-dark-blue text-white px-6 py-3 rounded-full font-medium text-base transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
              onClick={() => {
                const element = document.getElementById('how-it-works');
                if (element) {
                  const headerHeight = 64; // Fixed header height (h-16 = 4rem = 64px)
                  const elementPosition = element.offsetTop;
                  const offsetPosition = elementPosition - headerHeight;

                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                  });
                }
              }}
            >
{language === 'fr-FR' ? 'Comment ça marche' : 'How it works'}
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