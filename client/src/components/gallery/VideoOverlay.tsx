import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X, ImageIcon, Clock } from 'lucide-react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';
import { useGA4VideoAnalytics } from '@/hooks/useGA4VideoAnalytics';

interface VideoOverlayProps {
  videoUrl: string;
  title: string;
  sourceText: string;
  durationText: string;
  onClose: () => void;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  isInstantReady?: boolean;
  preloadedElement?: HTMLVideoElement | null;
  thumbnailUrl?: string;
}

export default function VideoOverlay({ 
  videoUrl, 
  title, 
  sourceText,
  durationText,
  onClose, 
  orientation, 
  width, 
  height, 
  isInstantReady = false, 
  preloadedElement = null,
  thumbnailUrl 
}: VideoOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUrl);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoStartTimeRef = useRef<number>(Date.now());
  const thumbnailStartTimeRef = useRef<number>(Date.now());
  const videoReadyRef = useRef<boolean>(false);
  
  // Minimum thumbnail display time (2 seconds)
  const MINIMUM_THUMBNAIL_DISPLAY_TIME = 2000;
  
  // Language detection for source text
  const language = localStorage.getItem('language') || 'en-US';
  
  // Analytics tracking - DISABLED: Switch to GA4-only for video analytics
  const { trackVideoView } = useVideoAnalytics();
  
  // GA4 Video Analytics - TEMPORARILY DISABLED for debugging
  // const ga4Analytics = useGA4VideoAnalytics();
  const ga4Analytics = {
    trackOpen: (...args: any[]) => console.log('📹 GA4 Video: video_open (DISABLED FOR DEBUG)', args),
    setupVisibilityTracking: (...args: any[]) => () => {},
    clearSession: () => {},
    trackProgressMilestone: (...args: any[]) => console.log('📹 GA4 Video: progress_milestone (DISABLED FOR DEBUG)', args),
    trackCompletion: (...args: any[]) => console.log('📹 GA4 Video: completion (DISABLED FOR DEBUG)', args),
    trackStart: (...args: any[]) => console.log('📹 GA4 Video: start (DISABLED FOR DEBUG)', args),
    trackResume: (...args: any[]) => console.log('📹 GA4 Video: resume (DISABLED FOR DEBUG)', args),
    trackPause: (...args: any[]) => console.log('📹 GA4 Video: pause (DISABLED FOR DEBUG)', args),
    trackEnded: (...args: any[]) => console.log('📹 GA4 Video: ended (DISABLED FOR DEBUG)', args)
  };
  
  // Feature flag for video analytics - DISABLED per requirement to switch to GA4-only
  const VIDEO_ANALYTICS_ENABLED = import.meta.env.VITE_VIDEO_ANALYTICS_ENABLED === 'true' || false;
  
  // Extract video ID from URL
  const getVideoId = useCallback(() => {
    if (videoUrl.includes('filename=')) {
      return videoUrl.split('filename=')[1].split('&')[0];
    }
    return videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
  }, [videoUrl]);

  // ENHANCED THUMBNAIL-TO-VIDEO SYSTEM v1.0.174 with minimum display time
  useEffect(() => {
    console.log('🚨🚨🚨 VIDEO OVERLAY MOUNTED! 🚨🚨🚨');
    console.log('🎬 Video URL:', videoUrl);
    console.log('🖼️ Thumbnail URL:', thumbnailUrl);
    videoStartTimeRef.current = Date.now();
    thumbnailStartTimeRef.current = Date.now();
    videoReadyRef.current = false;
    
    const videoId = getVideoId();
    console.log(`🎯 ENHANCED THUMBNAIL SYSTEM v1.0.177: Loading ${videoId} with ${MINIMUM_THUMBNAIL_DISPLAY_TIME}ms minimum display`);
    
    // GA4 Analytics: Track video open (modal/overlay opened)
    ga4Analytics.trackOpen(videoId, title);
    
    // Setup visibility tracking for watch time batching
    const cleanupVisibilityTracking = ga4Analytics.setupVisibilityTracking();
    
    // Start video buffering immediately for faster transition
    const video = videoRef.current;
    if (video && thumbnailUrl) {
      console.log('🎬 IMMEDIATE BUFFERING: Starting video load while showing thumbnail');
      video.load(); // Force immediate buffering
    }
    
    // Return cleanup function
    return () => {
      if (cleanupVisibilityTracking) {
        cleanupVisibilityTracking();
      }
      ga4Analytics.clearSession(videoId);
    };
  }, [videoUrl, getVideoId, title, ga4Analytics]); // Updated dependencies

  // Enhanced error handling
  const handleVideoError = useCallback((e: any) => {
    console.error(' ❌ VIDEO OVERLAY ERROR:');
    console.error('    - Video URL:', videoUrl);
    console.error('    - Error event:', e);
    console.error('    - Error details:', e.target?.error);
  }, [videoUrl]);

  // Mobile-responsive viewport sizing
  const viewportRatio = 90;

  // Calculate video container dimensions based on orientation
  const getVideoDimensions = useCallback(() => {
    if (orientation === 'portrait') {
      const containerHeight = (window.innerHeight * viewportRatio) / 100;
      const aspectRatio = width / height;
      const containerWidth = containerHeight * aspectRatio;
      return { width: containerWidth, height: containerHeight };
    } else {
      const containerWidth = (window.innerWidth * viewportRatio) / 100;
      const aspectRatio = width / height;
      const containerHeight = containerWidth / aspectRatio;
      return { width: containerWidth, height: containerHeight };
    }
  }, [orientation, width, height, viewportRatio]);

  const [videoDimensions, setVideoDimensions] = useState(() => getVideoDimensions());

  // Debounced resize handler
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setVideoDimensions(getVideoDimensions());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [getVideoDimensions]);

  // Auto-hide controls after 3 seconds
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Progress tracking - using timeupdate event for reliability with GA4 analytics
  const updateProgress = useCallback(() => {
    const video = videoRef.current;
    if (video && !isNaN(video.duration) && video.duration > 0) {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
      
      // GA4 Analytics: Track progress milestones and completion
      const videoId = getVideoId();
      ga4Analytics.trackProgressMilestone(videoId, video.duration, video.currentTime, title);
      ga4Analytics.trackCompletion(videoId, video.duration, video.currentTime, title);
    }
  }, [getVideoId, title, ga4Analytics]);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    resetControlsTimer();
    
    // GA4 Analytics: Track video start (first play) or resume
    const videoId = getVideoId();
    if (duration > 0) {
      ga4Analytics.trackStart(videoId, duration, currentTime, title);
      ga4Analytics.trackResume(videoId);
    }
  }, [resetControlsTimer, getVideoId, duration, currentTime, title, ga4Analytics]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    
    // GA4 Analytics: Track video pause
    const videoId = getVideoId();
    if (duration > 0) {
      ga4Analytics.trackPause(videoId, duration, currentTime, title);
    }
  }, [getVideoId, duration, currentTime, title, ga4Analytics]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(100);
    setShowControls(true);
    
    // GA4 Analytics: Track video ended
    const videoId = getVideoId();
    if (duration > 0) {
      ga4Analytics.trackEnded(videoId, duration, title);
    }
    
    // Old VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
    if (VIDEO_ANALYTICS_ENABLED) {
      const watchedDuration = Math.round(currentTime);
      const completionRate = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      const isCompleted = completionRate >= 90;
      console.log(`📊 VIDEO ENDED ANALYTICS: ${videoId} watched ${watchedDuration}s (${completionRate}% completion)`);
      trackVideoView(videoId, watchedDuration, isCompleted);
    }
  }, [currentTime, duration, getVideoId, trackVideoView, VIDEO_ANALYTICS_ENABLED, ga4Analytics, title]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      console.log('✅ Video metadata loaded');
    }
  }, []);

  // Helper function to check if minimum time has elapsed and video is ready
  const checkThumbnailTransition = useCallback(() => {
    if (!showThumbnail || !videoReadyRef.current) return;
    
    const timeElapsed = Date.now() - thumbnailStartTimeRef.current;
    const minimumTimeMet = timeElapsed >= MINIMUM_THUMBNAIL_DISPLAY_TIME;
    
    console.log(`🎯 THUMBNAIL TRANSITION CHECK: Time elapsed: ${timeElapsed}ms, Minimum met: ${minimumTimeMet}, Video ready: ${videoReadyRef.current}`);
    
    if (minimumTimeMet) {
      console.log('🎬 SMOOTH TRANSITION: Both conditions met - hiding thumbnail');
      setShowThumbnail(false);
      
      // Start video playback
      const video = videoRef.current;
      if (video) {
        console.log('🎬 STARTING VIDEO PLAYBACK after thumbnail hide');
        video.play().then(() => {
          console.log('✅ Video play() succeeded');
        }).catch((error) => {
          console.error('❌ Video play() failed:', error);
        });
      }
    } else {
      // Video is ready but minimum time hasn't elapsed - set timer for remaining time
      const remainingTime = MINIMUM_THUMBNAIL_DISPLAY_TIME - timeElapsed;
      console.log(`⏱️ WAITING: Video ready early, waiting ${remainingTime}ms more`);
      
      setTimeout(() => {
        if (showThumbnail && videoReadyRef.current) {
          console.log('🎬 DELAYED TRANSITION: Minimum time now met - hiding thumbnail');
          setShowThumbnail(false);
          
          const video = videoRef.current;
          if (video) {
            console.log('🎬 STARTING VIDEO PLAYBACK after delay');
            video.play().then(() => {
              console.log('✅ Video play() succeeded after delay');
            }).catch((error) => {
              console.error('❌ Video play() failed after delay:', error);
            });
          }
        }
      }, remainingTime);
    }
  }, [showThumbnail, MINIMUM_THUMBNAIL_DISPLAY_TIME]);

  // Enhanced video ready handler with minimum display time
  const handleCanPlay = useCallback(() => {
    if (!showThumbnail) return; // Prevent duplicate calls
    
    console.log('🎬 VIDEO READY: Can play - checking minimum display time');
    const video = videoRef.current;
    if (video) {
      console.log('🎬 VIDEO STATE CHECK:', {
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: video.currentTime,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      
      videoReadyRef.current = true;
      checkThumbnailTransition();
    }
  }, [showThumbnail, checkThumbnailTransition]);

  // Handle when enough data is loaded for smooth playback with minimum display time
  const handleCanPlayThrough = useCallback(() => {
    if (!showThumbnail) return; // Prevent duplicate calls
    
    console.log('🎬 VIDEO BUFFERED: Full buffer ready - checking minimum display time');
    videoReadyRef.current = true;
    checkThumbnailTransition();
  }, [showThumbnail, checkThumbnailTransition]);

  // Control handlers
  const handleVideoClick = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch(console.warn);
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (video) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * video.duration;
      video.currentTime = newTime;
      setProgress(percentage * 100);
      setCurrentTime(newTime);
    }
  }, []);

  // Enhanced close handler with analytics tracking
  const handleCloseWithAnalytics = useCallback(() => {
    // VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
    if (VIDEO_ANALYTICS_ENABLED) {
      // Track analytics when user manually closes the video
      const videoId = getVideoId();
      const watchedDuration = Math.round(currentTime);
      const completionRate = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      const isCompleted = completionRate >= 90; // Consider 90%+ as completed
      
      console.log(`📊 VIDEO CLOSED ANALYTICS: ${videoId} watched ${watchedDuration}s (${completionRate}% completion)`);
      trackVideoView(videoId, watchedDuration, isCompleted);
    } else {
      console.log('📊 VIDEO ANALYTICS DISABLED: Custom video tracking paused, switching to GA4-only');
    }
    
    // Call original close function
    onClose();
  }, [currentTime, duration, getVideoId, trackVideoView, onClose, VIDEO_ANALYTICS_ENABLED]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseWithAnalytics();
    }
  }, [handleCloseWithAnalytics]);

  // Keyboard controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const video = videoRef.current;
    if (!video) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        if (isPlaying) {
          video.pause();
        } else {
          video.play().catch(console.warn);
        }
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'Escape':
        e.preventDefault();
        handleCloseWithAnalytics();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        break;
    }
  }, [isPlaying, toggleMute, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 ease-out"
      style={{
        '--viewport-ratio': `${viewportRatio}%`,
      } as React.CSSProperties}
      onClick={handleOverlayClick}
    >
      {/* Video Container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          width: `${videoDimensions.width}px`,
          height: `${videoDimensions.height}px`,
        }}
        onMouseMove={resetControlsTimer}
      >
        {/* Thumbnail Display - Shows initially while video buffers */}
        {showThumbnail && thumbnailUrl && (
          <div 
            className="absolute inset-0 z-20 bg-black flex items-center justify-center transition-opacity duration-300"
            style={{
              opacity: showThumbnail ? 1 : 0,
              pointerEvents: showThumbnail ? 'auto' : 'none'
            }}
          >
            <img
              src={thumbnailUrl}
              alt="Video preview"
              className="w-full h-full object-cover"
              style={{
                width: `${videoDimensions.width}px`,
                height: `${videoDimensions.height}px`,
              }}
            />
            
            {/* Centered animated overlays - all appear simultaneously */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 sm:p-4">
              <div className="text-center space-y-3 sm:space-y-8 animate-fade-in max-w-full">
                {/* Source count (photos & videos) - Mobile responsive */}
                {sourceText && (
                  <div className="flex justify-center">
                    <div className="bg-black/70 backdrop-blur-sm text-white text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-4 rounded-full flex flex-col items-center justify-center max-w-full">
                      <div className="font-medium leading-tight whitespace-nowrap flex items-center gap-2 sm:gap-3">
                        <ImageIcon className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
                        <span className="truncate">{sourceText}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-300 mt-1">
                        {language === 'fr-FR' ? 'fournies par Client' : 'provided by Client'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Title - Mobile responsive */}
                {title && (
                  <div className="px-3 sm:px-8">
                    <h3 className="text-white font-bold text-lg sm:text-3xl leading-tight drop-shadow-lg text-center break-words">
                      {title}
                    </h3>
                  </div>
                )}
                
                {/* Duration - Mobile responsive */}
                {durationText && (
                  <div className="flex justify-center">
                    <div className="bg-black/70 backdrop-blur-sm text-white text-xs sm:text-base px-3 sm:px-6 py-2 rounded-full flex items-center gap-2 sm:gap-3">
                      <Clock className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
                      <span className="font-medium">{durationText}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            backgroundColor: 'black'
          }}
          controls={false}
          onClick={handleVideoClick}
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={updateProgress}
          onError={handleVideoError}
          onCanPlay={handleCanPlay}
          onCanPlayThrough={handleCanPlayThrough}
          onEnded={handleEnded}
          preload="auto"
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Center Play/Pause Overlay */}
        {!isPlaying && !showThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center z-25">
            <button
              onClick={handleVideoClick}
              className="bg-black/50 hover:bg-black/70 rounded-full p-4 transition-all duration-200 transform hover:scale-110"
              aria-label="Play video"
            >
              <Play size={48} className="text-white ml-1" />
            </button>
          </div>
        )}

        {/* Control Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Time Display */}
          <div className="flex justify-between items-center text-white text-xs sm:text-sm mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full bg-white/20 rounded-full h-1 sm:h-2 mb-2 sm:mb-4 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="bg-white rounded-full h-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleVideoClick}
              className="text-white hover:text-white/80 transition-colors p-1 sm:p-2"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="sm:w-6 sm:h-6" />}
            </button>

            <button
              onClick={toggleMute}
              className="text-white hover:text-white/80 transition-colors p-1 sm:p-2"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX size={16} className="sm:w-5 sm:h-5" /> : <Volume2 size={16} className="sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>

        {/* Close Button - Mobile Only */}
        <button
          onClick={handleCloseWithAnalytics}
          className="absolute top-2 right-2 sm:hidden text-white hover:text-white/80 transition-colors bg-black/50 rounded-full p-2 z-30"
          aria-label="Close video"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}