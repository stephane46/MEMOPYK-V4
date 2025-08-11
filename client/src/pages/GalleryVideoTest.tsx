export default function GalleryVideoTest() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Video */}
      <div className="relative h-96 bg-black overflow-hidden">
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => console.error('Hero video failed to load:', e)}
          onLoadedData={() => console.log('Hero video loaded successfully')}
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
          src="/api/video-proxy?filename=PomGalleryC.mp4"
          controls
          autoPlay
          muted
          style={{ width: '100%', maxWidth: '800px' }}
        />
      </div>
    </div>
  );
}