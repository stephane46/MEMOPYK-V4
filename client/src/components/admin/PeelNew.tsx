"use client";
import { useState } from "react";

type CardData = {
  frontTitle: string;
  frontBody: string;
  backTitle: string;
  backBody: string;
};

function FlipCard({ data }: { data: CardData }) {
  const [flipped, setFlipped] = useState(false);

  const toggle = () => setFlipped(v => !v);

  return (
    <div className="flip-scene">
      {/* Accessible button triggers flip */}
      <button
        type="button"
        className={`flip-card ${flipped ? "is-flipped" : ""}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-pressed={flipped}
        aria-label={flipped ? `Showing back: ${data.backTitle}` : `Showing front: ${data.frontTitle}`}
      >
        {/* Front */}
        <div className="flip-face flip-front">
          <div className="pr-8">
            <h3 className="text-lg font-medium text-slate-900 m-0">{data.frontTitle}</h3>
            <p className="text-slate-600 mt-2 text-sm leading-5">{data.frontBody}</p>
          </div>
          <span aria-hidden className="peel" />
        </div>

        {/* Back */}
        <div className="flip-face flip-back">
          <div className="pr-8">
            <h3 className="text-lg font-medium text-slate-900 m-0">{data.backTitle}</h3>
            <p className="text-slate-600 mt-2 text-sm leading-5">{data.backBody}</p>
          </div>
          <span aria-hidden className="peel" />
        </div>
      </button>
    </div>
  );
}

export default function PeelNew() {
  const cards: CardData[] = [
    {
      frontTitle: "Step 1: Static Peel",
      frontBody: "Bottom-right folded corner indicator (static).",
      backTitle: "Visual Feedback",
      backBody: "This corner hints that the card is interactive."
    },
    {
      frontTitle: "Step 2: Flip Animation", 
      frontBody: "Click/tap to reveal the back content.",
      backTitle: "Accessibility Built-in",
      backBody: "Keyboard support, ARIA labels, and semantic HTML."
    },
    {
      frontTitle: "Step 3: Polish",
      frontBody: "Smooth transitions and visual enhancements.",
      backTitle: "Production Ready",
      backBody: "Optimized for performance and accessibility."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Peel New - Advanced Card Effects</h2>
        <p className="text-gray-600 dark:text-gray-300">Interactive peel-corner cards with flip animations and accessibility features</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((cardData, i) => (
          <FlipCard key={i} data={cardData} />
        ))}
      </div>

      <style>{`
        .flip-scene {
          perspective: 1200px;
          transform-style: preserve-3d;
        }

        .flip-card {
          position: relative;
          width: 100%;
          min-height: 200px;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          border: none;
          background: transparent;
          padding: 0;
        }

        .flip-card.is-flipped {
          transform: rotateY(180deg);
        }

        .flip-face {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.08);
          padding: 20px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
          transition: box-shadow 0.3s ease;
        }

        .flip-card:hover .flip-face {
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }

        .flip-back {
          transform: rotateY(180deg);
          background: #f8fafc;
        }

        /* Peel corner indicator */
        .peel {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 48px;
          height: 48px;
          pointer-events: none;
        }

        .peel::before {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          width: 0;
          height: 0;
          border-bottom: 48px solid #e5e7eb;
          border-left: 48px solid transparent;
          filter: drop-shadow(-1px -1px 0 rgba(0, 0, 0, 0.08));
          transform-origin: bottom right;
          transition: all 0.3s ease;
        }

        .flip-card:hover .peel::before {
          border-bottom-color: #d1d5db;
        }

        .peel::after {
          content: "";
          position: absolute;
          right: 48px;
          bottom: 0;
          width: 48px;
          height: 48px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.7) 0%,
            rgba(255, 255, 255, 0) 60%
          );
          clip-path: polygon(100% 0, 0 100%, 100% 100%);
          opacity: 0.8;
          pointer-events: none;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .flip-face {
            background: #1e293b;
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
          }
          
          .flip-back {
            background: #0f172a;
          }
          
          .flip-face h3 {
            color: #f1f5f9;
          }
          
          .flip-face p {
            color: #cbd5e1;
          }
          
          .peel::before {
            border-bottom-color: #374151;
          }
          
          .flip-card:hover .peel::before {
            border-bottom-color: #4b5563;
          }
        }

        /* Focus states for accessibility */
        .flip-card:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .flip-card:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}