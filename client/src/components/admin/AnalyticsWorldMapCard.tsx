// client/src/components/admin/AnalyticsWorldMapCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleSequential, scaleLinear } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";

// --- If your bundler supports JSON imports (Vite/Next), uncomment this and remove geoUrl below
// import countries110m from "world-atlas/countries-110m.json";

// Fallback: CDN topojson (works well with react-simple-maps)
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type CountryRow = { country: string; sessions: number; visitors: number };
type GeoApiResponse = { countries: CountryRow[]; cities: any[] };

// Small helper to append global filters to a URL
function withFilters(url: string, filters: any) {
  const u = new URL(url, window.location.origin);
  if (filters.range?.from) u.searchParams.set("from", filters.range.from);
  if (filters.range?.to) u.searchParams.set("to", filters.range.to);
  if (filters.language) u.searchParams.set("lang", filters.language);
  if (filters.source) u.searchParams.set("source", filters.source);
  if (filters.device) u.searchParams.set("device", filters.device);
  return u.pathname + u.search;
}

// Basic normalization to improve country name matching against topojson props.NAME/NAME_LONG
function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function AnalyticsWorldMapCard() {
  const { filters } = React.useContext(GlobalFilterContext);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<CountryRow[]>([]);

  // Tooltip state
  const [tooltip, setTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    name?: string;
    sessions?: number;
    visitors?: number;
  }>({ visible: false, x: 0, y: 0 });

  // Map viewport
  const [position, setPosition] = React.useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [0, 20],
    zoom: 1,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withFilters("/api/analytics/geo?limit=250", filters));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: GeoApiResponse = await res.json();
      setRows((json.countries || []).map((r) => ({
        country: r.country ?? "—",
        sessions: Number(r.sessions ?? 0),
        visitors: Number(r.visitors ?? 0),
      })));
    } catch (e: any) {
      setError(e.message || "Failed to load geo data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters)]);

  // Build a quick map: normalized country name -> {sessions, visitors}
  const dataMap = React.useMemo(() => {
    const m = new Map<string, { sessions: number; visitors: number }>();
    for (const r of rows) m.set(norm(r.country), { sessions: r.sessions, visitors: r.visitors });
    return m;
  }, [rows]);

  // Color scale based on sessions
  const maxSessions = React.useMemo(() => rows.reduce((acc, r) => Math.max(acc, r.sessions), 0), [rows]);
  // Use a sequential scale; clamp to avoid extremes
  const color = React.useMemo(() => {
    if (maxSessions <= 0) {
      // Neutral gray scale when no data
      return scaleLinear<string>().domain([0, 1]).range(["#f3f4f6", "#e5e7eb"]);
    }
    return scaleSequential(interpolateBlues).domain([0, maxSessions || 1]);
  }, [maxSessions]);

  function resetView() {
    setPosition({ coordinates: [0, 20], zoom: 1 });
  }

  return (
    <Card className="w-full relative">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>World Map — Sessions by Country</CardTitle>
        <button
          onClick={resetView}
          className="h-8 rounded-md border px-3 text-sm hover:bg-muted"
          title="Reset view"
        >
          Reset
        </button>
      </CardHeader>

      <CardContent className="relative">
        {loading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : error ? (
          <div className="rounded-md border border-red-300 p-3 text-sm text-red-700">{error}</div>
        ) : (
          <div className="relative">
            <div className="h-[420px] w-full">
              <ComposableMap projectionConfig={{ scale: 140 }}>
                <ZoomableGroup
                  zoom={position.zoom}
                  center={position.coordinates}
                  onMoveEnd={(pos: any) =>
                    setPosition({ coordinates: pos.coordinates as [number, number], zoom: pos.zoom })
                  }
                >
                  <Geographies geography={geoUrl /* or countries110m as any */}>
                    {({ geographies }: any) =>
                      geographies.map((geo: any) => {
                        const props: any = geo.properties || {};
                        const namesToTry = [
                          props.NAME_LONG,
                          props.ADMIN,
                          props.NAME,
                          props.BRK_NAME,
                          props.FORMAL_EN,
                        ].filter(Boolean);
                        // Find first matching analytics row by normalized name
                        let datum: { sessions: number; visitors: number } | undefined;
                        for (const name of namesToTry) {
                          const hit = dataMap.get(norm(String(name)));
                          if (hit) { datum = hit; break; }
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
                              const name =
                                namesToTry.find((n: string) => !!n) || "Unknown";
                              setTooltip({
                                visible: true,
                                x: evt.clientX,
                                y: evt.clientY,
                                name: String(name),
                                sessions,
                                visitors: datum?.visitors ?? 0,
                              });
                            }}
                            onMouseMove={(evt: any) => {
                              setTooltip((t) => ({ ...t, x: evt.clientX, y: evt.clientY }));
                            }}
                            onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
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

            {/* Tooltip */}
            {tooltip.visible && (
              <div
                className="pointer-events-none absolute z-10 rounded-md border bg-white p-2 text-xs shadow"
                style={{
                  top: tooltip.y + 12,
                  left: tooltip.x + 12,
                }}
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