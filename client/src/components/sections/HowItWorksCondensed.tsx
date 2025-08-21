import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, X, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  
  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Téléversement",
      titleEn: "You Upload",
      descriptionFr: "Envoyez-nous vos photos et vidéos telles qu'elles sont — inutile de trier, renommer ou organiser. Nous acceptons tous les formats, et proposons des envois collaboratifs pour que la famille / les amis puissant contribuer.\nNous vous aidons pour la numérisation de vos éléments analogiques (vieilles photos imprimées, CD, cassettes VHS,...).",
      descriptionEn: "Give us your photos and videos as they are — no need to sort, rename, or organize.\nWe support collaborative uploads, so your family/friends can contribute.\nWe also help you with the digitization of your analog materials (printed old photos, CDs, VHS tapes,…).",
      subDescriptionFr: "Vous recevrez également un court questionnaire pour nous en dire plus sur votre histoire — qu'elle soit encore floue ou déjà bien construite.",
      subDescriptionEn: "You'll first fill in a short questionnaire, or have a consultation chat with us, to tell us more about what you have in mind — whether it's a vague or detailed vision.",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Montage", 
      titleEn: "We Create",
      descriptionFr: "Nous étudions chaque photo et chaque video pour repérer les moments les plus marquants, puis établissons l'arc naratif le plus adapté, avec des suggestions de musique, de durée et de format — tout est pensé pour sublimer vos souvenirs.",
      descriptionEn: "We study each photo and each video to identify the most meaningful moments, then establish a personalized storyline, suggest music, duration, and format — every details are tailored to your memories.",
      subDescriptionFr: "Bien entendu, votre brief initial et tout commentaire que vous pourriez avoir sont toujours respectés, à chaque étape du processus.",
      subDescriptionEn: "Of course, your initial brief and any comment that you may have are always respected, each step of the way.",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "C'est prêt !",
      titleEn: "You Enjoy & Share", 
      descriptionFr: "Nous donnons vie à votre film, dans le format de votre choix, le mieux adapté par exemple pour le visionnage à la télévision ou sur Facebook. Vous recevez un résultat soigné en 1 à 3 semaines, avec 2 séries de retours incluses. Vous obtiendrez un film de haute qualité qui reflète fidèlement votre vision et vos souhaits.",
      descriptionEn: "We bring your film to life, in the format of you choice, best suited for example for TV viewing or for Facebook. Expect a beautifully crafted result within 1-3 weeks, with 2 revision rounds included. You'll receive a high-quality visual story that truly reflects your vision and wishes.",
      subDescriptionFr: "Ce film est parfait pour préserver vos souvenirs, offrir un cadeau plein d'émotion à un proche, ou partager un moment privilégié en famille ou entre amis.",
      subDescriptionEn: "The film is ideal for cherishing memories, sharing a heartfelt gift with a loved one, or enjoying together with family and friends.",
      image: "/images/How_we_work_Step3.png"
    }
  ];

  const howItWorksUrl = language === 'fr-FR' ? '/fr-FR/comment-ca-marche' : '/en-US/how-it-works';

  return (
    <section className="py-20 bg-gradient-to-b from-memopyk-cream to-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-memopyk-dark-blue mb-4">
            {language === 'fr-FR' ? 'Comment ça marche' : 'How It Works'}
          </h2>
          <p className="text-xl text-memopyk-dark-blue/70 max-w-3xl mx-auto">
            {language === 'fr-FR' 
              ? '3 étapes pour transformer vos photos et vidéos en films personnalisés'
              : 'Discover our simple 3-step process to transform your memories into exceptional films'
            }
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isExpanded = expandedStep === step.number;
            return (
              <div key={step.number} className="text-center group">
                {/* Interactive Step Container */}
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                >
                  {/* Step Image with Number Overlay */}
                  <div className="relative mb-6 overflow-hidden rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-500 aspect-square">
                    <img 
                      src={step.image} 
                      alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                      className="w-full h-full object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Orange Number Circle - Top Left */}
                    <div className="absolute top-2 left-2 w-8 h-8 bg-memopyk-orange rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <span className="text-sm font-bold text-white">{step.number}</span>
                    </div>

                    {/* Desktop Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-memopyk-navy/95 via-memopyk-navy/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden md:flex flex-col justify-end p-6">
                      <div className="text-white drop-shadow-2xl">
                        <div className="text-sm leading-relaxed mb-3 font-semibold text-white">
                          {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                            <p key={i} className="mb-2 last:mb-0 drop-shadow-lg">{paragraph}</p>
                          ))}
                        </div>
                        <div className="text-xs font-semibold border-t border-white/60 pt-3 text-white drop-shadow-lg">
                          {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Tap Indicator */}
                    <div className="absolute top-2 right-2 md:hidden bg-memopyk-navy/80 rounded-full p-2">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>

                    {/* Desktop Hover Hint */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 hidden md:block opacity-70 group-hover:opacity-0 transition-opacity duration-300">
                      <div className="bg-memopyk-navy/80 text-white text-xs px-3 py-1 rounded-full">
                        {language === 'fr-FR' ? 'Survolez pour plus de détails' : 'Hover for details'}
                      </div>
                    </div>
                  </div>

                  {/* Step Title with Blue Icon */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-memopyk-navy rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-memopyk-navy group-hover:text-memopyk-orange transition-colors duration-300">
                      {language === 'fr-FR' ? step.titleFr : step.titleEn}
                    </h3>
                  </div>
                </div>

                {/* Mobile Expanded Content */}
                <div className={`md:hidden overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-gradient-to-br from-memopyk-navy to-memopyk-dark-blue rounded-xl p-6 text-white relative">
                    {/* Close Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedStep(null);
                      }}
                      className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="text-sm leading-relaxed mb-4">
                      {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
                      ))}
                    </div>
                    <div className="text-xs opacity-75 border-t border-white/20 pt-3">
                      {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                    </div>
                  </div>
                </div>

                {/* Spacer */}
                <div className="h-6"></div>
              </div>
            );
          })}
        </div>


      </div>
    </section>
  );
}