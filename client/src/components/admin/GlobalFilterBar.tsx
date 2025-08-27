// client/src/components/admin/GlobalFilterBar.tsx
import * as React from "react";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function toIsoDate(d: Date) { return d.toISOString().slice(0,10); }
function applyPresetDays(days: number): { from: string; to: string } {
  const end = new Date(); end.setUTCHours(0,0,0,0);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

export default function GlobalFilterBar() {
  const { range, setRange } = React.useContext(GlobalFilterContext);
  const [from, setFrom] = React.useState(range.from);
  const [to, setTo] = React.useState(range.to);

  React.useEffect(() => { setFrom(range.from); setTo(range.to); }, [range.from, range.to]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select onValueChange={(v) => setRange(applyPresetDays(Number(v)))}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder="Presets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      <input
        type="date"
        value={from ?? ""}
        onChange={(e) => setFrom(e.target.value || undefined)}
        className="h-9 rounded-md border px-2 text-sm"
        aria-label="From date"
      />
      <span className="text-sm text-muted-foreground">→</span>
      <input
        type="date"
        value={to ?? ""}
        onChange={(e) => setTo(e.target.value || undefined)}
        className="h-9 rounded-md border px-2 text-sm"
        aria-label="To date"
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setRange({ from, to })}
      >
        Apply
      </Button>
    </div>
  );
}