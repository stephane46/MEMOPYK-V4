import { useLanguage } from '../../contexts/LanguageContext';
// Using direct path to public asset
const keyVisualImage = '/images/photos_video_organization_chaos.png';

export function KeyVisualSection() {
  const { language } = useLanguage();

  return (
    <section className="py-20 bg-gradient-cream">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Key Visual Illustration */}
          <div className="relative">
            <div className="relative group">
              <img 
                src={keyVisualImage}
                alt={language === 'fr-FR' 
                  ? "Illustration MEMOPYK - Transformation des souvenirs"
                  : "MEMOPYK Illustration - Memory transformation"
                }
                className="w-full h-auto rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 -z-10 transform translate-x-8 translate-y-8">
              <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/20 to-memopyk-blue-gray/20 rounded-2xl"></div>
            </div>
          </div>

          {/* Right: Redesigned Text Section */}
          <div className="space-y-8">
            {/* Opening Hook - Redesigned with better typography */}
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-poppins font-bold text-memopyk-navy leading-tight mb-4">
                {language === 'fr-FR' 
                  ? "Tant de souvenirs précieux"
                  : "So many precious memories"
                }
              </h2>
              <div className="text-2xl md:text-3xl font-poppins font-light text-memopyk-sky-blue leading-relaxed">
                {language === 'fr-FR' 
                  ? "perdus dans le chaos du quotidien."
                  : "lost in the chaos of daily life."
                }
              </div>
              {/* Accent line */}
              <div className="mt-4 w-20 h-1 bg-gradient-to-r from-memopyk-orange to-memopyk-sky-blue rounded-full"></div>
            </div>
            
            {/* Problem Description - More visual hierarchy */}
            <div className="space-y-6">
              <div className="bg-white/40 backdrop-blur-sm p-6 rounded-2xl border-l-4 border-memopyk-sky-blue/50">
                <p className="text-lg text-memopyk-blue-gray leading-relaxed font-light italic">
                  {language === 'fr-FR' 
                    ? "Enfouis dans des téléphones, oubliés sur des disques durs, entassés dans des cartons…"
                    : "Buried in phones, forgotten on hard drives, piled in boxes…"
                  }
                </p>
              </div>
              
              <div className="text-center py-4">
                <div className="inline-block bg-memopyk-navy/10 px-6 py-3 rounded-full">
                  <p className="text-xl text-memopyk-navy font-poppins font-medium">
                    {language === 'fr-FR' 
                      ? "Vos souvenirs méritent mieux que ça"
                      : "Your memories deserve better than that"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Solution Promise - Enhanced visual design */}
            <div className="relative">
              {/* Layered background effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-memopyk-orange/10 via-memopyk-sky-blue/10 to-memopyk-cream/50 rounded-3xl transform rotate-1"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-memopyk-sky-blue/5 via-transparent to-memopyk-orange/5 rounded-3xl transform -rotate-1"></div>
              
              <div className="relative bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-memopyk-orange/30 shadow-xl">
                {/* Icon or visual element */}
                <div className="text-center mb-6">
                  <div className="inline-block w-16 h-16 bg-gradient-to-br from-memopyk-orange to-memopyk-sky-blue rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    ✨
                  </div>
                </div>
                
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-poppins font-bold text-memopyk-navy">
                    {language === 'fr-FR' 
                      ? "Notre mission"
                      : "Our mission"
                    }
                  </h3>
                  
                  <p className="text-lg text-memopyk-dark-blue leading-relaxed">
                    {language === 'fr-FR' 
                      ? "Transformer vos photos et vidéos en un film souvenir personnel que vous garderez précieusement."
                      : "Transform your photos and videos into a personal souvenir film you'll treasure forever."
                    }
                  </p>
                  
                  {/* Elegant closing tagline with better styling */}
                  <div className="pt-6 mt-6 border-t border-memopyk-sky-blue/20">
                    <div className="bg-gradient-to-r from-memopyk-sky-blue/10 to-memopyk-orange/10 px-6 py-3 rounded-full">
                      <p className="text-lg font-poppins font-medium text-memopyk-navy">
                        {language === 'fr-FR' 
                          ? "Personnel • Unique • Émouvant"
                          : "Personal • Unique • Moving"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating accent dots */}
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-memopyk-orange/30 rounded-full"></div>
              <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-memopyk-sky-blue/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}