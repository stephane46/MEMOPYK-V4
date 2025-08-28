import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Info } from 'lucide-react';
import { PeelWrapper, PeelTop, PeelBack } from 'react-peel';

export function PeelExperiment() {
  const { language } = useLanguage();
  const [peelPositions, setPeelPositions] = useState<{[key: number]: {x: number, y: number}}>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cardIndex = parseInt(entry.target.getAttribute('data-card-index') || '0');
          
          if (entry.isIntersecting) {
            // Trigger one-third reveal animation after a short delay
            setTimeout(() => {
              console.log('🎬 PEEL: Large reveal triggered for card', cardIndex);
              // Set peel position to reveal approximately one-third from bottom-right
              setPeelPositions(prev => ({
                ...prev,
                [cardIndex]: { x: 0.65, y: 0.65 } // This reveals about one-third
              }));
              
              // Auto-hide after showing for 2 seconds, but leave a small corner
              setTimeout(() => {
                console.log('🎬 PEEL: Peeling back down (removing peel)');
                // First remove the peel completely
                setPeelPositions(prev => {
                  const newPos = { ...prev };
                  delete newPos[cardIndex];
                  return newPos;
                });
                
                // Then after a brief pause, add the small corner
                setTimeout(() => {
                  // NOW I understand! peelPosition is the CORNER POSITION, not reveal size
                  // Values close to 1,1 = bottom-right corner (small dog-ear)
                  // Values like 0.5,0.5 = center (large reveal)
                  const experimentalPositions = [
                    { x: 0.85, y: 0.85 },  // Card 0: Close to bottom-right corner = small dog-ear
                    { x: 0.92, y: 0.92 },  // Card 1: Very close to corner = tiny dog-ear
                    { x: 0.96, y: 0.96 }   // Card 2: Almost at corner = minimal dog-ear
                  ];
                  
                  const position = experimentalPositions[cardIndex] || { x: 0.98, y: 0.98 };
                  console.log(`🎬 PEEL: Setting CORNER POSITION for card ${cardIndex}:`, position, '(close to bottom-right = small dog-ear)');
                  
                  setPeelPositions(prev => {
                    const newState = {
                      ...prev,
                      [cardIndex]: position
                    };
                    console.log(`🎬 PEEL: Corner position set for card ${cardIndex}:`, newState);
                    return newState;
                  });
                }, 200);
              }, 2000);
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
                  {/* Auto-Reveal Peel Card Container */}
                  <div className="mb-4">
                    <PeelWrapper
                      corner="BOTTOM_RIGHT"
                      peelPosition={peelPositions[step.number - 1] || undefined}
                      drag={false}
                      options={{
                        corner: "BOTTOM_RIGHT",
                        backShadow: true,
                        bottomShadow: true,
                        topShadow: true
                      }}
                      className="rounded-2xl overflow-hidden aspect-square"
                      height="100%"
                      width="100%"
                    >
                      <PeelTop>
                        {/* FRONT SIDE - Step Card */}
                        <div className="bg-white border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden h-full">
                          {/* Step Image */}
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
                            
                            {/* Info Button - Bottom Center */}
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
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
                      </PeelTop>
                      
                      <PeelBack>
                        {/* BACK SIDE - Detailed Information (revealed with auto-peel) */}
                        <div 
                          className="shadow-lg rounded-2xl overflow-hidden border border-gray-200 h-full"
                          style={{
                            backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            transform: 'scaleX(-1)', // Flip horizontally to counter the peel effect rotation
                            transformOrigin: 'center'
                          }}
                        >
                          <div 
                            className="h-full flex flex-col justify-between p-4"
                            style={{
                              transform: 'scaleX(-1)', // Double flip to make text readable again
                              transformOrigin: 'center'
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