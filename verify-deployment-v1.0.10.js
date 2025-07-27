#!/usr/bin/env node

const https = require('https');

console.log('🔍 VERIFYING v1.0.10 DEPLOYMENT');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// The production URL from the logs
const baseUrl = 'https://memopyk-gallery-video-fix-v1-0-10-maximum-debug-deployment.f9af3e2d.repl.co';

console.log('Testing deployment at:', baseUrl);
console.log('');

// Test 1: Check if the site is up
https.get(baseUrl, (res) => {
  console.log('1. Site Status:', res.statusCode);
  
  if (res.statusCode === 200) {
    console.log('   ✅ Site is accessible');
    
    // Test 2: Check the problematic video
    const videoUrl = `${baseUrl}/api/video-proxy?filename=1753390495474-Pom%20Gallery%20(RAV%20AAA_001)%20compressed.mp4`;
    
    console.log('\n2. Testing problematic gallery video...');
    
    https.get(videoUrl, {
      headers: {
        'Range': 'bytes=0-1023',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      }
    }, (videoRes) => {
      console.log('   Status:', videoRes.statusCode);
      
      let body = '';
      videoRes.on('data', (chunk) => body += chunk);
      videoRes.on('end', () => {
        if (videoRes.statusCode === 500) {
          console.log('   ❌ Still getting 500 error');
          try {
            const error = JSON.parse(body);
            console.log('   Error details:', JSON.stringify(error, null, 2));
            
            // Check if it's v1.0.9 or v1.0.10
            if (error.version && error.version.includes('v1.0.10')) {
              console.log('   ⚠️ v1.0.10 is deployed but still failing');
            } else {
              console.log('   ⚠️ Old version still deployed:', error.version || 'unknown');
            }
          } catch {
            console.log('   Raw error:', body.substring(0, 200));
          }
        } else if (videoRes.statusCode === 206) {
          console.log('   ✅ Video is working! v1.0.10 fix successful');
        }
      });
    }).on('error', (err) => {
      console.error('   Video request failed:', err.message);
    });
  } else {
    console.log('   ❌ Site not accessible');
  }
}).on('error', (err) => {
  console.error('Site check failed:', err.message);
});