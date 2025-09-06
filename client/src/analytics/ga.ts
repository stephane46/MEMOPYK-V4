// client/analytics/ga.ts
let inited = false;

export function initGA(measurementId: string, opts?: { debug?: boolean }) {
  if (inited || !measurementId) return;
  // dataLayer + gtag shim (reuse existing if GTM created it)
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag =
    (window as any).gtag ||
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    };

  // load gtag.js
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s);

  // consent (so events aren't suppressed)
  (window as any).gtag("consent", "update", {
    ad_storage: "granted",
    analytics_storage: "granted",
    functionality_storage: "granted",
  });

  // init config – IMPORTANT: prevent duplicate page_view
  (window as any).gtag("js", new Date());
  (window as any).gtag("config", measurementId, {
    send_page_view: false,
    debug_mode: !!opts?.debug || /(^|[?&])ga_debug=1/.test(location.search) || localStorage.getItem("ga_debug") === "1",
  });

  inited = true;
}

type EventParams = Record<string, any>;

export function sendVideoProgress(params: EventParams & {
  progress_percent: 10 | 25 | 50 | 75 | 90;
  video_id: string;
  video_title: string;
}) {
  if (!(window as any).gtag) return;
  (window as any).gtag("event", "video_progress", {
    ...params,
    transport_type: "beacon",
  });
}

export function sendVideoStart(params: EventParams & {
  video_id: string;
  video_title: string;
}) {
  if (!(window as any).gtag) return;
  (window as any).gtag("event", "video_start", {
    ...params,
    transport_type: "beacon",
  });
}

export function sendVideoComplete(params: EventParams & {
  video_id: string;
  video_title: string;
}) {
  if (!(window as any).gtag) return;
  (window as any).gtag("event", "video_complete", {
    ...params,
    transport_type: "beacon",
  });
}