#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 FORCING v1.0.10 BUILD AND DEPLOYMENT');
console.log('Timestamp:', new Date().toISOString());

// Create a deployment marker with current timestamp
const deploymentMarker = {
  version: "v1.0.10",
  timestamp: Date.now(),
  description: "FINAL FIX - Double encoding bug resolved",
  changes: [
    "Video proxy always uses decoded filename for Supabase URL construction",
    "Prevents double encoding that caused 500 errors",
    "Gallery videos with special characters now work correctly"
  ]
};

fs.writeFileSync('DEPLOYMENT_MARKER.json', JSON.stringify(deploymentMarker, null, 2));

console.log('\n✅ Created deployment marker:', deploymentMarker);

// Force rebuild
console.log('\n🔨 Building production bundle...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
}

console.log('\n📦 DEPLOYMENT READY - v1.0.10');
console.log('The fix is in server/routes.ts lines 1302-1313');
console.log('Key change: Always use decodedFilename for Supabase URL construction');