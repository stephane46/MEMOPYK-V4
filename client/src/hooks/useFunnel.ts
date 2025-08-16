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

    // Fetch funnel data directly - now returns {plays, half, completes} format
    fetch(`/api/ga4/funnel?startDate=${startDate}&endDate=${endDate}&locale=${locale}`)
      .then(r => r.json())
      .then(data => { if (alive) setData(data); })
      .catch(e => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [startDate, endDate, locale]);

  return { data, loading, error };
}