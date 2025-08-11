import { useEffect } from 'react';
import { HeroVideoSection } from '../components/sections/HeroVideoSection';
import { KeyVisualSection } from '../components/sections/KeyVisualSection';
import { HowItWorksSection } from '../components/sections/HowItWorksSection';
import { WhyMemopykSection } from '../components/sections/WhyMemopykSection';
import GallerySection from '../components/sections/GallerySection';
import FAQSection from '../components/sections/FAQSection';
import { CtaSection } from '../components/sections/CtaSection';

import { useLanguage } from '../contexts/LanguageContext';
import { useVideoAnalytics } from '../hooks/useVideoAnalytics';

export function HomePage() {
  const { language } = useLanguage();
  const { trackSession } = useVideoAnalytics();
  
  // Track visitor session on page load
  useEffect(() => {
    console.log('📊 Tracking visitor session on HomePage load');
    trackSession();
  }, [trackSession]);
  
  // Handle scrolling to anchor after navigation from other pages
  useEffect(() => {
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    if (scrollToSection) {
      // Clear the stored section
      sessionStorage.removeItem('scrollToSection');
      
      // Wait for page to fully load and render
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 1000); // Increased delay to ensure all components are rendered
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return (
    <div className="min-h-screen">
      {/* Hero Video Carousel Section */}
      <HeroVideoSection />
      
      {/* Key Visual Problem/Solution Section */}
      <KeyVisualSection />

      {/* How It Works 3-Step Process */}
      <HowItWorksSection />

      {/* Gallery Section - Moved above Why MEMOPYK */}
      <GallerySection />

      {/* Why MEMOPYK Benefits Section */}
      <WhyMemopykSection />

      {/* Call to Action Section */}
      <CtaSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* All Phase 6.2 Content Sections Complete */}
    </div>
  );
}