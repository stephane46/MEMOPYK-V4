#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Starting MEMOPYK production build...');

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
  
  // Create deployment marker with timestamp to force fresh deployment
  const deploymentMarker = {
    timestamp: new Date().toISOString(),
    fix: 'Gallery video range request parsing fix',
    commit: 'Range parsing bug fixed - production ready'
  };
  fs.writeFileSync('DEPLOYMENT_MARKER.json', JSON.stringify(deploymentMarker, null, 2));
  
  // Step 3: Ensure cache directories exist
  console.log('📋 Setting up production directories...');
  
  // Create cache directories for production
  const cacheDir = 'server/cache/videos';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
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