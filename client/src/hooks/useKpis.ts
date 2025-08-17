import { useEffect, useMemo, useState, useCallback, useRef } from "react";

type Kpis = {
  plays: number;
  completes: number;
  totals: { watchTimeSeconds: number };
  avgWatchSeconds: number;
  completionRate: number; // 0–100
  topLocale: { locale: string; plays: number };
};

function ymd(d: Date) { return d.toISOString().slice(0,10); }

function prevPeriod(startYmd: string, endYmd: string) {
  const start = new Date(startYmd);
  const end = new Date(endYmd);
  const days = Math.round((+end - +start) / 86400000) + 1;
  const prevEnd = new Date(+start - 86400000);
  const prevStart = new Date(+prevEnd - (days - 1) * 86400000);
  return { start: ymd(prevStart), end: ymd(prevEnd) };
}

async function fetchKpis(startDate: string, endDate: string, locale: string, signal?: AbortSignal): Promise<Kpis> {
  const url = new URL("/api/analytics/dashboard", window.location.origin);
  url.searchParams.set("dateFrom", startDate);
  url.searchParams.set("dateTo", endDate);
  if (locale !== "all") {
    url.searchParams.set("locale", locale);
  }
  
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  const dashboardData = await res.json();
  
  // Transform dashboard data to KPI format
  const totalViews = dashboardData.overview?.totalViews || 0;
  const totalWatchTime = dashboardData.overview?.totalWatchTime || 0;
  const avgWatchTime = totalViews > 0 ? Math.round(totalWatchTime / totalViews) : 0;
  
  // Calculate completion rate from video performance data
  const videoPerf = dashboardData.videoPerformance || [];
  const completionRates = videoPerf.map((v: any) => v.average_completion_rate || 0);
  const avgCompletionRate = completionRates.length > 0 
    ? completionRates.reduce((a: number, b: number) => a + b, 0) / completionRates.length 
    : 0;
  
  // Find top locale from language breakdown
  const languages = dashboardData.languageBreakdown || [];
  const topLanguage = languages.reduce((top: any, curr: any) => 
    (curr.sessions > (top?.sessions || 0)) ? curr : top, null
  );
  
  return {
    plays: totalViews,
    completes: videoPerf.filter((v: any) => v.average_completion_rate > 90).length,
    totals: { watchTimeSeconds: totalWatchTime },
    avgWatchSeconds: avgWatchTime,
    completionRate: Math.round(avgCompletionRate),
    topLocale: { 
      locale: topLanguage?.language || 'Unknown', 
      plays: topLanguage?.sessions || 0 
    }
  };
}

export function useKpis(params: { startDate: string; endDate: string; locale: "all"|"fr-FR"|"en-US" }) {
  const { startDate, endDate, locale } = params;
  const [current, setCurrent] = useState<Kpis | null>(null);
  const [previous, setPrevious] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // trigger refetch

  const reload = useCallback(() => setBump(b => b + 1), []);

  // Ref to store the current abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let alive = true;
    setLoading(true);
    setError(null);
    
    const { start: ps, end: pe } = prevPeriod(startDate, endDate);

    Promise.all([
      fetchKpis(startDate, endDate, locale, abortController.signal), 
      fetchKpis(ps, pe, locale, abortController.signal)
    ])
      .then(([cur, prev]) => { 
        if (alive && !abortController.signal.aborted) { 
          console.log('🔍 useKpis - RAW DATA:');
          console.log('  Current API response:', JSON.stringify(cur, null, 2));
          console.log('  Previous API response:', JSON.stringify(prev, null, 2));
          console.log('  Current plays value:', cur?.plays);
          console.log('  Previous plays value:', prev?.plays);
          setCurrent(cur); 
          setPrevious(prev); 
        }
      })
      .catch(e => { 
        if (alive && !abortController.signal.aborted && e.name !== 'AbortError') {
          setError(String(e.message || e)); 
        }
      })
      .finally(() => { if (alive && !abortController.signal.aborted) setLoading(false); });

    return () => { 
      alive = false;
      abortController.abort();
    };
  }, [startDate, endDate, locale, bump]);

  const withDeltas = useMemo(() => {
    if (!current) return null;
    if (!previous) {
      // If we have current but no previous data, show current with 0% delta
      const result = {
        plays: { value: current.plays ?? 0, delta: 0 },
        avgWatchSeconds: { value: current.avgWatchSeconds ?? 0, delta: 0 },
        completionRate: { value: current.completionRate ?? 0, delta: 0 },
        topLocale: current.topLocale ?? { locale: 'n/a', plays: 0 },
        watchTimeSeconds: { value: current.totals?.watchTimeSeconds ?? 0, delta: 0 }
      };
      return result;
    }

    // Improved delta calculation that handles no historical data gracefully
    const delta = (now: number, prev: number) => {
      if (prev === 0) {
        // If no previous data and current has data, show "New" instead of 100%
        return now > 0 ? 100 : 0;
      }
      return ((now - prev) / prev) * 100;
    };

    const result = {
      plays: { value: current.plays ?? 0, delta: delta(current.plays ?? 0, previous.plays ?? 0) },
      avgWatchSeconds: {
        value: current.avgWatchSeconds ?? 0,
        delta: delta(current.avgWatchSeconds ?? 0, previous.avgWatchSeconds ?? 0)
      },
      completionRate: {
        value: current.completionRate ?? 0,
        delta: delta(current.completionRate ?? 0, previous.completionRate ?? 0)
      },
      topLocale: current.topLocale ?? { locale: 'n/a', plays: 0 },
      watchTimeSeconds: {
        value: current.totals?.watchTimeSeconds ?? 0,
        delta: delta(current.totals?.watchTimeSeconds ?? 0, previous.totals?.watchTimeSeconds ?? 0)
      }
    };
    
    console.log('🔍 useKpis - PROCESSED DATA:');
    console.log('  Final result plays:', result.plays.value);
    console.log('  Raw current plays:', current.plays);
    console.log('  Raw previous plays:', previous.plays);
    console.log('  Complete result:', JSON.stringify(result, null, 2));
    
    return result;
  }, [current, previous]);

  return { loading, error, data: withDeltas, reload };
}