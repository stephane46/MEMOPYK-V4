import React, { useState } from 'react';
import { TopVideosTable } from './components/TopVideosTable';
import { VideoFunnel } from './components/VideoFunnel';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import type { TopVideoRow } from './data/types';
import { cn } from '@/lib/utils';


interface AnalyticsNewVideoProps {
  className?: string;
}

export const AnalyticsNewVideo: React.FC<AnalyticsNewVideoProps> = ({ 
  className = '' 
}) => {
  const [selectedVideo, setSelectedVideo] = useState<TopVideoRow | null>(null);

  // Get current filter state
  const { datePreset, customDateStart, customDateEnd } = useAnalyticsNewFilters();
  
  // Convert preset to the expected format
  const preset = (datePreset === '7d' || datePreset === '30d' || datePreset === '90d') 
    ? datePreset 
    : '7d';

  const handleVideoSelect = (video: TopVideoRow) => {
    setSelectedVideo(video);
  };

  const handleCloseFunnel = () => {
    setSelectedVideo(null);
  };

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
      </div>

      {/* Top Videos Table */}
      <TopVideosTable 
        onSelect={handleVideoSelect}
        preset={preset}
        className="mb-6"
      />

      {/* Video Funnel - renders when video is selected */}
      {selectedVideo && (
        <VideoFunnel 
          videoId={selectedVideo.videoId}
          videoTitle={selectedVideo.title}
          preset={preset}
          onClose={handleCloseFunnel}
          className="mt-6"
        />
      )}
    </div>
  );
};