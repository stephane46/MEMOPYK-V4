import { HeroVideoSection } from '../components/sections/HeroVideoSection';
import { KeyVisualSection } from '../components/sections/KeyVisualSection';

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Video Carousel Section */}
      <HeroVideoSection />
      
      {/* Key Visual Problem/Solution Section */}
      <KeyVisualSection />

      {/* More sections will be added in Phase 6.2 */}
    </div>
  );
}