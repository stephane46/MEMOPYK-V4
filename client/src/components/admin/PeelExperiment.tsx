"use client";

import React, { useEffect, useRef, useState } from "react";
import { PeelWrapper, PeelTop, PeelBack, PeelBottom } from "react-peel";

/* ---------- Minimal CSS (injected once) ---------- */
const injectOnce = (() => {
  let done = false;
  return () => {
    // Force re-injection in development
    if (done && import.meta.env.DEV) {
      const existing = document.querySelector('style[data-peel-experiment]');
      if (existing) existing.remove();
      done = false;
    }
    if (done) return;
    done = true;
    const el = document.createElement("style");
    el.setAttribute('data-peel-experiment', 'true');
    el.textContent = `
      :root { --bg1:#f3f6fb; --bg2:#edf1f7; --ink:#1b2a3a; --muted:#4a5b6c; }
      * { box-sizing: border-box; }
      .page { min-height:100vh; padding:24px; display:flex; align-items:flex-start; justify-content:center;
              background:linear-gradient(180deg,var(--bg1),var(--bg2)); overflow:visible; }
      .peel-zone { contain: layout paint size; overflow: visible; }
      .grid { display:grid; grid-template-columns:repeat(3, 384px); gap:32px; width:100%; max-width:1280px; overflow: visible; margin-top: 50px; }
      .peel-wrapper { will-change: transform, clip-path; transform: translateZ(0); -webkit-transform: translateZ(0); contain: layout paint size; }
      .shell { width:384px; height:400px; border-radius:16px; overflow:visible; background:transparent;
               box-shadow:0 6px 18px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.06); }
      .face { width:100%; height:100%; border-radius:16px; background:white;
              border: 1px solid #e5e7eb; box-shadow:0 8px 32px rgba(0,0,0,.12);
              display:flex; flex-direction:column; overflow:hidden; }
      .face .step-image { width:100%; aspect-ratio:1; background:#f9fafb; position:relative; overflow:hidden; border-radius:12px; margin:16px; margin-bottom:8px; }
      .face .step-number { position:absolute; top:8px; left:8px; width:32px; height:32px; background:#D67C4A; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:14px; }
      .face .info-button { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%); box-shadow:0 4px 12px rgba(0,0,0,0.2); border:1px solid rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:center; margin:12px auto 16px; }
      .face h3 { margin:0 16px 8px; font-size:18px; font-weight:700; color:#011526; text-align:center; font-family: 'Poppins', system-ui; }
      .face p { margin:0 16px 16px; color:#2A4759; line-height:1.4; font-size:14px; text-align:center; font-family: 'Poppins', system-ui; }
      .back { width:100%; height:100%; background:linear-gradient(135deg,#f6f6f7 0%, #e9ecf1 100%); border-radius:16px; }
      .reveal { width:100%; height:100%; color:#F2EBDC;
                background:linear-gradient(135deg,#011526 0%, #2A4759 100%);
                display:flex; align-items:center; justify-content:center; font-weight:600; font-size:16px; border-radius:16px; }
      @media (max-width:1140px){ .grid { grid-template-columns:1fr; place-items:center; } }
    `;
    document.head.appendChild(el);
  };
})();

/* ---------- Time-corrected spring with sub-stepping (very smooth) ---------- */
function makeSpring(
  getPos: () => { x: number; y: number },
  setPos: (xy: { x: number; y: number }) => void
) {
  let raf = 0;
  let x = getPos().x, y = getPos().y;
  let vx = 0, vy = 0;
  let last = performance.now();
  let acc = 0;

  const stop = () => { if (raf) cancelAnimationFrame(raf); };

  function to(
    target: { x: number; y: number },
    opts: {
      stiffness?: number; // per-substep "pull" (keep ~0.03–0.07)
      damping?: number;   // per-substep velocity keep (0.78–0.92)
      snapSpeed?: number; // velocity snap threshold
      snapDist?: number;  // distance snap threshold
      onComplete?: () => void;
    } = {}
  ) {
    const k = opts.stiffness ?? 0.08;
    const d = opts.damping   ?? 0.85;
    const snapV = opts.snapSpeed ?? 0.08;
    const snapD = opts.snapDist  ?? 0.15;

    stop();
    last = performance.now();
    const h = 1000 / 60;     // fixed 60Hz step
    const maxCatch = 50;     // cap catch-up to avoid big jumps

    const step = () => {
      const now = performance.now();
      let dt = now - last;
      last = now;
      if (dt > maxCatch) dt = maxCatch;
      acc += dt;

      let progressed = false;
      while (acc >= h) {
        const dx = target.x - x;
        const dy = target.y - y;
        vx = (vx + dx * k) * d;
        vy = (vy + dy * k) * d;
        x += vx;
        y += vy;
        acc -= h;
        progressed = true;
      }

      if (progressed) {
        // snap to 1/3 px grid to avoid shimmer
        const snap = (n: number) => Math.round(n * 3) / 3;
        setPos({ x: snap(x), y: snap(y) });
      }

      const v = Math.hypot(vx, vy);
      const dist = Math.hypot(target.x - x, target.y - y);

      if (v < snapV && dist < snapD) {
        x = target.x; y = target.y; vx = 0; vy = 0;
        setPos({ x, y });
        opts.onComplete?.();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  return { to, stop };
}

/* ---------- A single controlled peel card ---------- */
function PeelCard({
  title, description,
  width = 384, height = 440,
  initial,
  interactive = false,
  stepNumber = 1,
  stepImage = "/images/How_we_work_Step1.png",
  stepIcon = "upload",
  animateSequence,
  isFlipped = false,
  onToggleFlip,
}: {
  title: string;
  description: string;
  width?: number; height?: number;
  initial?: { x: number; y: number };
  interactive?: boolean;
  stepNumber?: number;
  stepImage?: string;
  stepIcon?: "upload" | "create" | "share";
  animateSequence?: (api: {
    to: (xy: { x: number; y: number }, o?: any) => void;
    stop: () => void;
    targets: { closed: { x: number; y: number }; base: { x: number; y: number }; reveal: { x: number; y: number } };
    prefersReduced: boolean;
  }) => void;
  isFlipped?: boolean;
  onToggleFlip?: () => void;
}) {
  // Determine position based on flip state
  const closed = { x: width - 2, y: height - 2 };
  const reveal = { x: Math.round(width * 0.08), y: Math.round(height * 0.12) };
  const [pos, setPos] = useState<{ x: number; y: number }>(() => 
    initial ?? (isFlipped ? reveal : closed)
  );

  // Update position when flip state changes with smooth animation
  useEffect(() => {
    const targetPos = isFlipped ? reveal : closed;
    const spring = makeSpring(() => pos, (xy) => setPos(xy));
    
    // Animate to target position smoothly
    spring.to(targetPos, { stiffness: 0.15, damping: 0.75 });
    
    return () => spring.stop();
  }, [isFlipped]);

  // Explicit geometry
  const base   = { x: width - 32, y: height - 32 }; // larger-corner base (4x bigger)

  const ran = useRef(false);
  useEffect(() => {
    if (!animateSequence || ran.current) return;
    ran.current = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const spring = makeSpring(() => pos, (xy) => setPos(xy));

    // Small delay to ensure component is fully rendered
    const timer = setTimeout(() => {
      animateSequence({
        to: spring.to, stop: spring.stop,
        targets: { closed, base, reveal },
        prefersReduced,
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      spring.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="shell">
      <PeelWrapper
        width={width}
        height={height}
        corner="BOTTOM_RIGHT"
        peelPosition={pos}
        drag={false}
        className="peel-wrapper"
        handleDrag={() => {
          // Drag disabled - using click-to-flip instead
        }}
      >
        <PeelTop>
          {/* Card Container - Rectangle: Square image + white padding below */}
          <div 
            className="bg-white border border-gray-200 shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer" 
            style={{ borderRadius: '1rem' }}
            onClick={onToggleFlip}
          >
            <div className="relative">
              {/* Step Image - Square */}
              <div 
                className="relative overflow-hidden transition-all duration-500 aspect-square bg-gray-50" 
                style={{ borderRadius: '1rem 1rem 0 0' }}
              >
                <img 
                  src={stepImage} 
                  alt={title}
                  className="w-full h-full object-contain transition-transform duration-500"
                  style={{ borderRadius: '1rem 1rem 0 0' }}
                />
                
              </div>
              
              {/* Title with orange number circle in white space */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <div className="w-8 h-8 bg-memopyk-orange rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">{stepNumber}</span>
                </div>
                <h3 className="text-2xl font-semibold text-memopyk-navy">
                  {title}
                </h3>
              </div>
            </div>
          </div>
        </PeelTop>

        {/* Back of the "page" */}
        <PeelBack>
          <div 
            className="shadow-lg hover:shadow-2xl overflow-hidden border border-gray-200 h-full cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${stepImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '1rem'
            }}
            onClick={onToggleFlip}
          >
            <div className="h-full flex flex-col cursor-pointer relative px-4 pt-6 pb-2">
              {/* Top Section - Text content area with better spacing */}
              <div className="text-center flex flex-col justify-start" style={{ height: '320px', position: 'relative' }}>
                <div className="text-sm leading-relaxed text-white w-full">
                  {description.split('\n').filter(line => line.trim() !== '').map((paragraph, i) => {
                    if (paragraph.trim() === '—') {
                      return <div key={i} className="text-center my-4 text-white text-xl font-light border-t border-white/30 pt-4 mt-6">—</div>;
                    }
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      const text = paragraph.slice(2, -2);
                      return <p key={i} className="mb-3 font-bold text-base">{text}</p>;
                    }
                    return <p key={i} className="mb-3 text-sm">{paragraph}</p>;
                  })}
                </div>
              </div>
              
              {/* Return arrow - Bottom left corner */}
              <div className="absolute -bottom-6 -left-6">
                <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                  <svg className="w-5 h-5 text-memopyk-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </PeelBack>

        {/* Revealed layer */}
        <PeelBottom>
          <div 
            className="reveal shadow-lg overflow-hidden border border-gray-200 h-full cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${stepImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '1rem'
            }}
            onClick={onToggleFlip}
          >
            <div className="h-full flex flex-col relative px-4 pt-6 pb-2">
              {/* Text content area - Same as card back with better spacing */}
              <div className="text-center flex flex-col justify-start" style={{ height: '320px', position: 'relative' }}>
                <div className="text-sm leading-relaxed text-white w-full">
                  {description.split('\n').filter(line => line.trim() !== '').map((paragraph, i) => {
                    if (paragraph.trim() === '—') {
                      return <div key={i} className="text-center my-4 text-white text-xl font-light border-t border-white/30 pt-4 mt-6">—</div>;
                    }
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      const text = paragraph.slice(2, -2);
                      return <p key={i} className="mb-3 font-bold text-base">{text}</p>;
                    }
                    return <p key={i} className="mb-3 text-sm">{paragraph}</p>;
                  })}
                </div>
              </div>
              
              {/* Return arrow - Bottom left corner */}
              <div className="absolute -bottom-6 -left-6">
                <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                  <svg className="w-5 h-5 text-memopyk-dark-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </PeelBottom>
      </PeelWrapper>
      
    </div>
  );
}

/* ---------- Exported component ---------- */
export default function PeelExperiment() {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  
  useEffect(() => { injectOnce(); }, []);

  const toggleCardFlip = (cardIndex: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardIndex)) {
        newSet.delete(cardIndex);
      } else {
        newSet.add(cardIndex);
      }
      return newSet;
    });
  };

  return (
    <section className="py-12 bg-gradient-to-b from-memopyk-cream to-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-memopyk-dark-blue mb-4">
            Peel Experiment
          </h2>
          <p className="text-xl text-memopyk-dark-blue/70 max-w-3xl mx-auto">
            Interactive card demonstration with peel effects
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <PeelCard
          title="You Upload"
          description="Envoyez-nous simplement vos photos et vidéos, sans avoir à les trier ou les retoucher.

Faites-nous part de votre vision et de ce qui compte le plus pour vous, soit en remplissant notre formulaire en ligne, soit en échangeant vos idées avec nous lors d'un appel téléphonique gratuit et convivial.

—

**Commencer est un jeu d'enfant : apportez-nous simplement vos souvenirs et vos envies, nous nous occupons du reste avec soin et créativité.**"
          stepNumber={1}
          stepImage="/images/How_we_work_Step1.png"
          stepIcon="upload"
          interactive={false}
          isFlipped={flippedCards.has(0)}
          onToggleFlip={() => toggleCardFlip(0)}
        />
        <PeelCard
          title="We Create"
          description="Nous examinons chaque détail avec attention et sélectionnons les plus beaux moments pour créer une histoire unique, selon vos préférences, avec la musique idéale, le bon rythme et le format qui vous convient.

Vous recevez un devis précis et personnalisé avant toute étape, sans aucune mauvaise surprise.

—

**Vos souvenirs deviennent un film sur-mesure, réalisé avec un souci du détail exceptionnel et une totale transparence à chaque étape.**"
          stepNumber={2}
          stepImage="/images/How_we_work_Step2.png"
          stepIcon="create"
          interactive={false}
          isFlipped={flippedCards.has(1)}
          onToggleFlip={() => toggleCardFlip(1)}
        />
        <PeelCard
          title="You Enjoy & Share"
          description="Vous recevez la première version de votre film-souvenir personnalisé sous une à trois semaines, soigneusement monté et prêt à vous émouvoir.

Deux séries de retours sont incluses pour affiner le montage jusqu'à ce qu'il corresponde parfaitement à vos attentes.

—

**Le résultat : un souvenir rien qu'à vous, livré rapidement et peaufiné selon vos envies jusqu'à la perfection.**"
          stepNumber={3}
          stepImage="/images/How_we_work_Step3.png"
          stepIcon="share"
          interactive={false}
          isFlipped={flippedCards.has(2)}
          onToggleFlip={() => toggleCardFlip(2)}
        />
        </div>
      </div>
    </section>
  );
}