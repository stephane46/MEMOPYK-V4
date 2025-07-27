// Force gallery video cache refresh for production deployment
const fs = require('fs');
const path = require('path');

async function forceGalleryCacheRefresh() {
  console.log('🚀 FORCING GALLERY CACHE REFRESH FOR PRODUCTION');
  
  try {
    // Import the video cache
    const { VideoCache } = await import('./server/video-cache.js');
    const videoCache = new VideoCache();
    
    console.log('📥 Forcing download of gallery videos...');
    
    // Force download gallery videos
    const galleryVideos = [
      'gallery_Our_vitamin_sea_rework_2_compressed.mp4',
      '1753390495474-Pom Gallery (RAV AAA_001) compressed.mp4'
    ];
    
    for (const filename of galleryVideos) {
      console.log(`📥 Downloading ${filename}...`);
      try {
        await videoCache.downloadAndCacheVideo(filename);
        console.log(`✅ Successfully cached: ${filename}`);
      } catch (error) {
        console.error(`❌ Failed to cache ${filename}:`, error.message);
      }
    }
    
    console.log('🎯 Gallery cache refresh complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cache refresh failed:', error);
    process.exit(1);
  }
}

forceGalleryCacheRefresh();