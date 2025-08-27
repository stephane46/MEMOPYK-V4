// client/src/components/admin/GlobalFilterContext.tsx
import * as React from "react";
export type DateRange = { from?: string; to?: string };

export const GlobalFilterContext = React.createContext<{
  range: DateRange;
  setRange: (r: DateRange) => void;
}>({ range: {}, setRange: () => {} });

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<DateRange>(() => {
    // restore last range
    try { return JSON.parse(localStorage.getItem("global-range") || "{}"); } catch { return {}; }
  });

  React.useEffect(() => {
    localStorage.setItem("global-range", JSON.stringify(range));
  }, [range]);

  return (
    <GlobalFilterContext.Provider value={{ range, setRange }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}