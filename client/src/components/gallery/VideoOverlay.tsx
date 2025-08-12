import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface VideoOverlayProps {
  videoUrl: string;
  title: string;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  onClose: () => void;
  isInstantReady?: boolean;
  preloadedElement?: HTMLVideoElement;
}

export function VideoOverlay({ videoUrl, title, width, height, orientation, onClose, isInstantReady = false, preloadedElement }: VideoOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateRef = useRef<number | null>(null);

  // VIDEO OVERLAY LOAD DEBUG with instant ready detection
  useEffect(() => {
    if (isInstantReady && preloadedElement) {
      console.log('⚡ INSTANT READY VIDEO OVERLAY - v1.0.149:');
      console.log('   - Video URL:', videoUrl);
      console.log('   - Instant Ready:', isInstantReady);
      console.log('   - Preloaded Element Available:', !!preloadedElement);
      console.log('   - Preloaded ReadyState:', preloadedElement.readyState);
      console.log('   - Should play immediately without delay');
      
      // Transfer preloaded element properties to overlay video
      const overlayVideo = videoRef.current;
      if (overlayVideo) {
        console.log('🎯 TRANSFERRING PRELOADED DATA to overlay video element');
        overlayVideo.currentTime = 0;
        overlayVideo.muted = false;
        // The src will be set normally but the browser should use cached data
      }
    } else {
      console.log('⏳ REGULAR VIDEO OVERLAY LOAD - v1.0.149:');
      console.log('   - Video URL:', videoUrl);
      console.log('   - Instant Ready:', isInstantReady);
      console.log('   - Preloaded Element:', !!preloadedElement);
      console.log('   - Will load normally (may have delay)');
    }
  }, [videoUrl, title, isInstantReady, preloadedElement]);

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
    console.log('🎬 VIDEO ENDED: Gallery video finished playing - closing overlay');
    setIsPlaying(false);
    setProgress(100);
    
    // Cancel any ongoing progress updates
    if (progressUpdateRef.current) {
      cancelAnimationFrame(progressUpdateRef.current);
    }
    
    // Track video completion analytics
    if (videoId) {
      console.log(`📊 VIDEO COMPLETION: Tracking finished video ${videoId}`);
      // The analytics tracking would happen here
    }
    
    // Close the video overlay and return to gallery after a brief delay
    setTimeout(() => {
      console.log('🔄 AUTO-CLOSE: Returning to video gallery');
      onClose();
    }, 800); // Brief pause to show completion, then close
  }, [videoId, onClose]);

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
    
    // Auto-play with sound
    const video = videoRef.current;
    if (video) {
      video.play().catch(console.warn);
      resetControlsTimer();
    }

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
        {/* Video Element - NO LETTERBOXING FIX: object-cover eliminates black bars */}
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
            console.log(`✅ VIDEO OVERLAY FINAL FIX (v1.0.16): loadedmetadata - ${videoUrl}`);
          }}
          onError={handleVideoError}
          onLoadStart={() => {
            console.log(`🎬 VIDEO OVERLAY 80% VIEWPORT SIZING (v1.0.62): loadstart - NO BROWSER CONTROLS`);
            console.log(`   - Video URL: "${videoUrl}"`);
            console.log(`   - Title: "${title}"`);
            console.log(`   - Container: ${videoDimensions.width}x${videoDimensions.height}px`);
            console.log(`   - Video Dimensions: ${width}x${height}px`);
            console.log(`   - Orientation: ${orientation}`);
            console.log(`   - Viewport Ratio: ${viewportRatio}% (updated from 66.66% to 80%)`);
            console.log(`   - Aspect Ratio: ${width}/${height} = ${(width/height).toFixed(3)}`);
            console.log(`   - Container Aspect Ratio: ${(videoDimensions.width/videoDimensions.height).toFixed(3)}`);
            console.log(`   - Using 80% viewport scaling with object-cover for no black bars`);
            console.log(`   - Browser controls disabled: controls={false}, no fullscreen, no download, no context menu`);
          }}
          onCanPlay={() => {
            if (isInstantReady) {
              console.log('⚡ INSTANT VIDEO: CanPlay event fired - ready for instant playback');
            }
            console.log(`✅ VIDEO OVERLAY FINAL FIX (v1.0.16): canplay - ${videoUrl}`);
          }}
          onLoadedData={() => {
            console.log(`✅ VIDEO OVERLAY FINAL FIX (v1.0.16): loadeddata - ${videoUrl}`);
          }}
          onCanPlayThrough={() => {
            console.log(`✅ VIDEO OVERLAY FINAL FIX (v1.0.16): canplaythrough - ${videoUrl}`);
          }}
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