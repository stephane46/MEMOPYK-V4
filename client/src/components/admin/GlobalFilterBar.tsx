// client/src/components/admin/GlobalFilterBar.tsx
import * as React from "react";
import { GlobalFilterContext } from "./GlobalFilterContext";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function toIsoDate(d: Date) { return d.toISOString().slice(0, 10); }
function applyPresetDays(days: number) {
  const end = new Date(); end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

export default function GlobalFilterBar() {
  const { filters, setFilters } = React.useContext(GlobalFilterContext);
  const [from, setFrom] = React.useState(filters.range.from);
  const [to, setTo] = React.useState(filters.range.to);
  const [language, setLanguage] = React.useState(filters.language ?? "");
  const [source, setSource] = React.useState(filters.source ?? "");
  const [device, setDevice] = React.useState(filters.device ?? "");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Preset */}
      <Select onValueChange={(v) => setFilters({ ...filters, range: applyPresetDays(Number(v)), language, source, device })}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder="Presets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      {/* Date inputs */}
      <input type="date" value={from ?? ""} onChange={(e) => setFrom(e.target.value || undefined)} className="h-9 rounded-md border px-2 text-sm" />
      <span>→</span>
      <input type="date" value={to ?? ""} onChange={(e) => setTo(e.target.value || undefined)} className="h-9 rounded-md border px-2 text-sm" />

      {/* Language filter */}
      <Select value={language} onValueChange={(v) => setLanguage(v)}>
        <SelectTrigger className="h-9 w-[100px]"><SelectValue placeholder="Lang" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">All</SelectItem>
          <SelectItem value="fr-FR">fr-FR</SelectItem>
          <SelectItem value="en-US">en-US</SelectItem>
        </SelectContent>
      </Select>

      {/* Source filter */}
      <input type="text" placeholder="Source/referrer" value={source} onChange={(e) => setSource(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />

      {/* Device filter */}
      <Select value={device} onValueChange={(v) => setDevice(v)}>
        <SelectTrigger className="h-9 w-[110px]"><SelectValue placeholder="Device" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">All</SelectItem>
          <SelectItem value="mobile">Mobile</SelectItem>
          <SelectItem value="desktop">Desktop</SelectItem>
          <SelectItem value="tablet">Tablet</SelectItem>
        </SelectContent>
      </Select>

      {/* Apply */}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setFilters({ range: { from, to }, language, source, device })}
      >
        Apply
      </Button>
    </div>
  );
}