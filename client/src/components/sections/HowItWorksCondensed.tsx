import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hasAnimated, setHasAnimated] = useState<Set<number>>(new Set());
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Design token for back face background (single source of truth)
  const backFaceGradient =
    'linear-gradient(135deg, rgba(214, 124, 74, 0.95) 0%, rgba(42, 71, 89, 0.95) 100%)';

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
                    setHasAnimated((prev) => new Set(prev).add(step.number));
                  }, 200);
                }, index * 150);
              }
            });
          }
        });
      },
      {
        threshold: [0.5, 0.7],
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [hasAnimated]);

  // Enhanced tap detection with debouncing
  const handleCardClick = (
    cardNumber: number,
    event?: React.PointerEvent | React.KeyboardEvent
  ) => {
    if (animatingCards.has(cardNumber)) return;

    // For pointer events, validate it's a tap (not scroll)
    if (event && 'pointerId' in event) {
      const pe = event as React.PointerEvent;
      if (Math.abs(pe.movementX) > 8 || Math.abs(pe.movementY) > 8) return;
    }

    // Lock during animation
    setAnimatingCards((prev) => new Set([...prev, cardNumber]));

    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardNumber)) next.delete(cardNumber);
      else next.add(cardNumber);
      return next;
    });

    // Cooldown (also cleared on animationComplete)
    setTimeout(() => {
      setAnimatingCards((prev) => {
        const next = new Set(prev);
        next.delete(cardNumber);
        return next;
      });
    }, 450);
  };

  // Keyboard handler
  const handleKeyDown = (cardNumber: number, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick(cardNumber, event);
    } else if (event.key === 'Escape' && flippedCards.has(cardNumber)) {
      event.preventDefault();
      handleCardClick(cardNumber, event);
    }
  };

  // ---- Folded-corner system (unchanged logic, but used inside the front face) ----
  const MotionCornerSystem = ({
    cardNumber,
    isHovered,
    isFlipped,
    backFaceGradient,
    shouldReduceMotion,
  }: {
    cardNumber: number;
    isHovered: boolean;
    isFlipped: boolean;
    backFaceGradient: string;
    shouldReduceMotion: boolean | null;
  }) => {
    const peekVariants = {
      idle: { scale: 1, opacity: 0.8 },
      hovered: {
        scale: shouldReduceMotion ? 1 : 1.15,
        opacity: 0.9,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      },
    };

    const cornerVariants = {
      idle: {
        rotate: 0,
        x: 0,
        y: 0,
        filter: 'drop-shadow(-1px -1px 2px rgba(0,0,0,0.15))',
      },
      hovered: shouldReduceMotion
        ? {
            rotate: 0,
            x: 0,
            y: 0,
            filter: 'drop-shadow(-1px -1px 2px rgba(0,0,0,0.15))',
          }
        : {
            rotate: 4,
            x: -3,
            y: -2,
            filter:
              'drop-shadow(-2px -2px 4px rgba(0,0,0,0.3)) drop-shadow(-1px -1px 2px rgba(0,0,0,0.15))',
            transition: { type: 'spring', stiffness: 300, damping: 25 },
          },
      nudge: shouldReduceMotion
        ? {
            rotate: 0,
            x: 0,
            y: 0,
            filter: 'drop-shadow(-1px -1px 2px rgba(0,0,0,0.15))',
          }
        : {
            rotate: 6,
            x: -4,
            y: -3,
            filter:
              'drop-shadow(-3px -3px 6px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 2px rgba(0,0,0,0.2))',
            transition: { type: 'spring', stiffness: 250, damping: 20, duration: 0.2 },
          },
    };

    const currentVariant =
      hasAnimated.has(cardNumber) && !isFlipped
        ? isHovered
          ? 'hovered'
          : 'idle'
        : !hasAnimated.has(cardNumber) && isHovered
        ? 'nudge'
        : 'idle';

    return (
      <div className="absolute bottom-0 right-0 pointer-events-none" style={{ overflow: 'visible' }}>
        {/* BackPeek - always visible slip */}
        <motion.div
          className="absolute bottom-0 right-0"
          style={{
            width: '14px',
            height: '14px',
            background: backFaceGradient,
            clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
            zIndex: 1,
          }}
          variants={peekVariants}
          animate={isHovered ? 'hovered' : 'idle'}
        >
          <div
            className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-medium opacity-60"
            style={{ filter: 'blur(0.5px)', transform: 'rotate(-45deg)' }}
          >
            ...
          </div>
        </motion.div>

        {/* CornerPeel - the lifting corner */}
        <motion.div
          className="absolute bottom-0 right-0"
          style={{
            width: 0,
            height: 0,
            borderLeft: '16px solid transparent',
            borderBottom: '16px solid white',
            transformOrigin: 'bottom right',
            background:
              'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(250,250,250,1) 100%)',
            zIndex: 3,
            willChange: isHovered ? 'transform, filter' : 'auto',
          }}
          variants={cornerVariants}
          animate={currentVariant}
        />

        {/* Highlight line along fold axis */}
        <motion.div
          className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, transparent 47%, rgba(255,255,255,0.6) 49%, rgba(255,255,255,0.2) 51%, transparent 53%)',
            zIndex: 2,
          }}
          animate={{ opacity: isHovered ? 0.8 : 0.4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </div>
    );
  };

  // ---- Framer Motion Card Flip (rewired): single rotating inner wrapper ----
  const MotionFlipCard = ({
    step,
    isFlipped,
    isHovered,
    onCardClick,
    onKeyDown,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  }: {
    step: any;
    isFlipped: boolean;
    isHovered: boolean;
    onCardClick: (e: React.PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  }) => {
    const cardState = isFlipped ? 'back' : 'front';

    const cardVariants = {
      front: {
        rotateY: 0,
        transition: {
          type: shouldReduceMotion ? 'tween' : 'spring',
          stiffness: shouldReduceMotion ? undefined : 260,
          damping: shouldReduceMotion ? undefined : 20,
          duration: shouldReduceMotion ? 0.3 : undefined,
          ease: shouldReduceMotion ? 'easeInOut' : undefined,
        },
      },
      back: {
        rotateY: shouldReduceMotion ? 0 : 180,
        transition: {
          type: shouldReduceMotion ? 'tween' : 'spring',
          stiffness: shouldReduceMotion ? undefined : 260,
          damping: shouldReduceMotion ? undefined : 20,
          duration: shouldReduceMotion ? 0.3 : undefined,
          ease: shouldReduceMotion ? 'easeInOut' : undefined,
        },
      },
    };

    return (
      <div className="text-center group">
        {/* Interactive wrapper (button semantics live here) */}
        <div
          className="relative rounded-2xl mb-4 cursor-pointer outline-none"
          role="button"
          tabIndex={0}
          aria-expanded={isFlipped}
          aria-label={`${
            language === 'fr-FR' ? step.titleFr : step.titleEn
          } - ${language === 'fr-FR' ? "Cliquer pour plus d'informations" : 'Click for more information'}`}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={onCardClick}
          onKeyDown={onKeyDown}
          style={{ perspective: shouldReduceMotion ? 'none' : '1000px' }}
        >
          {/* Fixed-size frame to keep both faces identical (no more size jumps) */}
          <div className="relative w-full aspect-square rounded-2xl">
            {/* Rotating inner wrapper (the only thing that rotates) */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                transformStyle: shouldReduceMotion ? 'flat' : 'preserve-3d',
                willChange: 'transform',
              }}
              variants={cardVariants}
              animate={cardState}
              onAnimationComplete={() => {
                if (animatingCards.has(step.number)) {
                  setAnimatingCards((prev) => {
                    const next = new Set(prev);
                    next.delete(step.number);
                    return next;
                  });
                }
              }}
            >
              {/* FRONT FACE */}
              <div
                className="absolute inset-0 bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden"
                style={{
                  backfaceVisibility: shouldReduceMotion ? 'visible' : 'hidden',
                  transform: 'rotateY(0deg) translateZ(0)',
                  zIndex: isFlipped ? 1 : 2,
                  pointerEvents: isFlipped ? 'none' : 'auto',
                }}
              >
                <div className="relative h-full w-full">
                  {/* Step Image */}
                  <div className="relative overflow-visible rounded-xl transition-all duration-500 h-full w-full">
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

                  {/* Folded corner only on front & only when not flipped */}
                  {!isFlipped && (
                    <MotionCornerSystem
                      cardNumber={step.number}
                      isHovered={isHovered}
                      isFlipped={isFlipped}
                      backFaceGradient={backFaceGradient}
                      shouldReduceMotion={shouldReduceMotion}
                    />
                  )}
                </div>
              </div>

              {/* BACK FACE */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-memopyk-orange/95 to-memopyk-dark-blue/95 text-white"
                style={{
                  backfaceVisibility: shouldReduceMotion ? 'visible' : 'hidden',
                  transform: 'rotateY(180deg) translateZ(0)',
                  zIndex: isFlipped ? 2 : 1,
                  pointerEvents: isFlipped ? 'auto' : 'none',
                }}
              >
                <div className="p-6 h-full w-full flex flex-col">
                  {/* Header with close button */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">{step.number}</span>
                      </div>
                      <h3 className="text-lg font-bold">
                        {language === 'fr-FR' ? step.titleFr : step.titleEn}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardClick(e as unknown as React.PointerEvent<HTMLDivElement>);
                      }}
                      className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                      aria-label={language === 'fr-FR' ? 'Fermer' : 'Close'}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>

                  {/* Scrollable content area to avoid size jumps */}
                  <div className="flex-1 overflow-auto">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {language === 'fr-FR' ? step.descriptionFr : step.descriptionEn}
                    </p>
                    {(step.subDescriptionFr || step.subDescriptionEn) && (
                      <p className="text-sm leading-relaxed mt-3 opacity-90 whitespace-pre-line">
                        {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                      </p>
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="text-xs text-white/60 text-center mt-4 border-t border-white/20 pt-3">
                    {language === 'fr-FR' ? 'Cliquer pour revenir' : 'Click to go back'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Title and Icon below card */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-memopyk-orange/10 rounded-full flex items-center justify-center group-hover:bg-memopyk-orange/20 transition-colors duration-300">
            <step.icon className="w-6 h-6 text-memopyk-orange" />
          </div>
          <h3 className="text-xl font-bold text-memopyk-dark-blue">
            {language === 'fr-FR' ? step.titleFr : step.titleEn}
          </h3>
        </div>
      </div>
    );
  };

  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: 'Nous écoutons et rassemblons',
      titleEn: 'We Listen & Gather',
      descriptionFr:
        "Envoyez-nous simplement vos photos et vidéos, sans avoir à les trier ou les retoucher. Faites-nous part de votre vision et de ce qui compte le plus pour vous, soit en remplissant notre formulaire en ligne, soit en échangeant vos idées avec nous lors d'un appel téléphonique gratuit et convivial.",
      descriptionEn:
        "Simply send us your photos and videos—no need to organize or edit anything beforehand. Share your vision and what matters most to you, either by filling out our easy online form or by discussing your ideas with us during a free, friendly phone call.",
      subDescriptionFr:
        "Commencer est un jeu d'enfant : apportez-nous simplement vos souvenirs et vos envies, nous nous occupons du reste avec soin et créativité.",
      subDescriptionEn:
        "Getting started is effortless: just bring us your memories and ideas, and we'll handle everything else with care and creativity.",
      image: '/images/How_we_work_Step1.png',
    },
    {
      number: 2,
      icon: Edit,
      titleFr: 'Nous analysons',
      titleEn: 'We Analyze',
      descriptionFr:
        "Nous examinons chaque détail avec attention et sélectionnons les plus beaux moments pour créer une histoire unique, selon vos préférences, avec la musique idéale, le bon rythme et le format qui vous convient. Vous recevez un devis précis et personnalisé avant toute étape, sans aucune mauvaise surprise.",
      descriptionEn:
        'We carefully review every detail and handpick the most beautiful scenes to craft a unique, engaging story that fits your preferences, including perfect music, optimal timing, and the best format for your needs. You\'ll receive a clear, custom quote before we begin, so there are no surprises.',
      subDescriptionFr:
        'Vos souvenirs deviennent un film sur-mesure, réalisé avec un souci du détail exceptionnel et une totale transparence à chaque étape.',
      subDescriptionEn:
        'Your memories become a one-of-a-kind film, created with meticulous attention to detail and total transparency at every step.',
      image: '/images/How_we_work_Step2.png',
    },
    {
      number: 3,
      icon: Heart,
      titleFr: 'Nous créons',
      titleEn: 'We create',
      descriptionFr:
        "Vous recevez la première version de votre film-souvenir personnalisé sous une à trois semaines, soigneusement monté et prêt à vous émouvoir. Deux séries de retours sont incluses pour affiner le montage jusqu'à ce qu'il corresponde parfaitement à vos attentes.",
      descriptionEn:
        "You'll receive the first version of your personalized souvenir film within one to three weeks, carefully edited and ready to impress. Our process includes two full rounds of feedback, making it easy to fine-tune your movie until it's exactly right.",
      subDescriptionFr:
        "Le résultat : un souvenir rien qu'à vous, livré rapidement et peaufiné selon vos envies jusqu'à la perfection.",
      subDescriptionEn:
        "The result is a keepsake entirely your own, delivered quickly and refined with your input until it's just perfect.",
      image: '/images/How_we_work_Step3.png',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-12 bg-gradient-to-b from-memopyk-cream to-white"
      ref={sectionRef}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-memopyk-dark-blue mb-4">
            {language === 'fr-FR' ? 'Comment ça marche' : 'How It Works'}
          </h2>
          <p className="text-xl text-memopyk-dark-blue/70 max-w-3xl mx-auto">
            {language === 'fr-FR'
              ? '3 étapes pour transformer vos photos et vidéos en films passionnants'
              : '3 steps to turn your photos and videos into captivating movies'}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => {
            const isFlipped = flippedCards.has(step.number);
            const isHovered = hoveredCard === step.number;

            return (
              <MotionFlipCard
                key={step.number}
                step={step}
                isFlipped={isFlipped}
                isHovered={isHovered}
                onCardClick={(e: React.PointerEvent<HTMLDivElement>) =>
                  handleCardClick(step.number, e)
                }
                onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(step.number, e)}
                onMouseEnter={() => setHoveredCard(step.number)}
                onMouseLeave={() => setHoveredCard(null)}
                onFocus={() => setHoveredCard(step.number)}
                onBlur={() => setHoveredCard(null)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}