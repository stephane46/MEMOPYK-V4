// client/src/components/admin/GlobalFilterBar.tsx
import * as React from "react";
import { GlobalFilterContext } from "./GlobalFilterContext";
import GlobalComparisonBar from "./GlobalComparisonBar";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function toIsoDate(d: Date) { return d.toISOString().slice(0, 10); }
function applyPresetDays(days: number) {
  const end = new Date(); end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

export default function GlobalFilterBar() {
  const { filters, setFilters, comparison, setComparison, periodComparison, setPeriodComparison } = React.useContext(GlobalFilterContext);
  const [from, setFrom] = React.useState(filters.range?.from);
  const [to, setTo] = React.useState(filters.range?.to);
  const [language, setLanguage] = React.useState(filters.language ?? "");
  const [source, setSource] = React.useState(filters.source ?? "");
  const [device, setDevice] = React.useState(filters.device ?? "");

  return (
    <div className="space-y-3">
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-3">
      {/* Preset */}
      <Select onValueChange={(v) => {
        if (v === "yesterday") {
          const end = new Date(); end.setUTCHours(0, 0, 0, 0);
          const start = new Date(end); start.setUTCDate(start.getUTCDate() - 1);
          setFilters({ ...filters, range: { from: toIsoDate(start), to: toIsoDate(start) }, language, source, device });
        } else {
          setFilters({ ...filters, range: applyPresetDays(Number(v)), language, source, device });
        }
      }}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder="Presets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      {/* Quick Time Ranges - matching the style from Analytics (old) */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Quick Time Ranges</span>
        <div className="flex gap-1">
          {[
            { value: '1', label: '1D', description: 'Today' },
            { value: '7', label: '7D', description: '7 Days' },
            { value: '30', label: '30D', description: '30 Days' },
            { value: '90', label: '90D', description: '90 Days' },
            { value: '365', label: '1Y', description: '1 Year' },
            { value: 'custom', label: '••', description: 'Custom' }
          ].map((range) => (
            <Button
              key={range.value}
              variant="outline"
              size="sm"
              className={`min-w-[50px] h-8 text-xs font-medium ${
                filters.range && filters.range.from === applyPresetDays(Number(range.value)).from
                  ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                if (range.value !== 'custom') {
                  const preset = applyPresetDays(Number(range.value));
                  setFrom(preset.from);
                  setTo(preset.to);
                  setFilters({ ...filters, range: preset, language, source, device });
                }
              }}
              title={range.description}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Date inputs */}
      <input type="date" value={from ?? ""} onChange={(e) => setFrom(e.target.value || undefined)} className="h-9 rounded-md border px-2 text-sm" />
      <span>→</span>
      <input type="date" value={to ?? ""} onChange={(e) => setTo(e.target.value || undefined)} className="h-9 rounded-md border px-2 text-sm" />

      {/* Language filter */}
      <Select value={language || "all"} onValueChange={(v) => setLanguage(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[100px]"><SelectValue placeholder="Lang" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="fr-FR">fr-FR</SelectItem>
          <SelectItem value="en-US">en-US</SelectItem>
        </SelectContent>
      </Select>

      {/* Source filter */}
      <input type="text" placeholder="Source/referrer" value={source} onChange={(e) => setSource(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />

      {/* Device filter */}
      <Select value={device || "all"} onValueChange={(v) => setDevice(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[110px]"><SelectValue placeholder="Device" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
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

      {/* Comparison controls row */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
        <div className="flex items-center space-x-2">
          <Switch 
            id="comparison-mode"
            checked={comparison.enabled} 
            onCheckedChange={(v) => setComparison({ ...comparison, enabled: v })} 
          />
          <Label htmlFor="comparison-mode" className="text-sm font-medium">
            Compare
          </Label>
        </div>

        {comparison.enabled && (
          <>
            <Select 
              value={comparison.mode} 
              onValueChange={(m) => setComparison({ ...comparison, mode: m as any })}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Compare by…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="period">Previous Period</SelectItem>
                <SelectItem value="language">Language (FR vs EN)</SelectItem>
                <SelectItem value="device">Device (Mobile vs Desktop)</SelectItem>
                <SelectItem value="source">Source (Google vs Direct)</SelectItem>
              </SelectContent>
            </Select>

            {comparison.mode === "period" && (
              <Select 
                value={periodComparison.mode} 
                onValueChange={(m) => setPeriodComparison({ ...periodComparison, mode: m as any })}
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="Period mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This week vs last week</SelectItem>
                  <SelectItem value="month">This month vs last month</SelectItem>
                  <SelectItem value="auto">Auto (derive from picked range)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>
    </div>
  );
}