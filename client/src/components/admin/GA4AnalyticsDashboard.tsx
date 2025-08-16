import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, RefreshCw, Play, Clock, Target, Trophy, Activity, BarChart3, AlertCircle } from 'lucide-react';
import { useGA4VideoAnalytics } from '@/hooks/useGA4VideoAnalytics';
import { useDashboardFilters } from '@/analytics/FiltersContext';
import { AnalyticsControls } from './AnalyticsControls';
import { TopVideosSection } from './TopVideosSection';

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

  // Get top locale from KPIs data
  const topLocale = kpis?.topLocale && kpis.topLocale.length > 0 ? kpis.topLocale[0] : null;

  // Simple funnel chart data processing - handle object format from API
  const funnelSteps = funnel ? {
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

      {/* KPIs Section */}
      {kpis && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Video Plays</p>
                  <p className="text-2xl font-bold">{formatNumber(kpis.plays)}</p>
                </div>
                <Play className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Watch Time</p>
                  <p className="text-2xl font-bold">{formatDuration(kpis.avgWatchSeconds)}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</p>
                  <p className="text-2xl font-bold">{formatPercent(kpis.completionRate / 100)}</p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Locale</p>
                  <p className="text-2xl font-bold">{topLocale?.locale || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{topLocale ? `${formatNumber(topLocale.users)} users` : ''}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Videos Table */}
          <TopVideosSection />

          {/* Watch Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">B. Watch Progress Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {funnelData.some(d => d.count > 0) ? (
                <div className="space-y-3">
                  {funnelData.map((step, index) => {
                    const maxCount = Math.max(...funnelData.map(d => d.count));
                    const width = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={step.label} className="flex items-center gap-3">
                        <div className="w-12 text-sm font-medium">{step.label}</div>
                        <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-right">{formatNumber(step.count)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No funnel data available</div>
              )}
            </CardContent>
          </Card>

          {/* Trend Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">C. Trend Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {trend && Array.isArray(trend) && trend.length ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-1">
                    {trend.slice(-7).map((day: any) => (
                      <div key={day.date} className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                        </div>
                        <div className="h-20 bg-gray-200 rounded flex flex-col justify-end overflow-hidden">
                          <div
                            className="bg-gradient-to-t from-green-500 to-green-400 transition-all duration-500"
                            style={{ 
                              height: `${Math.max(5, (day.plays / Math.max(...trend.map((d: any) => d.plays))) * 100)}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs font-medium mt-1">{formatNumber(day.plays)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No trend data available</div>
              )}
            </CardContent>
          </Card>

          {/* Realtime Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                D. Realtime Activity
                <Activity className="h-5 w-5 text-red-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Users:</span>
                  <Badge variant="default" className="bg-green-600">
                    {realtime?.active || 0} live
                  </Badge>
                </div>
                
                {realtime?.recent.length ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <div className="text-sm font-medium text-gray-600">Recent Events:</div>
                    {realtime.recent.slice(0, 5).map((event, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="font-medium">{event.video_id}</div>
                        <div className="text-gray-500">{event.locale} • {event.event}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GA4AnalyticsDashboard;