import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X, ImageIcon, Clock } from 'lucide-react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';

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

  // STABLE THUMBNAIL-TO-VIDEO SYSTEM v1.0.173
  useEffect(() => {
    videoStartTimeRef.current = Date.now();
    const videoId = getVideoId();
    console.log(`🎯 STABLE THUMBNAIL SYSTEM v1.0.173: Loading ${videoId}`);
    
    // Start video buffering immediately for faster transition
    const video = videoRef.current;
    if (video && thumbnailUrl) {
      console.log('🎬 IMMEDIATE BUFFERING: Starting video load while showing thumbnail');
      video.load(); // Force immediate buffering
    }
    
    trackVideoView(videoId, 0, false);
  }, [videoUrl]); // Simplified dependencies to prevent infinite loops

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

  // Progress tracking
  const updateProgress = useCallback(() => {
    const video = videoRef.current;
    if (video && !isNaN(video.duration)) {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    }
    progressUpdateRef.current = requestAnimationFrame(updateProgress);
  }, []);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    resetControlsTimer();
    updateProgress();
  }, [resetControlsTimer, updateProgress]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    if (progressUpdateRef.current) {
      cancelAnimationFrame(progressUpdateRef.current);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setShowControls(true);
    if (progressUpdateRef.current) {
      cancelAnimationFrame(progressUpdateRef.current);
    }
    
    // Track video completion
    const videoId = getVideoId();
    trackVideoView(videoId, duration, true);
  }, [duration, getVideoId, trackVideoView]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      console.log('✅ Video metadata loaded');
    }
  }, []);

  // Stable video ready handler
  const handleCanPlay = useCallback(() => {
    if (!showThumbnail) return; // Prevent duplicate calls
    
    console.log('🎬 VIDEO READY: Can play - instant transition from thumbnail');
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
      
      // Immediate transition without delay
      setShowThumbnail(false);
      video.play().catch(console.warn);
    }
  }, [showThumbnail]);

  // Handle when enough data is loaded for smooth playback
  const handleCanPlayThrough = useCallback(() => {
    if (!showThumbnail) return; // Prevent duplicate calls
    
    console.log('🎬 VIDEO BUFFERED: Full buffer ready for seamless playback');
    setShowThumbnail(false);
  }, [showThumbnail]);

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

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

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
        onClose();
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
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
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
            
            {/* Animated overlays matching video card format */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Source count (photos & videos) - top left */}
              {sourceText && (
                <div className="absolute top-3 left-3 animate-slide-in-left animation-delay-100">
                  <div className="bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" />
                    <span className="font-medium">{sourceText}</span>
                  </div>
                </div>
              )}
              
              {/* Title - bottom left */}
              {title && (
                <div className="absolute bottom-12 left-3 right-3 animate-slide-in-left animation-delay-200">
                  <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg">
                    {title}
                  </h3>
                </div>
              )}
              
              {/* Duration - bottom right */}
              {durationText && (
                <div className="absolute bottom-3 right-3 animate-slide-in-right animation-delay-300">
                  <div className="bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">{durationText}</span>
                  </div>
                </div>
              )}
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

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-white/80 transition-colors bg-black/50 rounded-full p-1 sm:p-2 z-30"
          aria-label="Close video"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
}