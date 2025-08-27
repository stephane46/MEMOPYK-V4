import Tracker from "@openreplay/tracker";
import trackerAssist from "@openreplay/tracker-assist";

let tracker: Tracker | null = null;

type InitOptions = {
  getUserId?: () => string | undefined;        // e.g., your auth user ID (email hash, etc.)
  getLang?: () => string | undefined;          // e.g., 'fr-FR'
  getCountryIso3?: () => string | undefined;   // from your global filter, optional
  getGaClient?: () => { clientId?: string; sessionId?: string } | undefined; // GA4 linkage
  extraMeta?: Record<string, string | number | boolean>; // any extra tags
};

export function initOpenReplay(opts: InitOptions = {}) {
  // Check if OpenReplay is enabled via environment variable
  const enabledFlag = import.meta.env.VITE_VIDEO_ANALYTICS_ENABLED;
  if (enabledFlag !== "true") return null;
  
  if (tracker) return tracker; // already started

  const projectKey = import.meta.env.VITE_OPENREPLAY_PROJECT_KEY as string;
  if (!projectKey) {
    console.warn("OpenReplay project key not found in environment variables");
    return null;
  }

  tracker = new Tracker({
    projectKey,
    // PRIVACY defaults (GDPR friendly)
    defaultInputMode: 2, // 2 = mask inputs by default
    obscureTextNumbers: false,
    obscureTextEmails: true,
    // respectDNT: true, // Not available in current version
  });

  // Plugins
  tracker.use(trackerAssist()); // optional co-browsing/chat later

  // Start tracking
  tracker.start();

  // Identify user (optional, recommended if you have a stable ID)
  const uid = opts.getUserId?.();
  if (uid) tracker.setUserID(uid);

  // GA4 linkage (lets you jump between GA4 and OpenReplay)
  const ga = opts.getGaClient?.();
  if (ga?.clientId) tracker.setMetadata("ga_client_id", ga.clientId);
  if (ga?.sessionId) tracker.setMetadata("ga_session_id", String(ga.sessionId));

  // Useful dimensions for searching
  const lang = opts.getLang?.();
  if (lang) tracker.setMetadata("lang", lang);

  const countryIso3 = opts.getCountryIso3?.();
  if (countryIso3) tracker.setMetadata("country_iso3", countryIso3);

  // Any custom business metadata
  if (opts.extraMeta) {
    for (const [k, v] of Object.entries(opts.extraMeta)) {
      tracker.setMetadata(k, String(v));
    }
  }

  // Expose tracker globally for testing
  if (typeof window !== 'undefined') {
    (window as any).OpenReplay = tracker;
  }

  console.log("🎬 OpenReplay session recording initialized for MEMOPYK");
  console.log("OpenReplay tracker started:", tracker.getSessionToken?.() || 'session-token-loading');
  
  return tracker;
}

// Optional helper to safely set metadata later
export function setReplayMeta(key: string, value: string | number | boolean) {
  tracker?.setMetadata(key, String(value));
}

// Helper to get current tracker instance
export function getTracker(): Tracker | null {
  return tracker;
}