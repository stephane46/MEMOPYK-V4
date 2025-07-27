#!/usr/bin/env node

/**
 * Force deployment of v1.0.11 with gallery video fix
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 FORCING v1.0.11 DEPLOYMENT WITH GALLERY VIDEO FIX\n');

// 1. Verify the fix is in the code
console.log('📋 Verifying v1.0.11 fix in routes.ts...');
const routesContent = fs.readFileSync('./server/routes.ts', 'utf8');
const hasV11Fix = routesContent.includes('PRODUCTION BULLETPROOF v1.0.11') && 
                  routesContent.includes('CRITICAL FIX v1.0.10: Always use original decoded filename');

if (!hasV11Fix) {
  console.error('❌ ERROR: v1.0.11 fix not found in routes.ts!');
  process.exit(1);
}

console.log('✅ v1.0.11 fix verified in code\n');

// 2. Create deployment marker
const deploymentMarker = {
  version: 'v1.0.11',
  timestamp: new Date().toISOString(),
  fix: 'Gallery video underscore-to-space conversion',
  critical: 'Uses decodedFilename for Supabase URL to prevent double encoding'
};

fs.writeFileSync('./DEPLOYMENT_MARKER_v1.0.11.json', JSON.stringify(deploymentMarker, null, 2));
console.log('✅ Created deployment marker\n');

// 3. Update package.json to force rebuild
console.log('📦 Updating package.json to force rebuild...');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
packageJson.version = '1.0.11';
packageJson.deploymentTimestamp = new Date().toISOString();
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json version to 1.0.11\n');

// 4. Clear any cached build artifacts
console.log('🧹 Clearing build artifacts...');
if (fs.existsSync('./dist')) {
  execSync('rm -rf ./dist', { stdio: 'inherit' });
}
console.log('✅ Cleared dist directory\n');

// 5. Build production bundle
console.log('🔨 Building production bundle...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Production build complete\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// 6. Create deployment instructions
const instructions = `
🚀 DEPLOYMENT INSTRUCTIONS FOR v1.0.11
=====================================

The v1.0.11 fix is now ready for deployment. This fixes the gallery video 500 error.

To deploy:
1. Click the "Deploy" button in Replit
2. Wait for the deployment to complete
3. Verify at: https://memopyk.replit.app

The fix:
- Gallery videos with underscores in filenames will now work
- Uses decodedFilename for Supabase URL construction
- Prevents double encoding that was causing 500 errors

Test after deployment:
1. Go to https://memopyk.replit.app
2. Click on a gallery video
3. It should play without errors

The gallery video will be downloaded and cached on first request.
`;

fs.writeFileSync('./DEPLOY_NOW_v1.0.11.txt', instructions);
console.log(instructions);

console.log('\n✅ READY FOR DEPLOYMENT - Click the Deploy button in Replit!');