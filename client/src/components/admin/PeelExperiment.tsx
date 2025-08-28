import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Info } from 'lucide-react';
import { PeelWrapper, PeelTop, PeelBack } from 'react-peel';

export function PeelExperiment() {
  const { language } = useLanguage();
  const [peelPositions, setPeelPositions] = useState<{[key: number]: {x: number, y: number}}>({});
  const [flippedCards, setFlippedCards] = useState<{ [key: number]: boolean }>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cardIndex = parseInt(entry.target.getAttribute('data-card-index') || '0');
          
          if (entry.isIntersecting) {
            setTimeout(() => {
              // === Universal Card Animation: Smooth float + gentle permanent pulsing ===
              console.log(`🎬 PEEL: Card ${cardIndex + 1} - Smooth float → gentle permanent pulsing`);

              // Cancel any in-flight animation for this card
              const rafMap: Map<number, number> =
                (window as any).__peelRafMap || ((window as any).__peelRafMap = new Map());
              const cancelPrev = () => {
                const id = rafMap.get(cardIndex);
                if (id) cancelAnimationFrame(id);
              };
              const schedule = (fn: FrameRequestCallback) => {
                const id = requestAnimationFrame(fn);
                rafMap.set(cardIndex, id);
                return id;
              };

              // Ensure a known starting point
              setPeelPositions(prev => ({
                ...prev,
                [cardIndex]: prev[cardIndex] ?? { x: 200, y: 200 },
              }));

              type Vec = { x: number; y: number };
              const setPos = (v: Vec) =>
                setPeelPositions(p => ({ ...p, [cardIndex]: v }));

              // Local spring state for this run (natural "paper" feel)
              const state = {
                x: peelPositions[cardIndex]?.x ?? 200,
                y: peelPositions[cardIndex]?.y ?? 200,
                vx: 0,
                vy: 0,
              };

              // Lightweight spring tween (Hooke's law + damping)
              const springTo = (
                to: Vec,
                opts?: {
                  stiffness?: number; // higher = quicker
                  damping?: number;   // lower = bouncier (0.75–0.9 sweet spot)
                  snapSpeed?: number; // stop when velocity is tiny
                  snapDist?: number;  // and when distance is tiny
                  onComplete?: () => void;
                }
              ) => {
                const stiffness = opts?.stiffness ?? 0.045;
                const damping   = opts?.damping   ?? 0.82;
                const snapSpeed = opts?.snapSpeed ?? 0.06;
                const snapDist  = opts?.snapDist  ?? 0.75;

                cancelPrev();

                const step = () => {
                  const dx = to.x - state.x;
                  const dy = to.y - state.y;

                  state.vx = (state.vx + dx * stiffness) * damping;
                  state.vy = (state.vy + dy * stiffness) * damping;

                  state.x += state.vx;
                  state.y += state.vy;

                  setPos({ x: state.x, y: state.y });

                  const speed = Math.hypot(state.vx, state.vy);
                  const dist  = Math.hypot(dx, dy);

                  if (speed < snapSpeed && dist < snapDist) {
                    setPos({ x: to.x, y: to.y }); // snap exact, avoid sub-pixel drift
                    opts?.onComplete && opts.onComplete();
                    return;
                  }
                  schedule(step);
                };

                schedule(step);
              };

              // Subtle decaying "tickle" at the small corner (professional flourish) - Card 3 behavior
              const microTickle = (base: Vec) => {
                const amps = [5, 3, 1.5]; // decay sequence
                let i = 0;
                const next = () => {
                  if (i >= amps.length) {
                    // Final settle - ensure completely static position
                    cancelPrev();
                    setPos({ x: base.x, y: base.y });
                    console.log(`🎬 PEEL: Card ${cardIndex + 1} - Final static position locked`);
                    return;
                  }
                  const a = amps[i++];

                  // left-down nudge
                  springTo(
                    { x: base.x - a, y: base.y - a },
                    {
                      stiffness: 0.065,
                      damping: 0.80,
                      onComplete: () => {
                        // right-up rebound
                        springTo(
                          { x: base.x + a, y: base.y + a },
                          {
                            stiffness: 0.065,
                            damping: 0.82,
                            onComplete: () => {
                              // settle back to base, then continue decay
                              springTo(base, {
                                stiffness: 0.05,
                                damping: 0.86,
                                onComplete: next,
                              });
                            },
                          }
                        );
                      },
                    }
                  );
                };
                next();
              };

              // Respect reduced motion
              const prefersReduced =
                typeof window !== 'undefined' &&
                window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

              if (prefersReduced) {
                setPos({ x: 320, y: 320 });
                console.log(`🎬 PEEL: Card ${cardIndex + 1} - Reduced motion fallback`);
              } else {
                // Card 2: Special sequence - Big reveal first, then small corner
                if (cardIndex === 1) { // Card 2 (0-indexed)
                  console.log(`🎬 PEEL: Card 2 - Starting big reveal sequence`);
                  // Phase A: Big reveal first
                  springTo(
                    { x: 50, y: 50 },
                    {
                      stiffness: 0.040,
                      damping: 0.86,
                      onComplete: () => {
                        console.log(`🎬 PEEL: Card 2 - Big reveal complete, returning to small corner`);
                        // Phase B: Return to small corner with pulsing
                        springTo(
                          { x: 280, y: 280 },
                          {
                            stiffness: 0.038,
                            damping: 0.88,
                            onComplete: () => {
                              microTickle({ x: 280, y: 280 });
                              console.log(`🎬 PEEL: Card 2 - Small corner pulsing started`);
                            },
                          }
                        );
                      },
                    }
                  );
                } else {
                  // All other cards: Original behavior
                  springTo(
                    { x: 25, y: 40 },
                    {
                      stiffness: 0.040, // softer entry
                      damping: 0.86,
                      onComplete: () => {
                        springTo(
                          { x: 320, y: 320 },
                          {
                            stiffness: 0.038,
                            damping: 0.88,
                            onComplete: () => {
                              microTickle({ x: 320, y: 320 });
                              console.log(`🎬 PEEL: Card ${cardIndex + 1} - Micro-tickle started`);
                            },
                          }
                        );
                      },
                    }
                  );
                }
              }
            }, 300);
          } else {
            // When card leaves viewport, reset it to default state
            setPeelPositions(prev => {
              const newPos = { ...prev };
              delete newPos[cardIndex];
              return newPos;
            });
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
                    className="mb-4 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Card 3: Use only peel transitions (no 3D flip)
                      if (step.number === 3) {
                        // Get current peel position
                        const currentPos = peelPositions[step.number - 1] || { x: 320, y: 320 };
                        
                        // Cancel any current animations
                        const rafMap: Map<number, number> = (window as any).__peelRafMap || new Map();
                        const cancelId = rafMap.get(step.number - 1);
                        if (cancelId) {
                          cancelAnimationFrame(cancelId);
                          rafMap.delete(step.number - 1);
                        }
                        
                        if (!flippedCards[step.number - 1]) {
                          // FRONT → BACK: Continue peel motion to reveal back content
                          console.log(`🎬 PEEL-CLICK: Card 3 - Continuing peel motion from {x: ${currentPos.x}, y: ${currentPos.y}}`);
                          
                          // Single smooth transition to complete reveal
                          setPeelPositions(prev => ({
                            ...prev,
                            [step.number - 1]: { x: 0, y: 0 } // Complete reveal showing full back content
                          }));
                          
                          // Mark as flipped but don't use rotateY - content comes from PeelBack
                          setFlippedCards(prev => ({
                            ...prev,
                            [step.number - 1]: true
                          }));
                        } else {
                          // BACK → FRONT: Reverse peel to hide back content
                          console.log(`🎬 PEEL-CLICK: Card 3 - Reversing peel to show front`);
                          
                          // Reset peel position to hide the back content
                          setPeelPositions(prev => ({
                            ...prev,
                            [step.number - 1]: { x: 320, y: 320 } // Hide PeelBack content
                          }));
                          
                          // Mark as not flipped
                          setFlippedCards(prev => ({
                            ...prev,
                            [step.number - 1]: false
                          }));
                        }
                      } else {
                        // Cards 1 & 2: Keep original instant flip behavior
                        setFlippedCards(prev => ({
                          ...prev,
                          [step.number - 1]: !prev[step.number - 1]
                        }));
                        
                        // Cancel any running peel animations for this card
                        const rafMap: Map<number, number> = (window as any).__peelRafMap || new Map();
                        const animationId = rafMap.get(step.number - 1);
                        if (animationId) {
                          cancelAnimationFrame(animationId);
                          rafMap.delete(step.number - 1);
                        }
                      }
                    }}
                  >
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
                          className={`border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden h-full transition-all duration-700 ${
                            flippedCards[step.number - 1] ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-white'
                          }`}
                          style={{
                            // Card 3: Remove rotateY - use only peel effect
                            transform: step.number === 3 
                              ? `translate(${
                                  (peelPositions[step.number - 1]?.x || 0) === 320 && (peelPositions[step.number - 1]?.y || 0) >= 318 && (peelPositions[step.number - 1]?.y || 0) <= 322
                                    ? `${(peelPositions[step.number - 1]?.x || 320) - 320}px, ${(peelPositions[step.number - 1]?.y || 320) - 320}px`
                                    : '0px, 0px'
                                })` // Only translate, no rotateY
                              : `${flippedCards[step.number - 1] ? 'rotateY(180deg)' : 'rotateY(0deg)'} translate(${
                                  (peelPositions[step.number - 1]?.x || 0) === 320 && (peelPositions[step.number - 1]?.y || 0) >= 318 && (peelPositions[step.number - 1]?.y || 0) <= 322
                                    ? `${(peelPositions[step.number - 1]?.x || 320) - 320}px, ${(peelPositions[step.number - 1]?.y || 320) - 320}px`
                                    : '0px, 0px'
                                })`, // Cards 1&2 keep rotateY
                            transformStyle: step.number === 3 ? 'flat' : 'preserve-3d'
                          }}
                        >
                          {/* Conditional Content Based on Flip State */}
                          {!flippedCards[step.number - 1] || step.number !== 3 ? (
                            /* FRONT SIDE - Original Image (or back side for Cards 1&2) */
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
                                
                                {/* Card 2: Always-Pulsing Corner - Shows Opposite Side Colors */}
                                {step.number === 2 && (
                                  <div 
                                    className="absolute bottom-0 right-0 w-6 h-6 z-10"
                                    style={{
                                      clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)',
                                      animation: 'peelFloat 3s ease-in-out infinite alternate, peelGlow 2s ease-in-out infinite',
                                      // Front side: Show orangey colors (back side preview)
                                      background: 'linear-gradient(135deg, #D67C4A 0%, #2A4759 100%)',
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center'
                                    }}
                                  />
                                )}
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
                                  transform: 'rotateY(180deg)', // Counter the card flip to make content readable
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
                                
                                {/* Card 2: Always-Pulsing Corner - Shows Opposite Side Colors */}
                                {step.number === 2 && (
                                  <div 
                                    className="absolute bottom-0 right-0 w-6 h-6 z-10"
                                    style={{
                                      clipPath: 'polygon(100% 0%, 100% 100%, 0% 100%)',
                                      animation: 'peelFloat 3s ease-in-out infinite alternate, peelGlow 2s ease-in-out infinite',
                                      // Back side: Show white/blue colors (front side preview)
                                      background: 'linear-gradient(135deg, #FFFFFF 0%, #89BAD9 100%)',
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      transform: 'rotateY(180deg)' // Counter the parent flip
                                    }}
                                  />
                                )}
                              </div>
                            )
                          ) : (
                            /* Card 3 BACK SIDE - Show the same content as PeelBack but in PeelTop when flipped */
                            <div 
                              className="shadow-lg rounded-2xl overflow-hidden border border-gray-200 h-full"
                              style={{
                                backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                transform: 'rotate(270deg)', // Same fix as PeelBack for Card 3
                                transformOrigin: 'center'
                              }}
                            >
                              <div className="h-full flex flex-col justify-between p-4">
                                {/* Main Content */}
                                <div className="text-center text-white">
                                  <div className="text-sm leading-normal mb-4">
                                    {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                                      <p key={i} className="mb-2">{paragraph}</p>
                                    ))}
                                  </div>
                                  
                                  {/* Separator Line */}
                                  <div className="border-t border-white/40 my-4"></div>
                                  
                                  {/* Sub Description */}
                                  <div className="text-xs text-white leading-relaxed">
                                    {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </PeelTop>
                      
                      <PeelBack>
                        {/* BACK SIDE - Detailed Information (revealed with auto-peel) - Card 3 with counter-rotation for readable text */}
                        <div 
                          className="shadow-lg rounded-2xl overflow-hidden border border-gray-200 h-full"
                          style={{
                            backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            // Card 3: Remove rotation to fix text orientation issues
                            ...(step.number === 3 ? {
                              // No transform for Card 3 - keep text readable
                            } : {
                              transform: 'scaleX(-1)',
                              transformOrigin: 'center'
                            })
                          }}
                        >
                          <div 
                            className="h-full flex flex-col justify-between p-4"
                            style={{
                              // Card 3: No text rotation - let container rotation handle it
                              ...(step.number === 3 ? {
                                // No transform for text, let container handle rotation
                              } : {
                                transform: 'scaleX(-1)',
                                transformOrigin: 'center'
                              })
                            }}
                          >
                            {/* Main Content */}
                            <div className="text-center text-white">
                              <div className="text-sm leading-normal mb-4">
                                {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                                  <p key={i} className="mb-2">{paragraph}</p>
                                ))}
                              </div>
                              
                              {/* Separator Line */}
                              <div className="border-t border-white/40 my-4"></div>
                              
                              {/* Sub Description */}
                              <div className="text-xs text-white leading-relaxed">
                                {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                              </div>
                            </div>
                          </div>
                        </div>
                      </PeelBack>
                    </PeelWrapper>
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