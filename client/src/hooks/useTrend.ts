import { useEffect, useState } from "react";

type TrendData = { date: string; plays: number; avgWatch: number };

export function useTrend(params: { startDate: string; endDate: string; locale: string }) {
  const { startDate, endDate, locale } = params;
  const [data, setData] = useState<TrendData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    // Fetch trend data from backend
    fetch(`/api/ga4/trend?startDate=${startDate}&endDate=${endDate}&locale=${locale}`)
      .then(r => r.json())
      .then(data => { if (alive) setData(data); })
      .catch(e => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [startDate, endDate, locale]);

  return { data, loading, error };
}