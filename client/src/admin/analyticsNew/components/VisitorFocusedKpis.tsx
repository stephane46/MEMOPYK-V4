import React from 'react';
import { Eye, Users, UserCheck, RotateCcw } from 'lucide-react';
import { useGa4Report } from "../hooks/useGa4Report";
import type { KpisResponse } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';

interface VisitorFocusedKpisProps {
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d";
  className?: string;
}

export function VisitorFocusedKpis({ preset = "7d", className = "" }: VisitorFocusedKpisProps) {
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
          title="Error loading visitor metrics"
          description="Unable to fetch visitor analytics data"
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
          title="No visitor data available"
          description="No visitor analytics data found for the selected period"
        />
      </div>
    );
  }

  const { totalViews, uniqueVisitors, returnVisitors } = data.kpis;

  const handleDetailClick = (metric: string) => {
    console.log(`Opening detailed view for: ${metric}`);
    // TODO: Implement navigation to detailed view
    // For now, just log the action
  };

  return (
    <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
      <VisitorKpiCard 
        label="Total Views" 
        value={totalViews?.value || 0}
        trend={totalViews?.trend || []}
        icon={Eye}
        color="blue"
        onDetailClick={() => handleDetailClick('totalViews')}
        data-testid="kpi-total-views"
      />
      <VisitorKpiCard 
        label="Unique Visitors" 
        value={uniqueVisitors?.value || 0}
        trend={uniqueVisitors?.trend || []}
        icon={Users}
        color="green"
        onDetailClick={() => handleDetailClick('uniqueVisitors')}
        data-testid="kpi-unique-visitors"
      />
      <VisitorKpiCard 
        label="Return Visitors" 
        value={returnVisitors?.value || 0}
        trend={returnVisitors?.trend || []}
        icon={RotateCcw}
        color="purple"
        onDetailClick={() => handleDetailClick('returnVisitors')}
        data-testid="kpi-return-visitors"
      />
    </div>
  );
}

interface VisitorKpiCardProps {
  label: string;
  value: number;
  trend?: Array<{ date: string; value: number }>;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onDetailClick: () => void;
  'data-testid'?: string;
}

function VisitorKpiCard({ 
  label, 
  value, 
  trend, 
  icon: Icon, 
  color, 
  onDetailClick, 
  'data-testid': testId 
}: VisitorKpiCardProps) {
  const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";

  const colorClasses = {
    blue: {
      border: 'border-l-blue-500',
      icon: 'text-blue-500',
      eyeIcon: 'text-blue-500 hover:text-blue-700'
    },
    green: {
      border: 'border-l-green-500',
      icon: 'text-green-500',
      eyeIcon: 'text-green-500 hover:text-green-700'
    },
    purple: {
      border: 'border-l-purple-500',
      icon: 'text-purple-500',
      eyeIcon: 'text-purple-500 hover:text-purple-700'
    },
    orange: {
      border: 'border-l-orange-500',
      icon: 'text-orange-500',
      eyeIcon: 'text-orange-500 hover:text-orange-700'
    },
    red: {
      border: 'border-l-red-500',
      icon: 'text-red-500',
      eyeIcon: 'text-red-500 hover:text-red-700'
    }
  };

  const colors = colorClasses[color];

  return (
    <div 
      className={`analytics-new-card border-l-4 ${colors.border} relative`} 
      data-testid={testId}
    >
      {/* Header with icon and label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${colors.icon}`} />
          <div className="text-sm font-medium text-[var(--analytics-new-text-muted)]">
            {label}
          </div>
        </div>
        {USE_MOCK && (
          <div className="text-xs text-orange-500 font-medium">🧪 Mock</div>
        )}
      </div>

      {/* Value display */}
      <div className="text-2xl font-bold text-[var(--analytics-new-text)] mb-2">
        {value.toLocaleString()}
      </div>

      {/* Sparkline trend */}
      {trend && trend.length > 0 && (
        <div className="flex items-center space-x-1 mb-3">
          {trend.slice(-7).map((point, index) => (
            <div
              key={index}
              className="flex-1 bg-gray-200 rounded-sm overflow-hidden"
              style={{ height: '4px' }}
            >
              <div
                className={`h-full bg-[var(--analytics-new-accent)] transition-all duration-300`}
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

      {/* Eye icon for detailed view (bottom right) */}
      <button
        onClick={onDetailClick}
        className={`absolute bottom-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors ${colors.eyeIcon}`}
        title={`View ${label} details`}
        data-testid={`${testId}-detail-button`}
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}