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

      {/* Quick Time Ranges - matching SEO Management design */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Quick Time Ranges</span>
        <div style={{ 
          display: 'grid', 
          width: '300px', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          backgroundColor: '#f3f4f6', 
          padding: '4px', 
          borderRadius: '8px',
          gap: '2px'
        }}>
          {[
            { value: '1', label: '1D', description: 'Today' },
            { value: '7', label: '7D', description: '7 Days' },
            { value: '30', label: '30D', description: '30 Days' },
            { value: '90', label: '90D', description: '90 Days' },
            { value: '365', label: '1Y', description: '1 Year' },
            { value: 'custom', label: '••', description: 'Custom' }
          ].map((range) => (
            <button
              key={range.value}
              className={`h-8 text-xs font-medium rounded transition-colors ${
                range.value !== 'custom' && filters.range && filters.range.from === applyPresetDays(Number(range.value)).from
                  ? 'time-range-btn-active'
                  : 'time-range-btn-inactive'
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
            </button>
          ))}
        </div>
      </div>

      {/* Date inputs */}
      <input type="date" value={from ?? ""} onChange={(e) => setFrom(e.target.value || undefined)} className="h-9 rounded-md border px-2 text-sm" />
      <span>→</span>
      <input type="date" value={to ?? ""} onChange={(e) => setTo(e.target.value || undefined)} className="h-9 rounded-md border px-2 text-sm" />

      {/* Language Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Language</span>
        <div style={{ 
          display: 'grid', 
          width: '180px', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          backgroundColor: '#f3f4f6', 
          padding: '4px', 
          borderRadius: '8px',
          gap: '2px'
        }}>
          {[
            { value: '', label: 'All', description: 'All Languages' },
            { value: 'fr-FR', label: 'FR', description: 'French' },
            { value: 'en-US', label: 'EN', description: 'English' }
          ].map((lang) => (
            <button
              key={lang.value}
              className={`h-8 text-xs font-medium rounded transition-colors ${
                language === lang.value
                  ? 'language-btn-active'
                  : 'language-btn-inactive'
              }`}
              onClick={() => {
                setLanguage(lang.value);
                setFilters({ ...filters, range: { from, to }, language: lang.value, source, device });
              }}
              title={lang.description}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source filter */}
      <input type="text" placeholder="Source/referrer" value={source} onChange={(e) => setSource(e.target.value)} className="h-9 rounded-md border px-2 text-sm" />

      {/* Device Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Device</span>
        <div style={{ 
          display: 'grid', 
          width: '240px', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          backgroundColor: '#f3f4f6', 
          padding: '4px', 
          borderRadius: '8px',
          gap: '2px'
        }}>
          {[
            { value: '', label: 'All', description: 'All Devices' },
            { value: 'mobile', label: '📱', description: 'Mobile' },
            { value: 'desktop', label: '💻', description: 'Desktop' },
            { value: 'tablet', label: '📱', description: 'Tablet' }
          ].map((dev) => (
            <button
              key={dev.value}
              className={`h-8 text-xs font-medium rounded transition-colors ${
                device === dev.value
                  ? 'device-btn-active'
                  : 'device-btn-inactive'
              }`}
              onClick={() => {
                setDevice(dev.value);
                setFilters({ ...filters, range: { from, to }, language, source, device: dev.value });
              }}
              title={dev.description}
            >
              {dev.label}
            </button>
          ))}
        </div>
      </div>

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