import { useState, useEffect, useRef } from 'react';
import { PeelWrapper, PeelTop, PeelBack } from 'react-peel';
import { Upload, Edit, Heart } from 'lucide-react';

export default function PeelExperiment() {
  const [peelPositions, setPeelPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [showArrows, setShowArrows] = useState<Record<number, boolean>>({});
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [card3Revealed, setCard3Revealed] = useState(false);
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
              
              // Card 3: Smaller persistent reveal, Cards 1 & 2: Normal reveal sequence
              if (cardIndex === 2) {
                // Card 3: Smaller reveal (1/3 size) that persists
                console.log(`🎬 PEEL: Card 3 - Starting smaller persistent reveal`);
                setPeelPositions(prev => ({ ...prev, [cardIndex]: { x: 25, y: 25 } }));
                setCard3Revealed(true);
                console.log(`🎬 PEEL: Card 3 - Persistent reveal complete`);
              } else {
                // Cards 1 & 2: Normal reveal sequence
                console.log(`🎬 PEEL: Card ${cardIndex + 1} - Starting reveal`);
                
                // Step 1: Reveal
                setPeelPositions(prev => ({ ...prev, [cardIndex]: { x: 120, y: 120 } }));
                
                // Step 2: Return after a short time
                setTimeout(() => {
                  setPeelPositions(prev => {
                    const newPos = { ...prev };
                    delete newPos[cardIndex]; // Remove position = return to normal
                    return newPos;
                  });
                  
                  // Step 3: Show arrows (Cards 1 & 2 after reveal)
                  setShowArrows(prev => ({ ...prev, [cardIndex]: true }));
                  
                  console.log(`🎬 PEEL: Card ${cardIndex + 1} - Animation complete`);
                }, 1500); // 1.5 second reveal duration
              }
            }, 300);
          } else {
            // When card leaves viewport, reset it to default state (except Card 3 persistence)
            if (cardIndex !== 2) {
              setPeelPositions(prev => {
                const newPos = { ...prev };
                delete newPos[cardIndex];
                return newPos;
              });
              // Reset arrow state when leaving viewport
              setShowArrows(prev => ({ ...prev, [cardIndex]: false }));
            }
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
      titleFr: "Transmission & Collecte",
      titleEn: "You Upload",
      image: "/images/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Analyse", 
      titleEn: "We Create",
      image: "/images/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "Montage & Création",
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
                    {/* Card 1 & 2: Regular cards (no peel), Card 3: PeelWrapper */}
                    {step.number === 1 || step.number === 2 ? (
                      /* Cards 1 & 2: Simple cards with no reveal effect */
                      <div className="rounded-2xl overflow-hidden aspect-square">
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
                                className="h-full flex flex-col cursor-pointer relative"
                                style={{
                                  transformOrigin: 'center',
                                  backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat'
                                }}
                              >
                                <div className="text-center flex flex-col p-4" style={{ height: '100%', position: 'relative' }}>
                                  <div className="text-sm leading-normal text-white w-full" style={{ height: '66%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    {step.number === 1 && language === 'fr-FR' && (
                                      <>
                                        <p className="mb-3">Envoyez-nous vos photos et vidéos telles quelles</p>
                                        <p className="mb-3">Dites-nous tout ce que vous avez en tête, via notre questionnaire, ou la séance de consultation gratuite</p>
                                      </>
                                    )}
                                    {step.number === 1 && language === 'en-US' && (
                                      <>
                                        <p className="mb-3">Send us all your photos and videos, even thousands of them.</p>
                                        <p className="mb-3">We sort, select, and keep only the most beautiful ones, according to what you want to share through our form or a free phone call.</p>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Separator Line - Fixed at 2/3 Position */}
                                  <div className="border-t border-memopyk-navy/40 mx-6" style={{ position: 'absolute', top: '66%', left: '0', right: '0' }}></div>
                                  
                                  {/* Bottom Section - Bold Text Same Size */}
                                  <div className="text-center" style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                                    <div className="text-sm text-white leading-relaxed font-bold">
                                      {step.number === 1 && language === 'fr-FR' && (
                                        <>
                                          <p className="mb-2">Le transfert des éléments se fait en quelques clics. Nous sommes à votre écoute pour bien comprendre votre vision.</p>
                                        </>
                                      )}
                                      {step.number === 1 && language === 'en-US' && (
                                        <>
                                          <p className="mb-2">Getting started is effortless: just bring us your memories and ideas, and we'll handle everything else with care and creativity.</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                        </div>
                      </div>
                    ) : (
                      /* Card 3: Keep PeelWrapper */
                      <PeelWrapper
                        className="rounded-2xl overflow-hidden aspect-square"
                        options={{
                          corner: 'top-right',
                          constrainToContainer: true,
                          fadeThreshold: 0.3,
                        }}
                        peelPosition={step.number === 3 && card3Revealed ? { x: 25, y: 25 } : peelPositions[step.number - 1]}
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
                                className="h-full flex flex-col cursor-pointer relative"
                                style={{
                                  transformOrigin: 'center',
                                  backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat'
                                }}
                              >
                                <div className="text-center flex flex-col p-4" style={{ height: '100%', position: 'relative' }}>
                                  <div className="text-sm leading-normal text-white w-full" style={{ height: '66%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    {step.number === 1 && language === 'fr-FR' && (
                                      <>
                                        <p className="mb-3">Envoyez-nous vos photos et vidéos telles quelles</p>
                                        <p className="mb-3">Dites-nous tout ce que vous avez en tête, via notre questionnaire, ou la séance de consultation gratuite</p>
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
                                        <p className="mb-3">Nous trions, sélectionnons et gardons uniquement le meilleur. Nous construisons le scénario avec la musique, le rythme et le format qui vous correspondent.</p>
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
                                    <div className="text-sm text-white leading-relaxed font-bold">
                                      {step.number === 1 && language === 'fr-FR' && (
                                        <>
                                          <p className="mb-2">Le transfert des éléments se fait en quelques clics. Nous sommes à votre écoute pour bien comprendre votre vision.</p>
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
                                          <p className="mb-2">Un film souvenir unique, livré à temps et parfaitement ajusté à vos envies.</p>
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
                            className="shadow-lg rounded-2xl overflow-hidden border border-gray-200 h-full"
                            style={{
                              backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat'
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
                    )}
                    
                    {/* Card 1: Custom large triangle corner peel (no arrow) - Always visible */}
                    {step.number === 1 && (
                      <div className="absolute bottom-0 right-0 pointer-events-none z-50">
                        <div className="relative">
                          {/* Large 60x60 triangle with gradient background and realistic paper curl */}
                          <div 
                            className="w-[60px] h-[60px] absolute bottom-0 right-0 overflow-hidden"
                            style={{
                              backgroundColor: '#F2EBDC', // Beige background where paper was removed
                            }}
                          >
                            <div
                              className="w-full h-full"
                              style={{
                                background: flippedCards[step.number - 1] 
                                  ? 'white' 
                                  : 'linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%)',
                                clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
                                borderRadius: '0 0 0 16px', // Round the tip corner
                                filter: 'drop-shadow(-2px -2px 6px rgba(0,0,0,0.2)) drop-shadow(2px 2px 8px rgba(0,0,0,0.1))',
                                transform: 'translateZ(4px) rotateX(-5deg) rotateY(5deg) translateY(-2px)',
                                transformStyle: 'preserve-3d',
                                transformOrigin: 'bottom right',
                              }}
                            />
                            {/* Diagonal shadow edge for realistic paper curl effect */}
                            <div 
                              className="absolute z-10"
                              style={{
                                bottom: '0px',
                                left: '0px',
                                width: '86px', // √(60² + 60²) diagonal length
                                height: '4px',
                                background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                                transform: 'rotate(135deg)',
                                transformOrigin: 'bottom left',
                                opacity: flippedCards[step.number - 1] ? 0.8 : 0.6,
                              }}
                            />
                          </div>
                          {/* Arrow for Card 1 - Same as Cards 2 & 3 */}
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

                    {/* Card 2: Same design as Card 1 (60x60 gradient triangle, always visible) */}
                    {step.number === 2 && (
                      <div className="absolute bottom-0 right-0 pointer-events-none z-50">
                        <div className="relative">
                          {/* Large 60x60 triangle with gradient background and realistic paper curl */}
                          <div 
                            className="w-[60px] h-[60px] absolute bottom-0 right-0 overflow-hidden"
                            style={{
                              backgroundColor: '#F2EBDC', // Beige background where paper was removed
                            }}
                          >
                            <div
                              className="w-full h-full"
                              style={{
                                background: flippedCards[step.number - 1] 
                                  ? 'white' 
                                  : 'linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%)',
                                clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
                                borderRadius: '0 0 0 16px', // Round the tip corner
                                filter: 'drop-shadow(-2px -2px 6px rgba(0,0,0,0.2)) drop-shadow(2px 2px 8px rgba(0,0,0,0.1))',
                                transform: 'translateZ(4px) rotateX(-5deg) rotateY(5deg) translateY(-2px)',
                                transformStyle: 'preserve-3d',
                                transformOrigin: 'bottom right',
                              }}
                            />
                            {/* Diagonal shadow edge for realistic paper curl effect */}
                            <div 
                              className="absolute z-10"
                              style={{
                                bottom: '0px',
                                left: '0px',
                                width: '86px', // √(60² + 60²) diagonal length
                                height: '4px',
                                background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                                transform: 'rotate(135deg)',
                                transformOrigin: 'bottom left',
                                opacity: flippedCards[step.number - 1] ? 0.8 : 0.6,
                              }}
                            />
                          </div>
                          {/* Arrow for Card 2 - Same as Card 1 */}
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