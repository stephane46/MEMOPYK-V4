import { useEffect, useState } from "react";
import { fetchReport } from "../data/ga4Report";
import type { ReportParams } from "../data/types";

export function useGa4Report<T>(params: ReportParams) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchReport<T>(params)
      .then((res) => { 
        if (!cancelled) {
          setData(res);
        }
      })
      .catch((e) => { 
        if (!cancelled) {
          setError(e);
        }
      })
      .finally(() => { 
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [JSON.stringify(params)]); // stable enough for our small filter set

  return { data, loading, error };
}