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

          {/* Right: Clean and Elegant Text */}
          <div className="space-y-10">
            {/* Main heading */}
            <h2 className="text-4xl md:text-5xl font-poppins font-bold text-memopyk-navy leading-tight">
              {language === 'fr-FR' 
                ? "Tant de souvenirs précieux, perdus dans le chaos du quotidien."
                : "So many precious memories, lost in the chaos of daily life."
              }
            </h2>
            
            {/* Simple description */}
            <p className="text-xl text-memopyk-sky-blue leading-relaxed">
              {language === 'fr-FR' 
                ? "Enfouis dans des téléphones, oubliés sur des disques durs, entassés dans des cartons… Vos souvenirs méritent mieux que ça, ils méritent une histoire."
                : "Buried in phones, forgotten on hard drives, piled in boxes… Your memories deserve more than that, they deserve a story."
              }
            </p>

            {/* Simple solution statement */}
            <p className="text-lg text-memopyk-dark-blue leading-relaxed">
              {language === 'fr-FR' 
                ? "Laissez-nous sauver vos photos et vidéos en les transformant en un film souvenir que vous garderez précieusement."
                : "Let us rescue your photos and videos by transforming them into a souvenir film you'll treasure forever."
              }
            </p>
            
            {/* Simple tagline */}
            <p className="text-xl font-poppins italic text-memopyk-sky-blue">
              {language === 'fr-FR' 
                ? "Personnel, unique et émouvant."
                : "Personal, unique and moving."
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}