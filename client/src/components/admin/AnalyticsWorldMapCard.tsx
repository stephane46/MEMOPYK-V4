// client/src/components/admin/AnalyticsWorldMapCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleSequential, scaleLinear, scaleDiverging } from "d3-scale";
import { interpolateBlues, interpolateRdYlGn } from "d3-scale-chromatic";
import { geoCentroid } from "d3-geo";

type CountryRow = { country: string; sessions: number; visitors: number };
type CityRow = { country: string; city: string; sessions: number; visitors: number };
type GeoApiResponse = { countries: CountryRow[]; cities: CityRow[] };

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- helpers
function withFilters(url: string, filters: any, extra?: Record<string, string>) {
  const u = new URL(url, window.location.origin);
  if (filters.range?.from) u.searchParams.set("from", filters.range.from);
  if (filters.range?.to) u.searchParams.set("to", filters.range.to);
  if (filters.language) u.searchParams.set("lang", filters.language);
  if (filters.source) u.searchParams.set("source", filters.source);
  if (filters.device) u.searchParams.set("device", filters.device);
  if (extra) Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.pathname + u.search;
}
function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function deltaPct(curr?: number, prev?: number) {
  if (curr == null || prev == null || prev === 0) return null;
  return (curr - prev) / prev;
}
function DeltaBadge({ v }: { v: number | null }) {
  if (v == null) return null;
  const pos = v >= 0;
  return <span className={`ml-2 text-xs ${pos ? "text-green-600" : "text-red-600"}`}>{pos ? "▲" : "▼"} {Math.abs(v * 100).toFixed(1)}%</span>;
}

export default function AnalyticsWorldMapCard() {
  const { filters, setFilters, comparison } = React.useContext(GlobalFilterContext);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [baselineCountries, setBaselineCountries] = React.useState<CountryRow[]>([]);
  const [comparisonCountries, setComparisonCountries] = React.useState<CountryRow[] | null>(null);
  const [cities, setCities] = React.useState<CityRow[]>([]);

  const [tooltip, setTooltip] = React.useState<{ visible: boolean; x: number; y: number; name?: string; sessions?: number; visitors?: number; delta?: number | null }>({ visible: false, x: 0, y: 0 });
  const [tooltipLocked, setTooltipLocked] = React.useState(false);

  const [position, setPosition] = React.useState<{ coordinates: [number, number]; zoom: number }>({ coordinates: [0, 20], zoom: 1 });

  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [countryCities, setCountryCities] = React.useState<CityRow[] | null>(null);
  const [loadingCountry, setLoadingCountry] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/analytics/geo?limit=500";
      if (comparison.enabled) url += `&compare=period&periodMode=${comparison.mode}`;
      const res = await fetch(withFilters(url, filters));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (comparison.enabled && json.baseline && json.comparison) {
        setBaselineCountries(json.baseline.countries || []);
        setComparisonCountries(json.comparison.countries || []);
        setCities(json.baseline.cities || []);
      } else {
        setBaselineCountries(json.countries || []);
        setComparisonCountries(null);
        setCities(json.cities || []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load geo data.");
      setBaselineCountries([]); setComparisonCountries(null); setCities([]);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters), comparison.enabled, comparison.mode]);

  // Quick lookup maps
  const baselineMap = React.useMemo(() => {
    const m = new Map<string, CountryRow>();
    for (const r of baselineCountries) m.set(norm(r.country), r);
    return m;
  }, [baselineCountries]);
  const comparisonMap = React.useMemo(() => {
    const m = new Map<string, CountryRow>();
    for (const r of (comparisonCountries ?? [])) m.set(norm(r.country), r);
    return m;
  }, [comparisonCountries]);

  // Max sessions for baseline
  const maxSessions = React.useMemo(() => baselineCountries.reduce((acc, r) => Math.max(acc, r.sessions), 0), [baselineCountries]);

  // Color scales
  const colorSessions = React.useMemo(() => {
    if (maxSessions <= 0) return scaleLinear<string>().domain([0, 1]).range(["#f3f4f6", "#e5e7eb"]);
    return scaleSequential(interpolateBlues).domain([0, maxSessions]);
  }, [maxSessions]);
  const colorDelta = scaleDiverging(interpolateRdYlGn).domain([-1, 0, 1]);

  function resetView() {
    setPosition({ coordinates: [0, 20], zoom: 1 });
    setSelectedCountry(null);
    setCountryCities(null);
    setTooltipLocked(false);
  }

  async function loadCountryCities(countryName: string) {
    setLoadingCountry(true);
    try {
      const url = withFilters("/api/analytics/geo?limit=500", filters, { country: countryName });
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const list = json.cities?.filter((c: any) => norm(c.country) === norm(countryName)) || [];
        setCountryCities(list);
      } else {
        const fallback = cities.filter(c => norm(c.country) === norm(countryName));
        setCountryCities(fallback);
      }
    } catch {
      setCountryCities(null);
    } finally {
      setLoadingCountry(false);
    }
  }

  function exportCountryCsv(country: string) {
    const url = withFilters("/api/analytics/export/csv?report=geo", filters, { country });
    window.open(url, "_blank");
  }

  return (
    <Card className="w-full relative">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>World Map — Sessions by Country</CardTitle>
        <Button variant="outline" size="sm" onClick={resetView}>Reset</Button>
      </CardHeader>

      <CardContent className="relative">
        {loading ? (
          <Skeleton className="h-[480px] w-full" />
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : (
          <div className="relative flex flex-col lg:flex-row gap-4">
            {/* Map */}
            <div className={`w-full ${selectedCountry ? "lg:w-2/3" : ""}`}>
              <div className="h-[420px] w-full">
                <ComposableMap projectionConfig={{ scale: 140 }}>
                  <ZoomableGroup
                    zoom={position.zoom}
                    center={position.coordinates}
                    onMoveEnd={(pos: any) => setPosition({ coordinates: pos.coordinates as [number, number], zoom: pos.zoom })}
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }: any) =>
                        geographies.map((geo: any) => {
                          const props: any = geo.properties || {};
                          const namesToTry = [props.NAME_LONG, props.ADMIN, props.NAME, props.BRK_NAME, props.FORMAL_EN].filter(Boolean);
                          let baseline = undefined;
                          let cmp = undefined;
                          let chosenName = String(namesToTry[0] || "Unknown");
                          for (const n of namesToTry) {
                            const hit = baselineMap.get(norm(n));
                            if (hit) { baseline = hit; chosenName = String(n); break; }
                          }
                          for (const n of namesToTry) {
                            const hit = comparisonMap.get(norm(n));
                            if (hit) { cmp = hit; break; }
                          }
                          const sessions = baseline?.sessions ?? 0;
                          const visitors = baseline?.visitors ?? 0;
                          const delta = comparison.enabled ? deltaPct(sessions, cmp?.sessions) : null;
                          const fill = comparison.enabled
                            ? (delta != null ? (colorDelta as any)(Math.max(-1, Math.min(1, delta))) : "#f3f4f6")
                            : (sessions > 0 ? (colorSessions as any)(sessions) : "#f3f4f6");

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fill}
                              stroke="#fff"
                              strokeWidth={0.5}
                              style={{ default: { outline: "none", cursor: "grab" }, hover: { outline: "none", cursor: "pointer" }, pressed: { outline: "none", cursor: "grabbing" } }}
                              onMouseEnter={(evt: any) => {
                                if (tooltipLocked) return;
                                setTooltip({ visible: true, x: evt.clientX, y: evt.clientY, name: chosenName, sessions, visitors, delta });
                              }}
                              onMouseMove={(evt: any) => {
                                if (tooltipLocked) setTooltip((t) => ({ ...t, x: evt.clientX, y: evt.clientY }));
                              }}
                              onMouseLeave={() => { if (!tooltipLocked) setTooltip((t) => ({ ...t, visible: false })); }}
                              onClick={() => {
                                // lock/unlock tooltip
                                setTooltipLocked(!tooltipLocked);
                                setTooltip((t) => ({ ...t, name: chosenName, sessions, visitors, delta }));
                                // zoom to country centroid
                                const [cx, cy] = geoCentroid(geo as any) as [number, number];
                                setPosition({ coordinates: [cx, cy], zoom: 2.5 });
                                setSelectedCountry(chosenName);
                                loadCountryCities(chosenName);
                              }}
                              onDoubleClick={() => {
                                setPosition((p) => (p.zoom > 1.5 ? { coordinates: [0, 20], zoom: 1 } : { coordinates: geoCentroid(geo as any) as [number, number], zoom: 2.5 }));
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              {/* Legend */}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {comparison.enabled ? (
                  <>
                    <span>Growth / Decline</span>
                    <div className="flex h-2 w-40 overflow-hidden rounded">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const v = (i / 19) * 2 - 1; // -1 → +1
                        const bg = (colorDelta as any)(v);
                        return <div key={i} style={{ width: "5%", background: bg }} />;
                      })}
                    </div>
                    <span>-100%</span>
                    <span className="ml-auto">+100%</span>
                  </>
                ) : (
                  <>
                    <span>Sessions</span>
                    <div className="flex h-2 w-40 overflow-hidden rounded">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const v = (i / 19) * (maxSessions || 1);
                        const bg = (colorSessions as any)(v);
                        return <div key={i} style={{ width: "5%", background: bg }} />;
                      })}
                    </div>
                    <span>0</span>
                    <span className="ml-auto">Max: {maxSessions}</span>
                  </>
                )}
              </div>
            </div>

            {/* Side Panel */}
            {selectedCountry && (
              <div className="lg:w-1/3 w-full border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{selectedCountry}</div>
                  <button onClick={() => { setSelectedCountry(null); setCountryCities(null); setTooltipLocked(false); }} className="text-xs underline">Close</button>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">Top Cities (sessions & visitors)</div>

                {/* Action buttons */}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportCountryCsv(selectedCountry)}>Export CSV</Button>
                  <Button size="sm" variant="outline" onClick={() => setFilters({ ...filters, country: selectedCountry })}>Filter Dashboard</Button>
                </div>

                {loadingCountry ? (
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : !countryCities || countryCities.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">No city data for this country and filters.</div>
                ) : (
                  <div className="mt-2 max-h-[300px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="px-2 py-1">City</th>
                          <th className="px-2 py-1">Sessions</th>
                          <th className="px-2 py-1">Visitors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countryCities
                          .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0))
                          .slice(0, 50)
                          .map((r, i) => (
                            <tr key={(r.city ?? "—") + i} className="border-t">
                              <td className="px-2 py-1">{r.city ?? "—"}</td>
                              <td className="px-2 py-1">{r.sessions ?? 0}</td>
                              <td className="px-2 py-1">{r.visitors ?? 0}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tooltip */}
            {tooltip.visible && (
              <div
                className={`pointer-events-none absolute z-10 rounded-md border bg-white p-2 text-xs shadow ${tooltipLocked ? "ring-2 ring-blue-500" : ""}`}
                style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}
              >
                <div className="font-medium">{tooltip.name} {tooltipLocked && <span className="text-blue-600">(Locked)</span>}</div>
                <div>Sessions: <span className="font-mono">{tooltip.sessions ?? 0}</span></div>
                <div>Visitors: <span className="font-mono">{tooltip.visitors ?? 0}</span></div>
                {comparison.enabled && tooltip.delta && <div>Change: <DeltaBadge v={tooltip.delta} /></div>}
                {!tooltipLocked && <div className="text-xs text-muted-foreground mt-1">Click to lock</div>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}