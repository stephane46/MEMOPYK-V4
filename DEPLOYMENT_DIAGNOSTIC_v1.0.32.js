// DEPLOYMENT DIAGNOSTIC v1.0.32 - Virgin Server Test
// Check if frontend updates reach production

console.log("🚨 DEPLOYMENT DIAGNOSTIC v1.0.32 - VIRGIN SERVER TEST");
console.log("📋 Checking if frontend bundle updates reach production...");

// Test 1: Version Check
const version = "v1.0.32_VIRGIN_SERVER_TEST";
console.log(`🔍 Version Tag: ${version}`);

// Test 2: Check if hasVideo function works
function testHasVideo() {
  console.log("🎬 Testing hasVideo function...");
  
  // Simulate gallery item with video_filename
  const testItem = {
    id: "test",
    video_filename: "1753736019450-VitaminSeaC.mp4",
    video_url_en: "1753736019450-VitaminSeaC.mp4"
  };
  
  const hasVideo = !!(testItem?.video_filename || testItem?.video_url_en);
  console.log(`🎬 hasVideo result: ${hasVideo}`);
  
  return hasVideo;
}

// Test 3: Check gallery data
fetch('/api/gallery')
  .then(response => response.json())
  .then(data => {
    console.log("📋 Gallery API response:", data);
    if (data && data.length > 0) {
      console.log(`🎬 First item video_filename: ${data[0].video_filename}`);
      console.log(`🎬 hasVideo for first item: ${!!(data[0]?.video_filename || data[0]?.video_url_en)}`);
    }
  })
  .catch(error => {
    console.error("❌ Gallery API error:", error);
  });

// Execute test
testHasVideo();

console.log("🚨 END DEPLOYMENT DIAGNOSTIC v1.0.32");