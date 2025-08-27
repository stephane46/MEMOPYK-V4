// client/src/components/admin/ExportRangeControls.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { downloadFile } from "@/utils/downloadFile";

type Props = {
  report: "overview" | "video" | "cta" | "geo";
  defaultFrom?: string; // "YYYY-MM-DD"
  defaultTo?: string;   // "YYYY-MM-DD"
  className?: string;
};

function buildExportUrl(report: string, from?: string, to?: string) {
  const params = new URLSearchParams({ report });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/api/analytics/export/csv?${params.toString()}`;
}

export default function ExportRangeControls({
  report,
  defaultFrom,
  defaultTo,
  className,
}: Props) {
  const [from, setFrom] = React.useState<string | undefined>(defaultFrom);
  const [to, setTo] = React.useState<string | undefined>(defaultTo);

  const filename = React.useMemo(() => {
    const base = `analytics_${report}`;
    if (from || to) {
      return `${base}_${from ?? "start"}_${to ?? "now"}.csv`;
    }
    return `${base}.csv`;
  }, [report, from, to]);

  return (
    <div className={["flex items-center gap-2", className].filter(Boolean).join(" ")}>
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
        variant="outline"
        className="gap-2"
        onClick={() => {
          const url = buildExportUrl(report, from, to);
          downloadFile(url, filename);
        }}
      >
        <FileDown className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}