import { useState, useRef } from 'react';

export default function GalleryVideoTest() {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoLoad = () => {
    setIsLoading(false);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Auto-play might be blocked, that's okay
      });
    }
  };

  // Use PomGalleryC.mp4 directly via video proxy
  const videoSrc = `/api/video-proxy?filename=PomGalleryC.mp4`;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
          <div className="text-white text-xl">Loading POM Video...</div>
        </div>
      )}

      {/* Simple video player */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full max-w-4xl max-h-screen object-contain"
        controls
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={handleVideoLoad}
        onError={(e) => {
          console.error('Video failed to load:', e);
          setIsLoading(false);
        }}
      />

      {/* Simple title overlay */}
      <div className="absolute bottom-10 left-10 text-white">
        <h1 className="text-2xl font-bold">POM Gallery Video</h1>
        <p className="text-lg opacity-80">Playing via video proxy</p>
      </div>
    </div>
  );
}