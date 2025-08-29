import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import RoundedPeelCorner from '@/components/ui/RoundedPeelCorner';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [card2InitialReveal, setCard2InitialReveal] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Auto-reveal and reset when section visibility changes
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Card 2: Start big reveal sequence when section comes into view
            if (!card2InitialReveal) {
              setTimeout(() => {
                setCard2InitialReveal(true);
                // Return to small corner after 1 second
                setTimeout(() => {
                  setCard2InitialReveal(false);
                }, 1000);
              }, 600); // Delay for Card 2
            }
          } else {
            // Reset everything when section is not visible
            setFlippedCards(new Set());
            setCard2InitialReveal(false);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [card2InitialReveal]);
  
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
                    <div className="card-front bg-white border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden relative" style={{ position: 'relative', zIndex: 0, isolation: 'isolate' }}>
                      {/* Orange peel corner with interactive icon */}
                      <div 
                        className="absolute bottom-0 right-0 pointer-events-none"
                        style={{
                          width: '60px',
                          height: '60px',
                          background: 'linear-gradient(135deg, #D67C4A 0%, #c2693c 100%)',
                          clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)',
                          borderRadius: '0 0 1rem 0',
                          boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.1)',
                          zIndex: 10
                        }}
                      ></div>
                      
                      {/* Flip icon with pulse animation - positioned ABOVE the triangle */}
                      <div 
                        className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center animate-pulse pointer-events-none"
                        style={{
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: '50%',
                          zIndex: 20
                        }}
                      >
                        <Info 
                          size={18} 
                          className="text-white drop-shadow-lg" 
                          strokeWidth={3}
                        />
                      </div>
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
                        
                        {/* Title inside card - white area below image */}
                        <div className="p-4 text-center">
                          <h3 className="text-xl font-semibold text-memopyk-dark-blue">
                            {language === 'fr-FR' ? step.titleFr : step.titleEn}
                          </h3>
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
                        className="h-full flex flex-col cursor-pointer relative px-2 pt-0 pb-2"
                        onClick={() => {
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(step.number);
                            return newSet;
                          });
                        }}
                      >
                        
                        {/* Top Section - Text content area */}
                        <div className="text-center flex flex-col" style={{ height: '350px', position: 'relative' }}>
                          <div className="text-sm leading-normal text-white w-full flip-card-text-zero-spacing">
                            {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                              <p key={i} className="m-0 p-0">{paragraph}</p>
                            ))}
                          </div>
                          
                          {/* Separator Line - EXACTLY 250px FROM TOP */}
                          <div
                            className="absolute border-t border-white/40 left-2"
                            style={{
                              top: '246px',
                              right: "calc(0.5rem + var(--peel-c, 0px))",
                              zIndex: 1,
                            }}
                          ></div>
                          
                          {/* Bottom Section - Sub Description - EXACTLY 260px FROM TOP */}
                          <div className="absolute text-center left-2 right-2" style={{ top: '256px' }}>
                            <div className="text-xs text-white leading-relaxed w-full">
                              {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                            </div>
                          </div>
                        </div>
                        
                        {/* Return arrow - Positioned with equal spacing */}
                        <div className="absolute -bottom-6 -left-6">
                          <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                            <svg className="w-5 h-5 text-memopyk-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}