import { useLanguage } from '../../contexts/LanguageContext';
import { Clock, Zap, Users, Settings, Shield } from 'lucide-react';

export function WhyMemopykSection() {
  const { language } = useLanguage();

  // Special title card (first position)
  const titleCard = {
    titleFr: "Les avantages MEMOPYK",
    titleEn: "MEMOPYK advantages",
    isSpecial: true
  };

  const benefits = [
    {
      icon: Zap,
      titleFr: "Simplicité",
      titleEn: "Simplicity", 
      descriptionFr: "Tous formats acceptés, détails techniques pris en charge professionnellement. Envoyez simplement vos photos et vidéos, inutile de trier ni d'organiser les fichiers : tout est simple pour vous.",
      descriptionEn: "All formats accepted, with technical details handled professionally. Just send your photos and videos—no need to sort or organize files; everything is made easy for you.",
      gradient: "from-memopyk-dark-blue/20 to-memopyk-navy/10"
    },
    {
      icon: Clock,
      titleFr: "Gain de Temps",
      titleEn: "Time Saving",
      descriptionFr: "Notre équipe dédiée prend tout en main avec un processus clair et des délais prévisibles. Vous gagnez des heures précieuses pendant que vos souvenirs se transforment sans effort.",
      descriptionEn: "Our dedicated team handles everything with a clear process and predictable deadlines. You save precious hours while your memories are brought to life effortlessly.",
      gradient: "from-memopyk-sky-blue/20 to-memopyk-blue-gray/10"
    },
    {
      icon: Settings,
      titleFr: "Personnalisation",
      titleEn: "Personalization",
      descriptionFr: "Chaque film souvenir est pensé pour être vraiment unique. Nous sommes à l'écoute de toutes vos envies et consignes spécifiques dans un esprit de collaboration.",
      descriptionEn: "Every souvenir film is designed to be truly unique. We listen to all your wishes and specific instructions in a spirit of collaboration.",
      gradient: "from-memopyk-cream/40 to-memopyk-sky-blue/20"
    },
    {
      icon: Users,
      titleFr: "Expertise",
      titleEn: "Expertise",
      descriptionFr: "Un processus efficace assure des conseils clairs et un suivi attentif à chaque étape. Le résultat : des films mémorables avec une véritable valeur ajoutée.",
      descriptionEn: "An efficient process ensures clear advice and attentive follow-up at each step. The result: memorable films with genuine added value.",
      gradient: "from-memopyk-orange/20 to-memopyk-cream/30"
    },
    {
      icon: Shield,
      titleFr: "Qualité Premium",
      titleEn: "Premium Quality",
      descriptionFr: "Tous nos films sont produits en haute définition avec une attention particulière aux détails visuels et sonores pour un rendu professionnel exceptionnel.",
      descriptionEn: "All our films are produced in high definition with special attention to visual and audio details for exceptional professional rendering.",
      gradient: "from-memopyk-navy/20 to-memopyk-dark-blue/10"
    }
  ];

  return (
    <section className="py-10 bg-gradient-to-br from-memopyk-cream/30 to-white overflow-x-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy mb-6">
            {language === 'fr-FR' 
              ? "Pourquoi choisir MEMOPYK"
              : "Why choose MEMOPYK"
            }
          </h2>
        </div>

        {/* Benefits Grid - 2 rows of 3 cards */}
        <div className="space-y-8">
          
          {/* First Row: Special title card + 2 benefit cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Special Title Card */}
            <div className="group relative h-full">
              <div className="relative bg-gradient-to-br from-memopyk-orange/30 to-memopyk-navy/20 backdrop-blur-sm p-8 sm:p-10 lg:p-12 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/20 h-full flex items-center justify-center">
                <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-memopyk-navy text-center leading-tight">
                  {language === 'fr-FR' ? titleCard.titleFr : titleCard.titleEn}
                </h3>
              </div>
              {/* Background Pattern */}
              <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
              </div>
            </div>

            {/* First two benefit cards */}
            {benefits.slice(0, 2).map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="group relative h-full">
                  <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                    
                    {/* Icon at Top */}
                    <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                        {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow">
                      {language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn}
                    </p>
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Second Row: Remaining 3 benefit cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.slice(2, 5).map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index + 2} className="group relative h-full">
                  <div className={`relative bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                    
                    {/* Icon at Top */}
                    <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                        {language === 'fr-FR' ? benefit.titleFr : benefit.titleEn}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow">
                      {language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn}
                    </p>
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </section>
  );
}