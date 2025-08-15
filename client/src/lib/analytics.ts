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

// Helper function to get current locale
function getCurrentLocale(): string {
  const path = window.location.pathname;
  if (path.startsWith('/fr-FR') || path.startsWith('/fr')) {
    return 'fr-FR';
  } else if (path.startsWith('/en-US') || path.startsWith('/en')) {
    return 'en-US';
  }
  // Fallback to localStorage or default
  return localStorage.getItem('memopyk-language') || 'fr-FR';
}

// GA4 Video Analytics Events
export const trackVideoOpen = (videoId: string, videoTitle?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    video_id: videoId,
    locale: getCurrentLocale(),
    gallery: 'Video Gallery',
    player: 'html5'
  };
  
  if (videoTitle) {
    eventParams.video_title = videoTitle;
  }
  
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', 'video_open', eventParams);
  console.log('📹 GA4 Video: video_open', eventParams);
};

export const trackVideoStart = (videoId: string, durationSec: number, positionSec: number = 0, videoTitle?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    video_id: videoId,
    locale: getCurrentLocale(),
    gallery: 'Video Gallery',
    player: 'html5',
    position_sec: positionSec,
    duration_sec: durationSec
  };
  
  if (videoTitle) {
    eventParams.video_title = videoTitle;
  }
  
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', 'video_start', eventParams);
  console.log('📹 GA4 Video: video_start', eventParams);
};

export const trackVideoPause = (videoId: string, durationSec: number, positionSec: number, videoTitle?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    video_id: videoId,
    locale: getCurrentLocale(),
    gallery: 'Video Gallery',
    player: 'html5',
    position_sec: positionSec,
    duration_sec: durationSec
  };
  
  if (videoTitle) {
    eventParams.video_title = videoTitle;
  }
  
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', 'video_pause', eventParams);
  console.log('📹 GA4 Video: video_pause', eventParams);
};

export const trackVideoProgress = (videoId: string, percent: 25 | 50 | 75 | 100, durationSec: number, positionSec: number, videoTitle?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    video_id: videoId,
    locale: getCurrentLocale(),
    gallery: 'Video Gallery',
    player: 'html5',
    percent: percent,
    position_sec: positionSec,
    duration_sec: durationSec
  };
  
  if (videoTitle) {
    eventParams.video_title = videoTitle;
  }
  
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', 'video_progress', eventParams);
  console.log('📹 GA4 Video: video_progress', eventParams);
};

export const trackVideoComplete = (videoId: string, durationSec: number, positionSec: number, videoTitle?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    video_id: videoId,
    locale: getCurrentLocale(),
    gallery: 'Video Gallery',
    player: 'html5',
    position_sec: positionSec,
    duration_sec: durationSec
  };
  
  if (videoTitle) {
    eventParams.video_title = videoTitle;
  }
  
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', 'video_complete', eventParams);
  console.log('📹 GA4 Video: video_complete', eventParams);
};

export const trackVideoWatchTime = (videoId: string, watchTimeSec: number, videoTitle?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const eventParams: any = {
    video_id: videoId,
    locale: getCurrentLocale(),
    gallery: 'Video Gallery',
    player: 'html5',
    watch_time_sec: watchTimeSec
  };
  
  if (videoTitle) {
    eventParams.video_title = videoTitle;
  }
  
  if (isGaDev()) {
    eventParams.debug_mode = true;
  }
  
  window.gtag('event', 'video_watch_time', eventParams);
  console.log('📹 GA4 Video: video_watch_time', eventParams);
};