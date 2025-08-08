import { useEffect } from 'react';
import { HeroVideoSection } from '../components/sections/HeroVideoSection';
import { KeyVisualSection } from '../components/sections/KeyVisualSection';
import { HowItWorksSection } from '../components/sections/HowItWorksSection';
import { WhyMemopykSection } from '../components/sections/WhyMemopykSection';
import GallerySection from '../components/sections/GallerySection';
import FAQSection from '../components/sections/FAQSection';
import { CtaSection } from '../components/sections/CtaSection';
import { MobileOptimizationIndicator } from '../components/mobile/MobileOptimizationIndicator';
import { useLanguage } from '../contexts/LanguageContext';

export function HomePage() {
  const { language } = useLanguage();
  
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

      {/* Mobile Optimization Indicator */}
      <MobileOptimizationIndicator language={language} />

      {/* All Phase 6.2 Content Sections Complete */}
    </div>
  );
}