import { useEffect, useMemo, useState, useCallback } from "react";

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

async function fetchKpis(startDate: string, endDate: string, locale: string): Promise<Kpis> {
  const url = new URL("/api/ga4/kpis", window.location.origin);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("locale", locale);
  
  console.log(`📡 Fetching KPIs: ${url.toString()}`);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  console.log(`📥 KPI Response: plays=${data.plays}, completes=${data.completes} for ${startDate}-${endDate}`);
  return data;
}

export function useKpis(params: { startDate: string; endDate: string; locale: "all"|"fr-FR"|"en-US" }) {
  const { startDate, endDate, locale } = params;
  const [current, setCurrent] = useState<Kpis | null>(null);
  const [previous, setPrevious] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // trigger refetch

  const reload = useCallback(() => setBump(b => b + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    
    // Debug logging to track race conditions
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🔄 KPI Request ${requestId}: ${startDate} to ${endDate}, locale: ${locale}`);
    
    const { start: ps, end: pe } = prevPeriod(startDate, endDate);

    Promise.all([fetchKpis(startDate, endDate, locale), fetchKpis(ps, pe, locale)])
      .then(([cur, prev]) => { 
        if (alive) { 
          console.log(`✅ KPI Response ${requestId}: plays=${cur.plays}, completes=${cur.completes}`);
          setCurrent(cur); 
          setPrevious(prev); 
        } else {
          console.log(`🚫 KPI Response ${requestId}: discarded (component unmounted)`);
        }
      })
      .catch(e => { 
        if (alive) {
          console.error(`❌ KPI Error ${requestId}:`, e.message);
          setError(String(e.message || e)); 
        }
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { 
      console.log(`🛑 KPI Cleanup ${requestId}: marking as dead`);
      alive = false; 
    };
  }, [startDate, endDate, locale, bump]);

  const withDeltas = useMemo(() => {
    if (!current || !previous) return null;

    const delta = (now: number, prev: number) =>
      prev === 0 ? (now > 0 ? 100 : 0) : ((now - prev) / prev) * 100;

    return {
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
  }, [current, previous]);

  return { loading, error, data: withDeltas, reload };
}