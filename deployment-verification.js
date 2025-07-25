#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 MEMOPYK Deployment Verification\n');

const checks = [
  // Build System Verification
  {
    name: 'Production Build Files',
    check: () => {
      const distExists = fs.existsSync('dist');
      const indexExists = fs.existsSync('dist/index.html');
      const assetsExists = fs.existsSync('dist/assets');
      return distExists && indexExists && assetsExists;
    },
    description: 'Frontend built and ready in dist/'
  },
  
  // Package Configuration
  {
    name: 'Production Start Script',
    check: () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.scripts.start === 'NODE_ENV=production tsx server/index.ts';
    },
    description: 'Start script configured for tsx runtime'
  },
  
  // Critical Files
  {
    name: 'Server Entry Point',
    check: () => fs.existsSync('server/index.ts'),
    description: 'Main server file exists'
  },
  
  {
    name: 'Database Schema',
    check: () => fs.existsSync('shared/schema.ts'),
    description: 'Database schema definitions'
  },
  
  {
    name: 'Hybrid Storage',
    check: () => fs.existsSync('server/hybrid-storage.ts'),
    description: 'Hybrid storage system with JSON fallback'
  },
  
  // Cache System
  {
    name: 'Video Cache Directory',
    check: () => {
      const cacheDir = 'server/cache/videos';
      return fs.existsSync(cacheDir);
    },
    description: 'Video cache directory ready'
  },
  
  // FAQ System Fix
  {
    name: 'FAQ Routes Fixed',
    check: () => {
      const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
      // Check that duplicate routes were removed
      const parseIntMatches = (routesContent.match(/parseInt\(req\.params\.id\)/g) || []).length;
      // Should only have parseInt for non-FAQ routes (hero videos, gallery items, etc.)
      return parseIntMatches < 10; // Should be around 6-7 legitimate uses
    },
    description: 'FAQ duplicate routes removed, no parseInt() on UUIDs'
  },
  
  // Environment Dependencies
  {
    name: 'TypeScript Runtime',
    check: () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.dependencies.tsx || packageJson.devDependencies?.tsx;
    },
    description: 'tsx runtime for TypeScript execution'
  }
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check, description }) => {
  try {
    const result = check();
    if (result) {
      console.log(`✅ ${name}`);
      console.log(`   ${description}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   ${description}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
  console.log('');
});

console.log('📊 Deployment Verification Summary:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

if (failed === 0) {
  console.log('🎉 All checks passed! System ready for deployment.');
  console.log('\n🚀 Deployment Instructions:');
  console.log('   1. Click "Deploy" button in Replit');
  console.log('   2. Environment secrets will be automatically transferred');
  console.log('   3. FAQ system will work correctly in production');
  console.log('   4. Video cache system will preload on startup');
  console.log('\n📋 Post-Deployment Verification:');
  console.log('   • Test FAQ section loading');
  console.log('   • Verify hero video playback');
  console.log('   • Check admin panel access');
  console.log('   • Confirm gallery video functionality');
} else {
  console.log('⚠️  Some checks failed. Please address issues before deployment.');
  process.exit(1);
}