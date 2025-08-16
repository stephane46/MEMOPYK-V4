import { useEffect, useMemo, useState } from "react";

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
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useKpis(params: { startDate: string; endDate: string; locale: "all"|"fr-FR"|"en-US" }) {
  const { startDate, endDate, locale } = params;
  const [current, setCurrent] = useState<Kpis | null>(null);
  const [previous, setPrevious] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const { start: ps, end: pe } = prevPeriod(startDate, endDate);

    Promise.all([fetchKpis(startDate, endDate, locale), fetchKpis(ps, pe, locale)])
      .then(([cur, prev]) => { if (alive) { setCurrent(cur); setPrevious(prev); } })
      .catch(e => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [startDate, endDate, locale]);

  const withDeltas = useMemo(() => {
    if (!current || !previous) return null;

    const delta = (now: number, prev: number) =>
      prev === 0 ? (now > 0 ? 100 : 0) : ((now - prev) / prev) * 100;

    return {
      plays: { value: current.plays, delta: delta(current.plays, previous.plays) },
      avgWatchSeconds: {
        value: current.avgWatchSeconds,
        delta: delta(current.avgWatchSeconds, previous.avgWatchSeconds)
      },
      completionRate: {
        value: current.completionRate,
        delta: delta(current.completionRate, previous.completionRate)
      },
      topLocale: current.topLocale,
      watchTimeSeconds: {
        value: current.totals.watchTimeSeconds,
        delta: delta(current.totals.watchTimeSeconds, previous.totals.watchTimeSeconds)
      }
    };
  }, [current, previous]);

  return { loading, error, data: withDeltas };
}