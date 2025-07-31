// Direct gallery video test to capture exact failure
console.log("🎯 DIRECT GALLERY VIDEO TEST");

// Step 1: Get the gallery data to see what videos exist
fetch('/api/gallery')
  .then(response => response.json())
  .then(galleryData => {
    console.log("📋 Gallery data:", galleryData);
    
    const activeItems = galleryData.filter(item => item.is_active);
    console.log("✅ Active gallery items:", activeItems.length);
    
    if (activeItems.length > 0) {
      const firstItem = activeItems[0];
      const videoUrl = firstItem.video_url_en || firstItem.video_url_fr;
      console.log("🎬 Raw video URL from database:", videoUrl);
      
      // Extract filename exactly like the frontend does
      let filename = videoUrl.includes('/') ? videoUrl.split('/').pop() : videoUrl;
      
      // Try to decode filename (like frontend)
      try {
        const decodedFilename = decodeURIComponent(filename || '');
        filename = decodedFilename;
        console.log("🔍 Decoded filename:", filename);
      } catch (e) {
        console.log("⚠️ Failed to decode filename:", filename);
      }
      
      // Construct proxy URL exactly like frontend
      const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename || '')}`;
      console.log("🎯 Constructed proxy URL:", proxyUrl);
      
      // Test the URL with fetch
      console.log("🧪 Testing with fetch...");
      fetch(proxyUrl, {
        headers: {
          'Range': 'bytes=0-1023',
          'Accept': '*/*'
        }
      })
      .then(response => {
        console.log("✅ Fetch result:", response.status, response.statusText);
        console.log("📋 Response headers:", [...response.headers.entries()]);
      })
      .catch(err => {
        console.error("❌ Fetch error:", err);
      });
      
      // Test with actual video element
      console.log("🧪 Testing with video element...");
      const video = document.createElement('video');
      video.onloadstart = () => console.log("✅ Video loadstart - SUCCESS");
      video.onloadeddata = () => console.log("✅ Video loadeddata - SUCCESS");
      video.onerror = (e) => {
        console.error("❌ Video element error:");
        console.error("   Network state:", video.networkState);
        console.error("   Ready state:", video.readyState);
        console.error("   Error:", video.error);
        console.error("   Current src:", video.currentSrc);
      };
      
      video.src = proxyUrl;
      document.body.appendChild(video);
      
      // Clean up after 5 seconds
      setTimeout(() => {
        console.log("🔍 Final video element state:");
        console.log("   Ready state:", video.readyState);
        console.log("   Network state:", video.networkState);
        console.log("   Has error:", !!video.error);
        document.body.removeChild(video);
      }, 5000);
      
    } else {
      console.error("❌ No active gallery items found");
    }
  })
  .catch(err => {
    console.error("❌ Failed to fetch gallery data:", err);
  });