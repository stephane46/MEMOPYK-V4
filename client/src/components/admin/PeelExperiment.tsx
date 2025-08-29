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
    const k = opts.stiffness ?? 0.040;
    const d = opts.damping   ?? 0.88;
    const snapV = opts.snapSpeed ?? 0.045;
    const snapD = opts.snapDist  ?? 0.65;

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
  width = 384, height = 320,
  initial,
  interactive = false,
  animateSequence,
}: {
  title: string;
  description: string;
  width?: number; height?: number;
  initial?: { x: number; y: number };
  interactive?: boolean;
  animateSequence?: (api: {
    to: (xy: { x: number; y: number }, o?: any) => void;
    stop: () => void;
    targets: { closed: { x: number; y: number }; base: { x: number; y: number }; reveal: { x: number; y: number } };
    prefersReduced: boolean;
  }) => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => initial ?? { x: width - 2, y: height - 2 });

  // Explicit geometry
  const closed = { x: width - 2, y: height - 2 };
  const base   = { x: width - 32, y: height - 32 }; // larger-corner base (4x bigger)
  const reveal = { x: Math.round(width * 0.08), y: Math.round(height * 0.12) };

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
        drag={interactive}
        className="peel-wrapper"
        handleDrag={(evt, x, y, peel) => {
          if (!interactive) return;
          peel.setPeelPosition(x, y);
          setPos({ x, y });
        }}
      >
        <PeelTop>
          <div className="face">
            <div className="step-image">
              <img 
                src="/images/How_we_work_Step1.png" 
                alt={title}
                className="w-full h-full object-contain"
              />
              <div className="step-number">1</div>
            </div>
            <div className="info-button">
              <span style={{color: '#2A4759'}}>ℹ️</span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </PeelTop>

        {/* Back of the "page" */}
        <PeelBack>
          <div className="back">
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">✨</span>
                </div>
              </div>
              <h4 className="text-lg font-bold text-memopyk-navy mb-2">We Edit</h4>
              <p className="text-sm text-memopyk-dark-blue">Professional editing with perfect music, timing, and your preferences</p>
            </div>
          </div>
        </PeelBack>

        {/* Revealed layer */}
        <PeelBottom>
          <div className="reveal">
            <div className="text-center">
              <div className="mb-4">
                <span className="text-3xl mb-2 block">❤️</span>
              </div>
              <h4 className="text-lg font-bold mb-2">Ready to Share</h4>
              <p className="text-sm opacity-90">Your personalized memory film delivered with love and care</p>
            </div>
          </div>
        </PeelBottom>
      </PeelWrapper>
    </div>
  );
}

/* ---------- Exported component ---------- */
export default function PeelExperiment() {
  useEffect(() => { injectOnce(); }, []);

  return (
    <div className="page peel-zone">
      <div className="grid">
        <PeelCard
          title="You Upload"
          description="Simply send us your photos and videos—no need to organize or edit anything beforehand."
          initial={{ x: 352, y: 288 }}
        />
        <PeelCard
          title="We Create"
          description="We carefully review every detail and handpick the most beautiful scenes to craft a unique story."
          interactive
          initial={{ x: 356, y: 236 }}
        />
        <PeelCard
          title="You Enjoy & Share"
          description="You'll receive your personalized souvenir film within one to three weeks, carefully edited."
          animateSequence={({ to, targets, prefersReduced }) => {
            if (prefersReduced) { to(targets.base, { stiffness: 0.035, damping: 0.92 }); return; }
            // Phase A: float down to reveal
            to(targets.reveal, {
              stiffness: 0.032, damping: 0.90,
              onComplete: () => {
                // Phase B: glide back to base
                to(targets.base, {
                  stiffness: 0.034, damping: 0.91,
                  onComplete: () => {
                    // Decaying micro-tickle
                    const amps = [5, 2.5, 1.2];
                    let i = 0;
                    const next = () => {
                      if (i >= amps.length) return;
                      const a = amps[i++];
                      to({ x: targets.base.x - a, y: targets.base.y - a }, {
                        stiffness: 0.055, damping: 0.86,
                        onComplete: () => {
                          to({ x: targets.base.x + a, y: targets.base.y + a }, {
                            stiffness: 0.055, damping: 0.87,
                            onComplete: () => {
                              to(targets.base, { stiffness: 0.040, damping: 0.90, onComplete: next });
                            }
                          });
                        }
                      });
                    };
                    next();
                  }
                });
              }
            });
          }}
        />
      </div>
    </div>
  );
}