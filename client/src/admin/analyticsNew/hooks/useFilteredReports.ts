import { useQuery } from '@tanstack/react-query';
import { buildAnalyticsParams, buildAnalyticsUrl, logFilterApplication } from '../data/analyticsFilters';
import { useAnalyticsNewFilters } from '../analyticsNewFilters.store';

/**
 * UNIFIED ANALYTICS REPORT HOOKS
 * 
 * This module provides specialized hooks for each analytics report type that
 * enforce the centralized filtering system. All hooks use:
 * - useAnalyticsNewFilters store for consistent date ranges
 * - buildAnalyticsParams() for standardized parameter building
 * - buildAnalyticsUrl() for consistent URL construction
 * - logFilterApplication() for debugging filter application
 * 
 * NO component should use useQuery directly for analytics data.
 */

// ==================== TYPE DEFINITIONS ====================

export interface TopVideoRow {
  videoId: string;
  title: string;
  views: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  engagement: number;
  thumbnail?: string;
  duration?: number;
}

export interface TopVideosData {
  videos: TopVideoRow[];
  totalViews: number;
  totalUniqueViewers: number;
  averageCompletionRate: number;
}

export interface CountryData {
  country: string;
  sessions: number;
  visitors: number;
  iso3?: string;
}

export interface CityData {
  country: string;
  city: string;
  sessions: number;
  visitors: number;
}

export interface GeoAnalyticsData {
  countries: CountryData[];
  cities: CityData[];
  totalSessions: number;
  totalVisitors: number;
  coverageCount: number;
}

export interface TrendDataPoint {
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

export type TrendsData = TrendDataPoint[];

// Common return type for all hooks with debugging info
export interface FilteredAnalyticsResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  appliedFilters: {
    dateRange: { start: string; end: string };
    exclusions: { dateEnabled: boolean; sinceDate?: string };
    segmentation: { language: string; country: string; videoId: string };
  };
  refetch: () => void;
}

// ==================== HOOK IMPLEMENTATIONS ====================

/**
 * Hook for Top Videos data (Video tab)
 * Fetches video performance metrics with centralized filtering
 */
export function useFilteredTopVideos(): FilteredAnalyticsResult<TopVideosData> {
  // Get filter state from store
  const {
    datePreset,
    getDateRange,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  } = useAnalyticsNewFilters();
  
  // Get date range
  const { start, end } = getDateRange();
  
  // Build standardized filter parameters
  const filterParams = buildAnalyticsParams('topVideos', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with proper queryKey
  const { data, isLoading, error, refetch } = useQuery<TopVideosData>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication('topVideos', filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl('/api/ga4/report', filterParams);
      const urlObj = new URL(url);
      urlObj.searchParams.set('report', 'topVideos');
      
      const response = await fetch(urlObj.toString());
      if (!response.ok) {
        throw new Error(`Top Videos request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Transform data to expected format
      const videos: TopVideoRow[] = (rawData.videos || rawData.data || []).map((item: any) => ({
        videoId: item.videoId || item.video_id || '',
        title: item.title || item.videoTitle || 'Unknown Video',
        views: item.views || item.sessions || 0,
        uniqueViewers: item.uniqueViewers || item.users || item.visitors || 0,
        averageWatchTime: item.averageWatchTime || item.avgWatchTime || item.avg_watch_time || 0,
        completionRate: item.completionRate || item.completion_rate || 0,
        engagement: item.engagement || item.engagementRate || 0,
        thumbnail: item.thumbnail || item.thumbnailUrl,
        duration: item.duration || item.videoDuration
      }));
      
      return {
        videos,
        totalViews: rawData.totalViews || videos.reduce((sum, v) => sum + v.views, 0),
        totalUniqueViewers: rawData.totalUniqueViewers || videos.reduce((sum, v) => sum + v.uniqueViewers, 0),
        averageCompletionRate: rawData.averageCompletionRate || 
          (videos.length > 0 ? videos.reduce((sum, v) => sum + v.completionRate, 0) / videos.length : 0)
      };
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}

/**
 * Hook for Geographic data (Geo tab)
 * Fetches country and city analytics with centralized filtering
 */
export function useFilteredGeo(): FilteredAnalyticsResult<GeoAnalyticsData> {
  // Get filter state from store
  const {
    datePreset,
    getDateRange,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  } = useAnalyticsNewFilters();
  
  // Get date range
  const { start, end } = getDateRange();
  
  // Build standardized filter parameters
  const filterParams = buildAnalyticsParams('geo', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with proper queryKey
  const { data, isLoading, error, refetch } = useQuery<GeoAnalyticsData>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication('geo', filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl('/api/ga4/geo', filterParams);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geographic data request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Process countries data
      const countries: CountryData[] = (rawData.countries || []).map((item: any) => ({
        country: item.country || item.name || 'Unknown',
        sessions: item.sessions || item.views || 0,
        visitors: item.visitors || item.users || item.uniqueVisitors || 0,
        iso3: item.iso3 || item.countryCode
      }));
      
      // Process cities data
      const cities: CityData[] = (rawData.cities || []).map((item: any) => ({
        country: item.country || 'Unknown',
        city: item.city || item.name || 'Unknown',
        sessions: item.sessions || item.views || 0,
        visitors: item.visitors || item.users || item.uniqueVisitors || 0
      }));
      
      // Calculate totals
      const totalSessions = countries.reduce((sum, c) => sum + c.sessions, 0);
      const totalVisitors = countries.reduce((sum, c) => sum + c.visitors, 0);
      const coverageCount = countries.length;
      
      return {
        countries,
        cities,
        totalSessions,
        totalVisitors,
        coverageCount
      };
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}

/**
 * Hook for Trends data (Trends tab)
 * Fetches time series analytics with centralized filtering
 */
export function useFilteredTrends(): FilteredAnalyticsResult<TrendsData> {
  // Get filter state from store
  const {
    datePreset,
    getDateRange,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  } = useAnalyticsNewFilters();
  
  // Get date range
  const { start, end } = getDateRange();
  
  // Build standardized filter parameters
  const filterParams = buildAnalyticsParams('trends', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with proper queryKey
  const { data, isLoading, error, refetch } = useQuery<TrendsData>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication('trends', filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl('/api/ga4/trend', filterParams);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Trends data request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Helper function to format dates
      const formatDate = (dateStr: string): string => {
        // Handle GA4 YYYYMMDD format (e.g., "20250906")
        if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
          const day = parseInt(dateStr.substring(6, 8));
          const date = new Date(year, month, day);
          
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
      
      // Transform data to expected format
      const trends = rawData.trends || rawData.daily || rawData;
      const processedData = (Array.isArray(trends) ? trends : []).map((item: any) => {
        const rawDate = item.date || item.day;
        return {
          date: rawDate,
          formattedDate: formatDate(rawDate),
          totalViews: item.sessions || item.views || item.totalViews || 0,
          uniqueVisitors: item.users || item.visitors || item.uniqueVisitors || 0,
          averageWatchTime: item.avgSessionDuration || item.avg_watch_time || item.averageWatchTime || 0,
          completionRate: item.bounceRate || item.completion_rate || 0,
          videoViews: item.sessions || item.videoViews || 0,
          // Previous period data for comparison
          previousTotalViews: item.previousSessions || 0,
          previousUniqueVisitors: item.previousUsers || 0,
          previousAverageWatchTime: item.previousAvgDuration || 0,
          previousCompletionRate: item.previousBounceRate || 0
        };
      });
      
      // Sort data chronologically by date to prevent artifacts
      return processedData.sort((a, b) => {
        // GA4 dates are in YYYYMMDD format, so string comparison works
        return a.date.localeCompare(b.date);
      });
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}

/**
 * Advanced hook for Trends data with custom metric selection
 * Provides additional configuration for specific trend analysis
 */
export function useFilteredTrendsAdvanced(options?: {
  metric?: 'views' | 'visitors' | 'watchTime' | 'completion';
  endpoint?: string;
  staleTime?: number;
}): FilteredAnalyticsResult<TrendsData> {
  const { metric = 'views', endpoint = '/api/ga4/trend', staleTime = 60 * 1000 } = options || {};
  
  // Get filter state from store
  const {
    datePreset,
    getDateRange,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  } = useAnalyticsNewFilters();
  
  // Get date range
  const { start, end } = getDateRange();
  
  // Build standardized filter parameters with metric
  const filterParams = buildAnalyticsParams('trends', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with enhanced queryKey including metric
  const { data, isLoading, error, refetch } = useQuery<TrendsData>({
    queryKey: [...filterParams.queryKey, metric], // Include metric in cache key
    queryFn: async () => {
      // Debug logging
      logFilterApplication(`trends-${metric}`, filterParams);
      
      // Build filtered URL with metric parameter
      const url = buildAnalyticsUrl(endpoint, filterParams);
      const urlObj = new URL(url);
      urlObj.searchParams.set('metric', metric);
      
      const response = await fetch(urlObj.toString());
      if (!response.ok) {
        throw new Error(`Advanced Trends data request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Use the same transformation logic as the base trends hook
      const baseHook = useFilteredTrends();
      return rawData; // Could be enhanced to process metric-specific transformations
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}