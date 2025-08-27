import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import ExportRangeControls from "./ExportRangeControls";
import { GlobalFilterContext } from "./GlobalFilterContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type CountryRow = { country: string; sessions: number; visitors: number };
type CityRow = { country: string; city: string; sessions: number; visitors: number };
type ApiResponse = { countries: CountryRow[]; cities: CityRow[] };

// Helper function to append global range to API URLs
function withRange(url: string, range: {from?: string; to?: string}) {
  const u = new URL(url, window.location.origin);
  if (range.from) u.searchParams.set("from", range.from);
  if (range.to) u.searchParams.set("to", range.to);
  return u.pathname + u.search; // relative
}

async function fetchGeo(limit = 50, range: {from?: string; to?: string}): Promise<ApiResponse> {
  const res = await fetch(withRange(`/api/analytics/geo?limit=${limit}`, range));
  if (!res.ok) throw new Error(`Geo fetch failed: ${res.status}`);
  return res.json();
}

export default function AnalyticsGeoDistributionCard() {
  const { range } = React.useContext(GlobalFilterContext);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [countries, setCountries] = React.useState<CountryRow[]>([]);
  const [cities, setCities] = React.useState<CityRow[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGeo(50, range);
      setCountries((data.countries || []).sort((a,b)=> (b.sessions ?? 0) - (a.sessions ?? 0)));
      setCities((data.cities || []).sort((a,b)=> (b.sessions ?? 0) - (a.sessions ?? 0)));
    } catch (e:any) {
      setError(e?.message || "Failed to load geo data.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  React.useEffect(() => { load(); }, [load]);


  const countryChart = countries.slice(0, 10).map(c => ({
    name: c.country || "—",
    sessions: c.sessions ?? 0,
    visitors: c.visitors ?? 0,
  }));

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Geo Distribution</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={load} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* NEW: range CSV export */}
          <ExportRangeControls report="geo" />
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
            {/* Top countries bar chart */}
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryChart} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" name="Sessions" fill="#D67C4A" />
                  <Bar dataKey="visitors" name="Visitors" fill="#89BAD9" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cities table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-1">Country</th>
                    <th className="px-2 py-1">City</th>
                    <th className="px-2 py-1">Sessions</th>
                    <th className="px-2 py-1">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((r, i) => (
                    <tr key={`${r.country}-${r.city}-${i}`} className="border-t">
                      <td className="px-2 py-1">{r.country || "—"}</td>
                      <td className="px-2 py-1">{r.city || "—"}</td>
                      <td className="px-2 py-1">{r.sessions ?? 0}</td>
                      <td className="px-2 py-1">{r.visitors ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Data source: GA4 → BigQuery → Supabase (views underpinning <code>analytics_geographic_distribution</code>).
      </CardFooter>
    </Card>
  );
}