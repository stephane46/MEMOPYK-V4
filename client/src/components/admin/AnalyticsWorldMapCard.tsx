// client/src/components/admin/AnalyticsWorldMapCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleSequential, scaleLinear } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";
import { geoCentroid } from "d3-geo";

type CountryRow = { country: string; sessions: number; visitors: number };
type CityRow = { country: string; city: string; sessions: number; visitors: number };
type GeoApiResponse = { countries: CountryRow[]; cities: CityRow[] };

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- Helpers
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
function DeltaBadge({ v }: { v: number | null }) {
  if (v == null) return null;
  const pos = v >= 0;
  return <span className={`ml-2 text-xs ${pos ? "text-green-600" : "text-red-600"}`}>{pos ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%</span>;
}
function deltaPct(curr?: number, prev?: number) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export default function AnalyticsWorldMapCard() {
  const { filters } = React.useContext(GlobalFilterContext);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [countries, setCountries] = React.useState<CountryRow[]>([]);
  const [cities, setCities] = React.useState<CityRow[]>([]); // baseline list (if backend returns it)

  // Tooltip state
  const [tooltip, setTooltip] = React.useState<{ visible: boolean; x: number; y: number; name?: string; sessions?: number; visitors?: number; }>({ visible: false, x: 0, y: 0 });

  // Map viewport
  const [position, setPosition] = React.useState<{ coordinates: [number, number]; zoom: number }>({ coordinates: [0, 20], zoom: 1 });

  // Selection + side panel
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [countryCities, setCountryCities] = React.useState<CityRow[] | null>(null);
  const [loadingCountry, setLoadingCountry] = React.useState(false);

  // Load base geo data
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withFilters("/api/analytics/geo?limit=250", filters));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: GeoApiResponse = await res.json();
      setCountries((json.countries || []).map(r => ({
        country: r.country ?? "—",
        sessions: Number(r.sessions ?? 0),
        visitors: Number(r.visitors ?? 0),
      })));
      setCities(json.cities || []);
    } catch (e: any) {
      setError(e.message || "Failed to load geo data.");
      setCountries([]);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters)]);

  // Quick lookup map for countries
  const countryData = React.useMemo(() => {
    const m = new Map<string, { sessions: number; visitors: number }>();
    for (const r of countries) m.set(norm(r.country), { sessions: r.sessions, visitors: r.visitors });
    return m;
  }, [countries]);

  // Color scale
  const maxSessions = React.useMemo(() => countries.reduce((acc, r) => Math.max(acc, r.sessions), 0), [countries]);
  const color = React.useMemo(() => {
    if (maxSessions <= 0) return scaleLinear<string>().domain([0, 1]).range(["#f3f4f6", "#e5e7eb"]);
    return scaleSequential(interpolateBlues).domain([0, maxSessions || 1]);
  }, [maxSessions]);

  function resetView() {
    setPosition({ coordinates: [0, 20], zoom: 1 });
    setSelectedCountry(null);
    setCountryCities(null);
  }

  // Load cities for a given country (server preferred; falls back to client filter)
  async function loadCountryCities(countryName: string) {
    setLoadingCountry(true);
    try {
      // Preferred: backend supports ?country=
      const url = withFilters("/api/analytics/geo?limit=250", filters, { country: countryName });
      const res = await fetch(url);
      if (res.ok) {
        const json: GeoApiResponse = await res.json();
        const list = json.cities?.filter(c => (c.country ?? "").toLowerCase() === countryName.toLowerCase()) || [];
        if (list.length) { setCountryCities(list); return; }
      }
      // Fallback: filter client-side from preloaded cities
      const fallback = cities.filter(c => (c.country ?? "").toLowerCase() === countryName.toLowerCase());
      setCountryCities(fallback);
    } catch {
      setCountryCities(null);
    } finally {
      setLoadingCountry(false);
    }
  }

  return (
    <Card className="w-full relative">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>World Map — Sessions by Country</CardTitle>
        <button onClick={resetView} className="h-8 rounded-md border px-3 text-sm hover:bg-muted" title="Reset view">Reset</button>
      </CardHeader>

      <CardContent className="relative">
        {loading ? (
          <Skeleton className="h-[480px] w-full" />
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : (
          <div className="relative">
            {/* Map + Panel layout */}
            <div className="flex flex-col lg:flex-row gap-4">
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
                            let datum: { sessions: number; visitors: number } | undefined;
                            let chosenName = String(namesToTry[0] || "Unknown");
                            for (const name of namesToTry) {
                              const hit = countryData.get(norm(String(name)));
                              if (hit) { datum = hit; chosenName = String(name); break; }
                            }
                            const sessions = datum?.sessions ?? 0;
                            const fill = sessions > 0 ? (color as any)(sessions) : "#f3f4f6";

                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill={fill}
                                stroke="#ffffff"
                                strokeWidth={0.5}
                                style={{
                                  default: { outline: "none", cursor: "grab" },
                                  hover:   { outline: "none", cursor: "pointer" },
                                  pressed: { outline: "none", cursor: "grabbing" },
                                }}
                                onMouseEnter={(evt: any) => {
                                  setTooltip({ visible: true, x: evt.clientX, y: evt.clientY, name: chosenName, sessions, visitors: datum?.visitors ?? 0 });
                                }}
                                onMouseMove={(evt: any) => setTooltip((t) => ({ ...t, x: evt.clientX, y: evt.clientY }))}
                                onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                                onClick={() => {
                                  // zoom to country centroid
                                  const [cx, cy] = geoCentroid(geo as any) as [number, number];
                                  setPosition({ coordinates: [cx, cy], zoom: 2.5 });
                                  setSelectedCountry(chosenName);
                                  loadCountryCities(chosenName);
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
                  <span>Sessions</span>
                  <div className="flex h-2 w-40 overflow-hidden rounded">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const v = (i / 19) * (maxSessions || 1);
                      const bg = maxSessions > 0 ? (color as any)(v) : "#e5e7eb";
                      return <div key={i} style={{ width: "5%", background: bg }} />;
                    })}
                  </div>
                  <span>0</span>
                  <span className="ml-auto">Max: {maxSessions}</span>
                </div>
              </div>

              {/* Side Panel */}
              {selectedCountry && (
                <div className="lg:w-1/3 w-full border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{selectedCountry}</div>
                    <button onClick={() => { setSelectedCountry(null); setCountryCities(null); }} className="text-xs underline">Close</button>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">Top Cities (sessions & visitors)</div>

                  {loadingCountry ? (
                    <div className="mt-2 space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : !countryCities || countryCities.length === 0 ? (
                    <div className="mt-2 text-sm text-muted-foreground">No city data for this country and filters.</div>
                  ) : (
                    <div className="mt-2 max-h-[340px] overflow-auto">
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
            </div>

            {/* Tooltip */}
            {tooltip.visible && (
              <div
                className="pointer-events-none absolute z-10 rounded-md border bg-white p-2 text-xs shadow"
                style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}
              >
                <div className="font-medium">{tooltip.name}</div>
                <div>Sessions: <span className="font-mono">{tooltip.sessions ?? 0}</span></div>
                <div>Visitors: <span className="font-mono">{tooltip.visitors ?? 0}</span></div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}