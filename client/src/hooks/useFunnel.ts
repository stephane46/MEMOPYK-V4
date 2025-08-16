import { useEffect, useState } from "react";

type FunnelData = { plays: number; half: number; completes: number };

export function useFunnel(params: { startDate: string; endDate: string; locale: string }) {
  const { startDate, endDate, locale } = params;
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    // Fetch both funnel progress data and plays count
    Promise.all([
      fetch(`/api/ga4/funnel?startDate=${startDate}&endDate=${endDate}&locale=${locale}`).then(r => r.json()),
      fetch(`/api/ga4/kpis?startDate=${startDate}&endDate=${endDate}&locale=${locale}`).then(r => r.json())
    ])
      .then(([funnelRes, kpisRes]) => {
        if (alive) {
          // Transform backend format {p25, p50, p75, p100} to expected format
          const transformed: FunnelData = {
            plays: kpisRes.plays || 0,
            half: funnelRes.p50 || 0,  // 50% progress
            completes: funnelRes.p100 || 0  // 100% completion
          };
          setData(transformed);
        }
      })
      .catch(e => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [startDate, endDate, locale]);

  return { data, loading, error };
}