// client/src/hooks/useTopVideos.ts
import { useEffect, useState, useCallback } from "react";

export type TopVideoRow = {
  video_id: string;
  title: string;
  plays: number;
  avgWatchSeconds: number;
  reach50Pct: number;
  completePct: number;
};

export function useTopVideos(params: { startDate: string; endDate: string; locale: "all" | "fr-FR" | "en-US" }) {
  const { startDate, endDate, locale } = params;
  const [data, setData] = useState<TopVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // trigger refetch

  const reload = useCallback(() => setBump(b => b + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const url = new URL("/api/ga4/top-videos", window.location.origin);
    url.searchParams.set("startDate", startDate);
    url.searchParams.set("endDate", endDate);
    url.searchParams.set("locale", locale);

    fetch(url.toString())
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => { if (alive) setData(json); })
      .catch((e) => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [startDate, endDate, locale, bump]);

  return { data, loading, error, reload };
}