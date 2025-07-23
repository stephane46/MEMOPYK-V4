#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Starting MEMOPYK production build...');

try {
  // Step 1: Build the frontend with Vite
  console.log('📦 Building frontend with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Step 2: Move files from dist/public to dist for Replit Deploy
  console.log('📁 Moving files to Replit Deploy structure...');
  if (fs.existsSync('dist/public')) {
    // Move all files from dist/public to dist
    execSync('mv dist/public/* dist/ 2>/dev/null || true', { stdio: 'inherit' });
    execSync('rmdir dist/public 2>/dev/null || true', { stdio: 'inherit' });
  }
  
  // Step 3: Use tsx for production TypeScript execution (no compilation needed)
  console.log('🔧 TypeScript backend ready (using tsx runtime)...');
  
  // Update package.json start script to use tsx in production
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.scripts.start = 'NODE_ENV=production tsx server/index.ts';
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
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