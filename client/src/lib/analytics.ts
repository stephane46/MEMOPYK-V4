// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const MEASUREMENT_ID = "G-JLRWHE1HV4";

// Check if GA developer mode is enabled
function isGaDev(): boolean {
  return /[?#&]ga_dev=1\b/.test(location.href) || localStorage.getItem('ga_dev') === '1';
}

// Track page views on route changes (SPA navigation)
export function sendPageView() {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const params: any = {
    page_path: window.location.pathname + window.location.search,
    page_title: document.title,
  };
  
  // Mark as developer traffic if dev mode is enabled
  if (isGaDev()) {
    params.debug_mode = true;
  }
  
  window.gtag('config', MEASUREMENT_ID, params);
}

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    event_category: category,
    event_label: label,
    value: value,
  };
  
  // Mark as developer traffic if dev mode is enabled
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', action, eventParams);
};

// Helper functions for managing developer mode
export function enableDeveloperMode() {
  localStorage.setItem('ga_dev', '1');
  console.log('🔧 GA4 Developer mode enabled. Your traffic will be excluded from analytics.');
}

export function disableDeveloperMode() {
  localStorage.removeItem('ga_dev');
  console.log('📊 GA4 Developer mode disabled. Your traffic will be included in analytics.');
}

export function isDeveloperMode(): boolean {
  return isGaDev();
}