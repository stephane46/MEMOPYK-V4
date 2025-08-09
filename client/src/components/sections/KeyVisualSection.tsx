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
      <div className="container mx-auto px-4 pb-0">
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
              {language === 'fr-FR' ? (
                <>
                  <span>Ne laissez pas vos souvenirs</span>
                  <br />
                  <span>se perdre à jamais.</span>
                </>
              ) : (
                "Don't let your memories be lost forever."
              )}
            </h2>
            
            {/* Animated Elements Coming from Left Image */}
            <div className="text-lg sm:text-xl text-memopyk-sky-blue leading-relaxed space-y-3 sm:space-y-2">
              {language === 'fr-FR' ? (
                <>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-[420px] max-w-full transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1200ms' }}
                  >
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium whitespace-nowrap">enfouis dans des téléphones...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-[420px] max-w-full transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1600ms' }}
                  >
                    <Laptop className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium whitespace-nowrap">oubliés sur des disques durs...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-[420px] max-w-full transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '2000ms' }}
                  >
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium whitespace-nowrap">entassés dans des cartons...</span>
                  </div>
                </>
              ) : (
                <>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-[320px] max-w-full transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1200ms' }}
                  >
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium whitespace-nowrap">buried in phones...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-[320px] max-w-full transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1600ms' }}
                  >
                    <Laptop className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium whitespace-nowrap">forgotten on hard drives...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg w-[320px] max-w-full transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '2000ms' }}
                  >
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span className="text-memopyk-navy font-medium whitespace-nowrap">piled in boxes...</span>
                  </div>
                </>
              )}
            </div>

            {/* Key message */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy leading-tight">
              {language === 'fr-FR' ? (
                <>
                  <span>Vos photos et vidéos méritent mieux</span>
                  <br />
                  <span>que d'être simplement stockés,</span>
                  <br />
                  <span>ils méritent une histoire.</span>
                </>
              ) : (
                "Your memories deserve better than just being stored, they deserve a story."
              )}
            </h2>

            {/* THE ANSWER - Enhanced Solution Statement */}
            <div className="relative mt-8">
              {/* Elegant background card */}
              <div className="bg-gradient-to-br from-memopyk-cream/80 via-white to-memopyk-cream/60 backdrop-blur-sm border-2 border-memopyk-orange/30 rounded-2xl px-8 py-8 shadow-2xl relative overflow-hidden transform hover:scale-[1.02] transition-all duration-500">
                
                {/* Decorative corner elements */}
                <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-memopyk-orange/20 to-transparent rounded-br-full"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-memopyk-sky-blue/15 to-transparent rounded-tl-full"></div>
                
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-5">
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-memopyk-orange/10 to-transparent transform rotate-45"></div>
                </div>

                {/* Main solution text with enhanced typography */}
                <div className="relative z-10 space-y-4">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-poppins font-bold text-memopyk-navy leading-relaxed text-center">
                    {language === 'fr-FR' ? (
                      <>
                        <span>Laissez-nous sauver vos photos et vidéos</span>
                        <br />
                        <span>en les transformant en un film souvenir</span>
                        <br />
                        <span>que vous garderez précieusement.</span>
                      </>
                    ) : (
                      "Let us save your photos and videos by transforming them into a memory film you'll treasure forever."
                    )}
                  </p>
                  
                  {/* Decorative divider */}
                  <div className="flex justify-center items-center space-x-3 py-2">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-memopyk-orange"></div>
                    <div className="w-3 h-3 bg-memopyk-orange rounded-full shadow-lg"></div>
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-memopyk-orange"></div>
                  </div>
                  
                  {/* Elegant tagline */}
                  <p className="text-lg sm:text-xl lg:text-2xl font-playfair italic text-memopyk-sky-blue font-medium text-center tracking-wide">
                    {language === 'fr-FR' 
                      ? "Personnel, unique et émouvant."
                      : "Personal, unique and moving."
                    }
                  </p>
                </div>

                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-memopyk-orange/5 via-transparent to-memopyk-sky-blue/5 pointer-events-none"></div>
              </div>
            </div>

          </div>
        </div>


      </div>
    </section>
  );
}