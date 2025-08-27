// client/src/components/admin/GlobalFilterContext.tsx
import * as React from "react";

export type DateRange = { from?: string; to?: string };
export type GlobalFilter = {
  range: DateRange;
  language?: string;
  source?: string;
  device?: string;
};

export const GlobalFilterContext = React.createContext<{
  filters: GlobalFilter;
  setFilters: (f: GlobalFilter) => void;
}>({
  filters: { range: {} },
  setFilters: () => {},
});

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<GlobalFilter>(() => {
    try {
      return JSON.parse(localStorage.getItem("global-filters") || "{}");
    } catch {
      return { range: {} };
    }
  });

  React.useEffect(() => {
    localStorage.setItem("global-filters", JSON.stringify(filters));
  }, [filters]);

  return (
    <GlobalFilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}