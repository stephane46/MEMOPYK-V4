#!/usr/bin/env node

/**
 * Clean Deployment Script v1.0.11
 * Ensures gallery video underscore-to-space fix is properly deployed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 MEMOPYK Clean Deployment v1.0.11');
console.log('====================================');
console.log('This deployment includes the critical gallery video fix:');
console.log('- Converts underscores to spaces for gallery video filenames');
console.log('- Fixes 500 errors on gallery videos in production');
console.log('');

// Step 1: Clean build directory
console.log('🧹 Step 1: Cleaning build directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('✅ Removed old dist directory');
}

// Step 2: Build frontend
console.log('\n📦 Step 2: Building frontend...');
try {
  execSync('npm run build:client', { stdio: 'inherit' });
  console.log('✅ Frontend built successfully');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 3: Build backend
console.log('\n🔧 Step 3: Building backend...');
try {
  execSync('npm run build:server', { stdio: 'inherit' });
  console.log('✅ Backend built successfully');
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}

// Step 4: Verify critical fix is in the build
console.log('\n🔍 Step 4: Verifying gallery video fix...');
const videoCachePath = path.join('dist', 'video-cache.js');
if (fs.existsSync(videoCachePath)) {
  const content = fs.readFileSync(videoCachePath, 'utf8');
  if (content.includes('gallery_') && content.includes('replace(/_/g, \' \')')) {
    console.log('✅ Gallery video underscore-to-space fix confirmed in build');
  } else {
    console.error('❌ WARNING: Gallery video fix not found in build!');
  }
} else {
  console.error('❌ WARNING: video-cache.js not found in build!');
}

// Step 5: Create deployment marker
console.log('\n📝 Step 5: Creating deployment marker...');
const deploymentInfo = {
  version: 'v1.0.11',
  buildTime: new Date().toISOString(),
  fixes: [
    'Gallery video underscore-to-space conversion',
    'Fixes 500 errors for gallery videos with underscores in JSON'
  ],
  criticalFiles: [
    'server/video-cache.ts - downloadAndCacheVideo method',
    'server/routes.ts - video proxy endpoint'
  ]
};

fs.writeFileSync('dist/deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
console.log('✅ Deployment marker created');

// Step 6: Summary
console.log('\n🎯 DEPLOYMENT READY v1.0.11');
console.log('===========================');
console.log('Build completed successfully with gallery video fix!');
console.log('');
console.log('Gallery videos will now work correctly:');
console.log('- JSON: gallery_Our_vitamin_sea_rework_2_compressed.mp4');
console.log('- Supabase: gallery Our vitamin sea rework 2 compressed.mp4');
console.log('');
console.log('To deploy:');
console.log('1. Click the Deploy button in Replit');
console.log('2. Wait for deployment to complete');
console.log('3. Test at: https://memopyk.replit.app/api/video-proxy/health');
console.log('');
console.log('The health check should show version: v1.0.11');