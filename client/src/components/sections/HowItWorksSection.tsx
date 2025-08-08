import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart } from 'lucide-react';

export function HowItWorksSection() {
  const { language } = useLanguage();

  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Téléversement",
      titleEn: "You Upload",
      descriptionFr: "Envoyez-nous vos photos et vidéos telles qu'elles sont — inutile de trier, renommer ou organiser. Nous acceptons tous les formats, et proposons même des envois collaboratifs pour que toute la famille puisse contribuer.",
      descriptionEn: "Send us your photos and videos exactly as they are — no need to sort, rename, or organize. We accept all formats and even support collaborative uploads, so your whole family can contribute.",
      subDescriptionFr: "Vous recevrez également un court questionnaire pour nous en dire plus sur votre histoire — qu'elle soit encore floue ou déjà bien construite.",
      subDescriptionEn: "You'll also receive a short questionnaire to tell us more about your story — whether it's a vague idea or a detailed vision.",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Montage", 
      titleEn: "We Curate & Edit",
      descriptionFr: "Nous passons en revue chaque fichier pour repérer les moments les plus marquants. Puis, nous vous proposons un scénario personnalisé, avec des suggestions de musique, de durée et de format — tout est pensé pour sublimer vos souvenirs.",
      descriptionEn: "We go through every file to identify the most meaningful moments. Then we propose a personalized storyline, suggest music, duration, and format — everything tailored to your memories.",
      subDescriptionFr: "Besoin d'en discuter ? Une consultation est toujours possible, gratuitement.",
      subDescriptionEn: "Need to talk it through? A consultation is always available, free of charge.",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "C'est prêt !",
      titleEn: "You Enjoy & Share", 
      descriptionFr: "Une fois le plan validé, nous donnons vie à votre film de souvenirs. Vous recevez un résultat soigné en 1 à 3 semaines, avec deux séries de retours incluses.",
      descriptionEn: "Once you approve the plan, we bring your memory film to life. Expect a beautifully crafted result within 1-3 weeks, with two revision rounds included.",
      subDescriptionFr: "Vous obtenez une création prête à être partagée — idéale à offrir ou à conserver précieusement.",
      subDescriptionEn: "You'll receive a high-quality, ready-to-share masterpiece — perfect for gifting or keeping.",
      image: "/images/How_we_work_Step3.png"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-poppins font-bold text-memopyk-navy mb-6">
            {language === 'fr-FR' 
              ? "3 étapes simples pour transformer le chaos en film mémoire"
              : "3 easy steps to turn chaos into a memory film"
            }
          </h2>
          <p className="text-xl text-memopyk-dark-blue max-w-3xl mx-auto">
            {language === 'fr-FR' 
              ? "De vos souvenirs éparpillés à un film cinématographique professionnel"
              : "From your scattered memories to a professional cinematic film"
            }
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isMiddleCard = step.number === 2;
            return (
              <div key={step.number} className="relative h-full">
                {/* Step Card */}
                <div className={`relative bg-memopyk-dark-blue rounded-3xl shadow-2xl text-center group hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 z-10 h-full flex flex-col p-12 ${
                  isMiddleCard ? 'border-4 border-memopyk-orange' : ''
                }`}>
                  
                  {/* Step Image */}
                  <div className="mb-8">
                    <div className="w-64 h-64 mx-auto bg-memopyk-cream rounded-3xl p-6 shadow-lg">
                      <img 
                        src={step.image}
                        alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="text-2xl font-bold text-memopyk-cream mb-6">
                    {step.number}. {language === 'fr-FR' ? step.titleFr : step.titleEn}
                  </h3>

                  {/* Step Description */}
                  <div className="flex-grow">
                    <p className="text-memopyk-cream/90 leading-relaxed text-base h-32 mb-4">
                      {language === 'fr-FR' ? step.descriptionFr : step.descriptionEn}
                    </p>
                  </div>

                  {/* Sub Description */}
                  <div className="mt-4 pt-4 border-t border-memopyk-cream/20">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-memopyk-cream mt-1 flex-shrink-0 flex items-center justify-center">
                        <Icon className="w-3 h-3 text-memopyk-dark-blue" />
                      </div>
                      <p className="text-memopyk-cream/90 text-base leading-relaxed h-20">
                        {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-memopyk-cream to-white p-8 rounded-2xl shadow-lg">
            <p className="text-lg text-memopyk-dark-blue mb-6">
              {language === 'fr-FR' 
                ? "Prêt à commencer votre film mémoire ?"
                : "Ready to start your memory film?"
              }
            </p>
            <button className="bg-memopyk-orange hover:bg-memopyk-dark-blue text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
              {language === 'fr-FR' 
                ? "Commencer"
                : "Get started"
              }
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}