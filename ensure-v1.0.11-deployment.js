#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 ENSURING v1.0.11 DEPLOYMENT');
console.log('==============================\n');

// Create a deployment manifest that explicitly states the version
const deploymentManifest = {
  version: 'v1.0.11',
  timestamp: new Date().toISOString(),
  criticalFixes: [
    'Gallery video underscore-to-space conversion in video-cache.ts line 658',
    'Force cache endpoint simplified to prevent double encoding',
    'Video proxy handling browser Accept-Encoding headers properly'
  ],
  verificationChecks: {
    videoCacheHasFix: false,
    routesHasUpdate: false,
    packageJsonVersion: false
  }
};

// Check video-cache.ts for v1.0.11 fix
const videoCachePath = path.join(__dirname, 'server', 'video-cache.ts');
if (fs.existsSync(videoCachePath)) {
  const content = fs.readFileSync(videoCachePath, 'utf8');
  if (content.includes('GALLERY VIDEO FIX v1.0.11: Converting underscores to spaces')) {
    deploymentManifest.verificationChecks.videoCacheHasFix = true;
    console.log('✅ video-cache.ts has v1.0.11 underscore fix');
  } else {
    console.log('❌ video-cache.ts missing v1.0.11 fix');
  }
}

// Check package.json version
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (pkg.version === '1.0.11') {
    deploymentManifest.verificationChecks.packageJsonVersion = true;
    console.log('✅ package.json version is 1.0.11');
  } else {
    console.log(`❌ package.json version is ${pkg.version}, not 1.0.11`);
  }
}

// Create a VERSION file to be included in deployment
fs.writeFileSync('VERSION', 'v1.0.11');
console.log('\n✅ Created VERSION file with v1.0.11');

// Create deployment instructions
const instructions = `
DEPLOYMENT INSTRUCTIONS FOR v1.0.11
===================================

CRITICAL: This deployment MUST include the v1.0.11 gallery video fix.

Before deploying:
1. Ensure all files are saved
2. Check that server/video-cache.ts has the underscore-to-space fix at line 658
3. Verify package.json shows version 1.0.11

The v1.0.11 fix addresses:
- Gallery videos failing with browser Accept-Encoding headers (500 error)
- Force cache endpoint failing due to filename encoding conflicts
- Gallery videos with underscores in filenames not loading properly

Key changes in v1.0.11:
- video-cache.ts line 658: Converts underscores to spaces for gallery videos
- routes.ts: Simplified force cache endpoint to prevent double encoding

After deployment:
1. Test gallery video playback
2. Test force cache button in admin panel
3. Verify deployment version at /api/video-proxy/health endpoint
`;

fs.writeFileSync('DEPLOYMENT_INSTRUCTIONS_v1.0.11.txt', instructions);
console.log('✅ Created DEPLOYMENT_INSTRUCTIONS_v1.0.11.txt');

// Save deployment manifest
fs.writeFileSync('deployment-manifest-v1.0.11.json', JSON.stringify(deploymentManifest, null, 2));
console.log('✅ Created deployment-manifest-v1.0.11.json');

console.log('\n📋 DEPLOYMENT CHECKLIST:');
console.log('1. ✅ VERSION file created');
console.log('2. ✅ Deployment instructions created');
console.log('3. ✅ Deployment manifest created');
console.log('4. ⚠️  Ensure all changes are saved before deploying');
console.log('5. ⚠️  Use "Deploy" button in Replit to create fresh deployment');

console.log('\n🎯 The deployment package now explicitly declares v1.0.11');
console.log('This should ensure the correct version is deployed.');