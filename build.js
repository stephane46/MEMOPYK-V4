#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Starting MEMOPYK production build...');

try {
  // Step 1: Build the frontend with Vite
  console.log('📦 Building frontend with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Step 2: Copy public assets and move built files to dist/ for Replit Deploy
  console.log('📁 Copying public assets and organizing for deployment...');
  
  // Copy public assets (images, icons, etc.) to dist
  if (fs.existsSync('public')) {
    console.log('🖼️  Copying public assets to dist...');
    execSync('cp -r public/* dist/', { stdio: 'inherit' });
  }
  
  // Move built files from dist/public to dist/
  if (fs.existsSync('dist/public')) {
    // Copy all files from dist/public to dist
    execSync('cp -r dist/public/* dist/', { stdio: 'inherit' });
    // Remove the public directory
    execSync('rm -rf dist/public', { stdio: 'inherit' });
  }
  
  // Step 3: Use tsx for production TypeScript execution (no compilation needed)
  console.log('🔧 TypeScript backend ready (using tsx runtime)...');
  
  // Ensure all server files are ready for deployment
  console.log('📄 Verifying server files for deployment...');
  const serverFiles = ['server/index.ts', 'server/routes.ts', 'server/video-cache.ts', 'server/hybrid-storage.ts'];
  serverFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing critical server file: ${file}`);
    }
    console.log(`   ✅ ${file} ready`);
  });
  
  // Update package.json start script to use tsx in production
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.scripts.start = 'NODE_ENV=production tsx server/index.ts';
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  // Clean up old deployment markers (keep only 10 most recent)
  console.log('🧹 Cleaning up old deployment markers...');
  const markerFiles = fs.readdirSync('.')
    .filter(file => file.startsWith('DEPLOYMENT_MARKER') && file.endsWith('.json'))
    .map(file => ({
      name: file,
      mtime: fs.statSync(file).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

  // Keep only the 9 most recent markers (plus the new one we're about to create = 10 total)
  const markersToDelete = markerFiles.slice(9);
  markersToDelete.forEach(marker => {
    fs.unlinkSync(marker.name);
    console.log(`   🗑️  Removed old marker: ${marker.name}`);
  });

  // Create deployment marker with timestamp to force fresh deployment
  const deploymentMarker = {
    timestamp: new Date().toISOString(),
    fix: 'Updated WhyMemopyk image card with rounded effects and proper scaling',
    commit: 'Replaced filmstrip image with souvenir film image in card format - production ready',
    version: '1.0.128',
    status: 'IMAGE_CARD_UPDATE_COMPLETE'
  };
  fs.writeFileSync('DEPLOYMENT_MARKER.json', JSON.stringify(deploymentMarker, null, 2));
  
  // Step 3: Ensure cache directories exist and copy cached files
  console.log('📋 Setting up production directories...');
  
  // CRITICAL: Copy cache directory to production build for deployment
  const sourceCacheDir = path.join(process.cwd(), 'server', 'cache');
  const targetCacheDir = 'server/cache';
  
  if (fs.existsSync(sourceCacheDir)) {
    console.log('📦 Copying video cache to production build...');
    
    // Create cache directory structure
    fs.mkdirSync(targetCacheDir, { recursive: true });
    fs.mkdirSync(path.join(targetCacheDir, 'videos'), { recursive: true });
    fs.mkdirSync(path.join(targetCacheDir, 'images'), { recursive: true });
    
    // Copy all cached videos
    const videoCacheDir = path.join(sourceCacheDir, 'videos');
    if (fs.existsSync(videoCacheDir)) {
      const videoFiles = fs.readdirSync(videoCacheDir);
      let copiedFiles = 0;
      let totalSize = 0;
      
      for (const file of videoFiles) {
        const sourceFile = path.join(videoCacheDir, file);
        const targetFile = path.join(targetCacheDir, 'videos', file);
        const stats = fs.statSync(sourceFile);
        
        fs.copyFileSync(sourceFile, targetFile);
        copiedFiles++;
        totalSize += stats.size;
      }
      
      console.log(`   ✅ Copied ${copiedFiles} cached video files (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
    }
    
    // Copy all cached images
    const imageCacheDir = path.join(sourceCacheDir, 'images');
    if (fs.existsSync(imageCacheDir)) {
      const imageFiles = fs.readdirSync(imageCacheDir);
      let copiedImages = 0;
      
      for (const file of imageFiles) {
        const sourceFile = path.join(imageCacheDir, file);
        const targetFile = path.join(targetCacheDir, 'images', file);
        fs.copyFileSync(sourceFile, targetFile);
        copiedImages++;
      }
      
      console.log(`   ✅ Copied ${copiedImages} cached image files`);
    }
    
  } else {
    console.log('⚠️ No cache directory found - production will need to download videos on first access');
    
    // Create empty cache directories for production
    const cacheDir = 'server/cache/videos';
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }
  
  console.log('✅ Build completed successfully!');
  console.log('📁 Production setup (Replit Deploy ready):');
  console.log('   - Frontend: dist/ (moved from dist/public for Replit Deploy)');
  console.log('   - Backend: server/index.ts (tsx runtime)');
  console.log('   - Cache: server/cache/videos/');
  console.log('   - Start command: NODE_ENV=production tsx server/index.ts');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}