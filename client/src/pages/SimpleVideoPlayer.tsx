export default function SimpleVideoPlayer() {
  const VERSION = "v1.0.1754927210.FIXED_BOTH_SOURCE";
  
  console.log(`🎬 SIMPLE VIDEO PLAYER ${VERSION} - LOADED`);
  console.log('   - Hero Video URL: /api/video-proxy?filename=VideoHero1.mp4');
  console.log('   - POM Video URL: /api/video-proxy?filename=PomGalleryC.mp4');
  console.log('   - Both using <source> element pattern');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Version Banner */}
      <div className="bg-red-500 text-white p-2 text-center text-sm font-bold">
        SIMPLE VIDEO PLAYER {VERSION} - BOTH VIDEOS USE SAME SOURCE PATTERN
      </div>
      
      {/* Hero Video Section */}
      <div className="relative h-96 bg-black overflow-hidden">
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onLoadStart={() => console.log('🎬 HERO VIDEO: loadstart event')}
          onLoadedData={() => console.log('🎬 HERO VIDEO: loadeddata event')}
          onCanPlay={() => console.log('🎬 HERO VIDEO: canplay event')}
          onError={(e) => console.error('🎬 HERO VIDEO ERROR:', e)}
        >
          <source src="/api/video-proxy?filename=VideoHero1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">Gallery Video Test</h1>
        </div>
      </div>
      
      {/* Simple POM Video Player */}
      <div className="py-8 flex justify-center">
        <video
          controls
          autoPlay
          muted
          style={{ width: '100%', maxWidth: '800px' }}
          onLoadStart={() => console.log('🎬 POM VIDEO: loadstart event')}
          onLoadedData={() => console.log('🎬 POM VIDEO: loadeddata event')}
          onCanPlay={() => console.log('🎬 POM VIDEO: canplay event')}
          onError={(e) => {
            console.error('🎬 POM VIDEO ERROR:', e);
            console.error('🎬 POM VIDEO ERROR DETAILS:', {
              error: e.target?.error,
              networkState: e.target?.networkState,
              readyState: e.target?.readyState,
              currentSrc: e.target?.currentSrc
            });
          }}
        >
          <source src="/api/video-proxy?filename=PomGalleryC.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}