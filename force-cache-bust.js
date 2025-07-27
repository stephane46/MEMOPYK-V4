#!/usr/bin/env node

// Force cache bust for production deployment
const fs = require('fs');
const path = require('path');

console.log('🔄 FORCE CACHE BUST v1.0.10');
console.log('Timestamp:', new Date().toISOString());

// Read the index.html file
const indexPath = path.join(__dirname, 'dist', 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Add cache-busting query parameter to JS and CSS files
  const timestamp = Date.now();
  html = html.replace(/assets\/(index-[a-zA-Z0-9]+\.js)/g, `assets/$1?v=${timestamp}`);
  html = html.replace(/assets\/(index-[a-zA-Z0-9]+\.css)/g, `assets/$1?v=${timestamp}`);
  
  fs.writeFileSync(indexPath, html);
  console.log('✅ Added cache-busting to index.html');
  console.log(`   Query parameter: ?v=${timestamp}`);
} else {
  console.log('❌ index.html not found');
}

console.log('');
console.log('ACTION REQUIRED:');
console.log('1. The build has been updated with cache-busting');
console.log('2. Go to Replit Deployments tab');
console.log('3. Click "Redeploy" to push the changes');
console.log('4. Clear browser cache (Ctrl+Shift+R) when testing');

process.exit(0);