#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Starting MEMOPYK production build...');

try {
  // Step 1: Build the frontend with Vite (optimized)
  console.log('📦 Building frontend with Vite (production mode)...');
  process.env.NODE_ENV = 'production';
  execSync('npx vite build --mode production --logLevel warn', { stdio: 'inherit' });
  
  // Step 2: Streamlined asset organization
  console.log('📁 Organizing deployment assets...');
  
  // Simplified asset copying
  if (fs.existsSync('public')) {
    execSync('cp -r public/* dist/ 2>/dev/null || true', { stdio: 'pipe' });
  }
  
  // Streamlined file organization
  if (fs.existsSync('dist/public')) {
    execSync('cp -r dist/public/* dist/ && rm -rf dist/public', { stdio: 'pipe' });
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
  
  // Simplified cleanup (reduce file system operations)
  console.log('🧹 Cleanup...');
  try {
    execSync('find . -name "DEPLOYMENT_MARKER*.json" -type f | head -n -5 | xargs rm -f 2>/dev/null || true', { stdio: 'pipe' });
  } catch (e) {
    // Silent cleanup - don't fail build
  }

  // Minimal deployment marker
  const deploymentMarker = {
    timestamp: new Date().toISOString(),
    status: 'BUILD_OPTIMIZED',
    version: '1.0.129'
  };
  fs.writeFileSync('DEPLOYMENT_MARKER.json', JSON.stringify(deploymentMarker));
  
  // Step 3: Streamlined cache setup (reduced I/O operations)
  console.log('📋 Setting up production cache...');
  
  const sourceCacheDir = path.join(process.cwd(), 'server', 'cache');
  const targetCacheDir = 'server/cache';
  
  // Fast cache directory setup
  fs.mkdirSync(path.join(targetCacheDir, 'videos'), { recursive: true });
  fs.mkdirSync(path.join(targetCacheDir, 'images'), { recursive: true });
  
  if (fs.existsSync(sourceCacheDir)) {
    // Bulk copy operations (faster than individual file copying)
    const videoCacheDir = path.join(sourceCacheDir, 'videos');
    const imageCacheDir = path.join(sourceCacheDir, 'images');
    
    if (fs.existsSync(videoCacheDir)) {
      execSync(`cp -r ${videoCacheDir}/* ${path.join(targetCacheDir, 'videos')}/ 2>/dev/null || true`, { stdio: 'pipe' });
      console.log('   ✅ Video cache copied');
    }
    
    if (fs.existsSync(imageCacheDir)) {
      execSync(`cp -r ${imageCacheDir}/* ${path.join(targetCacheDir, 'images')}/ 2>/dev/null || true`, { stdio: 'pipe' });
      console.log('   ✅ Image cache copied');
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