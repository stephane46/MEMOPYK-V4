#!/usr/bin/env node

/**
 * Deployment Script v1.0.17 - Enhanced Stream Error Detection
 * Ready for virgin server deployment to investigate gallery video failures
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 MEMOPYK DEPLOYMENT v1.0.17 - ENHANCED STREAM ERROR DETECTION');
console.log('=' .repeat(80));

// Verify version
const version = fs.readFileSync('VERSION', 'utf8').trim();
console.log(`📋 Version: ${version}`);

// Verify enhanced debugging features are in place
const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
const debugFeatures = [
  'PRODUCTION BULLETPROOF v1.0.17 - ENHANCED STREAM ERROR DETECTION',
  '❌ PRODUCTION RANGE STREAM ERROR',
  '❌ PRODUCTION FULL STREAM ERROR',
  'Error type: ${error.constructor.name}',
  'Accept header: ${req.headers.accept}',
  'Connection header: ${req.headers.connection}'
];

let featuresPresent = 0;
debugFeatures.forEach(feature => {
  if (routesContent.includes(feature)) {
    console.log(`✅ ${feature.substring(0, 50)}...`);
    featuresPresent++;
  } else {
    console.log(`❌ Missing: ${feature.substring(0, 50)}...`);
  }
});

console.log(`\n📊 Debug features: ${featuresPresent}/${debugFeatures.length} implemented`);

// Production build
try {
  console.log('\n🏗️ Creating production build...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Production build completed');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Verify build output
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist');
  console.log(`✅ Build output: ${distFiles.length} files generated`);
} else {
  console.error('❌ No dist/ directory found');
  process.exit(1);
}

console.log('\n🎯 DEPLOYMENT READY v1.0.17');
console.log('=' .repeat(80));
console.log('🔍 INVESTIGATION FOCUS:');
console.log('   ➤ Why hero videos work but gallery videos fail with 500 errors');
console.log('   ➤ Enhanced stream error logging will capture exact failure reasons');
console.log('   ➤ Error classification: type, message, code, headers, file existence');
console.log('   ➤ Compare Range vs Full file serving patterns');
console.log('\n📝 DEPLOYMENT EVIDENCE NEEDED:');
console.log('   ➤ ✅ Hero videos: working (206 responses)');
console.log('   ➤ ❌ Gallery videos: failing (500 errors)');
console.log('   ➤ 🔍 Both use identical /api/video-proxy route');
console.log('   ➤ 🔍 Both serve from local cache successfully');
console.log('   ➤ 🔍 Both use same Range request headers');
console.log('\n🚀 Deploy now to virgin server and monitor enhanced error logs');
console.log('   Expected log pattern: "❌ PRODUCTION RANGE STREAM ERROR" with detailed classification');