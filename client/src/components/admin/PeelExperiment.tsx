import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PeelWrapper, PeelTop, PeelBack, PeelBottom } from "react-peel";

/* ---------- Minimal global styles (injected) ---------- */
const inject = (css: string) => {
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
};
inject(`
  :root { --bg1:#f3f6fb; --bg2:#edf1f7; --ink:#1b2a3a; --muted:#4a5b6c; }
  * { box-sizing: border-box; }
  .peel-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:48px 24px; }
  .peel-grid { display:grid; grid-template-columns:repeat(3, 360px); gap:24px; width:100%; max-width:1200px; }
  .peel-shell { border-radius:16px; overflow:hidden; background:transparent;
           box-shadow:0 6px 18px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.06);}
  .peel-face { width:100%; height:100%; border-radius:16px; background:rgba(255,255,255,.92);
          backdrop-filter:blur(4px); padding:24px; }
  .peel-face h3 { margin:0; font-size:22px; font-weight:700; color:var(--ink); letter-spacing:.2px; }
  .peel-face p { margin:8px 0 0; color:var(--muted); line-height:1.5; font-size:15px; }
  .peel-back { width:100%; height:100%; background:linear-gradient(135deg,#f6f6f7 0%, #e9ecf1 100%); }
  .peel-reveal { width:100%; height:100%; color:#F2EBDC; background:linear-gradient(135deg,#011526 0%, #2A4759 100%);
            display:flex; align-items:center; justify-content:center; font-weight:600; font-size:16px; border-radius:16px; }
  @media (max-width: 1140px) { .peel-grid { grid-template-columns: 1fr; place-items:center; } }
`);

/* ---------- Small hook to measure element size ---------- */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, set] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      set({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/* ---------- Tiny spring animator (RAF, no libs) ---------- */
function makeSpring(
  getPos: () => { x: number; y: number },
  setPos: (xy: { x: number; y: number }) => void
) {
  let raf = 0;
  let x = getPos().x;
  let y = getPos().y;
  let vx = 0;
  let vy = 0;

  const stop = () => raf && cancelAnimationFrame(raf);

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
    const d = opts.damping ?? 0.84;
    const snapV = opts.snapSpeed ?? 0.06;
    const snapD = opts.snapDist ?? 0.75;

    stop();

    const step = () => {
      const dx = target.x - x;
      const dy = target.y - y;
      vx = (vx + dx * k) * d;
      vy = (vy + dy * k) * d;
      x += vx;
      y += vy;
      setPos({ x, y });

      const speed = Math.hypot(vx, vy);
      const dist = Math.hypot(dx, dy);
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
  title,
  description,
  width = 360,
  height = 240,
  initial,
  interactive = false,
  animateSequence,
}: {
  title: string;
  description: string;
  width?: number;
  height?: number;
  initial?: { x: number; y: number };
  interactive?: boolean;
  animateSequence?: (api: {
    to: (xy: { x: number; y: number }, o?: any) => void;
    stop: () => void;
    targets: {
      closed: { x: number; y: number };
      base: { x: number; y: number };
      reveal: { x: number; y: number };
    };
    prefersReduced: boolean;
  }) => void;
}) {
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // establish a starting position when sized
  useEffect(() => {
    const w = size.w || width;
    const h = size.h || height;
    if (!w || !h) return;
    const closed = { x: w - 2, y: h - 2 };
    setPos(initial ?? closed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  // scripted animation (used by Card 3)
  useEffect(() => {
    if (!pos || !animateSequence) return;
    const w = size.w || width;
    const h = size.h || height;
    const closed = { x: w - 2, y: h - 2 };
    const base = { x: w - 8, y: h - 8 }; // small corner base
    const reveal = { x: Math.round(w * 0.08), y: Math.round(h * 0.12) };

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const spring = makeSpring(
      () => pos,
      (xy) => setPos(xy)
    );

    animateSequence({
      to: spring.to,
      stop: spring.stop,
      targets: { closed, base, reveal },
      prefersReduced,
    });

    return () => spring.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.x, pos?.y, size.w, size.h]);

  return (
    <div ref={wrapRef} className="peel-shell" style={{ width, height }}>
      <PeelWrapper
        width={width}
        height={height}
        corner="BOTTOM_RIGHT"
        peelPosition={pos ?? undefined}
        drag={interactive}
        handleDrag={(evt, x, y, peel) => {
          if (!interactive) return;
          peel.setPeelPosition(x, y);
          setPos({ x, y });
        }}
      >
        <PeelTop>
          <div className="peel-face">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </PeelTop>

        <PeelBack>
          <div className="peel-back" />
        </PeelBack>

        <PeelBottom>
          <div className="peel-reveal">Revealed content / CTA</div>
        </PeelBottom>
      </PeelWrapper>
    </div>
  );
}

/* ---------- The app: three cards (Card 3 = polished animation) ---------- */
export default function PeelExperiment() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Peel Experiment</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Advanced peel effects with smooth spring animations and proper reveal layers.
        </p>
      </div>
      
      <main className="peel-page">
        <div className="peel-grid">
          <PeelCard
            title="Visual Feedback"
            description="This corner hints that the card is interactive."
            initial={{ x: 352, y: 232 }} // gentle peek
          />

          <PeelCard
            title="Step 2: Flip Animation"
            description="Click/tap and drag the corner to reveal the back content."
            interactive
            initial={{ x: 356, y: 236 }}
          />

          <PeelCard
            title="Step 3: Polish"
            description="Smooth transitions and a subtle, professional corner tickle."
            animateSequence={({ to, targets, prefersReduced }) => {
              if (prefersReduced) {
                to(targets.base, { stiffness: 0.05, damping: 0.9 });
                return;
              }
              // Phase A: float down to a large reveal
              to(targets.reveal, {
                stiffness: 0.040,
                damping: 0.86,
                onComplete: () => {
                  // Phase B: glide back to small-corner base
                  to(targets.base, {
                    stiffness: 0.038,
                    damping: 0.88,
                    onComplete: () => {
                      // Micro-tickle (decaying around base)
                      const amps = [6, 3, 1.5];
                      let i = 0;
                      const tickleNext = () => {
                        if (i >= amps.length) return;
                        const a = amps[i++];

                        // left-down
                        to(
                          { x: targets.base.x - a, y: targets.base.y - a },
                          {
                            stiffness: 0.065,
                            damping: 0.80,
                            onComplete: () => {
                              // right-up
                              to(
                                { x: targets.base.x + a, y: targets.base.y + a },
                                {
                                  stiffness: 0.065,
                                  damping: 0.82,
                                  onComplete: () => {
                                    // settle
                                    to(targets.base, {
                                      stiffness: 0.05,
                                      damping: 0.86,
                                      onComplete: tickleNext,
                                    });
                                  },
                                }
                              );
                            },
                          }
                        );
                      };
                      tickleNext();
                    },
                  });
                },
              });
            }}
          />
        </div>
      </main>
    </div>
  );
}