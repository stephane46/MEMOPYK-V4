import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Play, 
  TrendingUp, 
  Clock, 
  BarChart3,
  ChevronDown,
  ChevronUp,
  Video,
  Target
} from 'lucide-react';
import { AnalyticsNewKpiCard } from './AnalyticsNewKpiCard';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { cn } from '@/lib/utils';

interface TopVideo {
  video_id: string;
  title: string;
  plays: number;
  avgWatchSeconds: number;
  reach50Pct: number;
  completePct: number;
}

interface VideoFunnel {
  start: number;
  halfway: number;
  complete: number;
}

interface GA4ReportData {
  kpis: {
    sessions: number;
    plays: number;
    avgWatchTimeSec: number;
    completionRatePct: number;
  };
  topVideos: TopVideo[];
  videoFunnel: VideoFunnel;
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

  // Get GA4 report data with top videos and funnel
  const { data: reportData, isLoading, error } = useQuery<GA4ReportData>({
    queryKey: ['/api/ga4/report', datePreset, customDateStart, customDateEnd],
    queryFn: async () => {
      const response = await fetch('/api/ga4/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preset: datePreset,
          dateFrom: customDateStart || undefined,
          dateTo: customDateEnd || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`GA4 report failed: ${response.status}`);
      }

      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
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

  const sortedVideos = reportData?.topVideos ? [...reportData.topVideos].sort((a, b) => {
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

  // Calculate funnel percentages
  const calculateFunnelPercentages = (funnel: VideoFunnel) => {
    const startPct = 100;
    const halfwayPct = funnel.start > 0 ? Math.round((funnel.halfway / funnel.start) * 100) : 0;
    const completePct = funnel.start > 0 ? Math.round((funnel.complete / funnel.start) * 100) : 0;
    
    return { startPct, halfwayPct, completePct };
  };

  if (isLoading) {
    return (
      <div className={cn('analytics-new-container space-y-6', className)}>
        <h2 className="text-2xl font-bold text-[var(--analytics-new-text)]">Video Analytics</h2>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
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

  if (!reportData?.topVideos || reportData.topVideos.length === 0) {
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

  const { kpis, topVideos, videoFunnel } = reportData;
  const funnelPercentages = calculateFunnelPercentages(videoFunnel);

  const videoKpis = [
    {
      id: 'video_plays',
      title: 'Total Video Plays',
      value: kpis.plays.toLocaleString(),
      icon: Play,
      color: 'blue' as const,
      trend: 'up' as const,
      change: 0, // Could add comparison data later
    },
    {
      id: 'avg_watch_time',
      title: 'Avg Watch Time',
      value: formatDuration(kpis.avgWatchTimeSec),
      icon: Clock,
      color: 'green' as const,
      trend: 'up' as const,
      change: 0,
    },
    {
      id: 'completion_rate',
      title: 'Completion Rate',
      value: `${kpis.completionRatePct}%`,
      icon: Target,
      color: 'orange' as const,
      trend: 'up' as const,
      change: 0,
    },
    {
      id: 'total_videos',
      title: 'Total Videos',
      value: topVideos.length.toString(),
      icon: Video,
      color: 'purple' as const,
      trend: 'flat' as const,
      change: 0,
    },
  ];

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
          {reportData.cached ? '⚡ Cached' : '🔄 Live'} • Updated {new Date(reportData.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Video KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {videoKpis.map((kpi, index) => (
          <AnalyticsNewKpiCard 
            key={index}
            data={kpi}
          />
        ))}
      </div>

      {/* Video Funnel Chart */}
      <div className="analytics-new-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">Video Engagement Funnel</h3>
          <BarChart3 className="h-5 w-5 text-[var(--analytics-new-accent)]" />
        </div>
        
        <div className="space-y-4">
          {/* Start */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-[var(--analytics-new-text)]">Video Start</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[var(--analytics-new-text-muted)]">{funnelPercentages.startPct}%</span>
              <span className="text-sm font-semibold text-[var(--analytics-new-text)]">{videoFunnel.start.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${funnelPercentages.startPct}%` }}></div>
          </div>

          {/* Halfway */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-[var(--analytics-new-text)]">50% Progress</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[var(--analytics-new-text-muted)]">{funnelPercentages.halfwayPct}%</span>
              <span className="text-sm font-semibold text-[var(--analytics-new-text)]">{videoFunnel.halfway.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${funnelPercentages.halfwayPct}%` }}></div>
          </div>

          {/* Complete */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-medium text-[var(--analytics-new-text)]">Completion (90%+)</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[var(--analytics-new-text-muted)]">{funnelPercentages.completePct}%</span>
              <span className="text-sm font-semibold text-[var(--analytics-new-text)]">{videoFunnel.complete.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${funnelPercentages.completePct}%` }}></div>
          </div>
        </div>
      </div>

      {/* Top Videos Table */}
      <div className="analytics-new-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">Top Videos</h3>
          <span className="text-sm text-[var(--analytics-new-text-muted)]">{topVideos.length} videos</span>
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
                  onClick={() => handleSort('avgWatchSeconds')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Avg Watch</span>
                    {getSortIcon('avgWatchSeconds')}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('completePct')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Completion</span>
                    {getSortIcon('completePct')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVideos.map((video, index) => (
                <tr 
                  key={video.video_id}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors',
                    selectedVideo?.video_id === video.video_id && 'bg-blue-50'
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
                          {video.title || video.video_id}
                        </p>
                        <p className="text-xs text-[var(--analytics-new-text-muted)] truncate">
                          {video.video_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                    {video.plays.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                    {formatDuration(video.avgWatchSeconds)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                    <div className="flex items-center justify-end space-x-2">
                      <span>{video.completePct}%</span>
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-[var(--analytics-new-accent)] h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(video.completePct, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Video Details */}
      {selectedVideo && (
        <div className="analytics-new-card border-l-4 border-[var(--analytics-new-accent)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">Video Details</h3>
            <button
              onClick={() => setSelectedVideo(null)}
              className="text-[var(--analytics-new-text-muted)] hover:text-[var(--analytics-new-text)]"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--analytics-new-text)]">{selectedVideo.plays.toLocaleString()}</p>
              <p className="text-sm text-[var(--analytics-new-text-muted)]">Total Plays</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--analytics-new-text)]">{formatDuration(selectedVideo.avgWatchSeconds)}</p>
              <p className="text-sm text-[var(--analytics-new-text-muted)]">Avg Watch Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--analytics-new-text)]">{selectedVideo.reach50Pct}%</p>
              <p className="text-sm text-[var(--analytics-new-text-muted)]">Reached 50%</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--analytics-new-text)]">{selectedVideo.completePct}%</p>
              <p className="text-sm text-[var(--analytics-new-text-muted)]">Completion Rate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};