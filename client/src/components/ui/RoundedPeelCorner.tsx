import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * RoundedPeelCorner — bottom-right "paper peel" that hugs the card radius.
 *
 * Props
 * - size:  square box that contains the peel (px). Must be >= radius.
 * - radius: card's bottom-right border radius (px). If omitted, auto-detected.
 * - colorTop:  visible face of the flap.
 * - colorFold: underside near the fold.
 */
export default function RoundedPeelCorner({
  size = 84,
  radius, // optional; will auto-detect from parent if not provided
  colorTop = "#F2A300",
  colorFold = "#D67C4A",
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

  // Auto-detect the parent card's bottom-right radius if not provided
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

  // ---- Geometry ------------------------------------------------------------
  const C = Math.max(8, size); // peel box (px)
  const Ruser = radius ?? detectedR ?? 16;

  // ⛑ Clamp: quarter circle must fit inside C×C; keep a 2px safety margin
  const R = Math.max(1, Math.min(Ruser, C - 2));

  const { pathFlap, pathInner, t } = useMemo(() => {
    // Curl band thickness (between outer and inner arcs) and rounded "tip"
    const t = Math.max(8, Math.min(R * 0.70, C * 0.50));
    const tip = Math.min(t * 0.45, R * 0.50);

    const p1x = C - R, p1y = C;       // outer arc start (bottom edge)
    const p2x = C,     p2y = C - R;   // outer arc end   (right edge)

    const Rin = Math.max(R - t, 1);   // inner arc radius (clamped)
    const i1x = C - Rin, i1y = C;
    const i2x = C,       i2y = C - Rin;

    // Band between outer and inner quarter-circles, rounded toward the tip
    const pathFlap =
      `M ${p1x},${p1y} ` +
      `A ${R},${R} 0 0 0 ${p2x},${p2y} ` +
      `C ${C},${C - t * 0.68} ${C - t * 0.30},${C} ${C - tip},${C - tip} ` +
      `C ${C - t},${C - t * 0.30} ${C - t * 0.68},${C - t} ${i2x},${i2y} ` +
      `A ${Rin},${Rin} 0 0 1 ${i1x},${i1y} Z`;

    // Subtle "crease" highlight along the inner arc
    const pathInner = `M ${i1x},${i1y} A ${Rin},${Rin} 0 0 0 ${i2x},${i2y}`;

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
        willChange: "transform",
        contain: "layout paint size",
      }}
    >
      <svg
        viewBox={`0 0 ${C} ${C}`}
        width={C}
        height={C}
        style={{ width: C, height: C, display: "block" }} // protect against global svg {height:auto}
        aria-hidden
      >
        <defs>
          {/* soft layered shadow */}
          <filter id="peelShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.18" />
            <feDropShadow dx="-2" dy="8" stdDeviation="7" floodOpacity="0.10" />
          </filter>

          {/* top-face gradient */}
          <linearGradient id="peelTop" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"  stopColor={shade(colorTop, -0.04)} />
            <stop offset="60%" stopColor={colorTop} />
            <stop offset="100%" stopColor={tint(colorTop, 0.10)} />
          </linearGradient>

          {/* underside gradient */}
          <linearGradient id="peelFold" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={shade(colorFold, 0.10)} />
            <stop offset="100%" stopColor={colorFold} />
          </linearGradient>

          {/* clip path so fold shading stays inside the flap */}
          <clipPath id="peelClip">
            <path d={pathFlap} />
          </clipPath>
        </defs>

        <g filter="url(#peelShadow)">
          {/* flap */}
          <path d={pathFlap} fill="url(#peelTop)" />

          {/* fold darkening near the inner arc */}
          <path d={pathFlap} fill="url(#peelFold)" opacity="0.25" clipPath="url(#peelClip)" />

          {/* crease highlight */}
          <path
            d={pathInner}
            stroke="white"
            strokeOpacity="0.55"
            strokeWidth={Math.max(0.75, t * 0.06)}
          />
        </g>
      </svg>
    </div>
  );
}

/* ------- tiny color helpers (no dependency) ------- */
function clamp01(n: number){ return Math.max(0, Math.min(1, n)); }
function hexToRgb(hex: string){
  const h = hex.replace("#","").trim();
  const full = h.length === 3 ? h.split("").map(c=>c+c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}
function rgbToHex(r:number,g:number,b:number){
  const p = (v:number)=>v.toString(16).padStart(2,"0");
  return `#${p(r)}${p(g)}${p(b)}`;
}
function shade(hex:string, amt:number){
  const {r,g,b}=hexToRgb(hex);
  return rgbToHex(
    Math.round(clamp01((r/255)*(1+amt))*255),
    Math.round(clamp01((g/255)*(1+amt))*255),
    Math.round(clamp01((b/255)*(1+amt))*255)
  );
}
function tint(hex:string, amt:number){ return shade(hex, amt); }