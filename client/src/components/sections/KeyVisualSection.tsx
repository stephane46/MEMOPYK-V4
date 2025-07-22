import { useLanguage } from '../../contexts/LanguageContext';
// For now, we'll use a placeholder URL since the asset path needs configuration
// import keyVisualImage from '@assets/images/KeyVisualS.png';
const keyVisualImage = 'https://via.placeholder.com/800x600/F2EBDC/011526?text=MEMOPYK+Key+Visual';

export function KeyVisualSection() {
  const { language } = useLanguage();

  return (
    <section className="py-20 bg-gradient-cream">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Problem Statement */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold text-memopyk-navy leading-tight">
              {language === 'fr' 
                ? "Vos souvenirs dorment-ils dans vos téléphones ?"
                : "Are your memories sleeping in your phones?"
              }
            </h2>
            
            <p className="text-lg text-memopyk-dark-blue leading-relaxed">
              {language === 'fr' 
                ? "Photos dispersées, vidéos perdues dans les dossiers, disques durs qui s'accumulent... Vos moments précieux méritent mieux qu'un stockage numérique anonyme."
                : "Scattered photos, videos lost in folders, accumulating hard drives... Your precious moments deserve better than anonymous digital storage."
              }
            </p>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-memopyk-orange mt-3 flex-shrink-0"></div>
                <p className="text-memopyk-dark-blue">
                  {language === 'fr' 
                    ? "Milliers de photos et vidéos non organisées"
                    : "Thousands of unorganized photos and videos"
                  }
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-memopyk-orange mt-3 flex-shrink-0"></div>
                <p className="text-memopyk-dark-blue">
                  {language === 'fr' 
                    ? "Souvenirs inaccessibles aux proches"
                    : "Memories inaccessible to loved ones"
                  }
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-memopyk-orange mt-3 flex-shrink-0"></div>
                <p className="text-memopyk-dark-blue">
                  {language === 'fr' 
                    ? "Pas de narration cohérente de votre histoire"
                    : "No coherent storytelling of your history"
                  }
                </p>
              </div>
            </div>

            {/* Solution Promise */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-memopyk-sky-blue/30">
              <h3 className="text-xl font-semibold text-memopyk-navy mb-3">
                {language === 'fr' 
                  ? "Notre Solution MEMOPYK"
                  : "Our MEMOPYK Solution"
                }
              </h3>
              <p className="text-memopyk-dark-blue">
                {language === 'fr' 
                  ? "Transformez le chaos numérique en films cinématographiques personnalisés. Nos artistes créent des narrations visuelles qui révèlent la beauté de votre histoire familiale."
                  : "Transform digital chaos into personalized cinematic films. Our artists create visual narratives that reveal the beauty of your family story."
                }
              </p>
            </div>
          </div>

          {/* Right: Key Visual Illustration */}
          <div className="relative">
            <div className="relative group">
              <img 
                src={keyVisualImage}
                alt={language === 'fr' 
                  ? "Illustration MEMOPYK - Transformation des souvenirs"
                  : "MEMOPYK Illustration - Memory transformation"
                }
                className="w-full h-auto rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-memopyk-orange text-white px-4 py-2 rounded-full font-semibold shadow-lg animate-pulse-elegant">
                {language === 'fr' ? '100+ Films créés' : '100+ Films created'}
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white text-memopyk-navy px-4 py-2 rounded-full font-semibold shadow-lg border-2 border-memopyk-sky-blue">
                {language === 'fr' ? 'Artistes experts' : 'Expert artists'}
              </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 -z-10 transform translate-x-8 translate-y-8">
              <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/20 to-memopyk-blue-gray/20 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}