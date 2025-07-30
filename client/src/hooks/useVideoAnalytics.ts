import React, { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface VideoViewData {
  video_id: string;
  duration_watched?: number;
  completed?: boolean;
  language: 'en-US' | 'fr-FR';
  page_url?: string;
  referrer?: string;
}

interface SessionData {
  language: 'en-US' | 'fr-FR';
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
    onError: (error) => {
      console.warn('Video view tracking failed:', error);
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

  // Helper function to track video view with aggressive duplicate prevention
  const trackVideoViewWithDefaults = useCallback((videoId: string, durationWatched?: number, completed?: boolean) => {
    // Skip tracking for hero videos (auto-play videos don't provide meaningful engagement data)
    if (['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(videoId)) {
      console.log(`Skipping analytics tracking for hero video: ${videoId} (auto-play videos excluded from analytics)`);
      return;
    }
    
    const languageShort = localStorage.getItem('memopyk-language') as 'en' | 'fr' || 'fr';
    const language = languageShort === 'en' ? 'en-US' : 'fr-FR';
    
    // Very aggressive duplicate prevention - 30 second window
    const lastTracked = localStorage.getItem(`last-tracked-${videoId}`);
    const now = Date.now();
    if (lastTracked && now - parseInt(lastTracked) < 30000) {
      console.log(`Skipping duplicate video tracking for ${videoId} - last tracked ${Math.round((now - parseInt(lastTracked)) / 1000)}s ago`);
      return; // Skip if tracked within last 30 seconds
    }
    
    console.log(`Tracking gallery video view for ${videoId}`);
    localStorage.setItem(`last-tracked-${videoId}`, now.toString());
    
    trackVideoView.mutate({
      video_id: videoId,
      duration_watched: durationWatched,
      completed: completed,
      language,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
    });
  }, [trackVideoView]);

  // Helper function to track session with automatic data collection
  const trackSessionWithDefaults = () => {
    const languageShort = localStorage.getItem('memopyk-language') as 'en' | 'fr' || 'fr';
    const language = languageShort === 'en' ? 'en-US' : 'fr-FR';
    
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