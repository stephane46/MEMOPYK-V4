// client/src/components/admin/AnalyticsControls.tsx
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Globe, RefreshCw } from "lucide-react";

export function AnalyticsControls() {
  const { startDate, endDate, locale, setFilters } = useDashboardFilters();

  const handleDateRangePreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 864e5);
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    setFilters({ startDate: toYMD(start), endDate: toYMD(end) });
  };

  // Check if current date range matches a preset
  const isActivePreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 864e5);
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    const isActive = startDate === toYMD(start) && endDate === toYMD(end);
    console.log(`Checking ${days}d preset:`, {
      current: { startDate, endDate },
      preset: { start: toYMD(start), end: toYMD(end) },
      isActive
    });
    return isActive;
  };

  return (
    <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {/* Date Range */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <input 
          type="date" 
          value={startDate} 
          onChange={e => setFilters({ startDate: e.target.value })}
          className="px-2 py-1 border rounded text-sm"
        />
        <span className="text-gray-400">to</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={e => setFilters({ endDate: e.target.value })}
          className="px-2 py-1 border rounded text-sm"
        />
      </div>

      {/* Date Presets */}
      <div className="flex gap-2">
        {[7, 30, 90].map(days => {
          const isActive = isActivePreset(days);
          return (
            <Button
              key={days}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleDateRangePreset(days)}
              className={`${isActive ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-600" : "hover:bg-orange-50 hover:border-orange-300"} transition-colors`}
            >
              {days}d
            </Button>
          );
        })}
      </div>

      {/* Locale Selection */}
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-500" />
        <Select value={locale} onValueChange={(value) => setFilters({ locale: value as any })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locales</SelectItem>
            <SelectItem value="fr-FR">fr-FR</SelectItem>
            <SelectItem value="en-US">en-US</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}