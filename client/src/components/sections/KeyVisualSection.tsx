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

          {/* Right: Emotional Message */}
          <div className="space-y-8">
            {/* Opening Hook */}
            <h2 className="text-4xl md:text-5xl font-poppins font-bold text-memopyk-navy leading-tight">
              {language === 'fr-FR' 
                ? "Tant de souvenirs précieux, perdus dans le chaos du quotidien."
                : "So many precious memories, lost in the chaos of daily life."
              }
            </h2>
            
            {/* Problem Description */}
            <div className="space-y-4">
              <p className="text-xl text-memopyk-sky-blue leading-relaxed font-light">
                {language === 'fr-FR' 
                  ? "Enfouis dans des téléphones, oubliés sur des disques durs, entassés dans des cartons…"
                  : "Buried in phones, forgotten on hard drives, piled in boxes…"
                }
              </p>
              <p className="text-xl text-memopyk-dark-blue leading-relaxed font-medium">
                {language === 'fr-FR' 
                  ? "Vos souvenirs méritent mieux que ça, ils méritent une histoire."
                  : "Your memories deserve more than that, they deserve a story."
                }
              </p>
            </div>

            {/* Solution Promise - Styled as elegant call-out */}
            <div className="relative">
              {/* Background accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-memopyk-orange/5 to-memopyk-sky-blue/5 rounded-2xl transform rotate-1"></div>
              
              <div className="relative bg-white/90 backdrop-blur-sm p-8 rounded-2xl border border-memopyk-orange/20 shadow-lg">
                <p className="text-lg text-memopyk-dark-blue leading-relaxed mb-4">
                  {language === 'fr-FR' 
                    ? "Laissez-nous sauver vos photos et vidéos en les transformant en un film souvenir que vous garderez précieusement."
                    : "Let us rescue your photos and video by transforming them into a souvenir personal film you'll truly treasure."
                  }
                </p>
                
                {/* Elegant closing tagline */}
                <div className="text-center pt-4 border-t border-memopyk-sky-blue/30">
                  <p className="text-lg font-poppins italic text-memopyk-sky-blue">
                    {language === 'fr-FR' 
                      ? "Personnel, unique et émouvant."
                      : "A personalized visual story, unique and touching."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </section>
  );
}