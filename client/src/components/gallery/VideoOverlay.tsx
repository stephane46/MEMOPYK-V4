import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X, ImageIcon, Clock } from 'lucide-react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';
import { useGA4VideoAnalytics } from '@/hooks/useGA4VideoAnalytics';
import { trackVideoWatchTime, trackVideoStart } from '@/lib/analytics';

interface VideoOverlayProps {
  videoUrl: string;
  title: string;
  sourceText?: string;
  durationText?: string;
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
  console.log('🎬🎬🎬 VideoOverlay MOUNTED! 🎬🎬🎬', { videoUrl, title, sourceText, durationText });
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
  
  // Analytics tracking - LOCAL ANALYTICS: Track gallery video views
  const { trackVideoView } = useVideoAnalytics();
  

  
  // Feature flag for video analytics - Use environment variable as intended
  const VIDEO_ANALYTICS_ENABLED = import.meta.env.VITE_VIDEO_ANALYTICS_ENABLED === 'true' || false;
  
  // Extract video ID from URL
  const getVideoId = useCallback(() => {
    if (videoUrl.includes('filename=')) {
      return videoUrl.split('filename=')[1].split('&')[0];
    }
    return videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
  }, [videoUrl]);

  // ENHANCED THUMBNAIL-TO-VIDEO SYSTEM v1.0.174 with minimum display time - MOUNT ONCE ONLY
  useEffect(() => {
    console.log('🚨🚨🚨 VIDEO OVERLAY MOUNTED! 🚨🚨🚨');
    console.log('🎬 Video URL:', videoUrl);
    console.log('🖼️ Thumbnail URL:', thumbnailUrl);
    videoStartTimeRef.current = Date.now();
    thumbnailStartTimeRef.current = Date.now();
    videoReadyRef.current = false;
    
    // Extract video ID directly to avoid dependency issues
    const videoId = videoUrl.includes('filename=') 
      ? videoUrl.split('filename=')[1].split('&')[0]
      : videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
      
    console.log(`🎯 ENHANCED THUMBNAIL SYSTEM v1.0.178: Loading ${videoId} with ${MINIMUM_THUMBNAIL_DISPLAY_TIME}ms minimum display - GA4 ENABLED`);
    
    // GA4 Analytics: Track video open (modal/overlay opened) using proper analytics function
    trackVideoStart(videoId, 0, 0, title);
    
    // Start video buffering immediately for faster transition
    const video = videoRef.current;
    if (video && thumbnailUrl) {
      console.log('🎬 IMMEDIATE BUFFERING: Starting video load while showing thumbnail');
      video.load(); // Force immediate buffering
    }
    
    // Setup GA4 visibility tracking - DISABLED
    // const cleanupVisibilityTracking = ga4Analytics.setupVisibilityTracking();
    
    return () => {
      console.log('🔄 VIDEO OVERLAY CLEANUP - Component unmounting');
      
      // Track final watch time on cleanup
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        const finalWatchTime = Math.round(video.currentTime);
        console.log(`📊 CLEANUP WATCH TIME TRACKING: ${videoId} - ${finalWatchTime}s`);
        trackVideoWatchTime(videoId, finalWatchTime, title);
      }
      
      // cleanupVisibilityTracking();
      // ga4Analytics.clearSession(videoId);
    };
  }, [title]); // Include title for cleanup tracking

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
      
      // GA4 Analytics: Extract data inside callback to avoid dependencies
      const videoId = videoUrl.includes('filename=') 
        ? videoUrl.split('filename=')[1].split('&')[0]
        : videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
        
      // Progress tracking simplified - focus on watch time at end
    }
  }, [title, videoUrl]);

  // Video event handlers - Following stable dependency pattern
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    resetControlsTimer();
    
    // GA4 Analytics: Extract data inside callback to avoid dependencies
    const videoId = videoUrl.includes('filename=') 
      ? videoUrl.split('filename=')[1].split('&')[0]
      : videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
      
    // Track video start/resume with GA4 (don't wait for duration)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'video_start', {
        video_id: videoId,
        video_title: title,
        duration_sec: duration || 0,
        position_sec: currentTime || 0,
        locale: language
      });
      console.log('📊 GA4 VIDEO START EVENT SENT:', { video_id: videoId, video_title: title, duration_sec: duration || 0, locale: language });
    }
    
    // LOCAL ANALYTICS: Track video view start - CRITICAL FIX
    if (VIDEO_ANALYTICS_ENABLED && trackVideoView) {
      console.log(`📊 LOCAL ANALYTICS: Tracking video view start for ${videoId}`);
      trackVideoView(videoId, 0, false);
    }
  }, [resetControlsTimer, VIDEO_ANALYTICS_ENABLED, trackVideoView, title, videoUrl, duration, currentTime, language]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    
    // GA4 Analytics: Extract data inside callback to avoid dependencies
    const videoId = videoUrl.includes('filename=') 
      ? videoUrl.split('filename=')[1].split('&')[0]
      : videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
      
    if (duration > 0 && currentTime > 0) {
      // Track watch time when video is paused using proper analytics function
      trackVideoWatchTime(videoId, Math.round(currentTime), title);
    }
  }, [duration, currentTime, title, videoUrl, language]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(100);
    setShowControls(true);
    
    // GA4 Analytics: Extract data inside callback to avoid dependencies
    const videoId = videoUrl.includes('filename=') 
      ? videoUrl.split('filename=')[1].split('&')[0]
      : videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
      
    if (duration > 0) {
      // Track final watch time when video ends using proper analytics function
      trackVideoWatchTime(videoId, Math.round(duration), title);
    }
    
    // Old VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
    if (VIDEO_ANALYTICS_ENABLED) {
      const watchedDuration = Math.round(currentTime);
      const completionRate = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      const isCompleted = completionRate >= 90;
      console.log(`📊 VIDEO ENDED ANALYTICS: ${videoId} watched ${watchedDuration}s (${completionRate}% completion)`);
      trackVideoView(videoId, watchedDuration, isCompleted);
    }
  }, [currentTime, duration, trackVideoView, VIDEO_ANALYTICS_ENABLED, title, videoUrl, language]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      console.log('✅ Video metadata loaded');
    }
  }, []);

  // Simple function to start video after brief thumbnail display
  const startVideoPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      console.log('🎬 STARTING VIDEO PLAYBACK');
      setShowThumbnail(false);
      video.play().then(() => {
        console.log('✅ Video play() succeeded');
        setIsPlaying(true);
      }).catch((error) => {
        console.error('❌ Video play() failed:', error);
      });
    }
  }, []);

  // Simple video ready handler with proper 2-second minimum display
  const handleCanPlay = useCallback(() => {
    console.log('🎬 VIDEO READY: Can play');
    const video = videoRef.current;
    if (video && showThumbnail) {
      console.log('🎬 VIDEO STATE CHECK:', {
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: video.currentTime,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      
      videoReadyRef.current = true;
      
      // Calculate time already elapsed since thumbnail started showing
      const timeElapsed = Date.now() - thumbnailStartTimeRef.current;
      const remainingTime = Math.max(0, MINIMUM_THUMBNAIL_DISPLAY_TIME - timeElapsed);
      
      console.log(`🎯 THUMBNAIL TIMING: ${timeElapsed}ms elapsed, waiting ${remainingTime}ms more for minimum ${MINIMUM_THUMBNAIL_DISPLAY_TIME}ms display`);
      
      // Start playback after ensuring minimum 2-second thumbnail display
      setTimeout(startVideoPlayback, remainingTime);
    }
  }, [startVideoPlayback, showThumbnail, MINIMUM_THUMBNAIL_DISPLAY_TIME]);

  // Handle when enough data is loaded for smooth playback with proper timing
  const handleCanPlayThrough = useCallback(() => {
    console.log('🎬 VIDEO BUFFERED: Full buffer ready');
    const video = videoRef.current;
    if (video && showThumbnail) {
      videoReadyRef.current = true;
      
      // Calculate time already elapsed since thumbnail started showing
      const timeElapsed = Date.now() - thumbnailStartTimeRef.current;
      const remainingTime = Math.max(0, MINIMUM_THUMBNAIL_DISPLAY_TIME - timeElapsed);
      
      console.log(`🎯 BUFFERED TIMING: ${timeElapsed}ms elapsed, waiting ${remainingTime}ms more for minimum ${MINIMUM_THUMBNAIL_DISPLAY_TIME}ms display`);
      
      // Start playback after ensuring minimum 2-second thumbnail display
      setTimeout(startVideoPlayback, remainingTime);
    }
  }, [startVideoPlayback, showThumbnail, MINIMUM_THUMBNAIL_DISPLAY_TIME]);

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
    console.log('🔥🔥🔥 HANDLECLOSEWITHANALYTICS CALLED! 🔥🔥🔥');
    
    const video = videoRef.current;
    if (!video) {
      console.log('🔥 NO VIDEO REF - CALLING onClose()');
      onClose();
      return;
    }
    
    // GA4 Analytics: Read current time directly from video element for accuracy
    const videoId = getVideoId();
    const actualCurrentTime = video.currentTime;
    const actualDuration = video.duration;
    
    console.log(`📊 GA4 VIDEO CLOSE DEBUG: duration=${actualDuration}, currentTime=${actualCurrentTime}, videoId=${videoId}`);
    
    if (!isNaN(actualDuration) && actualDuration > 0 && actualCurrentTime > 0) {
      const finalWatchTime = Math.round(actualCurrentTime);
      console.log(`📊 GA4 VIDEO CLOSE: ${videoId} watched ${finalWatchTime}s (from video.currentTime)`);
      trackVideoWatchTime(videoId, finalWatchTime, title);
    } else {
      console.log(`📊 GA4 VIDEO CLOSE: No tracking - duration:${actualDuration}, currentTime:${actualCurrentTime}`);
    }
    
    // OLD VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
    if (VIDEO_ANALYTICS_ENABLED) {
      // Track analytics when user manually closes the video - also read from video element
      const watchedDuration = Math.round(actualCurrentTime);
      const completionRate = actualDuration > 0 ? Math.round((actualCurrentTime / actualDuration) * 100) : 0;
      const isCompleted = completionRate >= 90; // Consider 90%+ as completed
      
      console.log(`📊 VIDEO CLOSED ANALYTICS: ${videoId} watched ${watchedDuration}s (${completionRate}% completion)`);
      trackVideoView(videoId, watchedDuration, isCompleted);
    } else {
      console.log('📊 VIDEO ANALYTICS DISABLED: Custom video tracking paused, switching to GA4-only');
    }
    
    // Call original close function
    onClose();
  }, [getVideoId, trackVideoView, onClose, VIDEO_ANALYTICS_ENABLED, title]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseWithAnalytics();
    }
  }, [handleCloseWithAnalytics]);

  // Keyboard controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    console.log('⌨️ KEYBOARD EVENT CAPTURED:', e.key);
    const video = videoRef.current;
    if (!video) {
      console.log('⌨️ NO VIDEO REF - ignoring keyboard event');
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
        console.log('⌨️ PLAY/PAUSE key pressed');
        e.preventDefault();
        if (isPlaying) {
          video.pause();
        } else {
          video.play().catch(console.warn);
        }
        break;
      case 'm':
        console.log('⌨️ MUTE key pressed');
        e.preventDefault();
        toggleMute();
        break;
      case 'Escape':
        console.log('⌨️ ESC KEY PRESSED - calling handleCloseWithAnalytics');
        e.preventDefault();
        handleCloseWithAnalytics();
        break;
      case 'ArrowLeft':
        console.log('⌨️ LEFT ARROW key pressed');
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'ArrowRight':
        console.log('⌨️ RIGHT ARROW key pressed');
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        break;
    }
  }, [isPlaying, toggleMute, handleCloseWithAnalytics]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  // Component cleanup - Track watch time if user navigates away
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        const videoId = videoUrl.includes('filename=') 
          ? videoUrl.split('filename=')[1].split('&')[0]
          : videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
        
        const finalWatchTime = Math.round(video.currentTime);
        console.log(`📊 GA4 VIDEO UNMOUNT: ${videoId} watched ${finalWatchTime}s (component cleanup)`);
        trackVideoWatchTime(videoId, finalWatchTime, title);
      }
    };
  }, [videoUrl, title]);

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