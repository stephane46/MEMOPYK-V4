import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDashboardFilters } from "@/analytics/FiltersContext";
import { useTrend } from "@/hooks/useTrend";
import { formatInt, formatSeconds } from "@/utils/format";

export function TrendChart() {
  const { startDate, endDate, locale } = useDashboardFilters();
  const { data, loading, error } = useTrend({ startDate, endDate, locale });

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading trend…</div>;
  if (error || !data) return <div className="p-4 text-sm text-red-600">Error: {error || "No data"}</div>;

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-sm font-semibold mb-2">Trend Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis yAxisId="plays" tickFormatter={formatInt} />
          <YAxis yAxisId="watch" orientation="right" tickFormatter={formatSeconds} />
          <Tooltip formatter={(v:any, n:any)=> n==="avgWatch" ? formatSeconds(v) : formatInt(v)} />
          <Legend />
          <Line type="monotone" dataKey="plays" yAxisId="plays" stroke="#2563eb" name="Plays" />
          <Line type="monotone" dataKey="avgWatch" yAxisId="watch" stroke="#16a34a" name="Avg Watch" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}