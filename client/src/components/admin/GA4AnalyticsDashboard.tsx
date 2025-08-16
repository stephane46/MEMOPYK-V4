import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, RefreshCw, Play, Clock, Target, Trophy, Activity, BarChart3 } from 'lucide-react';
import { useGA4VideoAnalytics } from '@/hooks/useGA4VideoAnalytics';
import { useDashboardFilters } from '@/analytics/FiltersContext';
import { AnalyticsControls } from './AnalyticsControls';
import { TopVideosSection } from './TopVideosSection';
import { KpiStrip } from './KpiStrip';
import { FunnelChart } from './FunnelChart';
import { TrendChart } from './TrendChart';
import { RealtimePanel } from './RealtimePanel';

const GA4AnalyticsDashboard: React.FC = () => {
  const { startDate, endDate, locale } = useDashboardFilters();

  const { kpis, topVideos, funnel, trend, realtime, isLoading, isRefreshing, error, allCached, refresh } = useGA4VideoAnalytics({
    startDate,
    endDate,
    locale
  });

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatPercent = (decimal: number): string => {
    return `${(decimal * 100).toFixed(1)}%`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Debug Link functionality
  const handleCopyDebugLink = () => {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
      locale: locale || "all",
    });
    const url = `${window.location.origin}/fr-FR/admin?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      // Simple success feedback
      const btn = document.querySelector('[data-testid="copy-debug-link"]') as HTMLElement;
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    });
  };

  // Get top locale from KPIs data
  const topLocale = kpis?.topLocale && kpis.topLocale.length > 0 ? kpis.topLocale[0] : null;

  // Simple funnel chart data processing - handle both array and object formats
  const funnelSteps = funnel ? 
    Array.isArray(funnel) ? 
      funnel.reduce((acc: Record<number, number>, row: any) => {
        if (!acc[row.percent]) {
          acc[row.percent] = 0;
        }
        acc[row.percent] += row.count;
        return acc;
      }, {}) :
      {
        25: funnel.p25 || 0,
        50: funnel.p50 || 0,
        75: funnel.p75 || 0,
        100: funnel.p100 || 0
      } : {};

  const funnelData = [25, 50, 75, 100].map(percent => ({
    label: `${percent}%`,
    count: funnelSteps[percent] || 0
  }));

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-orange-600" />
          Analytics GA4 - Video Performance Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time video analytics from Google Analytics 4 Data API - Gallery videos only
        </p>
      </div>

      {/* Controls Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dashboard Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <AnalyticsControls />
            
            {/* Debug Link Button */}
            <Button
              onClick={handleCopyDebugLink}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              data-testid="copy-debug-link"
              title="Copy shareable link with current filters"
            >
              <Copy className="h-4 w-4" />
              Copy Debug Link
            </Button>
            
            {/* Refresh Button */}
            <Button
              onClick={refresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Cache Status */}
            {allCached && (
              <Badge variant="secondary" className="text-xs">
                Cached Data
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error loading GA4 data:</span>
              <span>{error.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-600">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading GA4 analytics data...</span>
          </div>
        </div>
      )}

      {/* KPIs Section - New KpiStrip Component */}
      <KpiStrip />

      {/* Main Content Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Videos Table */}
          <TopVideosSection 
            data={topVideos} 
            isLoading={isLoading} 
            error={error}
            onRefresh={refresh}
          />

          {/* Watch Funnel Chart - New Component */}
          <FunnelChart />

          {/* Trend Over Time - New TrendChart Component */}
          <TrendChart />

          {/* Realtime Activity - New RealtimePanel Component */}
          <RealtimePanel />
        </div>
      )}
    </div>
  );
};

export default GA4AnalyticsDashboard;