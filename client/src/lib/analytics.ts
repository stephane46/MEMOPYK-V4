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

// Initialize Google Analytics
export function initGA(): void {
  if (typeof window === 'undefined') return;
  
  // Add gtag script
  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(gtagScript);
  
  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer.push(args);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false // We'll handle page views manually
  });
  
  console.log('🚀 GA4 initialized with ID:', MEASUREMENT_ID);
}

// Initialize and display test mode branding
export function initTestMode() {
  // Check for test mode via URL parameter and save to localStorage
  if (/[?#&]ga_dev=1\b/.test(location.href)) {
    localStorage.setItem('ga_dev', '1');
  }
  
  // Display test mode branding if active
  if (isGaDev()) {
    console.log('🧪 MEMOPYK Test');
    return true;
  }
  return false;
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

// Track events (legacy)
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

// GA4 Standardized Video Events for BigQuery Export
export const trackVideoStart = (videoId: string, videoTitle?: string, locale?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_start', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    debug_mode: isGaDev()
  });
};

export const trackVideoProgress = (videoId: string, progressPercent: number, currentTimeSeconds: number, videoTitle?: string, locale?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_progress', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    current_time: currentTimeSeconds,
    progress_percent: progressPercent,
    debug_mode: isGaDev()
  });
};

export const trackVideoComplete = (videoId: string, watchTimeSeconds: number, videoTitle?: string, locale?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_complete', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    watch_time_seconds: watchTimeSeconds,
    progress_percent: 100,
    debug_mode: isGaDev()
  });
};

export const trackVideoPause = (videoId: string, progressPercent: number, currentTimeSeconds: number, videoTitle?: string, locale?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'video_pause', {
    video_id: videoId,
    video_title: videoTitle || videoId,
    gallery: 'main',
    player: 'custom',
    locale: locale || 'fr-FR',
    current_time: currentTimeSeconds,
    progress_percent: progressPercent,
    debug_mode: isGaDev()
  });
};

// GA4 Standardized CTA Click Events for BigQuery Export
export const trackCtaClick = (ctaId: string, pagePath?: string, locale?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'cta_click', {
    cta_id: ctaId,
    page_path: pagePath || window.location.pathname,
    locale: locale || 'fr-FR',
    debug_mode: isGaDev()
  });
};

// Helper functions for managing developer mode
export function enableDeveloperMode() {
  localStorage.setItem('ga_dev', '1');
  console.log('🧪 GA4 Developer mode enabled - add ?ga_dev=1 to URLs for testing');
}

export function disableDeveloperMode() {
  localStorage.removeItem('ga_dev');
  console.log('🔒 GA4 Developer mode disabled');
}

// Helper to get current stored language
function getStoredLanguage(): string {
  return localStorage.getItem('memopyk-language') || 'fr-FR';
}

// Get current locale for GA4 events
function getCurrentLocale(): string {
  return getStoredLanguage();
}