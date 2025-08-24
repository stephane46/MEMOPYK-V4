import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Play, Users, Clock, RefreshCw } from 'lucide-react';

interface GA4MetricsResponse {
  totalVideoStarts: number;
  totalCompletions: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  completionRate: number;
  topVideos: Array<{
    videoId: string;
    videoTitle: string;
    plays: number;
    completions: number;
  }>;
  localeBreakdown: Array<{
    locale: string;
    plays: number;
  }>;
}

export default function CleanGA4Analytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [locale, setLocale] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simple, clean GA4 data fetch
  const { data: ga4Data, isLoading, error, refetch } = useQuery<GA4MetricsResponse>({
    queryKey: ['ga4-clean-metrics', dateRange, locale],
    queryFn: async () => {
      const params = new URLSearchParams({
        range: dateRange,
        locale: locale
      });
      
      const response = await fetch(`/api/ga4/clean-metrics?${params}`);
      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (rate: number) => `${Math.round(rate * 100)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            GA4 Video Analytics (Clean)
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Simple, reliable Google Analytics 4 video tracking
          </p>
        </div>
        
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateRange">Time Period</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="locale">Language</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="fr-FR">Français</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading GA4 data...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-6">
            <div className="text-red-600 dark:text-red-400">
              <h3 className="font-semibold">Error loading GA4 data</h3>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Metrics */}
      {ga4Data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Video Plays</CardTitle>
                <Play className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalVideoStarts.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Total video starts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completions</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalCompletions.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Videos completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Watch Time</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(ga4Data.averageWatchTimeSeconds)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Per video session
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(ga4Data.completionRate)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Videos finished
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Language Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Language Distribution</CardTitle>
              <CardDescription>Video plays by language preference</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ga4Data.localeBreakdown.map((item) => (
                  <div key={item.locale} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant={item.locale === 'fr-FR' ? 'default' : 'secondary'}>
                        {item.locale === 'fr-FR' ? '🇫🇷 Français' : '🇺🇸 English'}
                      </Badge>
                    </div>
                    <div className="font-semibold">{item.plays.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Videos */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Videos</CardTitle>
              <CardDescription>Videos ranked by total plays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ga4Data.topVideos.map((video, index) => (
                  <div key={video.videoId} className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{video.videoTitle}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {video.videoId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{video.plays.toLocaleString()} plays</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {video.completions.toLocaleString()} completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Total Watch Time Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Total Watch Time</CardTitle>
              <CardDescription>Accumulated viewing time across all videos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-center py-6">
                {formatDuration(ga4Data.totalWatchTimeSeconds)}
              </div>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Total time viewers spent watching your videos
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}