import React, { useEffect } from "react";

/* ---------- CSS injection ---------- */
const injectCSS = () => {
  const el = document.createElement("style");
  el.textContent = `
    .peel-test-container {
      min-height: 100vh;
      padding: 48px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #f3f6fb, #edf1f7);
    }
    .peel-test-grid {
      display: grid;
      grid-template-columns: repeat(3, 360px);
      gap: 24px;
      max-width: 1200px;
    }
    .peel-test-card {
      width: 360px;
      height: 240px;
      border-radius: 16px;
      background: rgba(255,255,255,.92);
      backdrop-filter: blur(4px);
      padding: 24px;
      box-shadow: 0 6px 18px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.06);
      position: relative;
      overflow: hidden;
    }
    .peel-test-card h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1b2a3a;
      letter-spacing: .2px;
    }
    .peel-test-card p {
      margin: 8px 0 0;
      color: #4a5b6c;
      line-height: 1.5;
      font-size: 15px;
    }
    .peel-corner {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #011526 0%, #2A4759 100%);
      clip-path: polygon(100% 0, 100% 100%, 0 100%);
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .peel-corner:hover {
      width: 60px;
      height: 60px;
    }
    @media (max-width: 1140px) {
      .peel-test-grid {
        grid-template-columns: 1fr;
        place-items: center;
      }
    }
  `;
  document.head.appendChild(el);
};

export default function PeelExperiment() {
  useEffect(() => {
    injectCSS();
  }, []);

  return (
    <div className="peel-test-container">
      <div className="peel-test-grid">
        <div className="peel-test-card">
          <h3>Visual Feedback</h3>
          <p>This corner hints that the card is interactive.</p>
          <div className="peel-corner"></div>
        </div>

        <div className="peel-test-card">
          <h3>Step 2: Flip Animation</h3>
          <p>Click/tap and drag the corner to reveal the back content.</p>
          <div className="peel-corner"></div>
        </div>

        <div className="peel-test-card">
          <h3>Step 3: Polish</h3>
          <p>Smooth transitions and a subtle, professional corner tickle.</p>
          <div className="peel-corner"></div>
        </div>
      </div>
    </div>
  );
}