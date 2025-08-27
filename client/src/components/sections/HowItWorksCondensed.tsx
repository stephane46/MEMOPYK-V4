import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hasAnimated, setHasAnimated] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLElement>(null);

  // Reset flipped cards when section is not visible and handle first-load nudge
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If section is not visible (less than 50% visible), reset all cards
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
            setFlippedCards(new Set());
            setHoveredCard(null);
          } else if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            // First-load nudge animation for each card
            steps.forEach((step, index) => {
              if (!hasAnimated.has(step.number)) {
                setTimeout(() => {
                  setHoveredCard(step.number);
                  setTimeout(() => {
                    setHoveredCard(null);
                    setHasAnimated(prev => new Set(prev).add(step.number));
                  }, 200);
                }, index * 150);
              }
            });
          }
        });
      },
      {
        threshold: [0.5, 0.7], // Multiple thresholds for different behaviors
        rootMargin: '0px 0px -50px 0px'
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [hasAnimated]);
  
  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Nous écoutons et rassemblons",
      titleEn: "We listen and gather",
      descriptionFr: "Envoyez-nous vos photos et vidéos telles quelles.\nDites-nous tout ce que vous avez en tête :\n•\tvia notre questionnaire\n•\tou via la séance de consultation gratuite",
      descriptionEn: "Give us your photos and videos as they are\nTell us all about what you have in mind:\n•\tvia our questionnaire\n•\tor via the free consultation session",
      subDescriptionFr: "",
      subDescriptionEn: "",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Nous analysons", 
      titleEn: "We Analyze",
      descriptionFr: "Nous étudions tous les éléments pour :\n•\trécupérer \"crème de la crème\"\n•\tdéfinir l'arc naratif le plus adapté, ainsi que toutes les spécificités (musique, durée, format,…)\n\nUn devis complet est soumis à votre validation",
      descriptionEn: "Every detail and information are carefully studied to\n•\tselect the \"best of the best\"\n•\tdefine the most suitable storyline, as well as all the specific details (music, duration, format, etc.)\n\nA comprehensive quote is submitted for your approval.",
      subDescriptionFr: "",
      subDescriptionEn: "",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "Nous créons",
      titleEn: "We create", 
      descriptionFr: "Prévoyez un délai de 1 à 3 semaines avant de recevoir la première version de votre film souvenir.\n2 séries de retours sont incluses",
      descriptionEn: "Allow 1-3 weeks before receiving the first version of your souvenir film.\n2 rounds of feedback are included.",
      subDescriptionFr: "",
      subDescriptionEn: "",
      image: "/images/How_we_work_Step3.png"
    }
  ];

  return (
    <section id="how-it-works" className="py-12 bg-gradient-to-b from-memopyk-cream to-white" ref={sectionRef}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-memopyk-dark-blue mb-4">
            {language === 'fr-FR' ? 'Comment ça marche' : 'How It Works'}
          </h2>
          <p className="text-xl text-memopyk-dark-blue/70 max-w-3xl mx-auto">
            {language === 'fr-FR' 
              ? '3 étapes pour transformer vos photos et vidéos en films passionnants'
              : '3 steps to turn your photos and videos into captivating movies'
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
                    <div 
                      className="card-front bg-white border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isFlipped}
                      aria-label={`${language === 'fr-FR' ? step.titleFr : step.titleEn} - ${language === 'fr-FR' ? 'Cliquer pour plus d\'informations' : 'Click for more information'}`}
                      onMouseEnter={() => setHoveredCard(step.number)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onFocus={() => setHoveredCard(step.number)}
                      onBlur={() => setHoveredCard(null)}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(step.number)) {
                              newSet.delete(step.number);
                            } else {
                              newSet.add(step.number);
                            }
                            return newSet;
                          });
                        }
                      }}
                    >
                      {/* Main Card Content */}
                      <div className="relative">
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
                        
                        {/* Folded Corner Overlay - Bottom Right */}
                        <div 
                          className="absolute bottom-0 right-0 overflow-hidden pointer-events-none"
                          style={{
                            width: 'min(14%, 64px)',
                            height: 'min(14%, 64px)',
                            minWidth: '44px',
                            minHeight: '44px'
                          }}
                        >
                          {/* Back Preview (behind the fold) - Shows gradient preview */}
                          <div 
                            className="absolute inset-0 rounded-tl-full"
                            style={{
                              backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.85) 0%, rgba(42, 71, 89, 0.85) 100%)`,
                              transform: hoveredCard === step.number ? 'scale(1.05)' : 'scale(1)',
                              opacity: hoveredCard === step.number ? 0.9 : 0.7,
                              transition: 'all 200ms ease-out'
                            }}
                          >
                            {/* Subtle back content hint */}
                            <div 
                              className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-60"
                              style={{
                                fontSize: 'clamp(8px, 2vw, 10px)',
                                filter: 'blur(0.5px)'
                              }}
                            >
                              {language === 'fr-FR' ? 'Plus' : 'More'}
                            </div>
                          </div>
                          
                          {/* Folded Corner Triangle */}
                          <div 
                            className="absolute bottom-0 right-0"
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: 'min(14vw, 64px) solid transparent',
                              borderBottom: 'min(14vw, 64px) solid white',
                              filter: hoveredCard === step.number 
                                ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.25)) drop-shadow(0 2px 4px rgba(0,0,0,0.1))' 
                                : 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))',
                              transform: hoveredCard === step.number 
                                ? 'rotate(-3deg) translateY(-3px) translateX(1px)' 
                                : 'rotate(0deg) translateY(0px) translateX(0px)',
                              transition: 'all 200ms ease-out',
                              transformOrigin: 'bottom right'
                            }}
                          />
                          
                          {/* Fold Line Shadow */}
                          <div 
                            className="absolute bottom-0 right-0 pointer-events-none"
                            style={{
                              width: 'min(14%, 64px)',
                              height: 'min(14%, 64px)',
                              minWidth: '44px',
                              minHeight: '44px',
                              background: 'linear-gradient(135deg, transparent 48%, rgba(0,0,0,0.1) 50%, transparent 52%)',
                              opacity: hoveredCard === step.number ? 0.4 : 0.2,
                              transition: 'opacity 200ms ease-out'
                            }}
                          />
                          
                          {/* Highlight on fold edge */}
                          <div 
                            className="absolute bottom-0 right-0 pointer-events-none"
                            style={{
                              width: 'min(14%, 64px)',
                              height: 'min(14%, 64px)',
                              minWidth: '44px',
                              minHeight: '44px',
                              background: 'linear-gradient(135deg, transparent 47%, rgba(255,255,255,0.3) 49%, rgba(255,255,255,0.1) 51%, transparent 53%)',
                              opacity: hoveredCard === step.number ? 0.8 : 0.4,
                              transition: 'opacity 200ms ease-out'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                      
                    {/* BACK SIDE - Detailed Information */}
                    <div 
                      className="card-back shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden border border-gray-200 cursor-pointer transition-all duration-200"
                      role="button"
                      tabIndex={0}
                      aria-label={`${language === 'fr-FR' ? 'Fermer les détails' : 'Close details'}`}
                      style={{
                        backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                      onClick={() => {
                        setFlippedCards(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(step.number);
                          return newSet;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(step.number);
                            return newSet;
                          });
                        }
                      }}
                    >
                      <div className="h-full flex flex-col relative px-2 pt-0 pb-2">
                        
                        {/* Top Section - Text content area */}
                        <div className="text-center flex flex-col" style={{ height: '350px', position: 'relative' }}>
                          <div className="text-sm leading-normal text-white w-full flip-card-text-zero-spacing">
                            {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                              <p key={i} className="m-0 p-0">{paragraph}</p>
                            ))}
                          </div>
                          
                          {/* Separator Line - EXACTLY 250px FROM TOP */}
                          <div className="absolute border-t border-white/40 mx-2 left-2 right-2" style={{ top: '246px' }}></div>
                          
                          {/* Bottom Section - Sub Description - EXACTLY 260px FROM TOP */}
                          <div className="absolute text-center left-2 right-2" style={{ top: '256px' }}>
                            <div className="text-xs text-white leading-relaxed w-full">
                              {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                            </div>
                          </div>
                        </div>
                        
                        {/* Return arrow - Positioned with equal spacing */}
                        <div className="absolute -bottom-6 -left-6">
                          <div 
                            className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                            aria-label={language === 'fr-FR' ? 'Retour' : 'Back'}
                          >
                            <svg className="w-5 h-5 text-memopyk-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
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