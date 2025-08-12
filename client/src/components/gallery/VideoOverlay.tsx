import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';

interface VideoOverlayProps {
  videoUrl: string;
  title: string;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  onClose: () => void;
  isInstantReady?: boolean;
  preloadedElement?: HTMLVideoElement;
  thumbnailUrl?: string; // For instant thumbnail display while video loads
}

export function VideoOverlay({ videoUrl, title, width, height, orientation, onClose, isInstantReady = false, preloadedElement, thumbnailUrl }: VideoOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUrl); // Show thumbnail initially
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateRef = useRef<number | null>(null);
  const videoStartTimeRef = useRef<number>(Date.now());
  
  // Analytics tracking
  const { trackVideoView } = useVideoAnalytics();
  
  // Extract video ID from URL
  const getVideoId = useCallback(() => {
    if (videoUrl.includes('filename=')) {
      return videoUrl.split('filename=')[1].split('&')[0];
    }
    return videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
  }, [videoUrl]);

  // AGGRESSIVE INSTANT THUMBNAIL-TO-VIDEO SYSTEM v1.0.169
  useEffect(() => {
    // Reset start time when video loads
    videoStartTimeRef.current = Date.now();
    
    const videoId = getVideoId();
    console.log(`🎯 AGGRESSIVE INSTANT SYSTEM v1.0.169: Loading ${videoId}`);
    
    if (thumbnailUrl) {
      console.log('🖼️ AGGRESSIVE INSTANT DISPLAY - v1.0.169:');
      console.log('   - Thumbnail URL:', thumbnailUrl);
      console.log('   - Video URL:', videoUrl);
      console.log('   - Video ID:', videoId);
      console.log('   - Strategy: Start video buffering IMMEDIATELY, show on first playable frame');
      
      // Set up video loading detection with aggressive buffering
      const video = videoRef.current;
      if (video) {
        // AGGRESSIVE: Start loading immediately
        video.preload = 'auto';
        video.load(); // Force immediate loading
        
        const handleCanPlay = () => {
          console.log('🎬 AGGRESSIVE READY: Can play (first frame ready) - immediate transition');
          setIsVideoReady(true);
          setShowThumbnail(false); // Fade out thumbnail immediately
          video.play().catch(console.warn);
        };

        const handleLoadedData = () => {
          console.log('🎬 AGGRESSIVE BUFFERING: Metadata loaded, starting aggressive preload');
        };

        const handleLoadStart = () => {
          console.log('🎬 AGGRESSIVE START: Video loading initiated immediately');
        };

        // Use 'canplay' instead of 'canplaythrough' for faster response
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('loadstart', handleLoadStart);
        
        return () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('loadstart', handleLoadStart);
        };
      }
    } else {
      console.log('⏳ STANDARD VIDEO OVERLAY LOAD - v1.0.169:');
      console.log('   - Video URL:', videoUrl);
      console.log('   - Video ID:', videoId);
      console.log('   - No thumbnail - standard loading behavior');
      
      // Standard behavior for instant ready videos
      if (isInstantReady && preloadedElement) {
        const overlayVideo = videoRef.current;
        if (overlayVideo) {
          console.log('🎯 TRANSFERRING PRELOADED DATA to overlay video element');
          overlayVideo.currentTime = 0;
          overlayVideo.muted = false;
        }
      }
    }
    
    // Track video view start (partial view tracking)
    trackVideoView(videoId, 0, false);
  }, [videoUrl, title, isInstantReady, preloadedElement, getVideoId, trackVideoView]);

  // Enhanced error handling
  const handleVideoError = useCallback((e: any) => {
    console.error(' ❌ VIDEO OVERLAY ERROR (v1.0.13-debug):');
    console.error('    - Video URL:', videoUrl);
    console.error('    - Error event:', e);
    console.error('    - Error details:', e.target?.error);
    console.error('    - Network state:', e.target?.networkState);
    console.error('    - Ready state:', e.target?.readyState);
    console.error('    - Current src:', e.target?.currentSrc);
    console.error('    - Source elements:', e.target?.querySelectorAll('source'));
    
    // Additional network state analysis
    const networkStates = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
    const readyStates = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
    console.error('    - Network state meaning:', networkStates[e.target?.networkState] || 'Unknown');
    console.error('    - Ready state meaning:', readyStates[e.target?.readyState] || 'Unknown');
  }, [videoUrl]);

  // Mobile-responsive viewport sizing
  const viewportRatio = 90; // Increased to 90% for mobile

  // Calculate video container dimensions based on orientation - Mobile responsive scaling
  const getVideoDimensions = useCallback(() => {
    if (orientation === 'portrait') {
      // Portrait: height = 80% of viewport height, width = auto
      const containerHeight = (window.innerHeight * viewportRatio) / 100;
      const aspectRatio = width / height;
      const containerWidth = containerHeight * aspectRatio;
      return { width: containerWidth, height: containerHeight };
    } else {
      // Landscape: width = 80% of viewport width, height = auto  
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

  // Progress tracking
  const updateProgress = useCallback(() => {
    const video = videoRef.current;
    if (video && !isNaN(video.duration)) {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
      // Continue animation if video is still playing and not ended
      if (!video.paused && video.currentTime < video.duration) {
        progressUpdateRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, []);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    resetControlsTimer();
    // Start continuous progress updates
    const startProgressUpdates = () => {
      const video = videoRef.current;
      if (video && !isNaN(video.duration)) {
        setCurrentTime(video.currentTime);
        setProgress((video.currentTime / video.duration) * 100);
        progressUpdateRef.current = requestAnimationFrame(startProgressUpdates);
      }
    };
    startProgressUpdates();
  }, [resetControlsTimer]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    if (progressUpdateRef.current) {
      cancelAnimationFrame(progressUpdateRef.current);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    const videoId = getVideoId();
    const watchTime = Date.now() - videoStartTimeRef.current;
    const watchTimeSeconds = Math.round(watchTime / 1000);
    
    console.log('🎬 VIDEO ENDED: Gallery video finished playing - closing overlay');
    console.log(`📊 VIDEO COMPLETION: ${videoId} watched for ${watchTimeSeconds}s`);
    
    setIsPlaying(false);
    setProgress(100);
    
    // Cancel any ongoing progress updates
    if (progressUpdateRef.current) {
      cancelAnimationFrame(progressUpdateRef.current);
    }
    
    // Track video completion analytics with actual watch time
    trackVideoView(videoId, watchTimeSeconds, true);
    
    // Close the video overlay and return to gallery after a brief delay
    setTimeout(() => {
      console.log('🔄 AUTO-CLOSE: Returning to video gallery');
      onClose();
    }, 800); // Brief pause to show completion, then close
  }, [getVideoId, trackVideoView, onClose]);

  // Control handlers
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  const handleRestart = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      setProgress(0);
      resetControlsTimer();
    }
  }, [resetControlsTimer]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  // Format time for display
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Keyboard and click handlers
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlayPause();
    resetControlsTimer();
  }, [togglePlayPause, resetControlsTimer]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
      resetControlsTimer();
    } else if (e.code === 'Escape') {
      onClose();
    }
  }, [togglePlayPause, resetControlsTimer, onClose]);

  // Setup and cleanup
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    // Auto-play logic - depends on thumbnail system
    const video = videoRef.current;
    if (video && !thumbnailUrl) {
      // No thumbnail - play immediately (standard behavior)
      video.play().catch(console.warn);
      resetControlsTimer();
    }
    // If thumbnail exists, video will auto-play when ready (handled in thumbnail system)

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
      }
    };
  }, [handleKeyDown, resetControlsTimer]);

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
        {/* Instant Thumbnail Display - Shows immediately while video buffers */}
        {showThumbnail && thumbnailUrl && (
          <div 
            className="absolute inset-0 z-10 bg-black flex items-center justify-center transition-opacity duration-500"
            style={{
              opacity: showThumbnail ? 1 : 0
            }}
          >
            <img
              src={thumbnailUrl}
              alt="Loading..."
              className="w-full h-full object-cover"
              style={{
                width: `${videoDimensions.width}px`,
                height: `${videoDimensions.height}px`,
              }}
            />
            {/* Loading indicator over thumbnail */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
              </div>
            </div>
          </div>
        )}

        {/* Video Element - AGGRESSIVE BUFFERING: immediate loading for instant playback */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          controls={false}
          onClick={handleVideoClick}
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadedMetadata={() => {
            handleLoadedMetadata();
            if (isInstantReady) {
              console.log('⚡ INSTANT READY: Auto-playing preloaded video');
            }
            console.log(`✅ AGGRESSIVE VIDEO v1.0.169: loadedmetadata - ${videoUrl}`);
          }}
          onError={handleVideoError}
          onLoadStart={() => {
            console.log(`🎬 AGGRESSIVE BUFFERING v1.0.169: loadstart - IMMEDIATE LOADING`);
            console.log(`   - Video URL: "${videoUrl}"`);
            console.log(`   - Title: "${title}"`);
            console.log(`   - Container: ${videoDimensions.width}x${videoDimensions.height}px`);
            console.log(`   - Video Dimensions: ${width}x${height}px`);
            console.log(`   - Orientation: ${orientation}`);
            console.log(`   - Viewport Ratio: ${viewportRatio}% (updated from 66.66% to 80%)`);
            console.log(`   - Aspect Ratio: ${width}/${height} = ${(width/height).toFixed(3)}`);
            console.log(`   - Container Aspect Ratio: ${(videoDimensions.width/videoDimensions.height).toFixed(3)}`);
            console.log(`   - AGGRESSIVE: preload=auto + immediate load() for zero-delay start`);
          }}
          onCanPlay={() => {
            if (isInstantReady) {
              console.log('⚡ INSTANT VIDEO: CanPlay event fired - ready for instant playback');
            }
            console.log(`✅ AGGRESSIVE v1.0.169: canplay - FIRST FRAME READY - ${videoUrl}`);
          }}
          onLoadedData={() => {
            console.log(`✅ AGGRESSIVE v1.0.169: loadeddata - METADATA LOADED - ${videoUrl}`);
          }}
          onCanPlayThrough={() => {
            console.log(`✅ AGGRESSIVE v1.0.169: canplaythrough - FULL BUFFER READY - ${videoUrl}`);
          }}
          onEnded={handleEnded}
          preload="auto"
          autoPlay={false}
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Control Bar - Mobile Optimized */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Time Display */}
          <div className="flex justify-between items-center text-white text-xs sm:text-sm mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress Bar - Mobile Touch-Friendly */}
          <div className="w-full bg-white/20 h-2 sm:h-1 rounded-full mb-3 sm:mb-4 touch-manipulation">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Buttons - Mobile Optimized */}
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            <button
              onClick={handleRestart}
              className="text-white hover:text-orange-400 transition-colors p-2 sm:p-2 rounded-full hover:bg-white/10 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Restart video"
            >
              <RotateCcw size={16} className="sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={togglePlayPause}
              className="text-white hover:text-orange-400 transition-colors p-2 sm:p-3 rounded-full hover:bg-white/10 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="sm:w-6 sm:h-6" />}
            </button>

            <button
              onClick={toggleMute}
              className="text-white hover:text-orange-400 transition-colors p-2 sm:p-2 rounded-full hover:bg-white/10 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX size={16} className="sm:w-5 sm:h-5" /> : <Volume2 size={16} className="sm:w-5 sm:h-5" />}
            </button>
          </div>
          

        </div>


      </div>
    </div>
  );
}