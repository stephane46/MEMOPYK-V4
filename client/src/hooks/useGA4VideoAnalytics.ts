import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export interface GA4KPIsData {
  range: {
    start: string;
    end: string;
    locale: string;
  };
  kpis: {
    plays_unique_viewers: number;
    avg_watch_time_sec: number;
    completion_rate: number;
    plays_by_locale: Array<{
      locale: string;
      users: number;
    }>;
  };
  cached: boolean;
}

export interface GA4TopVideo {
  video_id: string;
  plays: number;
  avg_watch_time_sec: number;
  reach50_pct: number;
  complete100_pct: number;
}

export interface GA4TopVideosData {
  rows: GA4TopVideo[];
  cached: boolean;
}

export interface GA4FunnelRow {
  video_id: string;
  percent: number;
  count: number;
}

export interface GA4FunnelData {
  rows: GA4FunnelRow[];
  cached: boolean;
}

export interface GA4TrendDay {
  date: string;
  plays: number;
  avg_watch_time_sec: number;
}

export interface GA4TrendData {
  days: GA4TrendDay[];
  cached: boolean;
}

export interface GA4RealtimeEvent {
  ts: string;
  event: string;
  video_id: string;
  locale: string;
  percent?: number;
}

export interface GA4RealtimeData {
  active: number;
  recent: GA4RealtimeEvent[];
  cached: boolean;
}

export interface UseGA4VideoAnalyticsParams {
  startDate: string;
  endDate: string;
  locale?: string;
}

export const useGA4VideoAnalytics = (params: UseGA4VideoAnalyticsParams) => {
  const { startDate, endDate, locale = 'all' } = params;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // KPIs query
  const kpisQuery = useQuery<GA4KPIsData>({
    queryKey: ['ga4-kpis', startDate, endDate, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/ga4/kpis?startDate=${startDate}&endDate=${endDate}&locale=${locale}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 KPIs');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Top videos query
  const topVideosQuery = useQuery<GA4TopVideosData>({
    queryKey: ['ga4-top-videos', startDate, endDate, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/ga4/top-videos?startDate=${startDate}&endDate=${endDate}&locale=${locale}&limit=10`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 top videos');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Funnel query
  const funnelQuery = useQuery<GA4FunnelData>({
    queryKey: ['ga4-funnel', startDate, endDate, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/ga4/funnel?startDate=${startDate}&endDate=${endDate}&locale=${locale}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 funnel data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Trend query
  const trendQuery = useQuery<GA4TrendData>({
    queryKey: ['ga4-trend', startDate, endDate, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/ga4/trend?startDate=${startDate}&endDate=${endDate}&locale=${locale}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 trend data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Realtime query (shorter cache time)
  const realtimeQuery = useQuery<GA4RealtimeData>({
    queryKey: ['ga4-realtime'],
    queryFn: async () => {
      const response = await fetch('/api/ga4/realtime');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 realtime data');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute for realtime data
    refetchInterval: 2 * 60 * 1000 // Auto-refresh every 2 minutes
  });

  // Refresh function to force new data
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        kpisQuery.refetch(),
        topVideosQuery.refetch(),
        funnelQuery.refetch(),
        trendQuery.refetch(),
        realtimeQuery.refetch()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if any query is loading
  const isLoading = kpisQuery.isLoading || topVideosQuery.isLoading || 
                   funnelQuery.isLoading || trendQuery.isLoading || realtimeQuery.isLoading;

  // Check if any query has an error
  const error = kpisQuery.error || topVideosQuery.error || 
               funnelQuery.error || trendQuery.error || realtimeQuery.error;

  // Check if all data is cached
  const allCached = kpisQuery.data?.cached && topVideosQuery.data?.cached && 
                   funnelQuery.data?.cached && trendQuery.data?.cached && realtimeQuery.data?.cached;

  return {
    kpis: kpisQuery.data,
    topVideos: topVideosQuery.data,
    funnel: funnelQuery.data,
    trend: trendQuery.data,
    realtime: realtimeQuery.data,
    isLoading,
    isRefreshing,
    error,
    allCached,
    refresh
  };
};