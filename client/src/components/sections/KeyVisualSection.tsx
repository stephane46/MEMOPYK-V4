import { useLanguage } from '../../contexts/LanguageContext';
import { Smartphone, Laptop, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
// Using direct path to public asset
const keyVisualImage = '/images/photos_video_organization_chaos.png';

export function KeyVisualSection() {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-0 bg-gradient-to-br from-memopyk-cream to-memopyk-cream/70">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Left: Key Visual Illustration with Overlaid Animated Elements */}
          <div className="relative order-1 lg:order-none mb-8 sm:mb-0">
            <div className="relative min-h-[200px] sm:min-h-[300px] flex items-center justify-center">
              <img 
                src={keyVisualImage}
                alt={language === 'fr-FR' 
                  ? "Illustration MEMOPYK - Transformation des souvenirs"
                  : "MEMOPYK Illustration - Memory transformation"
                }
                className="w-full h-auto max-w-full rounded-2xl block"
                loading="eager"
                style={{ maxWidth: '100%', height: 'auto', visibility: 'visible', minHeight: '200px', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('KeyVisual image failed to load:', keyVisualImage);
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.border = '2px dashed #d1d5db';
                }}
                onLoad={() => {
                  console.log('KeyVisual image loaded successfully on mobile');
                }}
              />


            </div>

            {/* Background Pattern - Hidden on mobile for better performance */}
            <div className="hidden sm:block absolute inset-0 -z-10 transform translate-x-8 translate-y-8">
              <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/20 to-memopyk-blue-gray/20 rounded-2xl"></div>
            </div>
          </div>

          {/* Right: Clean and Elegant Text */}
          <div className="space-y-6 sm:space-y-8 lg:space-y-10 order-2 lg:order-none">
            {/* Main heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy leading-tight">
              {language === 'fr-FR' 
                ? "Tant de souvenirs précieux, perdus dans le chaos du quotidien."
                : "So many precious memories, lost in the chaos of daily life."
              }
            </h2>
            
            {/* Animated Elements Coming from Left Image */}
            <div className="text-lg sm:text-xl text-memopyk-sky-blue leading-relaxed space-y-3 sm:space-y-2">
              {language === 'fr-FR' ? (
                <>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-fit transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '400ms' }}
                  >
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium">enfouis dans des téléphones...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-fit transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '700ms' }}
                  >
                    <Laptop className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium">oubliés sur des disques durs...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-fit transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1000ms' }}
                  >
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium">entassés dans des cartons...</span>
                  </div>
                </>
              ) : (
                <>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-orange/30 shadow-lg w-fit transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '200ms' }}
                  >
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-orange transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium">buried in phones...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-orange/30 shadow-lg w-fit transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '500ms' }}
                  >
                    <Laptop className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-orange transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium">forgotten on hard drives...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-orange/30 shadow-lg w-fit transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '800ms' }}
                  >
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-orange transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium">piled in boxes...</span>
                  </div>
                </>
              )}
            </div>


            {/* Key message */}
            <div className="text-lg sm:text-xl text-memopyk-dark-blue leading-relaxed font-medium space-y-1">
              {language === 'fr-FR' ? (
                <>
                  <p>Vos souvenirs méritent mieux que d'être simplement stockés,</p>
                  <p>ils méritent une histoire.</p>
                </>
              ) : (
                <>
                  <p>Your memories deserve better than just being stored,</p>
                  <p>they deserve a story.</p>
                </>
              )}
            </div>

            {/* Solution statement */}
            <div className="text-lg sm:text-xl text-memopyk-dark-blue leading-relaxed font-medium space-y-1">
              <p>
                {language === 'fr-FR' 
                  ? "Laissez-nous sauver vos photos et vidéos en les transformant en un film souvenir que vous garderez précieusement."
                  : "Let us rescue your photos and videos by transforming them into a souvenir film you'll treasure forever."
                }
              </p>
            </div>
            
            {/* Centered tagline at bottom */}
            <div className="text-center pt-2 sm:pt-4">
              <p className="text-lg sm:text-xl font-poppins italic text-memopyk-sky-blue">
                {language === 'fr-FR' 
                  ? "Personnel, unique et émouvant."
                  : "Personal, unique and moving."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}