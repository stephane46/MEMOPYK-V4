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
  const videoRef = useRef<HTMLVideoElement>(null);

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
  className="font-playfair font-bold mb-4 sm:mb-6 lg:mb-8 leading-tight mx-auto hero-text-mobile text-2xl sm:text-4xl lg:text-5xl"
  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
>
  {(() => {
    // sourceText: prefer DB text, otherwise fallback multi-line literal
    const sourceText = language === 'fr-FR'
      ? (activeHeroText?.title_fr || "Nous transformons\nvos photos et vidéos personnelles\nen films souvenirs inoubliables")
      : (activeHeroText?.title_en || "We transform\nyour personal photos and videos\ninto unforgettable souvenir films");

    // Normalize -> array of lines (split on newline)
    const lines = sourceText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    // If DB gave a single long line and you still want exact 3 lines on mobile,
    // optionally provide a fallback lines array here. For now we use split result.
    return lines.map((line, idx) => (
      // explicit block display; don't rely on external CSS to flip inline->block
      <span key={idx} className="block text-center">
        {line}
      </span>
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