import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';

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

export function SimpleHeroVideoSection() {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch hero text settings for overlay
  const { data: heroTextData = [] } = useQuery<HeroText[]>({
    queryKey: ['/api/hero-text', language],
    staleTime: 5 * 60 * 1000,
  });

  const activeHeroText = heroTextData.find(text => text.is_active);

  const handleVideoLoad = () => {
    setIsLoading(false);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Auto-play might be blocked, that's okay
      });
    }
  };

  // Use VideoHero1.mp4 as the single hero video
  const videoSrc = `/api/video-proxy?filename=VideoHero1.mp4`;

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Simple single video background */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={handleVideoLoad}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      )}

      {/* Text overlay */}
      <div className="absolute inset-0 flex items-center justify-center text-center text-white px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full">
          <h1 
            className="font-playfair font-bold mb-4 sm:mb-6 lg:mb-8 leading-tight text-xl sm:text-3xl lg:text-6xl"
            style={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {language === 'fr-FR' 
              ? (activeHeroText?.title_fr || "Transformez vos souvenirs\nen films cinématographiques")
              : (activeHeroText?.title_en || "Transform your memories\ninto cinematic films")
            }
          </h1>
          
          {activeHeroText && (
            <p 
              className="text-base sm:text-lg lg:text-xl max-w-4xl mx-auto opacity-90"
              style={{ 
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}
            >
              {language === 'fr-FR' 
                ? activeHeroText.subtitle_fr 
                : activeHeroText.subtitle_en
              }
            </p>
          )}
        </div>
      </div>
    </section>
  );
}