import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import ExportRangeControls from "./ExportRangeControls";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { withFilters } from "@/lib/withFilters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type CtaSummary = { cta_id: string; total_clicks: number; unique_users: number };
type CtaByPage = { cta_id: string; page_path: string; clicks: number; impressions?: number | null; ctr?: number | null };
type ApiResponse = { summary: CtaSummary[]; by_page: CtaByPage[] };

async function fetchCtaPerformance(filters: any): Promise<ApiResponse> {
  const res = await fetch(withFilters("/api/analytics/cta-performance", filters));
  if (!res.ok) throw new Error(`CTA performance fetch failed: ${res.status}`);
  return res.json();
}

function pct(n?: number | null) {
  if (n == null || isNaN(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

export default function AnalyticsCtaPerformanceCard() {
  const { filters } = React.useContext(GlobalFilterContext);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<CtaSummary[]>([]);
  const [byPage, setByPage] = React.useState<CtaByPage[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCtaPerformance(filters);
      setSummary((data.summary || []).sort((a,b) => (b.total_clicks ?? 0) - (a.total_clicks ?? 0)));
      setByPage(data.by_page || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load CTA performance.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    load();
  }, [load]);


  const chartData = summary.map((s) => ({
    cta_id: s.cta_id,
    clicks: s.total_clicks ?? 0,
    unique: s.unique_users ?? 0,
  }));

  const hasCTR = byPage.some((r) => typeof r.ctr === "number");

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>CTA Performance</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={load} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* NEW: range CSV export */}
          <ExportRangeControls report="cta" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-[260px] w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : (
          <>
            {/* Bar chart: total clicks & unique users by CTA */}
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cta_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="clicks" name="Clicks" fill="#D67C4A" />
                  <Bar dataKey="unique" name="Unique users" fill="#89BAD9" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table: per-page breakdown with CTR if available */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-1">CTA</th>
                    <th className="px-2 py-1">Page</th>
                    <th className="px-2 py-1">Clicks</th>
                    <th className="px-2 py-1">Impressions</th>
                    {hasCTR && <th className="px-2 py-1">CTR</th>}
                  </tr>
                </thead>
                <tbody>
                  {byPage.map((r, i) => (
                    <tr key={`${r.cta_id}-${r.page_path}-${i}`} className="border-t">
                      <td className="px-2 py-1">{r.cta_id}</td>
                      <td className="px-2 py-1">{r.page_path}</td>
                      <td className="px-2 py-1">{r.clicks ?? 0}</td>
                      <td className="px-2 py-1">{r.impressions ?? "—"}</td>
                      {hasCTR && <td className="px-2 py-1">{pct(r.ctr)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!hasCTR && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Tip: provide <code>impressions</code> in the API (e.g., pageviews of the CTA's page or "cta_impression" events) to enable CTR.
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Data source: GA4 → BigQuery → Supabase (views: <code>analytics_cta_performance</code> + per-page breakdown).
      </CardFooter>
    </Card>
  );
}