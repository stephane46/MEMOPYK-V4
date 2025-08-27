import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import ExportRangeControls from "./ExportRangeControls";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { withFilters } from "@/lib/withFilters";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// Using fetch directly as per the existing pattern in the codebase
async function fetchOverview(days: number): Promise<any[]> {
  const res = await fetch(`/api/analytics/overview?days=${days}`);
  if (!res.ok) throw new Error(`Overview fetch failed: ${res.status}`);
  return res.json();
}

function formatDayLabel(isoDate: string) {
  // French date formatting (DD/MM)
  const d = new Date(isoDate + "T00:00:00Z"); // avoid TZ shifts
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

function secondsToHMS(sec?: number) {
  if (!sec && sec !== 0) return "—";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

// helper to convert "days" -> [from,to] (UTC, inclusive)
function rangeFromDays(days: number): { from?: string; to?: string } {
  if (days <= 0) return {};
  const end = new Date(); end.setUTCHours(0,0,0,0);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  const to = end.toISOString().slice(0,10);
  const from = start.toISOString().slice(0,10);
  return { from, to };
}

export default function AnalyticsDailyOverviewCard() {
  const { filters, comparison } = React.useContext(GlobalFilterContext);
  const [days, setDays] = React.useState<number>(30);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [data, setData] = React.useState<any[]>([]);
  const [comparisonData, setComparisonData] = React.useState<any[]>([]);
  const [isComparisonMode, setIsComparisonMode] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Add comparison parameters if enabled
      let url = withFilters(`/api/analytics/overview?days=${days}`, filters);
      if (comparison.enabled) {
        url += `&compare=true&compareMode=${comparison.mode}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Overview fetch failed: ${res.status}`);
      const result = await res.json();
      
      function normalizeData(rows: any[]) {
        return rows
          .map((r: any) => ({
            day: r.day, // ISO date (YYYY-MM-DD)
            label: formatDayLabel(r.day),
            sessions: Number(r.sessions ?? 0),
            uniqueVisitors: Number((r.unique_visitors ?? r.uniqueVisitors) ?? 0),
            returningVisitors: Number((r.returning_visitors ?? r.returningVisitors) ?? 0),
            avgSessionDuration: Number(
              (r.avg_session_duration ?? r.avgSessionDuration) ?? 0
            ),
          }))
          .sort((a: any, b: any) => (a.day < b.day ? -1 : 1));
      }
      
      if (result.baseline && result.comparison) {
        // Comparison mode response
        setData(normalizeData(result.baseline));
        setComparisonData(normalizeData(result.comparison));
        setIsComparisonMode(true);
      } else {
        // Normal single dataset response
        setData(normalizeData(result));
        setComparisonData([]);
        setIsComparisonMode(false);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load daily overview.");
    } finally {
      setLoading(false);
    }
  }, [days, filters, comparison]);

  React.useEffect(() => {
    load();
  }, [load]);



  const latest = data.length ? data[data.length - 1] : null;
  const latestComparison = comparisonData.length ? comparisonData[comparisonData.length - 1] : null;

  // Helper function to calculate percentage delta
  function calculateDelta(current: number, previous: number): { value: number; isPositive: boolean } | null {
    if (!previous || previous === 0) return null;
    const delta = ((current - previous) / previous) * 100;
    return { value: Math.abs(delta), isPositive: delta >= 0 };
  }

  // Get comparison labels
  function getComparisonLabels() {
    switch (comparison.mode) {
      case "period": return ["Current", "Previous"];
      case "language": return ["French", "English"];
      case "device": return ["Mobile", "Desktop"];
      case "source": return ["Google", "Direct"];
      default: return ["Baseline", "Comparison"];
    }
  }

  const [baselineLabel, comparisonLabel] = getComparisonLabels();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Daily Overview</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Yesterday</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* New: range-based export */}
          <ExportRangeControls report="overview" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[260px] w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : days === 1 ? (
          // Yesterday-only: stat cards only
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Sessions</div>
              <div className="text-xl font-semibold">{latest?.sessions ?? "—"}</div>
              {isComparisonMode && latestComparison && (
                <div className="text-xs text-muted-foreground mt-1">
                  vs {comparisonLabel}: {latestComparison.sessions}
                  {(() => {
                    const delta = calculateDelta(latest?.sessions || 0, latestComparison.sessions);
                    return delta ? (
                      <span className={`ml-1 ${delta.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {delta.isPositive ? '▲' : '▼'} {delta.value.toFixed(1)}%
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Unique Visitors</div>
              <div className="text-xl font-semibold">{latest?.uniqueVisitors ?? "—"}</div>
              {isComparisonMode && latestComparison && (
                <div className="text-xs text-muted-foreground mt-1">
                  vs {comparisonLabel}: {latestComparison.uniqueVisitors}
                  {(() => {
                    const delta = calculateDelta(latest?.uniqueVisitors || 0, latestComparison.uniqueVisitors);
                    return delta ? (
                      <span className={`ml-1 ${delta.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {delta.isPositive ? '▲' : '▼'} {delta.value.toFixed(1)}%
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Returning Visitors</div>
              <div className="text-xl font-semibold">{latest?.returningVisitors ?? "—"}</div>
              {isComparisonMode && latestComparison && (
                <div className="text-xs text-muted-foreground mt-1">
                  vs {comparisonLabel}: {latestComparison.returningVisitors}
                  {(() => {
                    const delta = calculateDelta(latest?.returningVisitors || 0, latestComparison.returningVisitors);
                    return delta ? (
                      <span className={`ml-1 ${delta.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {delta.isPositive ? '▲' : '▼'} {delta.value.toFixed(1)}%
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground">Avg. Session Duration</div>
              <div className="text-xl font-semibold">
                {secondsToHMS(latest?.avgSessionDuration)}
              </div>
              {isComparisonMode && latestComparison && (
                <div className="text-xs text-muted-foreground mt-1">
                  vs {comparisonLabel}: {secondsToHMS(latestComparison.avgSessionDuration)}
                  {(() => {
                    const delta = calculateDelta(latest?.avgSessionDuration || 0, latestComparison.avgSessionDuration);
                    return delta ? (
                      <span className={`ml-1 ${delta.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {delta.isPositive ? '▲' : '▼'} {delta.value.toFixed(1)}%
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Normal chart mode
          <>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Latest Sessions</div>
                <div className="text-xl font-semibold">
                  {latest ? latest.sessions : "—"}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Latest Unique Visitors</div>
                <div className="text-xl font-semibold">
                  {latest ? latest.uniqueVisitors : "—"}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Avg. Session Duration (latest)</div>
                <div className="text-xl font-semibold">
                  {latest ? secondsToHMS(latest.avgSessionDuration) : "—"}
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {isComparisonMode ? (
                  // Comparison mode: merge both datasets for side-by-side comparison
                  <LineChart 
                    data={data.map((d, i) => ({
                      ...d,
                      baselineSessions: d.sessions,
                      baselineVisitors: d.uniqueVisitors,
                      comparisonSessions: comparisonData[i]?.sessions || 0,
                      comparisonVisitors: comparisonData[i]?.uniqueVisitors || 0,
                    }))} 
                    margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name.includes('baseline')) return [value, `${baselineLabel} ${name.replace('baseline', '').toLowerCase()}`];
                        if (name.includes('comparison')) return [value, `${comparisonLabel} ${name.replace('comparison', '').toLowerCase()}`];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="baselineSessions"
                      name={`${baselineLabel} Sessions`}
                      stroke="#2563eb"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="comparisonSessions"
                      name={`${comparisonLabel} Sessions`}
                      stroke="#f97316"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="baselineVisitors"
                      name={`${baselineLabel} Visitors`}
                      stroke="#2563eb"
                      strokeDasharray="5 5"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="comparisonVisitors"
                      name={`${comparisonLabel} Visitors`}
                      stroke="#f97316"
                      strokeDasharray="5 5"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                ) : (
                  // Normal single dataset mode
                  <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sessions"
                      name="Sessions"
                      stroke="#2563eb"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="uniqueVisitors"
                      name="Unique visitors"
                      stroke="#2563eb"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Data source: GA4 → BigQuery → Supabase (`analytics_daily_overview` view).
      </CardFooter>
    </Card>
  );
}