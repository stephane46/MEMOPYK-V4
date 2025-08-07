import { useLanguage } from '../../contexts/LanguageContext';
// Using direct path to public asset
const keyVisualImage = '/images/photos_video_organization_chaos.png';

export function KeyVisualSection() {
  const { language } = useLanguage();

  return (
    <section className="min-h-screen bg-gradient-to-br from-memopyk-cream via-white to-memopyk-sky-blue/10">
      <div className="container mx-auto px-4 py-16">
        
        {/* Central Hero Statement */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-poppins font-black text-memopyk-navy mb-6 leading-none tracking-tight">
            {language === 'fr-FR' 
              ? "Vos Souvenirs"
              : "Your Memories"
            }
          </h2>
          <div className="w-32 h-1 bg-gradient-to-r from-memopyk-orange to-memopyk-sky-blue mx-auto mb-8"></div>
          <p className="text-2xl md:text-3xl font-poppins text-memopyk-blue-gray max-w-4xl mx-auto">
            {language === 'fr-FR' 
              ? "méritent plus qu'un simple stockage numérique"
              : "deserve more than digital storage chaos"
            }
          </p>
        </div>

        {/* Split Visual Storytelling */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          
          {/* The Problem */}
          <div className="relative group">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-8 rounded-3xl h-full border-2 border-dashed border-gray-300 transition-all duration-500 group-hover:scale-105">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-50">📱💻📦</div>
                <h3 className="text-xl font-poppins font-bold text-gray-700 mb-4">
                  {language === 'fr-FR' ? "Le Problème" : "The Problem"}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {language === 'fr-FR' 
                    ? "Éparpillés, oubliés, perdus dans le chaos numérique de notre époque"
                    : "Scattered, forgotten, lost in our digital age chaos"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* The Transformation */}
          <div className="relative group">
            <div className="relative">
              <img 
                src={keyVisualImage}
                alt={language === 'fr-FR' 
                  ? "Transformation MEMOPYK"
                  : "MEMOPYK Transformation"
                }
                className="w-full h-full object-cover rounded-3xl shadow-2xl transition-all duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-memopyk-navy/80 via-transparent to-transparent rounded-3xl flex items-end p-8">
                <div className="text-white">
                  <h3 className="text-2xl font-poppins font-bold mb-2">
                    {language === 'fr-FR' ? "La Transformation" : "The Transformation"}
                  </h3>
                  <p className="text-white/90">
                    {language === 'fr-FR' 
                      ? "Nous donnons vie à vos souvenirs"
                      : "We bring your memories to life"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* The Result */}
          <div className="relative group">
            <div className="bg-gradient-to-br from-memopyk-orange/10 via-memopyk-sky-blue/10 to-memopyk-cream p-8 rounded-3xl h-full border-2 border-memopyk-orange/30 transition-all duration-500 group-hover:scale-105 group-hover:shadow-xl">
              <div className="text-center">
                <div className="text-6xl mb-4">🎬✨💕</div>
                <h3 className="text-xl font-poppins font-bold text-memopyk-navy mb-4">
                  {language === 'fr-FR' ? "Le Résultat" : "The Result"}
                </h3>
                <p className="text-memopyk-dark-blue leading-relaxed font-medium">
                  {language === 'fr-FR' 
                    ? "Un film souvenir personnel, unique et profondément émouvant"
                    : "A personal souvenir film, unique and deeply moving"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action Statement */}
        <div className="text-center">
          <div className="bg-white/80 backdrop-blur-lg p-12 rounded-3xl shadow-2xl max-w-4xl mx-auto border border-memopyk-sky-blue/20">
            <p className="text-2xl md:text-3xl font-poppins font-light text-memopyk-navy leading-relaxed mb-6">
              {language === 'fr-FR' 
                ? "Transformons ensemble vos moments précieux en cinéma personnel"
                : "Together, let's transform your precious moments into personal cinema"
              }
            </p>
            <div className="inline-block">
              <div className="bg-gradient-to-r from-memopyk-orange to-memopyk-sky-blue text-white px-8 py-4 rounded-full font-poppins font-medium text-lg shadow-lg">
                {language === 'fr-FR' 
                  ? "Chaque souvenir a sa propre magie"
                  : "Every memory has its own magic"
                }
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}