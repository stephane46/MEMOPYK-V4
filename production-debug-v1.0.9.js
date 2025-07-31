#!/usr/bin/env node

// Debug production deployment to see if v1.0.9 fix was deployed
const https = require('https');

console.log('🔍 PRODUCTION DEBUG - Checking deployment version and cache status\n');

// Test 1: Check health endpoint for version info
function checkHealthEndpoint() {
  return new Promise((resolve) => {
    https.get('https://memopyk.replit.app/api/video-proxy/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          console.log('📊 PRODUCTION HEALTH CHECK:');
          console.log(`   Version: ${health.deployment?.version || 'Not specified'}`);
          console.log(`   Cache files: ${health.cache?.fileCount || 0}`);
          console.log(`   Total size: ${health.cache?.sizeMB || '0'}MB`);
          console.log(`   URL encoding: ${health.deployment?.urlEncoding || 'Not specified'}`);
          
          // Check if problematic video is cached
          const problemFile = health.cache?.fileDetails?.find(f => f.size === 49069681);
          if (problemFile) {
            console.log(`   ✅ Problem video cached: ${problemFile.filename} (${problemFile.size} bytes)`);
          } else {
            console.log(`   ❌ Problem video NOT in cache`);
          }
          
          resolve(health);
        } catch (error) {
          console.log(`   ❌ Error parsing health response: ${error.message}`);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.log(`   ❌ Health check failed: ${error.message}`);
      resolve(null);
    });
  });
}

// Test 2: Try the problematic video endpoint directly
function testProblematicVideo() {
  return new Promise((resolve) => {
    const url = 'https://memopyk.replit.app/api/video-proxy?filename=1753390495474-Pom%20Gallery%20%28RAV%20AAA_001%29%20compressed.mp4';
    console.log('\n🎯 TESTING PROBLEMATIC VIDEO ENDPOINT:');
    console.log(`   URL: ${url}`);
    
    const req = https.request(url, {
      method: 'HEAD',
      headers: {
        'Range': 'bytes=0-1023'
      }
    }, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers: ${JSON.stringify(Object.fromEntries(Object.entries(res.headers).slice(0, 5)))}`);
      
      if (res.statusCode === 200 || res.statusCode === 206) {
        console.log(`   ✅ SUCCESS - Video endpoint working`);
      } else if (res.statusCode === 500) {
        console.log(`   ❌ 500 ERROR - Fix not working in production`);
      } else {
        console.log(`   ⚠️ Unexpected status: ${res.statusCode}`);
      }
      
      resolve(res.statusCode);
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Request failed: ${error.message}`);
      resolve(0);
    });
    
    req.end();
  });
}

// Test 3: Check if v1.0.9 markers are in production
function checkVersionMarkers() {
  return new Promise((resolve) => {
    // Try to access a debug endpoint that should show v1.0.9 markers
    const url = 'https://memopyk.replit.app/api/video-proxy?filename=test-version-check.mp4';
    console.log('\n🔍 VERSION MARKER CHECK:');
    
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      console.log(`   Test endpoint status: ${res.statusCode}`);
      // The response should contain v1.0.9 debug markers in error messages
      resolve(res.statusCode);
    });
    
    req.on('error', (error) => {
      console.log(`   Version check failed: ${error.message}`);
      resolve(0);
    });
    
    req.end();
  });
}

async function runProductionDebug() {
  const health = await checkHealthEndpoint();
  const videoTest = await testProblematicVideo();
  const versionCheck = await checkVersionMarkers();
  
  console.log('\n🎯 PRODUCTION DEBUG SUMMARY:');
  console.log(`   Health check: ${health ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   Video test result: ${videoTest}`);
  console.log(`   Version check: ${versionCheck}`);
  
  if (videoTest === 500) {
    console.log('\n❌ CRITICAL FINDING: Production still returning 500 errors');
    console.log('   This suggests v1.0.9 fix was not deployed to production');
    console.log('   OR there is an additional issue not caught by local testing');
  } else if (videoTest === 200 || videoTest === 206) {
    console.log('\n✅ GOOD NEWS: Production video endpoint working');
    console.log('   Issue might be browser-specific or related to actual video playback');
  }
  
  console.log('\n💡 NEXT STEPS:');
  if (videoTest === 500) {
    console.log('   1. Verify v1.0.9 deployment was successful');
    console.log('   2. Check production server logs for actual error messages');
    console.log('   3. Consider that production environment may have different behavior');
  } else {
    console.log('   1. Check if issue is frontend-specific (video element loading)');
    console.log('   2. Test with different browsers or devices');
    console.log('   3. Check for Content-Type or CORS issues in production');
  }
}

runProductionDebug();