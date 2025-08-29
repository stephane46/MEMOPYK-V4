import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * RoundedPeelCorner — bottom-right "paper peel" that hugs the card radius.
 * - size: square in px that contains the peel (e.g. 80)
 * - radius: card border-radius in px (if omitted, we read it from the parent card)
 * - colorTop / colorFold: front/back colors of the flap
 */
export default function RoundedPeelCorner({
  size = 84,
  radius,                         // optional; auto-detected if not given
  colorTop = "#F9A31A",           // top/front of flap
  colorFold = "#D67C4A",          // underside color
  className = "",
}: {
  size?: number;
  radius?: number;
  colorTop?: string;
  colorFold?: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [detectedR, setDetectedR] = useState<number | null>(null);

  // Detect the parent card's bottom-right radius if not provided
  useEffect(() => {
    if (radius != null) return;
    const parent = boxRef.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      const cs = getComputedStyle(parent);
      const br = parseFloat(cs.borderBottomRightRadius || "0");
      setDetectedR(Number.isFinite(br) ? br : 16);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [radius]);

  const R = radius ?? detectedR ?? 16;  // card corner radius
  const C = size;

  // Geometry for the peel:
  // t = "thickness" of the curl band along the diagonal;
  // tip rounds off the outer end of the flap so it looks curled.
  const { pathFlap, pathInner, t } = useMemo(() => {
    const t = Math.max(8, Math.min(R * 0.75, C * 0.55));      // curl thickness
    const tip = t * 0.45;

    const p1x = C - R, p1y = C;                               // start on bottom edge
    const p2x = C,     p2y = C - R;                           // quarter arc end on right edge

    const i1x = C - (R - t), i1y = C;                         // inner arc start
    const i2x = C,           i2y = C - (R - t);               // inner arc end

    // Flap band between outer and inner quarter-circles, rounded toward the tip.
    const pathFlap =
      `M ${p1x},${p1y} ` +
      `A ${R},${R} 0 0 0 ${p2x},${p2y} ` +
      `C ${C},${C - t * 0.68} ${C - t * 0.30},${C} ${C - tip},${C - tip} ` +
      `C ${C - t},${C - t * 0.30} ${C - t * 0.68},${C - t} ${i2x},${i2y} ` +
      `A ${Math.max(R - t, 1)},${Math.max(R - t, 1)} 0 0 1 ${i1x},${i1y} Z`;

    // A soft "crease" highlight along the inner arc
    const pathInner = `M ${i1x},${i1y} A ${Math.max(R - t, 1)},${Math.max(R - t, 1)} 0 0 0 ${i2x},${i2y}`;

    return { pathFlap, pathInner, t };
  }, [C, R]);

  return (
    <div
      ref={boxRef}
      className={className}
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: C,
        height: C,
        pointerEvents: "none",
        // ensure it renders crisply and doesn't get clipped by transforms
        willChange: "transform",
        contain: "layout paint size",
      }}
    >
      <svg viewBox={`0 0 ${C} ${C}`} width={C} height={C} aria-hidden>
        <defs>
          {/* soft shadow to match your reference */}
          <filter id="peelShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.18"/>
            <feDropShadow dx="-2" dy="8" stdDeviation="7" floodOpacity="0.10"/>
          </filter>

          {/* subtle top-face gradient for the flap */}
          <linearGradient id="peelTop" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"  stopColor={shade(colorTop, -0.04)} />
            <stop offset="60%" stopColor={colorTop} />
            <stop offset="100%" stopColor={tint(colorTop, 0.10)} />
          </linearGradient>

          {/* underside gradient (slightly darker toward the fold) */}
          <linearGradient id="peelFold" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={shade(colorFold, 0.10)} />
            <stop offset="100%" stopColor={colorFold} />
          </linearGradient>

          {/* clip to the inner quarter circle so the "fold" stays inside */}
          <clipPath id="peelClip">
            <path d={pathFlap} />
          </clipPath>
        </defs>

        {/* Shadowed group */}
        <g filter="url(#peelShadow)">
          {/* Flap fill */}
          <path d={pathFlap} fill="url(#peelTop)" />

          {/* Fold darkening near the inner arc (subtle) */}
          <path d={pathFlap} fill="url(#peelFold)" opacity="0.25" clipPath="url(#peelClip)" />

          {/* Crease highlight */}
          <path d={pathInner} stroke="white" strokeOpacity="0.55" strokeWidth={Math.max(0.75, t * 0.06)} />
        </g>
      </svg>
    </div>
  );
}

/* ------- tiny color helpers (no dependency) ------- */
function clamp01(n: number){ return Math.max(0, Math.min(1, n)); }
function hexToRgb(hex: string){
  const h = hex.replace("#","").trim();
  const n = parseInt(h.length===3 ? h.split("").map(c=>c+c).join("") : h, 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}
function rgbToHex(r:number,g:number,b:number){
  const p = (v:number)=>v.toString(16).padStart(2,"0");
  return `#${p(r)}${p(g)}${p(b)}`;
}
function shade(hex:string, amt:number){ // amt in [-1..1]
  const {r,g,b}=hexToRgb(hex);
  return rgbToHex(
    Math.round(clamp01((r/255)*(1+amt))*255),
    Math.round(clamp01((g/255)*(1+amt))*255),
    Math.round(clamp01((b/255)*(1+amt))*255)
  );
}
function tint(hex:string, amt:number){ return shade(hex, amt); }