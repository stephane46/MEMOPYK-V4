import { useState, useRef } from 'react';

export function SingleGalleryVideoSection() {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  // Use VitaminSeaC.mp4 as the single gallery video
  const videoSrc = `/api/video-proxy?filename=VitaminSeaC.mp4`;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Sample Memory Film
          </h2>
          <p className="text-lg text-gray-600">
            See how we transform your memories into cinematic experiences
          </p>
        </div>
        
        <div className="relative bg-black rounded-lg overflow-hidden shadow-xl">
          {/* Simple single video player */}
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full aspect-video object-cover"
            controls
            preload="metadata"
            onLoadedData={handleVideoLoad}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-white text-xl">Loading video...</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}