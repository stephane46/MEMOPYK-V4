import { useLanguage } from '../../contexts/LanguageContext';
import { Clock, Zap, Users, Settings, Shield } from 'lucide-react';
import filmstripImage from "@assets/filmstrip.png";

export function WhyMemopykSection() {
  const { language } = useLanguage();

  // Security card (first position)
  const securityCard = {
    icon: Shield,
    titleFr: "Sécurité",
    titleEn: "Security",
    descriptionFr: "Vos données personnelles sont entièrement protégées. Stockage sécurisé, transferts chiffrés et suppression après livraison garantissent la confidentialité absolue de vos souvenirs.",
    descriptionEn: "Your personal data is fully protected. Secure storage, encrypted transfers, and deletion after delivery guarantee absolute confidentiality of your memories.",
    gradient: "from-memopyk-navy/30 to-memopyk-dark-blue/20"
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
    <section id="why-memopyk" className="py-10 bg-gradient-to-br from-memopyk-cream/30 to-white overflow-x-hidden">
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
          
          {/* First Row: Simplicité + Qualité Premium + Gain de Temps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Simplicité */}
            {(() => {
              const benefit = benefits[0]; // Simplicité
              const Icon = benefit.icon;
              return (
                <div className="group relative h-full">
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
                    <p className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center">
                      {language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn}
                    </p>
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}

            {/* Raw Image - No Card */}
            <img 
              src={filmstripImage}
              alt=""
              className="w-full h-64 sm:h-72 lg:h-80 object-contain rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            />

            {/* Card 3: Gain de Temps */}
            {(() => {
              const benefit = benefits[1]; // Gain de Temps
              const Icon = benefit.icon;
              return (
                <div className="group relative h-full">
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
                    <p className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center">
                      {language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn}
                    </p>
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Second Row: Personnalisation + Expertise + Sécurité Totale */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Card 4: Personnalisation */}
            {(() => {
              const benefit = benefits[2]; // Personnalisation
              const Icon = benefit.icon;
              return (
                <div className="group relative h-full">
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
                    <p className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center">
                      {language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn}
                    </p>
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}

            {/* Card 5: Expertise */}
            {(() => {
              const benefit = benefits[3]; // Expertise
              const Icon = benefit.icon;
              return (
                <div className="group relative h-full">
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
                    <p className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow text-center">
                      {language === 'fr-FR' ? benefit.descriptionFr : benefit.descriptionEn}
                    </p>
                  </div>

                  {/* Background Pattern */}
                  <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                    <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
                  </div>
                </div>
              );
            })()}

            {/* Card 6: Sécurité Totale */}
            <div className="group relative h-full">
              <div className={`relative bg-gradient-to-br ${securityCard.gradient} backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/20 h-full flex flex-col`}>
                
                {/* Icon at Top */}
                <div className="flex justify-center mb-4 sm:mb-6 flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-memopyk-dark-blue" />
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4 sm:mb-6 flex-shrink-0">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-navy text-center">
                    {language === 'fr-FR' ? securityCard.titleFr : securityCard.titleEn}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-memopyk-dark-blue leading-relaxed text-sm sm:text-base flex-grow">
                  {language === 'fr-FR' ? securityCard.descriptionFr : securityCard.descriptionEn}
                </p>
              </div>

              {/* Background Pattern */}
              <div className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2">
                <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/10 to-memopyk-blue-gray/10 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}