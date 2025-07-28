import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface VideoOverlayProps {
  videoUrl: string;
  title: string;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  onClose: () => void;
}

export function VideoOverlay({ videoUrl, title, width, height, orientation, onClose }: VideoOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateRef = useRef<number | null>(null);

  // CSS variables for 2/3 viewport sizing
  const twoThirdsRatio = 66.66;

  // Calculate video container dimensions based on orientation
  const getVideoDimensions = useCallback(() => {
    if (orientation === 'portrait') {
      // Portrait: height = 66.66% of viewport height, width = auto
      const containerHeight = (window.innerHeight * twoThirdsRatio) / 100;
      const aspectRatio = width / height;
      const containerWidth = containerHeight * aspectRatio;
      return { width: containerWidth, height: containerHeight };
    } else {
      // Landscape: width = 66.66% of viewport width, height = auto
      const containerWidth = (window.innerWidth * twoThirdsRatio) / 100;
      const aspectRatio = height / width;
      const containerHeight = containerWidth * aspectRatio;
      return { width: containerWidth, height: containerHeight };
    }
  }, [orientation, width, height, twoThirdsRatio]);

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
      setProgress((video.currentTime / video.duration) * 100);
      if (video.currentTime < video.duration) {
        progressUpdateRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, []);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    resetControlsTimer();
    progressUpdateRef.current = requestAnimationFrame(updateProgress);
  }, [resetControlsTimer, updateProgress]);

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
        '--two-thirds-ratio': `${twoThirdsRatio}%`,
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
        {/* Video Element - Use same structure as hero videos */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onClick={handleVideoClick}
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadedMetadata={handleLoadedMetadata}
          onError={(e) => {
            console.error(`❌ VIDEO OVERLAY ERROR (v1.0.13-debug):`);
            console.error(`   - Video URL: "${videoUrl}"`);
            console.error(`   - Error event:`, e);
            console.error(`   - Error details:`, e.currentTarget.error);
            console.error(`   - Network state:`, e.currentTarget.networkState);
            console.error(`   - Ready state:`, e.currentTarget.readyState);
            console.error(`   - Current src:`, e.currentTarget.currentSrc);
            console.error(`   - Source elements:`, e.currentTarget.querySelectorAll('source'));
            
            // Test direct fetch to see if URL is accessible
            console.log(`🔍 TESTING DIRECT FETCH: ${videoUrl}`);
            fetch(videoUrl, { 
              method: 'HEAD',
              headers: { 'Range': 'bytes=0-1023' }
            })
            .then(response => {
              console.log(`✅ DIRECT FETCH RESULT: ${response.status} ${response.statusText}`);
              console.log(`   - Headers:`, Array.from(response.headers.entries()));
            })
            .catch(err => {
              console.error(`❌ DIRECT FETCH FAILED:`, err);
            });
          }}
          onLoadStart={() => {
            console.log(`🎬 VIDEO OVERLAY LOAD START (v1.0.13-debug):`);
            console.log(`   - Video URL: "${videoUrl}"`);
            console.log(`   - Title: "${title}"`);
            console.log(`   - Element src:`, videoRef.current?.currentSrc);
            console.log(`   - Source elements:`, videoRef.current?.querySelectorAll('source').length || 0);
          }}
          onCanPlay={() => {
            console.log(`✅ VIDEO OVERLAY CAN PLAY: ${videoUrl}`);
          }}
          onProgress={() => {
            console.log(`📊 VIDEO OVERLAY PROGRESS: ${videoUrl}`);
          }}
          onSuspend={() => {
            console.log(`⏸️ VIDEO OVERLAY SUSPEND: ${videoUrl}`);
          }}
          onStalled={() => {
            console.log(`🔄 VIDEO OVERLAY STALLED: ${videoUrl}`);
          }}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>

        {/* Control Bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div className="w-full bg-white/20 h-1 rounded-full mb-4">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Buttons - As per requirements: Restart, Play/Pause, Mute */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleRestart}
              className="text-white hover:text-orange-400 transition-colors p-2 rounded-full hover:bg-white/10"
              aria-label="Restart video"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={togglePlayPause}
              className="text-white hover:text-orange-400 transition-colors p-3 rounded-full hover:bg-white/10"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              onClick={toggleMute}
              className="text-white hover:text-orange-400 transition-colors p-2 rounded-full hover:bg-white/10"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
          <h3 className="text-white text-lg font-semibold text-center">{title}</h3>
        </div>
      </div>
    </div>
  );
}