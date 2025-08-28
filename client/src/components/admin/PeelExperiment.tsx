import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Info } from 'lucide-react';
import { PeelWrapper, PeelTop, PeelBack } from 'react-peel';

export function PeelExperiment() {
  const { language } = useLanguage();
  const [peelPositions, setPeelPositions] = useState<{[key: number]: {x: number, y: number}}>({});
  const [flippedCards, setFlippedCards] = useState<{ [key: number]: boolean }>({});
  const [showArrows, setShowArrows] = useState<{ [key: number]: boolean }>({});
  const [hasTriggeredReveal, setHasTriggeredReveal] = useState<{ [key: number]: boolean }>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cardIndex = parseInt(entry.target.getAttribute('data-card-index') || '0');
          
          if (entry.isIntersecting && !hasTriggeredReveal[cardIndex]) {
            // Mark this card as having triggered its reveal
            setHasTriggeredReveal(prev => ({ ...prev, [cardIndex]: true }));
            
            setTimeout(() => {
              console.log(`🎬 PEEL: Card ${cardIndex + 1} - Simple reveal animation`);
              
              if (cardIndex === 2) {
                // CARD 3: No big reveal, just show the arrow immediately
                console.log(`🎬 PEEL: Card ${cardIndex + 1} - Showing arrow for card 3`);
                setShowArrows(prev => ({ ...prev, [cardIndex]: true }));
              } else {
                // CARDS 1 & 2: Simple reveal sequence
                console.log(`🎬 PEEL: Card ${cardIndex + 1} - Starting reveal for cards 1&2`);
                
                // Step 1: Reveal
                setPeelPositions(prev => ({ ...prev, [cardIndex]: { x: 120, y: 120 } }));
                
                // Step 2: Return after a short time
                setTimeout(() => {
                  setPeelPositions(prev => {
                    const newPos = { ...prev };
                    delete newPos[cardIndex]; // Remove position = return to normal
                    return newPos;
                  });
                  
                  // Step 3: Show arrow (only for card 1)
                  if (cardIndex === 0) {
                    setShowArrows(prev => ({ ...prev, [cardIndex]: true }));
                  }
                  
                  console.log(`🎬 PEEL: Card ${cardIndex + 1} - Animation complete`);
                }, 1000); // 1 second reveal duration
              }
            }, 300);
          } else {
            // When card leaves viewport, reset it to default state
            setPeelPositions(prev => {
              const newPos = { ...prev };
              delete newPos[cardIndex];
              return newPos;
            });
            // Also reset arrow state when leaving viewport
            setShowArrows(prev => ({ ...prev, [cardIndex]: false }));
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    cardRefs.current.forEach((ref, index) => {
      if (ref) {
        ref.setAttribute('data-card-index', index.toString());
        observer.observe(ref);
      }
    });

    return () => observer.disconnect();
  }, []);
  
  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Téléversement",
      titleEn: "You Upload",
      descriptionFr: "Envoyez-nous simplement vos photos et vidéos, sans avoir à les trier ou les retoucher. Faites-nous part de votre vision et de ce qui compte le plus pour vous, soit en remplissant notre formulaire en ligne, soit en échangeant vos idées avec nous lors d'un appel téléphonique gratuit et convivial.",
      descriptionEn: "Simply send us your photos and videos—no need to organize or edit anything beforehand. Share your vision and what matters most to you, either by filling out our easy online form or by discussing your ideas with us during a free, friendly phone call.",
      subDescriptionFr: "Commencer est un jeu d'enfant : apportez-nous simplement vos souvenirs et vos envies, nous nous occupons du reste avec soin et créativité.",
      subDescriptionEn: "Getting started is effortless: just bring us your memories and ideas, and we'll handle everything else with care and creativity.",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Montage", 
      titleEn: "We Create",
      descriptionFr: "Nous examinons chaque détail avec attention et sélectionnons les plus beaux moments pour créer une histoire unique, selon vos préférences, avec la musique idéale, le bon rythme et le format qui vous convient. Vous recevez un devis précis et personnalisé avant toute étape, sans aucune mauvaise surprise.",
      descriptionEn: "We carefully review every detail and handpick the most beautiful scenes to craft a unique, engaging story that fits your preferences, including perfect music, optimal timing, and the best format for your needs. You'll receive a clear, custom quote before we begin, so there are no surprises.",
      subDescriptionFr: "Vos souvenirs deviennent un film sur-mesure, réalisé avec un souci du détail exceptionnel et une totale transparence à chaque étape.",
      subDescriptionEn: "Your memories become a one-of-a-kind film, created with meticulous attention to detail and total transparency at every step.",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "C'est prêt !",
      titleEn: "You Enjoy & Share", 
      descriptionFr: "Vous recevez la première version de votre film-souvenir personnalisé sous une à trois semaines, soigneusement monté et prêt à vous émouvoir. Deux séries de retours sont incluses pour affiner le montage jusqu'à ce qu'il corresponde parfaitement à vos attentes.",
      descriptionEn: "You'll receive the first version of your personalized souvenir film within one to three weeks, carefully edited and ready to impress. Our process includes two full rounds of feedback, making it easy to fine-tune your movie until it's exactly right.",
      subDescriptionFr: "Le résultat : un souvenir rien qu'à vous, livré rapidement et peaufiné selon vos envies jusqu'à la perfection.",
      subDescriptionEn: "The result is a keepsake entirely your own, delivered quickly and refined with your input until it's just perfect.",
      image: "/images/How_we_work_Step3.png"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          🧪 Peel Effect Experiment - "How It Works" Cards
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Testing react-peel library with scroll-triggered auto-reveal effect. When you scroll to each card, 
          it automatically reveals about one-third of the back content, then returns to the original state.
        </p>
      </div>

      {/* Peel Effect Cards Section */}
      <section className="py-12 bg-gradient-to-b from-memopyk-cream to-white">
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

          {/* Steps Grid with Peel Effect */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {steps.map((step) => {
              const Icon = step.icon;
              
              return (
                <div 
                  key={step.number} 
                  className="text-center group"
                  ref={(el) => { cardRefs.current[step.number - 1] = el; }}
                >
                  {/* Auto-Reveal Peel Card Container with Click-to-Flip */}
                  <div 
                    className="mb-4 cursor-pointer relative"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // ALL CARDS: Same simple flip behavior
                      setFlippedCards(prev => ({
                        ...prev,
                        [step.number - 1]: !prev[step.number - 1]
                      }));
                      // Keep arrow visible - don't hide on click
                    }}
                  >
                    {step.number === 3 ? (
                      /* Card 3: Regular div without PeelWrapper - no fold */
                      <div className="rounded-2xl overflow-hidden aspect-square">
                        <div 
                          className={`border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden h-full transition-all duration-700 relative ${
                            flippedCards[step.number - 1] ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-white'
                          }`}
                          style={{
                            transformStyle: 'preserve-3d'
                          }}
                        >
                          {!flippedCards[step.number - 1] ? (
                            <div className="relative overflow-hidden rounded-xl transition-all duration-500 h-full">
                              <img 
                                src={step.image} 
                                alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                                className="w-full h-full object-contain bg-gray-50 transition-transform duration-500"
                              />
                              
                              <div className="absolute top-2 left-2 w-8 h-8 bg-memopyk-orange rounded-full flex items-center justify-center transition-transform duration-300 shadow-lg">
                                <span className="text-sm font-bold text-white">{step.number}</span>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="h-full flex flex-col cursor-pointer relative"
                              style={{
                                backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                transformOrigin: 'center'
                              }}
                            >
                              <div className="text-center flex flex-col p-4" style={{ height: '100%', position: 'relative' }}>
                                <div className="text-sm leading-normal text-white w-full mb-4">
                                  {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                                    <p key={i} className="mb-2">{paragraph}</p>
                                  ))}
                                </div>
                                
                                <div className="border-t border-white/40 mx-4 mb-4"></div>
                                
                                <div className="text-center">
                                  <div className="text-xs text-white leading-relaxed">
                                    {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Cards 1 & 2: PeelWrapper with peel effect */
                      <PeelWrapper
                        corner="BOTTOM_RIGHT"
                        peelPosition={peelPositions[step.number - 1] || undefined}
                        drag={false}
                        options={{
                          corner: "BOTTOM_RIGHT"
                        }}
                        className="rounded-2xl overflow-hidden aspect-square"
                        height="100%"
                        width="100%"
                      >
                      <PeelTop>
                        {/* FRONT/BACK SIDE - Step Card with Flip Animation */}
                        <div 
                          className={`border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden h-full transition-all duration-700 relative ${
                            flippedCards[step.number - 1] ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-white'
                          }`}
                          style={{
                            // Remove flip transform - let react-peel handle the visual effect
                            transformStyle: 'preserve-3d'
                          }}
                        >
                          {/* Conditional Content Based on Flip State */}
                          {
                            !flippedCards[step.number - 1] ? (
                              <div className="relative overflow-hidden rounded-xl transition-all duration-500 h-full">
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
                            ) : (
                              /* Cards 1&2 BACK SIDE - Detailed Information */
                              <div 
                                className="h-full flex flex-col cursor-pointer relative"
                                style={{
                                  backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                                  // No transform - let content appear naturally
                                  transformOrigin: 'center'
                                }}
                              >
                                {/* Top Section - Text content area with proper padding */}
                                <div className="text-center flex flex-col p-4" style={{ height: '100%', position: 'relative' }}>
                                  <div className="text-sm leading-normal text-white w-full mb-4">
                                    {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                                      <p key={i} className="mb-2">{paragraph}</p>
                                    ))}
                                  </div>
                                  
                                  {/* Separator Line */}
                                  <div className="border-t border-white/40 mx-4 mb-4"></div>
                                  
                                  {/* Bottom Section - Sub Description */}
                                  <div className="text-center">
                                    <div className="text-xs text-white leading-relaxed">
                                      {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                                    </div>
                                  </div>
                                </div>
                                
                              </div>
                            )
                          }
                        </div>
                      </PeelTop>
                      
                      {step.number !== 3 && (
                        <PeelBack>
                          {/* Cards 1 & 2 only: Full back side content */}
                          <div 
                            className="shadow-lg rounded-2xl overflow-hidden border border-gray-200 h-full"
                            style={{
                              backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }}
                          >
                            <div 
                              className="h-full flex flex-col justify-between p-4"
                              style={{
                                transform: 'rotateY(180deg) rotateZ(180deg)'
                              }}
                            >
                              <div className="text-center text-white">
                                <div className="text-sm leading-normal mb-4">
                                  {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                                    <p key={i} className="mb-2">{paragraph}</p>
                                  ))}
                                </div>
                                
                                <div className="border-t border-white/40 my-4"></div>
                                
                                <div className="text-xs text-white leading-relaxed">
                                  {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                                </div>
                              </div>
                            </div>
                          </div>
                        </PeelBack>
                      )}
                      </PeelWrapper>
                    )}
                    
                    {/* Orange Arrow Indicator - Only cards 1 & 3 */}
                    {showArrows[step.number - 1] && step.number !== 2 && (
                      <div className="absolute bottom-0 right-0 pointer-events-none z-50">
                        {step.number === 3 ? (
                          /* Card 3: Orange triangle corner with unfold reveal */
                          <div className="relative">
                            <div 
                              className="w-0 h-0 border-l-[40px] border-b-[40px] border-l-transparent border-b-memopyk-orange shadow-lg"
                              style={{
                                filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))',
                                animation: 'cornerPeel 2s ease-in-out infinite'
                              }}
                            />
                            <div 
                              className="absolute bottom-1 right-1"
                              style={{
                                animation: 'arrowFloat 2s ease-in-out infinite'
                              }}
                            >
                              <svg 
                                width="18" 
                                height="18" 
                                viewBox="0 0 16 16" 
                                fill="white"
                                style={{
                                  filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
                                }}
                              >
                                {/* Arrow pointing to top-left */}
                                <path d="M4 4 L4 9 L6 7 L10 11 L12 9 L8 5 L10 4 Z" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          /* Card 1 only: Orange circle with larger arrow */
                          <div className="bg-memopyk-orange text-white p-2 rounded-full shadow-lg animate-pulse flex items-center justify-center">
                            <svg 
                              width="18" 
                              height="18" 
                              viewBox="0 0 16 16" 
                              fill="currentColor"
                            >
                              {/* Arrow pointing to top-left */}
                              <path d="M4 4 L4 9 L6 7 L10 11 L12 9 L8 5 L10 4 Z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Debug: Show arrow state */}
                    <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white p-1 rounded">
                      Arrow: {showArrows[step.number - 1] ? 'ON' : 'OFF'}
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
    </div>
  );
}