#!/usr/bin/env node

/**
 * FORCE GALLERY VIDEO CACHE - v1.0.14
 * 
 * Emergency script to force download and cache gallery video on fresh deployment
 * This resolves the issue where gallery video fails on virgin server deployment
 */

const https = require('https');
const http = require('http');

console.log('🚨 EMERGENCY GALLERY CACHE FORCE - v1.0.14');
console.log('   - This will force the gallery video to cache on deployment server');
console.log('   - Target: gallery_Our_vitamin_sea_rework_2_compressed.mp4');

const forceGalleryCache = async () => {
  const url = 'https://memopyk.replit.app/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4';
  
  console.log(`🔄 FORCING gallery video cache via: ${url}`);
  
  const makeRequest = () => {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'Range': 'bytes=0-1023',
          'User-Agent': 'Cache-Force-Script/1.0.14'
        }
      }, (res) => {
        console.log(`📊 Response status: ${res.statusCode}`);
        console.log(`📊 Response headers:`, res.headers);
        
        if (res.statusCode === 206) {
          console.log('✅ SUCCESS: Gallery video cache forced successfully');
          resolve(res.statusCode);
        } else if (res.statusCode === 500) {
          console.log('❌ 500 ERROR: Gallery video still failing - need deeper investigation');
          resolve(res.statusCode);
        } else {
          console.log(`⚠️ UNEXPECTED STATUS: ${res.statusCode}`);
          resolve(res.statusCode);
        }
        
        // Consume response data
        res.on('data', (chunk) => {
          console.log(`📦 Received ${chunk.length} bytes`);
        });
        
        res.on('end', () => {
          console.log('🏁 Response complete');
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ REQUEST ERROR:', error.message);
        reject(error);
      });
      
      req.setTimeout(30000, () => {
        console.error('❌ REQUEST TIMEOUT');
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  };
  
  try {
    console.log('🎬 ATTEMPT 1: Initial cache force request...');
    const status1 = await makeRequest();
    
    if (status1 === 206) {
      console.log('🎉 GALLERY VIDEO SUCCESSFULLY CACHED!');
      console.log('   - Test the gallery video in browser now');
      return;
    }
    
    console.log('🔄 ATTEMPT 2: Retry after 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const status2 = await makeRequest();
    
    if (status2 === 206) {
      console.log('🎉 GALLERY VIDEO SUCCESSFULLY CACHED ON RETRY!');
      console.log('   - Test the gallery video in browser now');
      return;
    }
    
    console.log('❌ BOTH ATTEMPTS FAILED');
    console.log('   - Gallery video may need manual server investigation');
    console.log('   - Check server logs for detailed error information');
    
  } catch (error) {
    console.error('💥 SCRIPT ERROR:', error.message);
  }
};

// Run the cache force
forceGalleryCache().then(() => {
  console.log('🏁 CACHE FORCE SCRIPT COMPLETE');
  process.exit(0);
}).catch((error) => {
  console.error('💥 FATAL ERROR:', error.message);
  process.exit(1);
});