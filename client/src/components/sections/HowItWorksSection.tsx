import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart } from 'lucide-react';

export function HowItWorksSection() {
  const { language } = useLanguage();

  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Vous Partagez",
      titleEn: "You Upload",
      descriptionFr: "Envoyez-nous toutes vos photos et vidéos, peu importe le désordre. Tous les formats acceptés, de n'importe quel appareil.",
      descriptionEn: "Send us all your photos and videos, no matter the mess. All formats accepted, from any device.",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Nous Créons", 
      titleEn: "We Create",
      descriptionFr: "Nos artistes organisent et transforment vos souvenirs en un film cinématographique personnel avec narration professionnelle.",
      descriptionEn: "Our artists organize and transform your memories into a personal cinematic film with professional storytelling.",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "Vous Profitez & Partagez",
      titleEn: "You Enjoy & Share", 
      descriptionFr: "Recevez votre film en HD prêt à partager avec famille et amis, sur tous supports digitaux et physiques.",
      descriptionEn: "Receive your HD film ready to share with family and friends, on all digital and physical media.",
      image: "/images/How_we_work_Step3.png"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-memopyk-navy mb-6">
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
            return (
              <div key={step.number} className="relative">
                {/* Connection Line (except for last step) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 left-full w-full h-0.5 bg-gradient-to-r from-memopyk-sky-blue to-memopyk-blue-gray/30 transform -translate-x-1/2 z-0"></div>
                )}
                
                {/* Step Card */}
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 text-center group hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 z-10">
                  
                  {/* Step Number */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                    <div className="w-12 h-12 bg-memopyk-orange text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg">
                      {step.number}
                    </div>
                  </div>

                  {/* Step Image */}
                  <div className="mb-6 mt-4">
                    <img 
                      src={step.image}
                      alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                      className="w-full h-48 object-cover rounded-xl shadow-lg"
                    />
                  </div>

                  {/* Step Icon */}
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-memopyk-sky-blue/20 to-memopyk-blue-gray/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-8 h-8 text-memopyk-dark-blue" />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="text-2xl font-bold text-memopyk-navy mb-4">
                    {language === 'fr-FR' ? step.titleFr : step.titleEn}
                  </h3>

                  {/* Step Description */}
                  <p className="text-memopyk-dark-blue leading-relaxed">
                    {language === 'fr-FR' ? step.descriptionFr : step.descriptionEn}
                  </p>

                  {/* Responsibility Badge */}
                  <div className="mt-6">
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                      step.number === 2 
                        ? 'bg-memopyk-orange text-white' 
                        : 'bg-memopyk-sky-blue/20 text-memopyk-dark-blue'
                    }`}>
                      {step.number === 2 
                        ? 'MEMOPYK'
                        : language === 'fr-FR' ? 'Vous' : 'You'
                      }
                    </span>
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
                ? "Commencer maintenant"
                : "Start now"
              }
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}