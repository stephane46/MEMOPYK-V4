// Debug script to test gallery video with different header combinations
// Run this in browser console on production site

console.log("🔍 PRODUCTION GALLERY VIDEO HEADER TEST");

const testUrl = "/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4";

// Test 1: Standard fetch (this should work)
console.log("🧪 TEST 1: Standard fetch request");
fetch(testUrl, {
  headers: {
    'Range': 'bytes=0-1023',
    'Accept': '*/*'
  }
})
.then(response => {
  console.log("✅ Standard fetch result:", response.status);
  console.log("   Headers:", [...response.headers.entries()]);
})
.catch(err => console.error("❌ Standard fetch error:", err));

// Test 2: Video element Accept header (this might fail)
console.log("🧪 TEST 2: Video element style request");
fetch(testUrl, {
  headers: {
    'Range': 'bytes=0-1023',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'sec-fetch-dest': 'video',
    'sec-fetch-mode': 'no-cors'
  }
})
.then(response => {
  console.log("✅ Video element style result:", response.status);
  console.log("   Headers:", [...response.headers.entries()]);
})
.catch(err => console.error("❌ Video element style error:", err));

// Test 3: Mobile browser headers (from HAR file)
console.log("🧪 TEST 3: Mobile browser headers");
fetch(testUrl, {
  headers: {
    'Range': 'bytes=0-1023',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Encoding': 'identity;q=1, *;q=0',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'video',
    'sec-fetch-mode': 'no-cors'
  }
})
.then(response => {
  console.log("✅ Mobile browser style result:", response.status);
  console.log("   Headers:", [...response.headers.entries()]);
})
.catch(err => console.error("❌ Mobile browser style error:", err));

// Test 4: Create actual video element (closest to real scenario)
console.log("🧪 TEST 4: Real video element test");
const video = document.createElement('video');
video.onloadstart = () => console.log("✅ Video element loadstart");
video.onloadeddata = () => console.log("✅ Video element loadeddata");
video.onerror = (e) => {
  console.error("❌ Video element error:", e);
  console.error("   Network state:", video.networkState);
  console.error("   Ready state:", video.readyState);
  console.error("   Error code:", video.error?.code);
  console.error("   Error message:", video.error?.message);
};
video.src = testUrl;
document.body.appendChild(video);

setTimeout(() => {
  console.log("🔍 Video element final state:");
  console.log("   Network state:", video.networkState);
  console.log("   Ready state:", video.readyState);
  console.log("   Current src:", video.currentSrc);
  console.log("   Error:", video.error);
  document.body.removeChild(video);
}, 5000);