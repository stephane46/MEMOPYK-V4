import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Play, Users, Clock, RefreshCw, Globe, Eye, UserCheck, MapPin, Languages, MousePointer } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface GA4MetricsResponse {
  // Visitor Analytics
  totalViews: number;
  uniqueVisitors: number;
  returnVisitors: number;
  averageSessionDuration: number;
  activeVisitors: number;
  // Video Analytics  
  totalVideoStarts: number;
  totalCompletions: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  completionRate: number;
  // Geographic Data
  topCountries: Array<{
    country: string;
    visitors: number;
    flag: string;
  }>;
  // Language & Traffic
  languageBreakdown: Array<{
    language: string;
    visitors: number;
    percentage: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    visitors: number;
  }>;
  // Video Performance
  topVideos: Array<{
    videoId: string;
    videoTitle: string;
    plays: number;
    completions: number;
  }>;
}

export default function CleanGA4Analytics() {
  const [dateRange, setDateRange] = useState('90d'); // Match the filter default
  const [locale, setLocale] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Comprehensive GA4 + visitor analytics data fetch
  const { data: ga4Data, isLoading, error, refetch } = useQuery<GA4MetricsResponse>({
    queryKey: ['ga4-clean-comprehensive', dateRange, locale],
    queryFn: async () => {
      const params = new URLSearchParams({
        range: dateRange,
        locale: locale
      });
      
      const response = await fetch(`/api/ga4/clean-comprehensive?${params}`);
      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time data
    refetchInterval: 5 * 60 * 1000, // 5 minutes auto-refresh
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
            Comprehensive Analytics (Clean)
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Visitor analytics, video engagement, and geographic insights
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

      {/* Visitor Overview Metrics */}
      {ga4Data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalViews.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Page views across site
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.uniqueVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Distinct visitors (IP-based)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Return Visitors</CardTitle>
                <UserCheck className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.returnVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Returning visitors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                <MousePointer className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.activeVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Currently browsing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Video Performance Metrics */}
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
                <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(ga4Data.averageSessionDuration)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Time on site
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Video Completions</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalCompletions.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Videos finished
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(ga4Data.completionRate)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Video engagement
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Top Countries</span>
              </CardTitle>
              <CardDescription>Where your visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ga4Data.topCountries?.map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                        {index + 1}
                      </div>
                      <CountryFlag country={country.country} size={24} />
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <div className="font-semibold">{(country.visitors || 0).toLocaleString()}</div>
                  </div>
                )) || <p className="text-gray-500">No geographic data available</p>}
              </div>
            </CardContent>
          </Card>

          {/* Language & Traffic Sources */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Languages className="h-5 w-5" />
                  <span>Language Breakdown</span>
                </CardTitle>
                <CardDescription>Visitor language preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ga4Data.languageBreakdown?.map((lang) => (
                    <div key={lang.language} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={lang.language.includes('fr') ? 'default' : 'secondary'}>
                          {lang.language.includes('fr') ? '🇫🇷 Français' : '🇺🇸 English'}
                        </Badge>
                        <span className="text-sm text-gray-600">{lang.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="font-semibold">{(lang.visitors || 0).toLocaleString()}</div>
                    </div>
                  )) || <p className="text-gray-500">No language data available</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Traffic Sources</span>
                </CardTitle>
                <CardDescription>How visitors found your site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ga4Data.topReferrers?.map((ref, index) => (
                    <div key={ref.referrer || 'direct'} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </div>
                        <span className="font-medium truncate max-w-[200px]">
                          {ref.referrer || 'Direct Traffic'}
                        </span>
                      </div>
                      <div className="font-semibold">{ref.visitors.toLocaleString()}</div>
                    </div>
                  )) || <p className="text-gray-500">No referrer data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

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