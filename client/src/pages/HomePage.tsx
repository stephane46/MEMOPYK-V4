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