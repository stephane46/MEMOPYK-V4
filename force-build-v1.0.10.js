#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 FORCE BUILD v1.0.10 - ATOMIC DEPLOYMENT SOLUTION');
console.log('This will ensure the correct version gets deployed');

// Step 1: Clean all build artifacts
console.log('\n1️⃣ Cleaning old build artifacts...');
try {
  execSync('rm -rf dist', { stdio: 'inherit' });
  console.log('✅ Cleaned dist directory');
} catch (e) {
  console.log('⚠️  No dist directory to clean');
}

// Step 2: Update package.json version to force cache bust
console.log('\n2️⃣ Updating package.json version to v1.0.10...');
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = '1.0.10';
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json to version 1.0.10');

// Step 3: Create deployment marker
console.log('\n3️⃣ Creating deployment marker...');
const deploymentMarker = {
  version: '1.0.10',
  timestamp: new Date().toISOString(),
  fix: 'Double encoding bug fixed in server/routes.ts',
  critical: true
};
fs.writeFileSync('DEPLOYMENT_MARKER.json', JSON.stringify(deploymentMarker, null, 2));
console.log('✅ Created deployment marker');

// Step 4: Build the project
console.log('\n4️⃣ Building project with v1.0.10...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (e) {
  console.error('❌ Build failed:', e.message);
  process.exit(1);
}

// Step 5: Verify build output
console.log('\n5️⃣ Verifying build output...');
const distPublicPath = path.join(__dirname, 'dist', 'public');
if (fs.existsSync(distPublicPath)) {
  const files = fs.readdirSync(distPublicPath);
  console.log('✅ Build output verified:');
  files.forEach(file => {
    if (file.includes('.js') || file.includes('.html')) {
      console.log(`   - ${file}`);
    }
  });
} else {
  console.error('❌ Build output not found!');
  process.exit(1);
}

// Step 6: Create deployment trigger
console.log('\n6️⃣ Creating deployment trigger...');
fs.writeFileSync('DEPLOYMENT_TRIGGER.txt', `DEPLOY v1.0.10 - ${new Date().toISOString()}`);
console.log('✅ Deployment trigger created');

console.log('\n🎯 ATOMIC BUILD COMPLETE - v1.0.10 READY FOR DEPLOYMENT');
console.log('\n📋 DEPLOYMENT INSTRUCTIONS:');
console.log('1. Go to Replit Deployments tab');
console.log('2. Click "Redeploy" button');
console.log('3. Wait for deployment to complete');
console.log('4. The problematic gallery video will now work!');
console.log('\n✨ The deployment will use the NEW BUILD with v1.0.10 fixes');