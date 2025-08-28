import { useState, useEffect, useRef } from 'react';
import { PeelWrapper, PeelTop, PeelBack } from 'react-peel';
import { Upload, Edit, Heart } from 'lucide-react';

export default function PeelExperiment() {
  const [peelPositions, setPeelPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [showArrows, setShowArrows] = useState<Record<number, boolean>>({});
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const language = 'fr-FR'; // You can change this for testing

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cardIndex = parseInt(entry.target.getAttribute('data-card-index') || '0');
          
          if (entry.isIntersecting) {
            setTimeout(() => {
              console.log(`🎬 PEEL: Card ${cardIndex + 1} - Simple reveal animation`);
              
              // ALL CARDS 1, 2 & 3: Simple reveal sequence
              console.log(`🎬 PEEL: Card ${cardIndex + 1} - Starting reveal for all cards`);
              
              // Step 1: Reveal
              setPeelPositions(prev => ({ ...prev, [cardIndex]: { x: 120, y: 120 } }));
              
              // Step 2: Return after a short time
              setTimeout(() => {
                setPeelPositions(prev => {
                  const newPos = { ...prev };
                  delete newPos[cardIndex]; // Remove position = return to normal
                  return newPos;
                });
                
                // Step 3: Show arrows (all cards after reveal)
                setShowArrows(prev => ({ ...prev, [cardIndex]: true }));
                
                console.log(`🎬 PEEL: Card ${cardIndex + 1} - Animation complete`);
              }, 1500); // 1.5 second reveal duration
            }, 300);
          } else {
            // When card leaves viewport, reset it to default state
            setPeelPositions(prev => {
              const newPos = { ...prev };
              delete newPos[cardIndex];
              return newPos;
            });
            // Reset arrow state when leaving viewport
            setShowArrows(prev => ({ ...prev, [cardIndex]: false }));
            // Reset flip state to return to front side
            setFlippedCards(prev => ({ ...prev, [cardIndex]: false }));
            
            console.log(`🎬 PEEL: Card ${cardIndex + 1} - Reset to front side when out of view`);
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
      titleFr: "Transmission & Tri",
      titleEn: "You Upload",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Création", 
      titleEn: "We Create",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "Montage & Validation",
      titleEn: "You Enjoy & Share", 
      image: "/images/How_we_work_Step3.png"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Large spacing before */}
      <div className="h-screen"></div>
      <div className="h-screen"></div>
      
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
                    {/* ALL CARDS 1, 2 & 3: Same PeelWrapper structure */}
                    <PeelWrapper
                      className="rounded-2xl overflow-hidden aspect-square"
                      options={{
                        corner: 'top-right',
                        constrainToContainer: true,
                        fadeThreshold: 0.3,
                      }}
                      peelPosition={peelPositions[step.number - 1]}
                    >
                      <PeelTop>
                        <div 
                          className="border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden h-full transition-all duration-700 relative"
                          style={{
                            transformStyle: 'preserve-3d'
                          }}
                        >
                          {
                            !flippedCards[step.number - 1] ? (
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
                                className="h-full flex flex-col cursor-pointer relative card-back-gradient"
                                style={{
                                  transformOrigin: 'center',
                                  backgroundImage: `url(${step.image}), linear-gradient(to bottom right, white, hsl(201 56% 60% / 0.1))`,
                                  backgroundSize: 'contain, cover',
                                  backgroundPosition: 'center, center',
                                  backgroundRepeat: 'no-repeat, no-repeat'
                                }}
                              >
                                <div className="text-center flex flex-col p-4" style={{ height: '100%', position: 'relative' }}>
                                  <div className="text-sm leading-normal text-memopyk-navy w-full" style={{ height: '66%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    {step.number === 1 && language === 'fr-FR' && (
                                      <>
                                        <p className="mb-3">Envoyez-nous toutes vos photos et vidéos, même par milliers.</p>
                                        <p className="mb-3">Nous trions, sélectionnons et gardons uniquement les plus belles, selon ce que vous souhaitez partager via notre formulaire ou un appel téléphonique gratuit.</p>
                                      </>
                                    )}
                                    {step.number === 1 && language === 'en-US' && (
                                      <>
                                        <p className="mb-3">Simply send us your photos and videos—no need to organize or edit anything beforehand.</p>
                                        <p className="mb-3">Share your vision and what matters most to you, either by filling out our easy online form or by discussing your ideas with us during a free, friendly phone call.</p>
                                      </>
                                    )}
                                    {step.number === 2 && language === 'fr-FR' && (
                                      <>
                                        <p className="mb-3">Nous construisons le scénario à partir des meilleures images, avec la musique, le rythme et le format qui vous correspondent.</p>
                                        <p className="mb-3">Vous recevez un devis clair et adapté avant tout travail.</p>
                                      </>
                                    )}
                                    {step.number === 2 && language === 'en-US' && (
                                      <>
                                        <p className="mb-3">We carefully review every detail and handpick the most beautiful scenes to craft a unique, engaging story that fits your preferences, including perfect music, optimal timing, and the best format for your needs.</p>
                                        <p className="mb-3">You'll receive a clear, custom quote before we begin, so there are no surprises.</p>
                                      </>
                                    )}
                                    {step.number === 3 && language === 'fr-FR' && (
                                      <>
                                        <p className="mb-3">Vous recevez la première version de votre film-souvenir en une à trois semaines, prête à être revue.</p>
                                        <p className="mb-3">Deux séries de retours sont incluses pour affiner le montage jusqu'à votre entière satisfaction.</p>
                                      </>
                                    )}
                                    {step.number === 3 && language === 'en-US' && (
                                      <>
                                        <p className="mb-3">You'll receive the first version of your personalized souvenir film within one to three weeks, carefully edited and ready to impress.</p>
                                        <p className="mb-3">Our process includes two full rounds of feedback, making it easy to fine-tune your movie until it's exactly right.</p>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Separator Line - Fixed at 2/3 Position */}
                                  <div className="border-t border-memopyk-navy/40 mx-6" style={{ position: 'absolute', top: '66%', left: '0', right: '0' }}></div>
                                  
                                  {/* Bottom Section - Bold Text Same Size */}
                                  <div className="text-center" style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                                    <div className="text-sm text-memopyk-navy leading-relaxed font-bold">
                                      {step.number === 1 && language === 'fr-FR' && (
                                        <>
                                          <p className="mb-2">Libérez-vous de la sélection : nous trouvons les moments forts pour créer votre histoire.</p>
                                        </>
                                      )}
                                      {step.number === 1 && language === 'en-US' && (
                                        <>
                                          <p className="mb-2">Getting started is effortless: just bring us your memories and ideas, and we'll handle everything else with care and creativity.</p>
                                        </>
                                      )}
                                      {step.number === 2 && language === 'fr-FR' && (
                                        <>
                                          <p className="mb-2">Vos souvenirs prennent vie dans un film unique, réalisé avec soin et transparence.</p>
                                        </>
                                      )}
                                      {step.number === 2 && language === 'en-US' && (
                                        <>
                                          <p className="mb-2">Your memories become a one-of-a-kind film, created with meticulous attention to detail and total transparency at every step.</p>
                                        </>
                                      )}
                                      {step.number === 3 && language === 'fr-FR' && (
                                        <>
                                          <p className="mb-2">Un souvenir unique, livré rapidement et parfaitement ajusté à vos envies.</p>
                                        </>
                                      )}
                                      {step.number === 3 && language === 'en-US' && (
                                        <>
                                          <p className="mb-2">The result is a keepsake entirely your own, delivered quickly and refined with your input until it's just perfect.</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                        </div>
                      </PeelTop>
                      
                      <PeelBack>
                        {/* All Cards 1, 2 & 3: Full back side content */}
                          <div 
                            className="shadow-lg rounded-2xl overflow-hidden border border-gray-200 h-full card-back-gradient"
                            style={{
                              backgroundImage: `url(${step.image}), linear-gradient(to bottom right, white, hsl(201 56% 60% / 0.1))`,
                              backgroundSize: 'contain, cover',
                              backgroundPosition: 'center, center',
                              backgroundRepeat: 'no-repeat, no-repeat'
                            }}
                          >
                            <div 
                              className="h-full flex flex-col justify-between p-4"
                              style={{
                                transform: 'rotate(270deg)'
                              }}
                            >
                              <div className="text-center text-memopyk-navy" style={{ height: '100%', position: 'relative' }}>
                                <div className="text-sm leading-normal" style={{ height: '66%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  {step.number === 1 && language === 'fr-FR' && (
                                    <>
                                      <p className="mb-3">Envoyez-nous toutes vos photos et vidéos, même par milliers.</p>
                                      <p className="mb-3">Nous trions, sélectionnons et gardons uniquement les plus belles, selon ce que vous souhaitez partager via notre formulaire ou un appel téléphonique gratuit.</p>
                                    </>
                                  )}
                                  {step.number === 1 && language === 'en-US' && (
                                    <>
                                      <p className="mb-3">Simply send us your photos and videos—no need to organize or edit anything beforehand.</p>
                                      <p className="mb-3">Share your vision and what matters most to you, either by filling out our easy online form or by discussing your ideas with us during a free, friendly phone call.</p>
                                    </>
                                  )}
                                  {step.number === 2 && language === 'fr-FR' && (
                                    <>
                                      <p className="mb-3">Nous construisons le scénario à partir des meilleures images, avec la musique, le rythme et le format qui vous correspondent.</p>
                                      <p className="mb-3">Vous recevez un devis clair et adapté avant tout travail.</p>
                                    </>
                                  )}
                                  {step.number === 2 && language === 'en-US' && (
                                    <>
                                      <p className="mb-3">We carefully review every detail and handpick the most beautiful scenes to craft a unique, engaging story that fits your preferences, including perfect music, optimal timing, and the best format for your needs.</p>
                                      <p className="mb-3">You'll receive a clear, custom quote before we begin, so there are no surprises.</p>
                                    </>
                                  )}
                                  {step.number === 3 && language === 'fr-FR' && (
                                    <>
                                      <p className="mb-3">Vous recevez la première version de votre film-souvenir en une à trois semaines, prête à être revue.</p>
                                      <p className="mb-3">Deux séries de retours sont incluses pour affiner le montage jusqu'à votre entière satisfaction.</p>
                                    </>
                                  )}
                                  {step.number === 3 && language === 'en-US' && (
                                    <>
                                      <p className="mb-3">You'll receive the first version of your personalized souvenir film within one to three weeks, carefully edited and ready to impress.</p>
                                      <p className="mb-3">Our process includes two full rounds of feedback, making it easy to fine-tune your movie until it's exactly right.</p>
                                    </>
                                  )}
                                </div>
                                
                                <div className="border-t border-memopyk-navy/40 mx-6" style={{ position: 'absolute', top: '66%', left: '0', right: '0' }}></div>
                                
                                <div className="text-sm text-memopyk-navy leading-relaxed font-bold" style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                                  {step.number === 1 && language === 'fr-FR' && (
                                    <>
                                      <p className="mb-2">Libérez-vous de la sélection : nous trouvons les moments forts pour créer votre histoire.</p>
                                    </>
                                  )}
                                  {step.number === 1 && language === 'en-US' && (
                                    <>
                                      <p className="mb-2">Getting started is effortless: just bring us your memories and ideas, and we'll handle everything else with care and creativity.</p>
                                    </>
                                  )}
                                  {step.number === 2 && language === 'fr-FR' && (
                                    <>
                                      <p className="mb-2">Vos souvenirs prennent vie dans un film unique, réalisé avec soin et transparence.</p>
                                    </>
                                  )}
                                  {step.number === 2 && language === 'en-US' && (
                                    <>
                                      <p className="mb-2">Your memories become a one-of-a-kind film, created with meticulous attention to detail and total transparency at every step.</p>
                                    </>
                                  )}
                                  {step.number === 3 && language === 'fr-FR' && (
                                    <>
                                      <p className="mb-2">Un souvenir unique, livré rapidement et parfaitement ajusté à vos envies.</p>
                                    </>
                                  )}
                                  {step.number === 3 && language === 'en-US' && (
                                    <>
                                      <p className="mb-2">The result is a keepsake entirely your own, delivered quickly and refined with your input until it's just perfect.</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </PeelBack>
                      </PeelWrapper>
                    
                    {/* Orange Arrow Indicator - Cards 1, 2 & 3 */}
                    {showArrows[step.number - 1] && (
                      <div className="absolute bottom-0 right-0 pointer-events-none z-50">
                        {/* All Cards 1, 2 & 3: Triangle corner with unfold reveal */}
                        <div className="relative">
                          <div 
                            className={`w-0 h-0 border-l-[40px] border-b-[40px] border-l-transparent ${
                              flippedCards[step.number - 1] ? 'border-b-white' : 'border-b-memopyk-orange'
                            }`}
                            style={{
                              position: 'relative',
                              bottom: '1px',
                              borderBottomRightRadius: '16px'
                            }}
                          />
                          {/* Dotted diagonal line along the hypotenuse */}
                          <div 
                            className="absolute"
                            style={{
                              top: '2px',
                              right: '2px',
                              width: '48px',
                              height: '2px',
                              background: flippedCards[step.number - 1] 
                                ? 'repeating-linear-gradient(45deg, #D67C4A 0px, #D67C4A 2px, white 2px, white 4px)'
                                : 'repeating-linear-gradient(45deg, white 0px, white 2px, #D67C4A 2px, #D67C4A 4px)',
                              transform: 'rotate(-45deg)',
                              transformOrigin: 'top right',
                              opacity: 0.9
                            }}
                          />
                          <div 
                            className="absolute bottom-0 right-0"
                            style={{
                              animation: 'arrowRiseAndGrow 2s ease-in-out infinite',
                              transform: 'translate(2px, 2px)'
                            }}
                          >
                            <svg 
                              width="18" 
                              height="18" 
                              viewBox="0 0 16 16" 
                              fill={flippedCards[step.number - 1] ? '#D67C4A' : 'white'}
                              style={{
                                filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
                              }}
                            >
                              {/* Arrow pointing to top-left */}
                              <path d="M4 4 L4 9 L6 7 L10 11 L12 9 L8 5 L10 4 Z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    
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
      
      {/* Large spacing after */}
      <div className="h-screen"></div>
      <div className="h-screen"></div>
      <div className="h-screen"></div>
    </div>
  );
}