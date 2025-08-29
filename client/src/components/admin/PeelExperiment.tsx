"use client";

import React, { useEffect, useRef, useState } from "react";
import { PeelWrapper, PeelTop, PeelBack, PeelBottom } from "react-peel";

/* ---------- Minimal CSS (injected once) ---------- */
const injectOnce = (() => {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const el = document.createElement("style");
    el.textContent = `
      :root { --bg1:#f3f6fb; --bg2:#edf1f7; --ink:#1b2a3a; --muted:#4a5b6c; }
      * { box-sizing: border-box; }
      .page { min-height:100%; padding:48px 24px; display:flex; align-items:center; justify-content:center;
              background:linear-gradient(180deg,var(--bg1),var(--bg2)); }
      .grid { display:grid; grid-template-columns:repeat(3, 360px); gap:24px; width:100%; max-width:1200px; }
      .shell { width:360px; height:240px; border-radius:16px; overflow:hidden; background:transparent;
               box-shadow:0 6px 18px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.06); }
      .face { width:100%; height:100%; border-radius:16px; background:rgba(255,255,255,.92);
              backdrop-filter:blur(4px); padding:24px; }
      .face h3 { margin:0; font-size:22px; font-weight:700; color:var(--ink); letter-spacing:.2px; }
      .face p { margin:8px 0 0; color:var(--muted); line-height:1.5; font-size:15px; }
      .back { width:100%; height:100%; background:linear-gradient(135deg,#f6f6f7 0%, #e9ecf1 100%); }
      .reveal { width:100%; height:100%; color:#F2EBDC;
                background:linear-gradient(135deg,#011526 0%, #2A4759 100%);
                display:flex; align-items:center; justify-content:center; font-weight:600; font-size:16px; border-radius:16px; }
      @media (max-width:1140px){ .grid { grid-template-columns:1fr; place-items:center; } }
    `;
    document.head.appendChild(el);
  };
})();

/* ---------- Tiny spring animator (RAF, no libs) ---------- */
function makeSpring(
  getPos: () => { x: number; y: number },
  setPos: (xy: { x: number; y: number }) => void
) {
  let raf = 0;
  let x = getPos().x, y = getPos().y, vx = 0, vy = 0;

  const stop = () => { if (raf) cancelAnimationFrame(raf); };

  function to(
    target: { x: number; y: number },
    opts: {
      stiffness?: number; // ~0.03–0.08
      damping?: number;   // 0.75–0.92
      snapSpeed?: number; // small velocity threshold
      snapDist?: number;  // small distance threshold
      onComplete?: () => void;
    } = {}
  ) {
    const k = opts.stiffness ?? 0.045;
    const d = opts.damping   ?? 0.84;
    const snapV = opts.snapSpeed ?? 0.06;
    const snapD = opts.snapDist  ?? 0.75;

    stop();
    const step = () => {
      const dx = target.x - x, dy = target.y - y;
      vx = (vx + dx * k) * d;  vy = (vy + dy * k) * d;
      x += vx;  y += vy;
      setPos({ x, y });
      const speed = Math.hypot(vx, vy), dist = Math.hypot(dx, dy);
      if (speed < snapV && dist < snapD) {
        setPos({ x: target.x, y: target.y });
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
  width = 360, height = 240,
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

  // Keep geometry fixed/explicit so parent wrappers can't break it
  const closed = { x: width - 2, y: height - 2 };
  const base   = { x: width - 8, y: height - 8 };             // small-corner base
  const reveal = { x: Math.round(width * 0.08), y: Math.round(height * 0.12) };

  // One-time scripted animation (Card 3)
  const ran = useRef(false);
  useEffect(() => {
    if (!animateSequence || ran.current) return;
    ran.current = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const spring = makeSpring(() => pos, (xy) => setPos(xy));

    animateSequence({
      to: spring.to, stop: spring.stop,
      targets: { closed, base, reveal },
      prefersReduced,
    });

    return () => spring.stop();
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
        handleDrag={(evt, x, y, peel) => {
          if (!interactive) return;
          peel.setPeelPosition(x, y);
          setPos({ x, y });
        }}
      >
        <PeelTop>
          <div className="face">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </PeelTop>

        {/* Back of the "page" */}
        <PeelBack><div className="back" /></PeelBack>

        {/* Revealed layer (what the peel shows) */}
        <PeelBottom><div className="reveal">Revealed content / CTA</div></PeelBottom>
      </PeelWrapper>
    </div>
  );
}

/* ---------- Exported component (drop-in) ---------- */
export default function PeelExperiment() {
  useEffect(() => { injectOnce(); }, []);

  return (
    <div className="page">
      <div className="grid">
        {/* Card 1 — static visual hint */}
        <PeelCard
          title="Visual Feedback"
          description="This corner hints that the card is interactive."
          initial={{ x: 352, y: 232 }}
        />

        {/* Card 2 — user-draggable peel */}
        <PeelCard
          title="Step 2: Flip Animation"
          description="Click/tap and drag the corner to reveal the back content."
          interactive
          initial={{ x: 356, y: 236 }}
        />

        {/* Card 3 — smooth float → settle → micro-tickle */}
        <PeelCard
          title="Step 3: Polish"
          description="Smooth transitions and a subtle, professional corner tickle."
          animateSequence={({ to, targets, prefersReduced }) => {
            if (prefersReduced) { to(targets.base, { stiffness: 0.05, damping: 0.9 }); return; }

            // Phase A: float down to a larger reveal
            to(targets.reveal, {
              stiffness: 0.040, damping: 0.86,
              onComplete: () => {
                // Phase B: glide back to small-corner base
                to(targets.base, {
                  stiffness: 0.038, damping: 0.88,
                  onComplete: () => {
                    // Decaying micro-tickle around the base
                    const amps = [6, 3, 1.5]; let i = 0;
                    const next = () => {
                      if (i >= amps.length) return;
                      const a = amps[i++];
                      to({ x: targets.base.x - a, y: targets.base.y - a }, {
                        stiffness: 0.065, damping: 0.80,
                        onComplete: () => {
                          to({ x: targets.base.x + a, y: targets.base.y + a }, {
                            stiffness: 0.065, damping: 0.82,
                            onComplete: () => {
                              to(targets.base, { stiffness: 0.05, damping: 0.86, onComplete: next });
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