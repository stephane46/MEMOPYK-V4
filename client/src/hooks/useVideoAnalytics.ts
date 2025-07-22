import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface VideoViewData {
  video_id: string;
  duration_watched?: number;
  completed?: boolean;
  language: 'en' | 'fr';
  page_url?: string;
  referrer?: string;
}

interface SessionData {
  language: 'en' | 'fr';
  page_url: string;
  user_agent?: string;
  screen_resolution?: string;
  timezone?: string;
  referrer?: string;
}

export const useVideoAnalytics = () => {
  const queryClient = useQueryClient();

  const trackVideoView = useMutation({
    mutationFn: async (data: VideoViewData) => {
      const response = await fetch('/api/analytics/video-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to track video view');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate analytics queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
  });

  const trackSession = useMutation({
    mutationFn: async (data: SessionData) => {
      const response = await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to track session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
  });

  // Helper function to track video view with automatic data collection
  const trackVideoViewWithDefaults = (videoId: string, durationWatched?: number, completed?: boolean) => {
    const language = localStorage.getItem('memopyk-language') as 'en' | 'fr' || 'fr';
    
    trackVideoView.mutate({
      video_id: videoId,
      duration_watched: durationWatched,
      completed: completed,
      language,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
    });
  };

  // Helper function to track session with automatic data collection
  const trackSessionWithDefaults = () => {
    const language = localStorage.getItem('memopyk-language') as 'en' | 'fr' || 'fr';
    
    trackSession.mutate({
      language,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || undefined,
    });
  };

  return {
    trackVideoView: trackVideoViewWithDefaults,
    trackSession: trackSessionWithDefaults,
    // Raw mutation hooks for manual usage
    trackVideoViewMutation: trackVideoView,
    trackSessionMutation: trackSession,
  };
};