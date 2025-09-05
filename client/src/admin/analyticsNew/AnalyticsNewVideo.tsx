import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Play, 
  TrendingUp, 
  Clock, 
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { getMockReport } from './mockReport';
import { cn } from '@/lib/utils';

// Development flags
const USE_MOCK = true; // Switch to false when GA4 backend is ready
const SIMULATE_ERROR = false;
const SIMULATE_EMPTY = false;

interface TopVideo {
  videoId: string;
  title: string;
  plays: number;
  completions: number;
  completionRate: number;
  avgEngagement?: number;
}

interface TopVideosResponse {
  topVideos: TopVideo[];
  timestamp: string;
  cached: boolean;
}

interface VideoFunnelResponse {
  funnel: Array<{ bucket: 10|25|50|75|90, count: number }>;
  timestamp: string;
  cached: boolean;
}

interface AnalyticsNewVideoProps {
  className?: string;
}

export const AnalyticsNewVideo: React.FC<AnalyticsNewVideoProps> = ({ 
  className = '' 
}) => {
  const [selectedVideo, setSelectedVideo] = useState<TopVideo | null>(null);
  const [sortField, setSortField] = useState<keyof TopVideo>('plays');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get current filter state
  const { datePreset, customDateStart, customDateEnd } = useAnalyticsNewFilters();

  // Get Top Videos data
  const { data: topVideosData, isLoading: videosLoading, error: videosError } = useQuery<TopVideosResponse>({
    queryKey: ['/api/ga4/report', 'topVideos', datePreset, customDateStart, customDateEnd, USE_MOCK],
    queryFn: async () => {
      // Development toggles
      if (SIMULATE_ERROR) {
        throw new Error('Simulated error for testing');
      }
      
      if (USE_MOCK) {
        // Simulate API delay for realistic testing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (SIMULATE_EMPTY) {
          return { topVideos: [], timestamp: new Date().toISOString(), cached: false };
        }
        
        return getMockReport('topVideos') as TopVideosResponse;
      }

      // Real API call
      const params = new URLSearchParams({
        report: 'topVideos',
        preset: datePreset,
        ...(customDateStart && { startDate: customDateStart }),
        ...(customDateEnd && { endDate: customDateEnd }),
      });

      const response = await fetch(`/api/ga4/report?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch top videos: ${response.status}`);
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });

  // Get Video Funnel data when a video is selected
  const { data: funnelData, isLoading: funnelLoading } = useQuery<VideoFunnelResponse>({
    queryKey: ['/api/ga4/report', 'videoFunnel', selectedVideo?.videoId, datePreset, customDateStart, customDateEnd, USE_MOCK],
    queryFn: async () => {
      if (!selectedVideo) return null;
      
      if (USE_MOCK) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return getMockReport('videoFunnel', selectedVideo.videoId) as VideoFunnelResponse;
      }

      // Real API call
      const params = new URLSearchParams({
        report: 'videoFunnel',
        videoId: selectedVideo.videoId,
        preset: datePreset,
        ...(customDateStart && { startDate: customDateStart }),
        ...(customDateEnd && { endDate: customDateEnd }),
      });

      const response = await fetch(`/api/ga4/report?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch video funnel: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!selectedVideo,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // Handle sorting
  const handleSort = (field: keyof TopVideo) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: keyof TopVideo) => {
    if (sortField !== field) return null;
    return sortDirection === 'desc' ? (
      <ChevronDown className="h-4 w-4" />
    ) : (
      <ChevronUp className="h-4 w-4" />
    );
  };

  const sortedVideos = topVideosData?.topVideos ? [...topVideosData.topVideos].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    }
    
    // For string fields
    return sortDirection === 'desc' 
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal));
  }) : [];

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render funnel chart
  const renderFunnelChart = () => {
    if (!funnelData || !selectedVideo) return null;
    
    const maxCount = Math.max(...funnelData.funnel.map(f => f.count));
    
    return (
      <div className="analytics-new-card border-l-4 border-[var(--analytics-new-accent)] mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
            Video Engagement Funnel - {selectedVideo.title}
          </h3>
          <button
            onClick={() => setSelectedVideo(null)}
            className="text-[var(--analytics-new-text-muted)] hover:text-[var(--analytics-new-text)] text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        {funnelLoading ? (
          <div className="text-center py-8">Loading funnel data...</div>
        ) : (
          <div className="space-y-3">
            {funnelData.funnel.map((item) => {
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              const bucketLabel = item.bucket === 90 ? `${item.bucket}% (Complete)` : `${item.bucket}%`;
              
              return (
                <div key={item.bucket}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--analytics-new-text)]">
                      {bucketLabel}
                    </span>
                    <span className="text-sm font-semibold text-[var(--analytics-new-text)]">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[var(--analytics-new-accent)] h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (videosLoading) {
    return (
      <div className={cn('analytics-new-container space-y-6', className)}>
        <h2 className="text-2xl font-bold text-[var(--analytics-new-text)]">Video Analytics</h2>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (videosError) {
    return (
      <div className={cn('analytics-new-container space-y-6', className)}>
        <h2 className="text-2xl font-bold text-[var(--analytics-new-text)]">Video Analytics</h2>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Failed to load video analytics"
          description="Unable to fetch video performance data"
          showRetry={true}
        />
      </div>
    );
  }

  if (!topVideosData?.topVideos || topVideosData.topVideos.length === 0) {
    return (
      <div className={cn('analytics-new-container space-y-6', className)}>
        <h2 className="text-2xl font-bold text-[var(--analytics-new-text)]">Video Analytics</h2>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No video data available"
          description="No video analytics data found for the selected time period"
        />
      </div>
    );
  }

  return (
    <div className={cn('analytics-new-container space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--analytics-new-text)]">Video Analytics</h2>
          <p className="text-[var(--analytics-new-text-muted)] mt-1">
            Video performance and engagement metrics
          </p>
        </div>
        <div className="text-xs text-[var(--analytics-new-text-muted)]">
          {USE_MOCK ? '🧪 Mock Data' : (topVideosData.cached ? '⚡ Cached' : '🔄 Live')} • Updated {new Date(topVideosData.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Top Videos Table */}
      <div className="analytics-new-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">Top Videos</h3>
          <span className="text-sm text-[var(--analytics-new-text-muted)]">
            {topVideosData.topVideos.length} videos • Click a row to view funnel
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th 
                  className="text-left py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Video</span>
                    {getSortIcon('title')}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('plays')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Plays</span>
                    {getSortIcon('plays')}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('completions')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Completions</span>
                    {getSortIcon('completions')}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('completionRate')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Completion Rate</span>
                    {getSortIcon('completionRate')}
                  </div>
                </th>
                {topVideosData.topVideos.some(v => v.avgEngagement) && (
                  <th 
                    className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('avgEngagement')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Avg Engagement</span>
                      {getSortIcon('avgEngagement')}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedVideos.map((video) => (
                <tr 
                  key={video.videoId}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
                    selectedVideo?.videoId === video.videoId && 'bg-blue-50'
                  )}
                  onClick={() => setSelectedVideo(video)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Play className="h-4 w-4 text-[var(--analytics-new-accent)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--analytics-new-text)] truncate">
                          {video.title}
                        </p>
                        <p className="text-xs text-[var(--analytics-new-text-muted)] truncate">
                          {video.videoId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                    {video.plays.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                    {video.completions.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                    <div className="flex items-center justify-end space-x-2">
                      <span>{video.completionRate}%</span>
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-[var(--analytics-new-accent)] h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(video.completionRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  {video.avgEngagement !== undefined && (
                    <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                      {formatDuration(video.avgEngagement)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Funnel Chart - renders when video is selected */}
      {renderFunnelChart()}
    </div>
  );
};