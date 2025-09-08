import React from 'react';
import { useGa4Report } from "../hooks/useGa4Report";
import type { KpisResponse } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';
import { VisitorFocusedKpis } from './VisitorFocusedKpis';

interface OverviewKpisProps {
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d";
  className?: string;
}

export function OverviewKpis({ preset = "7d", className = "" }: OverviewKpisProps) {
  const { data, loading, error } = useGa4Report<KpisResponse>({ report: "kpis", preset });

  if (loading) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Error loading KPIs"
          description="Unable to fetch analytics data"
          showRetry={true}
        />
      </div>
    );
  }

  if (!data || !data.kpis) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No data available"
          description="No analytics data found for the selected period"
        />
      </div>
    );
  }

  const { sessions, plays, completions, avgWatch } = data.kpis;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Row 1: Visitor-focused metrics (like Analytics Old) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Visitor Overview</h3>
        <VisitorFocusedKpis preset={preset} />
      </div>

      {/* Row 2: Technical metrics (existing) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Metrics</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard 
            label="Sessions" 
            value={sessions.value} 
            trend={sessions.trend}
            data-testid="kpi-sessions"
          />
          <KpiCard 
            label="Video Plays" 
            value={plays.value} 
            trend={plays.trend}
            data-testid="kpi-plays"
          />
          <KpiCard 
            label="Completions (90%)" 
            value={completions.value} 
            trend={completions.trend}
            data-testid="kpi-completions"
          />
          <KpiCard 
            label="Avg Watch (s)" 
            value={avgWatch.value} 
            trend={avgWatch.trend}
            data-testid="kpi-avg-watch"
          />
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  trend?: Array<{ date: string; value: number }>;
  'data-testid'?: string;
}

function KpiCard({ label, value, trend, 'data-testid': testId }: KpiCardProps) {
  const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";

  return (
    <div className="analytics-new-card border-l-4 border-[var(--analytics-new-accent)]" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-[var(--analytics-new-text-muted)]">{label}</div>
        {USE_MOCK && (
          <div className="text-xs text-orange-500 font-medium">🧪 Mock</div>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--analytics-new-text)] mb-2">
        {value.toLocaleString()}
      </div>
      {trend && trend.length > 0 && (
        <div className="flex items-center space-x-1">
          {trend.slice(-7).map((point, index) => (
            <div
              key={index}
              className="flex-1 bg-gray-200 rounded-sm overflow-hidden"
              style={{ height: '4px' }}
            >
              <div
                className="h-full bg-[var(--analytics-new-accent)] transition-all duration-300"
                style={{ 
                  width: trend.length > 1 
                    ? `${Math.max(10, (point.value / Math.max(...trend.map(t => t.value))) * 100)}%` 
                    : '100%'
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}