import { HeroVideoSection } from '../components/sections/HeroVideoSection';
import { KeyVisualSection } from '../components/sections/KeyVisualSection';
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

      {/* Gallery Section */}
      <GallerySection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Contact Section */}
      <ContactSection />

      {/* More sections will be added in upcoming phases */}
    </div>
  );
}