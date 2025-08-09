import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Phone } from 'lucide-react';

export function HowItWorksSection() {
  const { language } = useLanguage();

  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Téléversement",
      titleEn: "You Upload",
      descriptionFr: "Envoyez-nous vos photos et vidéos telles qu'elles sont — inutile de trier, renommer ou organiser. Nous acceptons tous les formats, et proposons même des envois collaboratifs pour que la famille et les amis puissent contribuer.\nNous vous aidons pour la numérisation de vos éléments analogiques (photos imprimées, CD, cassette VHS,…).",
      descriptionEn: "Give us your photos and videos exactly as they are — no need to sort, rename, or organize. \nWe accept all formats and even support collaborative uploads, so your family and friends can contribute.\nWe also support the digitization of your analog materials (printed old photos, CDs, VHS tapes,…).",
      subDescriptionFr: "Vous recevrez également un court questionnaire pour nous en dire plus sur votre histoire — qu'elle soit encore floue ou déjà bien construite.",
      subDescriptionEn: "You'll first fill in a short questionnaire, or have a consultation chat with us, to tell us more about what you have in mind — whether it's a vague or detailed vision.",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Montage", 
      titleEn: "We Curate & Edit",
      descriptionFr: "Nous passons en revue chaque fichier pour repérer les moments les plus marquants, puis établissons l'arc naratif le plus adapté, avec des suggestions de musique, de durée et de format — tout est pensé pour sublimer vos souvenirs.",
      descriptionEn: "We go through every file to identify the most meaningful moments, then establish a personalized storyline, suggest music, duration, and format — every details are tailored to your memories.",
      subDescriptionFr: "Bien entendu, votre brief initial et tout commentaire que vous pourriez avoir sont toujours respectés, à chaque étape du processus.",
      subDescriptionEn: "Of course, your initial brief and any comment that you may have are always respected, each step of the way.",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "C'est prêt !",
      titleEn: "You Enjoy & Share", 
      descriptionFr: "Nous donnons vie à votre film de souvenirs. Vous recevez un résultat soigné en 1 à 3 semaines, avec 2 séries de retours incluses.",
      descriptionEn: "We bring your souvenir film to life. Expect a beautifully crafted result within 1-3 weeks, with 2 revision rounds included.",
      subDescriptionFr: "Vous obtenez un film souvenir prêt à partager — idéal pour offrir ou à conserver précieusement.",
      subDescriptionEn: "You'll receive a high-quality, ready-to-share masterpiece — perfect for gifting or keeping.",
      image: "/images/How_we_work_Step3.png"
    }
  ];

  return (
    <section id="how-it-works" className="pt-8 pb-2 bg-gradient-to-br from-white to-memopyk-sky-blue/10">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy mb-6">
            {language === 'fr-FR' 
              ? "Comment Ça Marche"
              : "How It Works"
            }
          </h2>

        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" style={{ gridAutoRows: '1fr' }}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isMiddleCard = step.number === 2;
            return (
              <div key={step.number} className="h-full">
                {/* Step Card */}
                <div className={`relative bg-memopyk-dark-blue rounded-3xl shadow-2xl text-center group hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 z-10 h-full flex flex-col p-12 ${
                  isMiddleCard ? 'border-4 border-memopyk-orange' : ''
                }`}>
                  
                  {/* Step Image */}
                  <div className="mb-8 flex-shrink-0">
                    <div className="w-64 h-64 mx-auto bg-memopyk-cream rounded-3xl p-6 shadow-lg">
                      <img 
                        src={step.image}
                        alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="text-2xl font-bold text-memopyk-cream mb-6 flex-shrink-0">
                    {step.number}. {language === 'fr-FR' ? step.titleFr : step.titleEn}
                  </h3>

                  {/* Step Description - Takes available space */}
                  <div className="text-memopyk-cream/90 leading-relaxed text-base mb-8 flex-grow">
                    {language === 'fr-FR' ? step.descriptionFr : step.descriptionEn}
                  </div>
                  
                  {/* Sub Description - Fixed at bottom with consistent height */}
                  <div className="flex-shrink-0 pt-4 border-t border-memopyk-cream/20 h-[100px] flex items-start">
                    <div className="flex items-start space-x-3 w-full pt-4">
                      <div className="w-6 h-6 rounded-full bg-memopyk-cream flex-shrink-0 flex items-center justify-center">
                        <Icon className="w-3 h-3 text-memopyk-dark-blue" />
                      </div>
                      <p className="text-memopyk-cream/90 text-base leading-relaxed">
                        {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Call to Action */}
        <div className="text-center mt-4">
          <div className="relative bg-gradient-to-br from-memopyk-dark-blue via-memopyk-navy to-memopyk-dark-blue p-10 rounded-3xl shadow-2xl border border-memopyk-orange/20 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-memopyk-orange/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-memopyk-sky-blue/10 rounded-full blur-2xl"></div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Main Headline */}
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-memopyk-cream mb-4">
                {language === 'fr-FR' 
                  ? "Transformez Vos Souvenirs en Film Cinématographique"
                  : "Transform Your Memories Into a Cinematic Film"
                }
              </h3>
              
              {/* Compelling Subtitle */}
              <p className="text-lg md:text-xl text-memopyk-cream/90 mb-6 max-w-3xl mx-auto leading-relaxed">
                {language === 'fr-FR' 
                  ? "Ne laissez plus vos moments précieux dormir dans vos téléphones. En seulement 1 à 3 semaines, recevez un film professionnel qui fera revivre vos plus beaux souvenirs pour toujours."
                  : "Don't let your precious moments sleep in your phones anymore. In just 1-3 weeks, receive a professional film that will bring your most beautiful memories to life forever."
                }
              </p>

              {/* Value Proposition */}
              <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm md:text-base">
                <div className="flex items-center text-memopyk-cream/80">
                  <div className="w-2 h-2 bg-memopyk-orange rounded-full mr-2"></div>
                  {language === 'fr-FR' ? "Livraison 1-3 semaines" : "1-3 weeks delivery"}
                </div>
                <div className="flex items-center text-memopyk-cream/80">
                  <div className="w-2 h-2 bg-memopyk-orange rounded-full mr-2"></div>
                  {language === 'fr-FR' ? "2 séries de retours incluses" : "2 revision rounds included"}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button className="inline-flex items-center gap-3 bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer">
                  <Phone className="w-5 h-5" />
                  {language === 'fr-FR' 
                    ? "Réserver une Consultation"
                    : "Book an appointment"
                  }
                </button>
                <button className="inline-flex items-center gap-3 bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer">
                  <Edit className="w-5 h-5" />
                  {language === 'fr-FR' 
                    ? "Obtenir un Devis"
                    : "Get a personalized quote"
                  }
                </button>
              </div>

              {/* Trust Element */}
              <p className="text-sm text-memopyk-cream/70 mt-6 italic">
                {language === 'fr-FR' 
                  ? "✨ Vos souvenirs, magnifiquement racontés — façonnés par l'expérience professionnelle et la passion du storytelling visuel.✨"
                  : "✨ Your memories, beautifully told — shaped by professional experience and a passion for visual storytelling.✨"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}