import React, { useState, useEffect, useRef } from 'react';

interface EventRecord {
  name: string;
  params: Record<string, any>;
  ts: number;
}

interface DebugState {
  events: EventRecord[];
  counts: { video_start: number; video_progress: number; video_complete: number };
  gtagType: string;
  hasDL: boolean;
  consent: Record<string, any>;
  probes: { img: boolean; connect: boolean };
  lastMsg: string;
  networkHits: number;
  lastCollectUrls: Array<{ url: string; timestamp: number }>;
}

export default function GaDebugHud() {
  const [visible, setVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [state, setState] = useState<DebugState>({
    events: [],
    counts: { video_start: 0, video_progress: 0, video_complete: 0 },
    gtagType: 'unknown',
    hasDL: false,
    consent: {},
    probes: { img: false, connect: false },
    lastMsg: '',
    networkHits: 0,
    lastCollectUrls: []
  });

  const fadeTimer = useRef<NodeJS.Timeout | null>(null);
  const originalGtag = useRef<any>(null);

  useEffect(() => {
    // Check if debug mode is enabled
    const qsOn = new URLSearchParams(location.search).get('ga_debug') === '1';
    const lsOn = (() => {
      try {
        return localStorage.getItem('ga_debug') === '1';
      } catch {
        return false;
      }
    })();

    if (!qsOn && !lsOn) return;

    setVisible(true);

    // Wrap gtag to capture video events
    if (window.gtag && !originalGtag.current) {
      originalGtag.current = window.gtag;
      window.gtag = function(...args: any[]) {
        try {
          if (args[0] === 'event') {
            const name = args[1];
            const params = args[2] || {};
            if (['video_start', 'video_progress', 'video_complete'].includes(name)) {
              setState(prev => ({
                ...prev,
                events: [...prev.events, { name, params, ts: Date.now() }],
                counts: { ...prev.counts, [name]: (prev.counts[name as keyof typeof prev.counts] || 0) + 1 },
                lastMsg: `captured ${name}`
              }));
            }
          }
        } catch (e) {
          console.warn('GA Debug HUD: Error capturing event', e);
        }
        return originalGtag.current?.apply(this, args);
      };
    }

    // Initial snapshot
    const snapshot = () => {
      setState(prev => {
        const newState = { ...prev };
        newState.gtagType = typeof window.gtag;
        newState.hasDL = !!window.dataLayer;
        
        try {
          const dl = window.dataLayer || [];
          const consentRows = dl.filter((e: any) => e?.[0] === 'consent').map((e: any) => e?.[2]);
          newState.consent = consentRows[consentRows.length - 1] || {};
        } catch (e) {
          console.warn('GA Debug HUD: Error reading consent', e);
        }
        
        return newState;
      });
    };

    snapshot();
    setTimeout(snapshot, 300);
    setTimeout(snapshot, 1500);

    return () => {
      // Restore original gtag on cleanup
      if (originalGtag.current) {
        window.gtag = originalGtag.current;
        originalGtag.current = null;
      }
    };
  }, []);

  const probeImg = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const done = (ok: boolean) => {
        setState(prev => ({
          ...prev,
          probes: { ...prev.probes, img: ok },
          lastMsg: ok ? 'img probe ok' : 'img probe failed'
        }));
        resolve(ok);
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = 'https://www.google-analytics.com/r/collect?v=2&_dbg=1';
      setTimeout(() => done(false), 2500);
    });
  };

  const probeConnect = async (): Promise<boolean> => {
    try {
      await fetch('https://www.google-analytics.com/g/collect?v=2&_dbg=1', { 
        mode: 'no-cors', 
        method: 'GET' 
      });
      setState(prev => ({
        ...prev,
        probes: { ...prev.probes, connect: true },
        lastMsg: 'connect probe ok'
      }));
      return true;
    } catch {
      setState(prev => ({
        ...prev,
        probes: { ...prev.probes, connect: false },
        lastMsg: 'connect probe failed'
      }));
      return false;
    }
  };

  const runProbes = async () => {
    await probeImg();
    await probeConnect();
  };

  // Auto-run probes after functions are defined
  useEffect(() => {
    if (visible) {
      runProbes();
      startNetworkMonitoring();
    }
  }, [visible]);

  const startNetworkMonitoring = () => {
    // Monitor performance entries for GA4 collect requests
    const checkNetworkHits = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const gaHits = resources.filter(r => 
        (r.name.includes('google-analytics.com/g/collect') || 
         r.name.includes('region1.google-analytics.com/g/collect')) &&
        (r.name.includes('en=video_start') || 
         r.name.includes('en=video_progress') || 
         r.name.includes('en=video_complete'))
      );
      
      if (gaHits.length > state.networkHits) {
        const newUrls = gaHits.slice(state.networkHits).map(hit => ({
          url: hit.name.split('?')[1] || hit.name, // Show query params only
          timestamp: Date.now()
        }));
        
        setState(prev => ({
          ...prev,
          networkHits: gaHits.length,
          lastCollectUrls: [...prev.lastCollectUrls, ...newUrls].slice(-3), // Keep last 3
          lastMsg: `${gaHits.length} GA hits detected`
        }));
      }
    };
    
    // Check every second for new network hits
    const interval = setInterval(checkNetworkHits, 1000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  };

  const copyToClipboard = () => {
    const consentStr = Object.keys(state.consent).length ? JSON.stringify(state.consent) : '{}';
    const last5 = state.events
      .slice(-5)
      .map(e => `• ${e.name} ${JSON.stringify(e.params)}`)
      .join('\n') || '(none yet)';
    
    const collectUrls = state.lastCollectUrls.length 
      ? state.lastCollectUrls.map(u => `• ${u.url.slice(0, 80)}...`).join('\n')
      : '(none yet)';

    const text = `gtag:           ${state.gtagType}
dataLayer:      ${state.hasDL ? 'present' : 'missing'}
consent:        ${consentStr}
events (totals): start=${state.counts.video_start} | progress=${state.counts.video_progress} | complete=${state.counts.video_complete}
CSP probes:     img=${state.probes.img ? 'ok' : 'blocked?'} | connect=${state.probes.connect ? 'ok' : 'blocked?'}
GA hits:        ${state.networkHits} delivered
last message:   ${state.lastMsg}

Last 3 collect URLs:
${collectUrls}

Last 5 events:
${last5}`;

    navigator.clipboard?.writeText(text);
    setState(prev => ({ ...prev, lastMsg: 'copied to clipboard' }));
  };

  const scheduleFade = () => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    if (pinned) return;
    fadeTimer.current = setTimeout(() => {
      if (!hover) {
        // Fade logic handled by opacity state
      }
    }, 1200) as NodeJS.Timeout;
  };

  useEffect(() => {
    scheduleFade();
  }, [hover, pinned]);

  if (!visible) return null;

  const consentStr = Object.keys(state.consent).length ? JSON.stringify(state.consent) : '{}';
  const last5 = state.events
    .slice(-5)
    .map(e => `• ${e.name} ${JSON.stringify(e.params)}`)
    .join('\n') || '(none yet)';

  return (
    <div
      className="fixed right-3 bottom-3 z-[99999] font-mono text-xs leading-relaxed bg-slate-900 text-blue-100 border border-slate-600 p-3 rounded-lg w-80 shadow-2xl transition-opacity duration-300"
      style={{ 
        opacity: hover || pinned ? 1 : 0.65,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <strong className="text-blue-300">GA Debug HUD</strong>
        <button
          onClick={() => setVisible(false)}
          className="bg-slate-800 text-blue-100 border border-slate-600 rounded px-2 py-1 text-xs hover:bg-slate-700"
        >
          ✕
        </button>
      </div>

      {/* Status Display */}
      <pre className="whitespace-pre-wrap text-xs mb-3 text-blue-100">
{`gtag:           ${state.gtagType}
dataLayer:      ${state.hasDL ? 'present' : 'missing'}
consent:        ${consentStr}
events (totals): start=${state.counts.video_start} | progress=${state.counts.video_progress} | complete=${state.counts.video_complete}
CSP probes:     img=${state.probes.img ? 'ok' : 'blocked?'} | connect=${state.probes.connect ? 'ok' : 'blocked?'}
last message:   ${state.lastMsg}

Last 5 events:
${last5}`}
      </pre>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={runProbes}
          className="bg-green-800 text-blue-100 border border-green-600 rounded px-2 py-1 text-xs hover:bg-green-700"
        >
          Probe CSP
        </button>
        <button
          onClick={copyToClipboard}
          className="bg-slate-800 text-blue-100 border border-slate-600 rounded px-2 py-1 text-xs hover:bg-slate-700"
        >
          Copy Log
        </button>
        <button
          onClick={() => setPinned(!pinned)}
          className={`${pinned ? 'bg-blue-700 border-blue-500' : 'bg-slate-800 border-slate-600'} text-blue-100 border rounded px-2 py-1 text-xs hover:bg-slate-700`}
        >
          Pin
        </button>
      </div>
    </div>
  );
}