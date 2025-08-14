import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
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
      console.log('🚨 CRITICAL TRACKING MUTATION v1.0.190: Making video view tracking request to /api/analytics/video-view');
      console.log('🚨 CRITICAL TRACKING MUTATION v1.0.190: Request data:', data);
      
      const response = await fetch('/api/analytics/video-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log('🚨 CRITICAL TRACKING MUTATION v1.0.190: Response status:', response.status);
      console.log('🚨 CRITICAL TRACKING MUTATION v1.0.190: Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 CRITICAL TRACKING MUTATION v1.0.190: TRACKING FAILED:', response.status, errorText);
        throw new Error(`Failed to track video view: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🚨 CRITICAL TRACKING MUTATION v1.0.190: SUCCESS - Server response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('🚨 CRITICAL TRACKING MUTATION v1.0.190: MUTATION SUCCESS:', data);
      // Invalidate analytics queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
    onError: (error) => {
      console.error('🚨 CRITICAL TRACKING MUTATION v1.0.190: MUTATION ERROR:', error);
      console.error('🚨 CRITICAL TRACKING MUTATION v1.0.190: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    },
  });

  const trackSession = useMutation({
    mutationFn: async (data: SessionData) => {
      console.log('📊 PRODUCTION ANALYTICS: Making session tracking request to /api/analytics/session');
      const response = await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log('📊 PRODUCTION ANALYTICS: Session request response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📊 PRODUCTION ANALYTICS: Session tracking failed:', response.status, errorText);
        throw new Error(`Failed to track session: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📊 PRODUCTION ANALYTICS: Session tracked successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('📊 PRODUCTION ANALYTICS: Session mutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
    onError: (error) => {
      console.error('📊 PRODUCTION ANALYTICS: Session tracking error:', error);
    },
  });

  // Helper function to track video view with duplicate prevention (reduced for better production testing)
  const trackVideoViewWithDefaults = useCallback((videoId: string, durationWatched?: number, completed?: boolean) => {
    // Skip tracking for hero videos (auto-play videos don't provide meaningful engagement data)
    if (['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(videoId)) {
      console.log(`📊 PRODUCTION ANALYTICS: Skipping analytics tracking for hero video: ${videoId} (auto-play videos excluded from analytics)`);
      return;
    }
    
    console.log(`🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: Gallery video tracking requested for: ${videoId}`);
    console.log('🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: Video data:', { videoId, durationWatched, completed });
    console.log('🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: Current URL:', window.location.href);
    console.log('🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: User Agent:', navigator.userAgent);
    
    const language = (localStorage.getItem('memopyk-language') as 'en-US' | 'fr-FR') || 'fr-FR';
    console.log('🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: Language:', language);
    
    // Reduced duplicate prevention - 10 second window for better production testing
    const lastTracked = localStorage.getItem(`last-tracked-${videoId}`);
    const now = Date.now();
    if (lastTracked && now - parseInt(lastTracked) < 10000) {
      console.log(`🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: DUPLICATE BLOCKED - last tracked ${Math.round((now - parseInt(lastTracked)) / 1000)}s ago`);
      return; // Skip if tracked within last 10 seconds
    }
    
    console.log(`🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: PROCEEDING WITH TRACKING for ${videoId}`);
    localStorage.setItem(`last-tracked-${videoId}`, now.toString());
    
    const viewData = {
      video_id: videoId,
      duration_watched: durationWatched,
      completed: completed,
      language,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
    };
    
    console.log('🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: Final tracking data:', viewData);
    console.log('🚨 CRITICAL VIDEO TRACKING DEBUG v1.0.190: Calling trackVideoView.mutate...');
    
    trackVideoView.mutate(viewData);
  }, [trackVideoView]);

  // Helper function to track session with automatic data collection and deduplication
  const trackSessionWithDefaults = () => {
    // Admin page exclusion - automatically exclude admin visits from analytics
    if (window.location.pathname.includes('/admin') || window.location.pathname.endsWith('/admin')) {
      console.log('📊 PRODUCTION ANALYTICS: Skipping session tracking - admin page detected');
      return;
    }
    
    // Session deduplication to prevent analytics overload (reduced from 1 hour to 10 minutes for better production tracking)
    const sessionKey = 'memopyk-session-tracked';
    const sessionStartKey = 'memopyk-session-start';
    const lastSessionTime = localStorage.getItem(sessionKey);
    const now = Date.now();
    
    // Reduced to 30 seconds for better production testing and country change detection
    if (lastSessionTime && now - parseInt(lastSessionTime) < 30000) {
      console.log(`⏭️ PRODUCTION ANALYTICS: Skipping session tracking - already tracked ${Math.round((now - parseInt(lastSessionTime)) / 1000)}s ago`);
      return;
    }
    
    console.log('📊 PRODUCTION ANALYTICS: Tracking new visitor session');
    console.log('📊 PRODUCTION ANALYTICS: Environment:', import.meta.env.NODE_ENV || 'production');
    console.log('📊 PRODUCTION ANALYTICS: Current URL:', window.location.href);
    
    // Store session start time for duration calculation
    if (!localStorage.getItem(sessionStartKey)) {
      localStorage.setItem(sessionStartKey, now.toString());
      console.log('📊 SESSION DURATION: Session start time recorded');
    }
    
    localStorage.setItem(sessionKey, now.toString());
    
    const language = (localStorage.getItem('memopyk-language') as 'en-US' | 'fr-FR') || 'fr-FR';
    
    const sessionData = {
      language,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || undefined,
    };
    
    console.log('📊 PRODUCTION ANALYTICS: Sending session data:', sessionData);
    
    trackSession.mutate(sessionData);
    
    // Set up session duration tracking
    setupSessionDurationTracking();
  };

  // Session duration tracking with page visibility API
  const setupSessionDurationTracking = () => {
    const sessionStartKey = 'memopyk-session-start';
    
    const updateSessionDuration = async () => {
      const sessionStart = localStorage.getItem(sessionStartKey);
      if (!sessionStart) return;
      
      const duration = Math.round((Date.now() - parseInt(sessionStart)) / 1000);
      console.log(`📊 SESSION DURATION: Current session duration: ${duration}s`);
      
      // Send session duration update to backend
      try {
        await fetch('/api/analytics/session-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration })
        });
      } catch (error) {
        console.warn('📊 SESSION DURATION: Failed to update session duration:', error);
      }
    };
    
    // Update session duration on page unload
    const handleBeforeUnload = () => {
      updateSessionDuration();
      console.log('📊 SESSION DURATION: Session ending, final duration recorded');
    };
    
    // Update session duration when page becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateSessionDuration();
        console.log('📊 SESSION DURATION: Page hidden, duration updated');
      }
    };
    
    // Set up event listeners if not already done
    if (!window.memopykSessionListenersAdded) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.memopykSessionListenersAdded = true;
      
      // Update duration every 30 seconds
      setInterval(updateSessionDuration, 30000);
      console.log('📊 SESSION DURATION: Tracking setup complete - updates every 30s');
    }
  };

  return {
    trackVideoView: trackVideoViewWithDefaults,
    trackSession: trackSessionWithDefaults,
    // Raw mutation hooks for manual usage
    trackVideoViewMutation: trackVideoView,
    trackSessionMutation: trackSession,
  };
};