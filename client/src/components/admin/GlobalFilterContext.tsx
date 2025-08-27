// client/src/components/admin/GlobalFilterContext.tsx
import * as React from "react";

export type DateRange = { from?: string; to?: string };
export type GlobalFilter = {
  range: DateRange;
  language?: string;
  source?: string;
  device?: string;
};

export type ComparisonConfig = {
  enabled: boolean;
  mode: "period" | "language" | "device" | "source";
};

export const GlobalFilterContext = React.createContext<{
  filters: GlobalFilter;
  setFilters: (f: GlobalFilter) => void;
  comparison: ComparisonConfig;
  setComparison: (c: ComparisonConfig) => void;
}>({
  filters: { range: {} },
  setFilters: () => {},
  comparison: { enabled: false, mode: "period" },
  setComparison: () => {},
});

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<GlobalFilter>(() => {
    try {
      return JSON.parse(localStorage.getItem("global-filters") || "{}");
    } catch {
      return { range: {} };
    }
  });

  const [comparison, setComparison] = React.useState<ComparisonConfig>(() => {
    try {
      return JSON.parse(localStorage.getItem("global-comparison") || '{"enabled": false, "mode": "period"}');
    } catch {
      return { enabled: false, mode: "period" };
    }
  });

  React.useEffect(() => {
    localStorage.setItem("global-filters", JSON.stringify(filters));
  }, [filters]);

  React.useEffect(() => {
    localStorage.setItem("global-comparison", JSON.stringify(comparison));
  }, [comparison]);

  return (
    <GlobalFilterContext.Provider value={{ filters, setFilters, comparison, setComparison }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}