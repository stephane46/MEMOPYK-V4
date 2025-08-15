// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const MEASUREMENT_ID = "G-JLRWHE1HV4";

// Track page views on route changes (SPA navigation)
export function sendPageView() {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('config', MEASUREMENT_ID, {
    page_path: window.location.pathname + window.location.search,
    page_title: document.title,
  });
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