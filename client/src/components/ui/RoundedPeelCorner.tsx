import React, { useEffect, useMemo, useRef, useState } from "react";

/** RoundedPeelCorner — bottom-right "paper peel" that hugs the card radius. */
export default function RoundedPeelCorner({
  colorTop = "#F2A300",
  colorFold = "#D67C4A",
  className = "",
}: {
  colorTop?: string;
  colorFold?: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [Rdet, setRdet] = useState<number | null>(null);

  // Detect the card's bottom-right radius from the parent element
  useEffect(() => {
    const parent = boxRef.current?.parentElement;
    if (!parent) return;
    const read = () => {
      const cs = getComputedStyle(parent);
      const v = parseFloat(cs.borderBottomRightRadius || "0");
      setRdet(Number.isFinite(v) ? v : 16);
    };
    const ro = new ResizeObserver(read);
    ro.observe(parent);
    read();
    return () => ro.disconnect();
  }, []);

  // ---- Resolve geometry safely ----
  const { C, R, pathFlap, pathInner, t } = useMemo(() => {
    const Rraw = Rdet ?? 16;
    // choose a box size from the detected radius (2.1× for strong, curled look)
    const Cauto = Math.ceil(Rraw * 4.0);
    const C = Math.max(10, Cauto);           // peel box (px)
    const R = Math.max(1, Math.min(Rraw, C - 2)); // clamp so quarter circle fits

    // curl thickness and rounded tip
    const t = Math.max(12, Math.min(R * 0.85, C * 0.55));
    const tip = Math.min(t * 0.55, R * 0.75);

    const p1x = C - R, p1y = C;
    const p2x = C,     p2y = C - R;

    const Rin = Math.max(R - t, 1);
    const i1x = C - Rin, i1y = C;
    const i2x = C,       i2y = C - Rin;

    const pathFlap =
      `M ${p1x},${p1y} A ${R},${R} 0 0 0 ${p2x},${p2y} ` +
      `C ${C},${C - t * 0.68} ${C - t * 0.30},${C} ${C - tip},${C - tip} ` +
      `C ${C - t},${C - t * 0.30} ${C - t * 0.68},${C - t} ${i2x},${i2y} ` +
      `A ${Rin},${Rin} 0 0 1 ${i1x},${i1y} Z`;

    const pathInner = `M ${i1x},${i1y} A ${Rin},${Rin} 0 0 0 ${i2x},${i2y}`;

    return { C, R, pathFlap, pathInner, t };
  }, [Rdet]);

  // expose peel size to the parent and ensure layering
  useEffect(() => {
    const parent = boxRef.current?.parentElement;
    if (!parent) return;
    parent.style.setProperty("--peel-c", `${C}px`);
    parent.style.setProperty("--peel-r", `${R}px`);
  }, [C, R]);

  // dev hint: expose what we used (look in Elements → Attributes)
  const dbg = `R=${Rdet ?? "?"}; C=${C ?? "?"}`;

  return (
    <div
      ref={boxRef}
      data-peel={dbg}
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
        zIndex: 2,
      }}
    >
      <svg
        viewBox={`0 0 ${C} ${C}`}
        width={C}
        height={C}
        style={{ width: C, height: C, display: "block" }}
        aria-hidden
      >
        <defs>
          <filter id="peelShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.18" />
            <feDropShadow dx="-2" dy="8" stdDeviation="7" floodOpacity="0.10" />
          </filter>
          <linearGradient id="peelTop" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"  stopColor={shade(colorTop, -0.04)} />
            <stop offset="60%" stopColor={colorTop} />
            <stop offset="100%" stopColor={tint(colorTop, 0.10)} />
          </linearGradient>
          <linearGradient id="peelFold" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={shade(colorFold, 0.10)} />
            <stop offset="100%" stopColor={colorFold} />
          </linearGradient>
          <clipPath id="peelClip"><path d={pathFlap} /></clipPath>
        </defs>

        <g filter="url(#peelShadow)">
          <path d={pathFlap} fill="url(#peelTop)" />
          <path d={pathFlap} fill="url(#peelFold)" opacity="0.25" clipPath="url(#peelClip)" />
          <path d={pathInner} stroke="white" strokeOpacity="0.55" strokeWidth={Math.max(0.75, t * 0.06)} />
        </g>
      </svg>
    </div>
  );
}

/* tiny color helpers */
function clamp01(n: number){ return Math.max(0, Math.min(1, n)); }
function hexToRgb(hex: string){
  const h = hex.replace("#","").trim();
  const full = h.length===3 ? h.split("").map(c=>c+c).join("") : h;
  const n = parseInt(full, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function rgbToHex(r:number,g:number,b:number){
  const p=(v:number)=>v.toString(16).padStart(2,"0");
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