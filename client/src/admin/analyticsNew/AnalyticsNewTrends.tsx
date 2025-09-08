import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Video, Clock, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }
  
  // Fallback for other formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if parsing fails
  }
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit' 
  });
};

const formatTooltipDate = (dateStr: string): string => {
  // Handle GA4 YYYYMMDD format (e.g., "20250906")
  if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('fr-FR', {
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
  return date.toLocaleDateString('fr-FR', {
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
      console.log('📈 TRENDS: Raw data received:', data);
      
      if (!Array.isArray(data)) {
        console.warn('📈 TRENDS: Data is not array, checking for trends property');
        const trends = data.trends || data.daily || data;
        if (Array.isArray(trends)) {
          return trends.map((item: any) => {
            const rawDate = item.date || item.day;
            return {
              date: rawDate,
              formattedDate: formatDate(rawDate),
              totalViews: item.plays || item.views || item.totalViews || 0,
              uniqueVisitors: item.visitors || item.uniqueVisitors || 0,
              averageWatchTime: item.avgWatch || item.avg_watch_time || item.averageWatchTime || 0,
              completionRate: item.completionRate || item.completion_rate || 0,
              videoViews: item.plays || item.videoViews || 0
            };
          });
        }
      }
      
      // If data is already an array
      return (Array.isArray(data) ? data : []).map((item: any) => {
        const rawDate = item.date || item.day;
        return {
          date: rawDate,
          formattedDate: formatDate(rawDate),
          totalViews: item.plays || item.views || item.totalViews || 0,
          uniqueVisitors: item.visitors || item.uniqueVisitors || 0,
          averageWatchTime: item.avgWatch || item.avg_watch_time || item.averageWatchTime || 0,
          completionRate: item.completionRate || item.completion_rate || 0,
          videoViews: item.plays || item.videoViews || 0
        };
      });
    },
    refetchOnWindowFocus: false,
  });

  // Calculate trend metrics (compare with previous period)
  const calculateTrendMetrics = () => {
    if (!trendData || trendData.length === 0) {
      return {
        totalViews: { current: 0, trend: 0 },
        uniqueVisitors: { current: 0, trend: 0 },
        averageWatchTime: { current: 0, trend: 0 },
        completionRate: { current: 0, trend: 0 }
      };
    }

    const midPoint = Math.floor(trendData.length / 2);
    const currentPeriod = trendData.slice(midPoint);
    const previousPeriod = trendData.slice(0, midPoint);

    const calculatePeriodSum = (period: TrendData[], metric: keyof TrendData) => {
      return period.reduce((sum, item) => sum + (item[metric] as number), 0);
    };

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentViews = calculatePeriodSum(currentPeriod, 'totalViews');
    const previousViews = calculatePeriodSum(previousPeriod, 'totalViews');

    const currentVisitors = calculatePeriodSum(currentPeriod, 'uniqueVisitors');
    const previousVisitors = calculatePeriodSum(previousPeriod, 'uniqueVisitors');

    const currentWatchTime = currentPeriod.length > 0 
      ? calculatePeriodSum(currentPeriod, 'averageWatchTime') / currentPeriod.length
      : 0;
    const previousWatchTime = previousPeriod.length > 0
      ? calculatePeriodSum(previousPeriod, 'averageWatchTime') / previousPeriod.length
      : 0;

    const currentCompletion = currentPeriod.length > 0
      ? calculatePeriodSum(currentPeriod, 'completionRate') / currentPeriod.length
      : 0;
    const previousCompletion = previousPeriod.length > 0
      ? calculatePeriodSum(previousPeriod, 'completionRate') / previousPeriod.length
      : 0;

    return {
      totalViews: {
        current: currentViews,
        trend: calculateTrend(currentViews, previousViews)
      },
      uniqueVisitors: {
        current: currentVisitors,
        trend: calculateTrend(currentVisitors, previousVisitors)
      },
      averageWatchTime: {
        current: currentWatchTime,
        trend: calculateTrend(currentWatchTime, previousWatchTime)
      },
      completionRate: {
        current: currentCompletion,
        trend: calculateTrend(currentCompletion, previousCompletion)
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
        return trendData.map(item => ({ ...item, value: item.uniqueVisitors }));
      case 'watchTime':
        return trendData.map(item => ({ ...item, value: item.averageWatchTime }));
      case 'completion':
        return trendData.map(item => ({ ...item, value: item.completionRate }));
      default:
        return trendData.map(item => ({ ...item, value: item.totalViews }));
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
          <h2 className="text-2xl font-bold text-gray-900">📈 Tendances</h2>
          <p className="text-gray-600 mt-1">
            Évolution des performances vidéo et engagement au fil du temps
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {datePreset === '7d' ? '7 derniers jours' : 
           datePreset === '30d' ? '30 derniers jours' : '90 derniers jours'}
        </Badge>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendCard
          title="Vues Totales"
          value={metrics.totalViews.current.toLocaleString('fr-FR')}
          trend={metrics.totalViews.trend}
          icon={<Eye className="h-4 w-4" />}
          description="vs période précédente"
        />
        <TrendCard
          title="Visiteurs Uniques"
          value={metrics.uniqueVisitors.current.toLocaleString('fr-FR')}
          trend={metrics.uniqueVisitors.trend}
          icon={<Users className="h-4 w-4" />}
          description="vs période précédente"
        />
        <TrendCard
          title="Temps Moyen"
          value={formatWatchTime(metrics.averageWatchTime.current)}
          trend={metrics.averageWatchTime.trend}
          icon={<Clock className="h-4 w-4" />}
          description="vs période précédente"
        />
        <TrendCard
          title="Taux Complétion"
          value={`${Math.round(metrics.completionRate.current)}%`}
          trend={metrics.completionRate.trend}
          icon={<Video className="h-4 w-4" />}
          description="vs période précédente"
        />
      </div>

      {/* Chart Section */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Évolution Temporelle
              </CardTitle>
              <CardDescription className="text-gray-600">
                Analyse des tendances par jour
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedMetric === 'views' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('views')}
                className={`transition-all ${
                  selectedMetric === 'views' 
                    ? 'bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white border-[#D67C4A]' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#D67C4A]'
                }`}
              >
                Vues
              </Button>
              <Button
                variant={selectedMetric === 'visitors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('visitors')}
                className={`transition-all ${
                  selectedMetric === 'visitors' 
                    ? 'bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white border-[#D67C4A]' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#D67C4A]'
                }`}
              >
                Visiteurs
              </Button>
              <Button
                variant={selectedMetric === 'watchTime' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('watchTime')}
                className={`transition-all ${
                  selectedMetric === 'watchTime' 
                    ? 'bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white border-[#D67C4A]' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#D67C4A]'
                }`}
              >
                Durée
              </Button>
              <Button
                variant={selectedMetric === 'completion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('completion')}
                className={`transition-all ${
                  selectedMetric === 'completion' 
                    ? 'bg-[#D67C4A] hover:bg-[#D67C4A]/90 text-white border-[#D67C4A]' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#D67C4A]'
                }`}
              >
                Complétion
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
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
                  formatter={(value: number) => [chartConfig.format(value), chartConfig.label]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartConfig.color}
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};