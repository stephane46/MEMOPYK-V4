#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Preparing MEMOPYK v1.0.11 deployment...');

try {
  // Step 1: Build the frontend with Vite
  console.log('📦 Building frontend with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Step 2: Move files from dist/public to dist/ for Replit Deploy
  console.log('📁 Moving files to Replit Deploy structure...');
  if (fs.existsSync('dist/public')) {
    // Copy all files from dist/public to dist
    execSync('cp -r dist/public/* dist/', { stdio: 'inherit' });
    // Remove the public directory
    execSync('rm -rf dist/public', { stdio: 'inherit' });
  }
  
  // Step 3: Ensure cache directories exist
  console.log('📋 Setting up production directories...');
  const cacheDir = 'server/cache/videos';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // Step 4: Verify all server files are ready
  console.log('📄 Verifying server files for deployment...');
  const serverFiles = ['server/index.ts', 'server/routes.ts', 'server/video-cache.ts', 'server/hybrid-storage.ts'];
  serverFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing critical server file: ${file}`);
    }
    console.log(`   ✅ ${file} ready`);
  });
  
  // Step 5: Create deployment verification file
  const deploymentInfo = {
    version: '1.0.11',
    timestamp: new Date().toISOString(),
    fix: 'Gallery video underscore to space conversion fix',
    changes: [
      'Gallery videos with underscores converted to spaces for Supabase URLs',
      'Example: gallery_Our_vitamin_sea_rework_2_compressed.mp4 → gallery Our vitamin sea rework 2 compressed.mp4',
      'Fix applied in video-cache.ts downloadAndCacheVideo() method'
    ]
  };
  fs.writeFileSync('DEPLOYMENT_INFO_v1.0.11.json', JSON.stringify(deploymentInfo, null, 2));
  
  console.log('✅ Deployment preparation completed!');
  console.log('');
  console.log('📁 Production setup ready:');
  console.log('   - Frontend: dist/ (static files)');
  console.log('   - Backend: server/index.ts (tsx runtime)');
  console.log('   - Start command: NODE_ENV=production tsx server/index.ts');
  console.log('');
  console.log('🚀 v1.0.11 FIX APPLIED:');
  console.log('   - Gallery videos will convert underscores to spaces');
  console.log('   - This matches actual Supabase storage filenames');
  console.log('   - Gallery videos will work in production');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}