// client/src/components/admin/ExportPdfControls.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { RangeContext } from "./RangeContext";

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ExportPdfControls() {
  const storageKey = "export-range-pdf";
  const { range } = React.useContext(RangeContext);
  const [from, setFrom] = React.useState<string | undefined>();
  const [to, setTo] = React.useState<string | undefined>();

  // load remembered
  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { const j = JSON.parse(saved); setFrom(j.from); setTo(j.to); } catch {}
    }
  }, []);

  // when Overview updates shared range, prefer it (but don't overwrite manual edits mid-session)
  React.useEffect(() => {
    if (range.from || range.to) { setFrom(range.from); setTo(range.to); }
  }, [range.from, range.to]);

  // persist
  React.useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ from, to }));
  }, [from, to]);

  function applyPreset(days: number) {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    setFrom(toIsoDate(start));
    setTo(toIsoDate(end));
  }

  const filename = React.useMemo(() => {
    if (from || to) return `analytics_full_report_${from ?? "start"}_${to ?? "now"}.pdf`;
    return "analytics_full_report.pdf";
  }, [from, to]);

  function buildUrl() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/analytics/export/pdf?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select onValueChange={(v) => applyPreset(Number(v))}>
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
        className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
        onClick={() => downloadFile(buildUrl(), filename)}
      >
        <FileDown className="h-4 w-4" />
        Export Full Report (PDF)
      </Button>
    </div>
  );
}