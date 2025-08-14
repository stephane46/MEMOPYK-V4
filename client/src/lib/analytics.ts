// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const MEASUREMENT_ID = "G-JLRWHE1HV4";

// Call this on every route change
export function sendPageView() {
  const params = {
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
    page_title: document.title,
  };

  // If gtag is ready, send immediately; otherwise queue until it appears
  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
    (window as any).gtag("config", MEASUREMENT_ID, params);
  } else {
    // minimal retry to avoid missing the first hit after hydration
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("config", MEASUREMENT_ID, params);
        clearInterval(t);
      }
      if (tries > 20) clearInterval(t); // stop after ~10s
    }, 500);
  }
}

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};