import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Video, Clock, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart } from 'recharts';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import './analyticsNew.tokens.css';

interface TrendData {
  date: string;
  formattedDate: string;
  totalViews: number;
  uniqueVisitors: number;
  averageWatchTime: number;
  completionRate: number;
  videoViews: number;
  // Previous period data for comparison
  previousTotalViews: number;
  previousUniqueVisitors: number;
  previousAverageWatchTime: number;
  previousCompletionRate: number;
}

interface TrendCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  description: string;
}

const TrendCard: React.FC<TrendCardProps> = ({ title, value, trend, icon, description }) => {
  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="text-gray-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center mt-2">
          {getTrendIcon()}
          <span className={`text-sm ml-1 ${getTrendColor()}`}>
            {trend !== 0 && (trend > 0 ? '+' : '')}{trend.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500 ml-2">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const formatDate = (dateStr: string): string => {
  // Handle GA4 YYYYMMDD format (e.g., "20250906")
  if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);
    
    // Use "Sep 05" format as requested
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit' 
    });
  }
  
  // Fallback for other formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if parsing fails
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: '2-digit' 
  });
};

const formatTooltipDate = (dateStr: string): string => {
  // Handle GA4 YYYYMMDD format (e.g., "20250906")
  if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  // Fallback for other formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if parsing fails
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export const AnalyticsNewTrends: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<'views' | 'visitors' | 'watchTime' | 'completion'>('views');
  
  // Get current filter state
  const { datePreset, getDateRange } = useAnalyticsNewFilters();
  const { start, end } = getDateRange();

  // Fetch trend data from GA4 API (using existing endpoint)
  const { data: trendData, isLoading, error } = useQuery<TrendData[]>({
    queryKey: ['/api/ga4/trend', start, end, selectedMetric],
    queryFn: async () => {
      const url = new URL('/api/ga4/trend', window.location.origin);
      url.searchParams.set('startDate', start);
      url.searchParams.set('endDate', end);
      url.searchParams.set('locale', 'all');

      console.log('📈 TRENDS: Fetching trend data:', {
        startDate: start,
        endDate: end,
        metric: selectedMetric,
        url: url.toString()
      });

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform data for charting (adjust based on actual GA4 trend data format)
      console.log('📈 TRENDS: Raw website sessions data received:', data);
      
      if (!Array.isArray(data)) {
        console.warn('📈 TRENDS: Data is not array, checking for trends property');
        const trends = data.trends || data.daily || data;
        if (Array.isArray(trends)) {
          const mappedTrends = trends.map((item: any) => {
            const rawDate = item.date || item.day;
            return {
              date: rawDate,
              formattedDate: formatDate(rawDate),
              totalViews: item.sessions || item.views || item.totalViews || 0, // FIXED: Use sessions instead of plays
              uniqueVisitors: item.users || item.visitors || item.uniqueVisitors || 0, // FIXED: Use users from sessions data
              averageWatchTime: item.avgSessionDuration || item.avg_watch_time || item.averageWatchTime || 0, // FIXED: Use session duration
              completionRate: item.bounceRate || item.completion_rate || 0, // FIXED: Use bounce rate instead
              videoViews: item.sessions || item.videoViews || 0 // FIXED: Use sessions
            };
          });

          // CRITICAL FIX: Sort data chronologically by date to prevent artifacts
          return mappedTrends.sort((a, b) => {
            // GA4 dates are in YYYYMMDD format, so string comparison works
            return a.date.localeCompare(b.date);
          });
        }
      }
      
      // If data is already an array
      const mappedData = (Array.isArray(data) ? data : []).map((item: any) => {
        const rawDate = item.date || item.day;
        return {
          date: rawDate,
          formattedDate: formatDate(rawDate),
          // Current period data (solid lines)
          totalViews: item.sessions || item.views || item.totalViews || 0,
          uniqueVisitors: item.users || item.visitors || item.uniqueVisitors || 0,
          averageWatchTime: item.avgSessionDuration || item.avg_watch_time || item.averageWatchTime || 0,
          completionRate: item.bounceRate || item.completion_rate || 0,
          videoViews: item.sessions || item.videoViews || 0,
          // Previous period data (dotted comparison lines)
          previousTotalViews: item.previousSessions || 0,
          previousUniqueVisitors: item.previousUsers || 0,
          previousAverageWatchTime: item.previousAvgDuration || 0,
          previousCompletionRate: item.previousBounceRate || 0
        };
      });

      // CRITICAL FIX: Sort data chronologically by date to prevent artifacts
      return mappedData.sort((a, b) => {
        // GA4 dates are in YYYYMMDD format, so string comparison works
        return a.date.localeCompare(b.date);
      });
    },
    refetchOnWindowFocus: false,
  });

  // Calculate trend metrics (show full period totals to match Overview)
  const calculateTrendMetrics = () => {
    if (!trendData || trendData.length === 0) {
      return {
        totalViews: { current: 0, trend: 0 },
        uniqueVisitors: { current: 0, trend: 0 },
        averageWatchTime: { current: 0, trend: 0 },
        completionRate: { current: 0, trend: 0 }
      };
    }

    // FIXED: Use full period data to match Overview instead of splitting in half
    const calculatePeriodSum = (period: TrendData[], metric: keyof TrendData) => {
      return period.reduce((sum, item) => sum + (item[metric] as number), 0);
    };

    // Use all data for current totals (to match Overview behavior)
    const currentViews = calculatePeriodSum(trendData, 'totalViews');
    const currentVisitors = calculatePeriodSum(trendData, 'uniqueVisitors');
    
    const currentWatchTime = trendData.length > 0 
      ? calculatePeriodSum(trendData, 'averageWatchTime') / trendData.length
      : 0;
    const currentCompletion = trendData.length > 0
      ? calculatePeriodSum(trendData, 'completionRate') / trendData.length
      : 0;

    return {
      totalViews: {
        current: currentViews, // Full period total (matches Overview)
        trend: 0 // Trend calculation removed for simplicity and consistency
      },
      uniqueVisitors: {
        current: currentVisitors, // Full period total
        trend: 0
      },
      averageWatchTime: {
        current: currentWatchTime, // Average across full period
        trend: 0
      },
      completionRate: {
        current: currentCompletion, // Average across full period
        trend: 0
      }
    };
  };

  const metrics = calculateTrendMetrics();

  const formatWatchTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getChartData = () => {
    if (!trendData) return [];
    
    switch (selectedMetric) {
      case 'visitors':
        return trendData.map(item => ({ 
          ...item, 
          value: item.uniqueVisitors,
          previousValue: item.previousUniqueVisitors
        }));
      case 'watchTime':
        return trendData.map(item => ({ 
          ...item, 
          value: item.averageWatchTime,
          previousValue: item.previousAverageWatchTime
        }));
      case 'completion':
        return trendData.map(item => ({ 
          ...item, 
          value: item.completionRate,
          previousValue: item.previousCompletionRate
        }));
      default:
        return trendData.map(item => ({ 
          ...item, 
          value: item.totalViews,
          previousValue: item.previousTotalViews
        }));
    }
  };

  const getChartConfig = () => {
    switch (selectedMetric) {
      case 'visitors':
        return {
          color: '#3B82F6',
          label: 'Visiteurs uniques',
          format: (value: number) => value.toLocaleString('fr-FR')
        };
      case 'watchTime':
        return {
          color: '#10B981',
          label: 'Temps de visionnage (sec)',
          format: (value: number) => `${Math.round(value)}s`
        };
      case 'completion':
        return {
          color: '#8B5CF6',
          label: 'Taux de complétion (%)',
          format: (value: number) => `${Math.round(value)}%`
        };
      default:
        return {
          color: '#D67C4A',
          label: 'Vues totales',
          format: (value: number) => value.toLocaleString('fr-FR')
        };
    }
  };

  if (isLoading) {
    return (
      <AnalyticsNewLoadingStates 
        mode="loading" 
        title="Chargement des tendances"
        description="Analyse des données de performance..."
      />
    );
  }

  if (error) {
    return (
      <AnalyticsNewLoadingStates 
        mode="error" 
        title="Erreur de chargement"
        description="Impossible de charger les données de tendances"
      />
    );
  }

  const chartConfig = getChartConfig();
  const chartData = getChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📈 Trends</h2>
          <p className="text-gray-600 mt-1">
            Website analytics trends and visitor behavior over time
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {datePreset === '7d' ? 'Last 7 days' : 
           datePreset === '30d' ? 'Last 30 days' : 'Last 90 days'}
        </Badge>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendCard
          title="Website Sessions"
          value={metrics.totalViews.current.toLocaleString('en-US')}
          trend={metrics.totalViews.trend}
          icon={<Eye className="h-4 w-4" />}
          description="vs previous period"
        />
        <TrendCard
          title="Unique Visitors"
          value={metrics.uniqueVisitors.current.toLocaleString('en-US')}
          trend={metrics.uniqueVisitors.trend}
          icon={<Users className="h-4 w-4" />}
          description="vs previous period"
        />
        <TrendCard
          title="Session Duration"
          value={formatWatchTime(metrics.averageWatchTime.current)}
          trend={metrics.averageWatchTime.trend}
          icon={<Clock className="h-4 w-4" />}
          description="vs previous period"
        />
        <TrendCard
          title="Bounce Rate"
          value={`${Math.round(metrics.completionRate.current)}%`}
          trend={metrics.completionRate.trend}
          icon={<Video className="h-4 w-4" />}
          description="vs previous period"
        />
      </div>

      {/* Chart Section */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Time Series Evolution
              </CardTitle>
              <CardDescription className="text-gray-600">
                Daily trend analysis
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedMetric === 'views' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('views')}
                className={selectedMetric === 'views' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Sessions
              </Button>
              <Button
                variant={selectedMetric === 'visitors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('visitors')}
                className={selectedMetric === 'visitors' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Visitors
              </Button>
              <Button
                variant={selectedMetric === 'watchTime' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('watchTime')}
                className={selectedMetric === 'watchTime' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Duration
              </Button>
              <Button
                variant={selectedMetric === 'completion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('completion')}
                className={selectedMetric === 'completion' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Completion
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={chartConfig.format}
                />
                <Tooltip 
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0] && payload[0].payload) {
                      return formatTooltipDate(payload[0].payload.date);
                    }
                    return value;
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'previousValue' ? `${chartConfig.label} (Previous Period)` : chartConfig.label;
                    return [chartConfig.format(value), label];
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                {/* Current period - solid line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartConfig.color}
                  strokeWidth={3}
                  dot={{ fill: chartConfig.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: chartConfig.color }}
                />
                {/* Previous period - dotted line */}
                <Line
                  type="monotone"
                  dataKey="previousValue"
                  stroke={chartConfig.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'transparent', stroke: chartConfig.color, strokeWidth: 1, r: 3 }}
                  opacity={0.7}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};