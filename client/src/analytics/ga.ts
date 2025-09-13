// client/analytics/ga.ts
let gaReadyPromise: Promise<void> | null = null;
let MEASUREMENT_ID = "";

// ✅ LOCALE DETECTION: Extract language from URL for GA4 custom dimension
function getLocaleFromURL(): string {
  const path = window.location.pathname;
  if (path.includes('/fr-FR')) return 'fr-FR';
  if (path.includes('/en-US')) return 'en-US';
  return 'unknown';
}

function hasGtagScript(id: string) {
  return !!document.querySelector(`script[src*="gtag/js?id=${id}"]`);
}

function loadGtagScript(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (hasGtagScript(id)) return resolve();
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load gtag.js"));
    document.head.appendChild(s);
  });
}

function shimGtag() {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag =
    (window as any).gtag ||
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    };
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureClientIdReady(id: string, attempts = 10): Promise<void> {
  // Resolve when gtag('get', id, 'client_id') returns a value
  for (let i = 0; i < attempts; i++) {
    const v: any = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(undefined), 1500);
      try {
        (window as any).gtag("get", id, "client_id", (val: any) => {
          clearTimeout(timer);
          resolve(val);
        });
      } catch {
        clearTimeout(timer);
        resolve(undefined);
      }
    });
    if (v) return; // ready!
    await wait(300);
  }
  // Not fatal—continue; events should still flush once lib settles.
}

export function initGA(measurementId: string, opts?: { debug?: boolean }) {
  if (!measurementId) return;
  MEASUREMENT_ID = measurementId;

  if (!gaReadyPromise) {
    gaReadyPromise = (async () => {
      shimGtag();

      // Consent early so events aren't suppressed
      (window as any).gtag("consent", "update", {
        ad_storage: "granted",
        analytics_storage: "granted",
        functionality_storage: "granted",
      });

      await loadGtagScript(measurementId);

      // Base config (avoid duplicate page_view)
      (window as any).gtag("js", new Date());
      (window as any).gtag("config", measurementId, {
        send_page_view: false,
        debug_mode:
          !!opts?.debug ||
          /(^|[?&])ga_debug=1/.test(location.search) ||
          localStorage.getItem("ga_debug") === "1",
      });

      // Wait (best-effort) until GA can return a client_id
      await ensureClientIdReady(measurementId);

      // Attach a simple self-test helper
      (window as any).__gaSelfTest = async () => {
        await gaReady();
        (window as any).gtag("event", "video_progress", {
          progress_percent: 25,
          video_id: "SELFTEST.mp4",
          video_title: "Self Test",
          debug_mode: true,
          transport_type: "beacon",
          send_to: MEASUREMENT_ID,
        });
        console.info("[GA] self-test event sent → check GA4 DebugView (video_progress / SELFTEST.mp4)");
      };
    })();
  }
  return gaReadyPromise;
}

export async function gaReady() {
  if (!gaReadyPromise) throw new Error("initGA not called");
  return gaReadyPromise;
}

type EventParams = Record<string, any>;

function sendEvent(name: string, params: EventParams) {
  if (!(window as any).gtag) return;
  (window as any).gtag("event", name, {
    ...params,
    locale: getLocaleFromURL(), // ✅ ALWAYS include locale in events
    transport_type: "beacon",
    send_to: MEASUREMENT_ID, // IMPORTANT when multiple configs/GTM exist
  });
}

// Public API

// ✅ SEND PAGE VIEW with locale - called on route changes  
export async function sendPageView(additionalParams?: EventParams) {
  await gaReady();
  const locale = getLocaleFromURL();
  (window as any).gtag("event", "page_view", {
    page_path: window.location.pathname + window.location.search,
    page_title: document.title,
    locale: locale, // ✅ Include locale in page views
    transport_type: "beacon",
    send_to: MEASUREMENT_ID,
    ...additionalParams,
  });
}

export async function sendVideoProgress(params: EventParams & {
  progress_percent: 10 | 25 | 50 | 75 | 90;
  video_id: string;
  video_title: string;
}) {
  await gaReady();
  sendEvent("video_progress", params);
}

export async function sendVideoStart(params: EventParams & {
  video_id: string;
  video_title: string;
}) {
  await gaReady();
  sendEvent("video_start", params);
}

export async function sendVideoComplete(params: EventParams & {
  video_id: string;
  video_title: string;
}) {
  await gaReady();
  sendEvent("video_complete", params);
}