import { useState, useRef, useEffect } from 'react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Force mobile detection in React state
  const [isMobileSize, setIsMobileSize] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsMobileSize(window.innerWidth < 640);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Fetch hero text settings for overlay
  const { data: heroTextData = [] } = useQuery<HeroText[]>({
    queryKey: ['/api/hero-text', language],
    staleTime: 5 * 60 * 1000,
  });

  const activeHeroText = heroTextData.find(text => text.is_active);

  const handleVideoCanPlay = () => {
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
        preload="auto"
        onCanPlay={handleVideoCanPlay}
      />

      {/* Text overlay */}
      <div className="absolute inset-0 flex items-center justify-center text-center text-white px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full">
          {/* === Deterministic hero title (unified desktop/mobile rendering) === */}
{/* Deterministic title rendering (same across breakpoints) */}
<h1
  className="font-playfair font-bold mb-4 sm:mb-6 lg:mb-8 mx-auto hero-text-mobile"
  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
>
  {(() => {
    // sourceText: prefer DB text, otherwise fallback multi-line literal
    // FORCE: Ultra-short text on mobile using React state
    const sourceText = language === 'fr-FR'
      ? (isMobileSize ? "Films\nsouvenirs" : (activeHeroText?.title_fr || ""))
      : (isMobileSize ? "Memory\nfilms" : (activeHeroText?.title_en || ""));
    
    // Normalize -> array of lines (split on newline)
    const lines = sourceText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    // Clean production text rendering

    // Render each line as a separate div for proper line breaks
    return lines.map((line, idx) => (
      <div 
        key={idx} 
        className="hero-line"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          margin: 0,
          padding: 0,
          fontSize: isMobileSize ? '8px' : 'inherit',
          lineHeight: isMobileSize ? '1.0' : 'inherit'
        }}
      >
        {line}
      </div>
    ));
  })()}
</h1>
          
          {activeHeroText && (
            <p 
              className="text-sm sm:text-lg lg:text-xl max-w-sm sm:max-w-4xl mx-auto opacity-90 leading-snug sm:leading-normal"
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