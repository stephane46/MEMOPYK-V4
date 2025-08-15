import { useRef, useCallback } from 'react';
import { 
  trackVideoOpen, 
  trackVideoStart, 
  trackVideoPause, 
  trackVideoProgress, 
  trackVideoComplete, 
  trackVideoWatchTime 
} from '@/lib/analytics';

interface VideoSession {
  videoId: string;
  startTime: number;
  watchedTime: number;
  lastUpdateTime: number;
  milestones: Set<25 | 50 | 75 | 100>;
  hasStarted: boolean;
  hasCompleted: boolean;
}

// Force bundle regeneration to clear browser cache - August 15, 2025
export const useGA4VideoAnalytics = () => {
  const sessionsRef = useRef<Map<string, VideoSession>>(new Map());
  const watchTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get or create session
  const getSession = useCallback((videoId: string): VideoSession => {
    if (!sessionsRef.current.has(videoId)) {
      sessionsRef.current.set(videoId, {
        videoId,
        startTime: Date.now(),
        watchedTime: 0,
        lastUpdateTime: Date.now(),
        milestones: new Set(),
        hasStarted: false,
        hasCompleted: false
      });
    }
    return sessionsRef.current.get(videoId)!;
  }, []);

  // Helper to calculate percentage with tolerance
  const getProgressMilestone = useCallback((currentTime: number, duration: number): 25 | 50 | 75 | 100 | null => {
    if (duration <= 0) return null;
    
    const percentage = (currentTime / duration) * 100;
    
    // Tolerance: within ±1% (24-26% → 25%)
    if (percentage >= 24 && percentage <= 26) return 25;
    if (percentage >= 49 && percentage <= 51) return 50;
    if (percentage >= 74 && percentage <= 76) return 75;
    if (percentage >= 99 || percentage >= 100) return 100;
    
    return null;
  }, []);

  // Track video modal/overlay open
  const trackOpen = useCallback((videoId: string, videoTitle?: string) => {
    console.log(`🎬 GA4 Video Analytics: Video opened - ${videoId}`);
    getSession(videoId); // Initialize session
    trackVideoOpen(videoId, videoTitle);
  }, [getSession]);

  // Track first video start/play
  const trackStart = useCallback((videoId: string, duration: number, currentTime: number = 0, videoTitle?: string) => {
    const session = getSession(videoId);
    
    if (!session.hasStarted) {
      session.hasStarted = true;
      session.lastUpdateTime = Date.now();
      console.log(`🎬 GA4 Video Analytics: First start - ${videoId}`);
      trackVideoStart(videoId, duration, currentTime, videoTitle);
    }
  }, [getSession]);

  // Track video pause
  const trackPause = useCallback((videoId: string, duration: number, currentTime: number, videoTitle?: string) => {
    const session = getSession(videoId);
    
    // Update watched time
    const now = Date.now();
    const sessionTime = (now - session.lastUpdateTime) / 1000;
    session.watchedTime += sessionTime;
    session.lastUpdateTime = now;
    
    console.log(`🎬 GA4 Video Analytics: Paused - ${videoId} at ${currentTime}s`);
    trackVideoPause(videoId, duration, currentTime, videoTitle);
    
    // Send batched watch time
    if (session.watchedTime > 0) {
      trackVideoWatchTime(videoId, Math.round(session.watchedTime), videoTitle);
      session.watchedTime = 0; // Reset after sending
    }
  }, [getSession]);

  // Track video resume (update last update time)
  const trackResume = useCallback((videoId: string) => {
    const session = getSession(videoId);
    session.lastUpdateTime = Date.now();
    console.log(`🎬 GA4 Video Analytics: Resumed - ${videoId}`);
  }, [getSession]);

  // Track progress milestones
  const trackProgressMilestone = useCallback((videoId: string, duration: number, currentTime: number, videoTitle?: string) => {
    const session = getSession(videoId);
    const milestone = getProgressMilestone(currentTime, duration);
    
    if (milestone && !session.milestones.has(milestone)) {
      session.milestones.add(milestone);
      console.log(`🎬 GA4 Video Analytics: Progress milestone ${milestone}% - ${videoId}`);
      trackVideoProgress(videoId, milestone, duration, currentTime, videoTitle);
    }
  }, [getSession, getProgressMilestone]);

  // Track video completion
  const trackCompletion = useCallback((videoId: string, duration: number, currentTime: number, videoTitle?: string) => {
    const session = getSession(videoId);
    
    // Mark as complete if ≥90% or ended
    const completionThreshold = duration * 0.9;
    if ((currentTime >= completionThreshold || currentTime >= duration) && !session.hasCompleted) {
      session.hasCompleted = true;
      console.log(`🎬 GA4 Video Analytics: Video completed - ${videoId}`);
      trackVideoComplete(videoId, duration, currentTime, videoTitle);
    }
    
    // Also track as 100% milestone if applicable
    trackProgressMilestone(videoId, duration, currentTime, videoTitle);
  }, [getSession, trackProgressMilestone]);

  // Handle video ended event
  const trackEnded = useCallback((videoId: string, duration: number, videoTitle?: string) => {
    const session = getSession(videoId);
    
    // Update final watched time
    const now = Date.now();
    const sessionTime = (now - session.lastUpdateTime) / 1000;
    session.watchedTime += sessionTime;
    
    // Send final watch time batch
    if (session.watchedTime > 0) {
      trackVideoWatchTime(videoId, Math.round(session.watchedTime), videoTitle);
    }
    
    // Mark as completed
    trackCompletion(videoId, duration, duration, videoTitle);
    
    console.log(`🎬 GA4 Video Analytics: Video ended - ${videoId}`);
  }, [getSession, trackCompletion]);

  // Handle page visibility change (send batched watch time when hidden)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      console.log('🎬 GA4 Video Analytics: Page hidden - sending watch time batches');
      
      sessionsRef.current.forEach((session) => {
        if (session.watchedTime > 0) {
          const now = Date.now();
          const sessionTime = (now - session.lastUpdateTime) / 1000;
          const totalWatchTime = session.watchedTime + sessionTime;
          
          trackVideoWatchTime(session.videoId, Math.round(totalWatchTime));
          session.watchedTime = 0;
          session.lastUpdateTime = now;
        }
      });
    } else {
      // Update last update time when page becomes visible again
      sessionsRef.current.forEach((session) => {
        session.lastUpdateTime = Date.now();
      });
    }
  }, []);

  // Setup/cleanup for page visibility tracking
  const setupVisibilityTracking = useCallback(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Clear session data for a video
  const clearSession = useCallback((videoId: string) => {
    sessionsRef.current.delete(videoId);
    console.log(`🎬 GA4 Video Analytics: Session cleared - ${videoId}`);
  }, []);

  return {
    trackOpen,
    trackStart,
    trackPause,
    trackResume,
    trackProgressMilestone,
    trackCompletion,
    trackEnded,
    clearSession,
    setupVisibilityTracking
  };
};