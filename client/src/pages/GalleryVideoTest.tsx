export default function GalleryVideoTest() {
  return (
    <video
      src="/api/video-proxy?filename=PomGalleryC.mp4"
      controls
      autoPlay
      muted
      style={{ width: '100%', height: '100vh' }}
    />
  );
}