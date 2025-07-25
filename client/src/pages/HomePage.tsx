import { HeroVideoSection } from '../components/sections/HeroVideoSection';
import { KeyVisualSection } from '../components/sections/KeyVisualSection';
import { HowItWorksSection } from '../components/sections/HowItWorksSection';
import { WhyMemopykSection } from '../components/sections/WhyMemopykSection';
import GallerySection from '../components/sections/GallerySection';
import FAQSection from '../components/sections/FAQSection';
import { ContactSection } from '../components/sections/ContactSection';


export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Video Carousel Section */}
      <HeroVideoSection />
      
      {/* Key Visual Problem/Solution Section */}
      <KeyVisualSection />

      {/* How It Works 3-Step Process */}
      <HowItWorksSection />

      {/* Why MEMOPYK Benefits Section */}
      <WhyMemopykSection />

      {/* Gallery Section */}
      <GallerySection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Contact Section */}
      <ContactSection />

      {/* All Phase 6.2 Content Sections Complete */}
    </div>
  );
}