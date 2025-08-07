import { useLanguage } from '../../contexts/LanguageContext';
// Using direct path to public asset
const keyVisualImage = '/images/photos_video_organization_chaos.png';

export function KeyVisualSection() {
  const { language } = useLanguage();

  return (
    <section className="relative py-32 bg-white overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-memopyk-sky-blue/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-memopyk-orange/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-memopyk-cream rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          {/* Floating main content */}
          <div className="text-center mb-20">
            {/* Main statement - floating and minimal */}
            <div className="inline-block relative">
              <h2 className="text-6xl md:text-8xl font-poppins font-extralight text-memopyk-navy mb-8 leading-none tracking-wide">
                {language === 'fr-FR' 
                  ? "Vos souvenirs"
                  : "Your memories"
                }
              </h2>
              {/* Floating accent line */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-memopyk-sky-blue to-transparent"></div>
            </div>
            
            {/* Floating subtitle */}
            <div className="mt-12">
              <p className="text-2xl md:text-3xl font-poppins font-light text-memopyk-blue-gray/80 leading-relaxed">
                {language === 'fr-FR' 
                  ? "méritent plus que le chaos numérique"
                  : "deserve more than digital chaos"
                }
              </p>
            </div>
          </div>

          {/* Floating image container */}
          <div className="flex justify-center mb-20">
            <div className="relative group">
              {/* Main floating image */}
              <div className="relative bg-white p-8 rounded-2xl shadow-2xl transform rotate-1 transition-all duration-700 group-hover:rotate-0 group-hover:scale-105">
                <img 
                  src={keyVisualImage}
                  alt={language === 'fr-FR' 
                    ? "Chaos des souvenirs numériques"
                    : "Digital memory chaos"
                  }
                  className="w-full max-w-md rounded-xl"
                />
              </div>
              
              {/* Floating accent elements */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-memopyk-orange/20 rounded-full blur-sm"></div>
              <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-memopyk-sky-blue/20 rounded-full blur-sm"></div>
            </div>
          </div>

          {/* Floating text blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-20">
            
            {/* Problem statement - floating left */}
            <div className="relative">
              <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100/50 transform -rotate-1 transition-all duration-500 hover:rotate-0">
                <div className="space-y-4">
                  <h3 className="text-xl font-poppins font-medium text-memopyk-navy">
                    {language === 'fr-FR' ? "Le problème" : "The problem"}
                  </h3>
                  <p className="text-memopyk-blue-gray leading-relaxed">
                    {language === 'fr-FR' 
                      ? "Éparpillés dans vos appareils, oubliés sur des disques durs, perdus dans le quotidien…"
                      : "Scattered across devices, forgotten on hard drives, lost in daily routine…"
                    }
                  </p>
                </div>
                {/* Floating accent dot */}
                <div className="absolute -top-2 right-8 w-4 h-4 bg-memopyk-sky-blue/30 rounded-full"></div>
              </div>
            </div>

            {/* Solution statement - floating right */}
            <div className="relative">
              <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-100/50 transform rotate-1 transition-all duration-500 hover:rotate-0">
                <div className="space-y-4">
                  <h3 className="text-xl font-poppins font-medium text-memopyk-navy">
                    {language === 'fr-FR' ? "Notre solution" : "Our solution"}
                  </h3>
                  <p className="text-memopyk-blue-gray leading-relaxed">
                    {language === 'fr-FR' 
                      ? "Nous transformons cette collection en un film souvenir personnel et profondément émouvant."
                      : "We transform this collection into a personal and deeply moving souvenir film."
                    }
                  </p>
                </div>
                {/* Floating accent dot */}
                <div className="absolute -top-2 left-8 w-4 h-4 bg-memopyk-orange/30 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Floating call to action */}
          <div className="text-center">
            <div className="inline-block relative">
              {/* Main CTA text */}
              <div className="bg-white/80 backdrop-blur-lg px-12 py-8 rounded-full shadow-xl border border-memopyk-sky-blue/10">
                <p className="text-xl md:text-2xl font-poppins font-light text-memopyk-navy">
                  {language === 'fr-FR' 
                    ? "Chaque mémoire a une âme"
                    : "Every memory has a soul"
                  }
                </p>
              </div>
              
              {/* Floating subtitle */}
              <div className="mt-6">
                <p className="text-memopyk-sky-blue font-poppins text-lg font-light italic">
                  {language === 'fr-FR' 
                    ? "Laissez-nous lui donner vie"
                    : "Let us bring it to life"
                  }
                </p>
              </div>

              {/* Floating decorative elements */}
              <div className="absolute -top-3 left-6 w-2 h-2 bg-memopyk-orange rounded-full animate-pulse"></div>
              <div className="absolute -bottom-3 right-6 w-2 h-2 bg-memopyk-sky-blue rounded-full animate-pulse"></div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}