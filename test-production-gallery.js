#!/usr/bin/env node

const https = require('https');

console.log('🧪 TESTING PRODUCTION GALLERY VIDEO v1.0.10');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Test the problematic gallery video
const testUrl = 'https://memopyk-gallery-video-fix-v1-0-8-complete-auto-download-fix.1753649341920.repl.co/api/video-proxy?filename=1753390495474-Pom%20Gallery%20(RAV%20AAA_001)%20compressed.mp4';

console.log('Testing URL:', testUrl);
console.log('');

https.get(testUrl, { 
  headers: {
    'Range': 'bytes=0-1023',
    'User-Agent': 'Mozilla/5.0 (Test Script v1.0.10)'
  }
}, (res) => {
  console.log('Response Status:', res.statusCode);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  
  if (res.statusCode === 206) {
    console.log('✅ SUCCESS! Gallery video is working correctly');
    console.log('The v1.0.10 double encoding fix is deployed and functional');
  } else if (res.statusCode === 500) {
    console.log('❌ FAILED! Still getting 500 error');
    console.log('The deployment may need to be refreshed');
  } else {
    console.log('⚠️ Unexpected status code:', res.statusCode);
  }
  
  // Read response body for error details
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 206) {
      console.log('\nResponse body:');
      console.log(body.substring(0, 500)); // First 500 chars
    }
  });
}).on('error', (err) => {
  console.error('❌ Request failed:', err.message);
});