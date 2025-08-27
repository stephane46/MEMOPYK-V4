import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = useState<Set<number>>(new Set());
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Design token for back face background (single source of truth)
  const backFaceGradient =
    'linear-gradient(135deg, rgba(214, 124, 74, 0.95) 0%, rgba(42, 71, 89, 0.95) 100%)';

  // Reset flipped cards when section is not visible (nudge will be handled by animation controls)
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
          // Note: Nudge animation will be handled via Framer Motion controls, not state
        });
      },
      {
        threshold: [0.5],
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

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
    setAnimatingCards((prev) => new Set(Array.from(prev).concat([cardNumber])));

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

  // ---- Folded-corner system using direct Framer hover ----
  const MotionCornerSystem = ({
    cardNumber,
    isFlipped,
    backFaceGradient,
    shouldReduceMotion,
  }: {
    cardNumber: number;
    isFlipped: boolean;
    backFaceGradient: string;
    shouldReduceMotion: boolean | null;
  }) => {
    return (
      <motion.div 
        style={{ 
          position: 'absolute',
          bottom: 0,
          right: 0,
          pointerEvents: 'none',
          overflow: 'visible'
        }}
        initial="idle"
        animate="idle"
        whileHover="hovered"
      >
        {/* BackPeek - always visible slip */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 'var(--peekSize)',
            height: 'var(--peekSize)',
            background: backFaceGradient,
            clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
            zIndex: 1,
          }}
          layout={false}
          variants={{
            idle: { scale: 1, opacity: 0.85 },
            hovered: {
              scale: shouldReduceMotion ? 1 : 1.12,
              opacity: 0.95,
              transition: { type: 'spring', stiffness: 280, damping: 22 },
            },
          }}
        >
          <div
            style={{ 
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '8px',
              fontWeight: 500,
              opacity: 0.6,
              filter: 'blur(0.5px)', 
              transform: 'rotate(-45deg)' 
            }}
          >
            ...
          </div>
        </motion.div>

        {/* CornerPeel - the lifting corner */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 0,
            height: 0,
            borderLeft: 'var(--cornerSize) solid transparent',
            borderBottom: 'var(--cornerSize) solid white',
            transformOrigin: 'bottom right',
            background:
              'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,248,248,1) 100%)',
            zIndex: 3,
          }}
          layout={false}
          variants={{
            idle: {
              rotate: 0,
              x: 0,
              y: 0,
              filter: 'drop-shadow(-1px -1px 2px rgba(0,0,0,0.15))',
            },
            hovered: shouldReduceMotion
              ? { rotate: 0, x: 0, y: 0 }
              : {
                  rotate: 5,
                  x: -4,
                  y: -3,
                  filter:
                    'drop-shadow(-3px -3px 6px rgba(0,0,0,0.28)) drop-shadow(-1px -1px 2px rgba(0,0,0,0.15))',
                  transition: { type: 'spring', stiffness: 280, damping: 22 },
                },
          }}
        />

        {/* Highlight line along fold axis */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            pointerEvents: 'none',
            width: 'var(--cornerSize)',
            height: 'var(--cornerSize)',
            background:
              'linear-gradient(135deg, transparent 47%, rgba(255,255,255,0.6) 49%, rgba(255,255,255,0.2) 51%, transparent 53%)',
            zIndex: 2,
          }}
          layout={false}
          variants={{
            idle: { opacity: 0.45 },
            hovered: { opacity: 0.8, transition: { type: 'spring', stiffness: 280, damping: 22 } },
          }}
        />
      </motion.div>
    );
  };

  // ---- Framer Motion Card Flip (rewired): single rotating inner wrapper ----
  const MotionFlipCard = ({
    step,
    isFlipped,
    onCardClick,
    onKeyDown,
  }: {
    step: any;
    isFlipped: boolean;
    onCardClick: (e: React.PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
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
      <div style={{ perspective: '1000px', width: '100%', height: '100%' }}>
        <div
          style={{ 
            cursor: 'pointer',
            paddingTop: '100%',
            position: 'relative',
            borderRadius: '16px',
            overflow: 'visible'
          }}
          onClick={onCardClick}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="button"
          aria-label={
            isFlipped
              ? (language === 'fr-FR' ? 'Fermer les détails' : 'Close details')
              : (language === 'fr-FR' ? 'Voir les détails' : 'View details')
          }
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            {/* MOTION WRAPPER: Single rotating inner container */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '16px',
                transformStyle: shouldReduceMotion ? 'flat' : 'preserve-3d',
                willChange: 'transform',
              }}
              variants={cardVariants}
              animate={cardState}
              onAnimationComplete={() => {
                setAnimatingCards((prev) => {
                  const next = new Set(prev);
                  next.delete(step.number);
                  return next;
                });
              }}
            >
              {/* FRONT FACE */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  backgroundColor: 'white',
                  backfaceVisibility: shouldReduceMotion ? 'visible' : 'hidden',
                  transform: 'translateZ(0)',
                  zIndex: isFlipped ? 1 : 2,
                  pointerEvents: isFlipped ? 'none' : 'auto',
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  {/* Card Image */}
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img
                      src={step.image}
                      alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain', 
                        backgroundColor: '#f9fafb',
                        transition: 'transform 500ms'
                      }}
                    />

                    {/* Orange Number Circle - Top Left */}
                    <div style={{ 
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#D67C4A',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 300ms',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{step.number}</span>
                    </div>
                  </div>

                  {/* Folded corner only on front & only when not flipped */}
                  {!isFlipped && (
                    <MotionCornerSystem
                      cardNumber={step.number}
                      isFlipped={isFlipped}
                      backFaceGradient={backFaceGradient}
                      shouldReduceMotion={shouldReduceMotion}
                    />
                  )}
                </div>
              </div>

              {/* BACK FACE */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  background: 'linear-gradient(135deg, rgba(214, 124, 74, 0.95) 0%, rgba(42, 71, 89, 0.95) 100%)',
                  color: 'white',
                  backfaceVisibility: shouldReduceMotion ? 'visible' : 'hidden',
                  transform: 'rotateY(180deg) translateZ(0)',
                  zIndex: isFlipped ? 2 : 1,
                  pointerEvents: isFlipped ? 'auto' : 'none',
                }}
              >
                <div style={{ padding: '24px', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Header with close button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{step.number}</span>
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                        {language === 'fr-FR' ? step.titleFr : step.titleEn}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardClick(e as unknown as React.PointerEvent<HTMLDivElement>);
                      }}
                      style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <p style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-line', margin: 0 }}>
                      {language === 'fr-FR' ? step.descriptionFr : step.descriptionEn}
                    </p>
                    {(step.subDescriptionFr || step.subDescriptionEn) && (
                      <p style={{ fontSize: '14px', lineHeight: '1.5', marginTop: '12px', opacity: 0.9, whiteSpace: 'pre-line', margin: '12px 0 0 0' }}>
                        {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                      </p>
                    )}
                  </div>

                  {/* Footer hint */}
                  <div style={{ 
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textAlign: 'center',
                    marginTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                    paddingTop: '12px'
                  }}>
                    {language === 'fr-FR' ? 'Cliquer pour revenir' : 'Click to go back'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Title and Icon below card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(214, 124, 74, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 300ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(214, 124, 74, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(214, 124, 74, 0.1)';
          }}>
            <step.icon style={{ width: '24px', height: '24px', color: '#D67C4A' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#2A4759', margin: 0 }}>
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
        'Simply send us your photos and videos without worrying about editing or organizing them first. Share your vision and what matters most to you, either by completing our online form or through a friendly, free phone conversation where we discuss your ideas.',
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
      style={{
        padding: '48px 0',
        background: 'linear-gradient(180deg, #F2EBDC 0%, white 100%)'
      }}
      ref={sectionRef}
    >
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ 
            fontSize: 'clamp(2.25rem, 5vw, 3rem)',
            fontWeight: 'bold',
            color: '#2A4759',
            marginBottom: '16px',
            margin: '0 0 16px 0'
          }}>
            {language === 'fr-FR' ? 'Comment ça marche' : 'How It Works'}
          </h2>
          <p style={{ 
            fontSize: '20px',
            color: 'rgba(42, 71, 89, 0.7)',
            maxWidth: '768px',
            margin: '0 auto'
          }}>
            {language === 'fr-FR'
              ? '3 étapes pour transformer vos photos et vidéos en films passionnants'
              : '3 steps to turn your photos and videos into captivating movies'}
          </p>
        </div>

        {/* Steps Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '48px'
        }}>
          {steps.map((step) => {
            const isFlipped = flippedCards.has(step.number);

            return (
              <MotionFlipCard
                key={step.number}
                step={step}
                isFlipped={isFlipped}
                onCardClick={(e: React.PointerEvent<HTMLDivElement>) =>
                  handleCardClick(step.number, e)
                }
                onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(step.number, e)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}