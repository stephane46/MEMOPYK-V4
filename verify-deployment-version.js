#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 DEPLOYMENT VERSION VERIFICATION');
console.log('==================================');

// Check server files for version indicators
const routesPath = path.join(__dirname, 'server', 'routes.ts');
const videoCachePath = path.join(__dirname, 'server', 'video-cache.ts');

// Read routes.ts and check for v1.0.11 indicators
if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  const versionMatches = routesContent.match(/v1\.0\.\d+/g) || [];
  const uniqueVersions = [...new Set(versionMatches)];
  
  console.log('\n📄 server/routes.ts versions found:');
  uniqueVersions.forEach(v => {
    const count = versionMatches.filter(m => m === v).length;
    console.log(`   - ${v}: ${count} occurrences`);
  });
  
  // Check for v1.0.11 specific fix
  if (routesContent.includes('GALLERY VIDEO FIX v1.0.11: Converting underscores to spaces')) {
    console.log('   ✅ v1.0.11 underscore-to-space fix FOUND');
  } else {
    console.log('   ❌ v1.0.11 underscore-to-space fix NOT FOUND');
  }
}

// Read video-cache.ts and check for v1.0.11 indicators  
if (fs.existsSync(videoCachePath)) {
  const cacheContent = fs.readFileSync(videoCachePath, 'utf8');
  const versionMatches = cacheContent.match(/v1\.0\.\d+/g) || [];
  const uniqueVersions = [...new Set(versionMatches)];
  
  console.log('\n📄 server/video-cache.ts versions found:');
  uniqueVersions.forEach(v => {
    const count = versionMatches.filter(m => m === v).length;
    console.log(`   - ${v}: ${count} occurrences`);
  });
  
  // Check for v1.0.11 specific fix at line 658
  const lines = cacheContent.split('\n');
  if (lines[657] && lines[657].includes('supabaseFilename = filename.replace(/_/g, \' \');')) {
    console.log('   ✅ v1.0.11 underscore replacement fix FOUND at line 658');
  } else {
    console.log('   ❌ v1.0.11 underscore replacement fix NOT FOUND at line 658');
  }
}

// Check deployment marker files
console.log('\n📁 Deployment marker files:');
const deploymentFiles = fs.readdirSync(__dirname).filter(f => f.includes('DEPLOYMENT') && f.includes('v1.0'));
deploymentFiles.forEach(f => {
  const stats = fs.statSync(f);
  console.log(`   - ${f} (modified: ${stats.mtime.toISOString()})`);
});

// Check package.json for any version info
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`\n📦 package.json version: ${packageJson.version || 'not set'}`);
}

// Create deployment timestamp
const deploymentInfo = {
  timestamp: new Date().toISOString(),
  expectedVersion: 'v1.0.11',
  gitStatus: 'Check git status manually',
  checksums: {
    routes: require('crypto').createHash('md5').update(fs.readFileSync(routesPath)).digest('hex'),
    videoCache: require('crypto').createHash('md5').update(fs.readFileSync(videoCachePath)).digest('hex')
  }
};

fs.writeFileSync('deployment-version-check.json', JSON.stringify(deploymentInfo, null, 2));
console.log('\n✅ Created deployment-version-check.json with file checksums');

console.log('\n🎯 RECOMMENDATIONS:');
console.log('1. Run "git status" to check for uncommitted changes');
console.log('2. Run "git log --oneline -5" to see recent commits');
console.log('3. Ensure all v1.0.11 changes are committed before deployment');
console.log('4. Check Replit deployment logs for any build errors');
console.log('5. Consider using "git tag v1.0.11" to mark the exact version');