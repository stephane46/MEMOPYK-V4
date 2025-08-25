#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 MEMOPYK Production Deployment');

try {
  // Step 1: Build the application
  console.log('📦 Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 2: Start in production mode
  console.log('🎯 Starting production server...');
  process.env.NODE_ENV = 'production';
  execSync('npm start', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}