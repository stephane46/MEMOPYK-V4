import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLElement>(null);

  // Reset flipped cards when section is not visible
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If section is not visible (less than 50% visible), reset all cards
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
            setFlippedCards(new Set());
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of section is visible/hidden
        rootMargin: '0px 0px -50px 0px' // Add some margin for smoother triggering
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);
  
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

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-b from-memopyk-cream to-white" ref={sectionRef}>
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

        {/* Steps Grid with Flip Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => {
            const Icon = step.icon;
            const isFlipped = flippedCards.has(step.number);
            
            return (
              <div key={step.number} className="text-center group">
                {/* Flip Card Container - Only for the image area */}
                <div className={`card-flip-container ${isFlipped ? 'flipped' : ''} rounded-2xl mb-4`}>
                  <div className="card-flip-inner">
                    
                    {/* FRONT SIDE - Step Card */}
                    <div className="card-front bg-white border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden">
                      {/* Clickable Area */}
                      <div 
                        className="relative cursor-pointer"
                        onClick={() => {
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(step.number)) {
                              newSet.delete(step.number);
                            } else {
                              newSet.add(step.number);
                            }
                            return newSet;
                          });
                        }}
                      >
                        {/* Step Image */}
                        <div className="relative overflow-hidden rounded-xl transition-all duration-500 aspect-square">
                          <img 
                            src={step.image} 
                            alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                            className="w-full h-full object-contain bg-gray-50 transition-transform duration-500"
                          />
                          
                          {/* Orange Number Circle - Top Left */}
                          <div className="absolute top-2 left-2 w-8 h-8 bg-memopyk-orange rounded-full flex items-center justify-center transition-transform duration-300 shadow-lg">
                            <span className="text-sm font-bold text-white">{step.number}</span>
                          </div>
                        </div>
                        
                        {/* Info Button - Below image in white space */}
                        <div className="flex justify-center mt-3 mb-2">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                              border: '1px solid rgba(0, 0, 0, 0.1)',
                              backdropFilter: 'blur(2px)'
                            }}
                          >
                            <Info className="w-6 h-6" style={{ color: '#2A4759' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                      
                    {/* BACK SIDE - Detailed Information */}
                    <div 
                      className="card-back shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden border border-gray-200"
                      style={{
                        backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <div 
                        className="h-full flex flex-col justify-between p-3 cursor-pointer relative"
                        onClick={() => {
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(step.number);
                            return newSet;
                          });
                        }}
                      >
                        
                        {/* Top Section - Description */}
                        <div className="text-center flex-1 flex items-start">
                          <div className="text-sm leading-relaxed text-white w-full">
                            {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                              <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
                            ))}
                          </div>
                        </div>
                        
                        {/* Bottom Section - Sub Description with consistent separator */}
                        <div className="text-center mt-auto">
                          <div className="border-t border-white/40 pt-3 mb-4">
                            <div className="text-xs text-white leading-relaxed min-h-[3rem] flex items-center justify-center text-center">
                              {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                            </div>
                          </div>
                          
                          {/* Return arrow - Properly positioned */}
                          <div className="flex justify-center mb-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Static Title with Blue Icon - Always Visible */}
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-memopyk-navy rounded-full flex items-center justify-center transition-transform duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-memopyk-navy transition-colors duration-300">
                    {language === 'fr-FR' ? step.titleFr : step.titleEn}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}