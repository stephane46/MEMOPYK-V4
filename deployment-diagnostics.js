// Deployment Environment Diagnostics
// Run this in deployment to understand the production environment

console.log('🔍 DEPLOYMENT DIAGNOSTICS');
console.log('='.repeat(50));

// Environment info
console.log('📋 Environment Variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Port:', process.env.PORT);
console.log('- Replit environment:', process.env.REPLIT || 'Not set');

// File system checks
const fs = require('fs');
const path = require('path');

console.log('\n📁 File System Checks:');

// Check if routes.ts exists and contains our video proxy fix
const routesPath = path.join(__dirname, 'server', 'routes.ts');
if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  const hasVideoProxy = routesContent.includes('/video-proxy');
  const hasExpressStatic = routesContent.includes('express.static');
  console.log('- routes.ts exists:', true);
  console.log('- Contains video-proxy route:', hasVideoProxy);
  console.log('- Contains express.static:', hasExpressStatic);
} else {
  console.log('- routes.ts exists:', false);
}

// Check gallery section code
const gallerySectionPath = path.join(__dirname, 'client', 'src', 'components', 'sections', 'GallerySection.tsx');
if (fs.existsSync(gallerySectionPath)) {
  const galleryContent = fs.readFileSync(gallerySectionPath, 'utf8');
  const usesCDN = galleryContent.includes('Use direct CDN URLs');
  const usesProxy = galleryContent.includes('/api/video-proxy');
  console.log('- GallerySection.tsx exists:', true);
  console.log('- Uses direct CDN URLs:', usesCDN);
  console.log('- Still uses proxy system:', usesProxy);
} else {
  console.log('- GallerySection.tsx exists:', false);
}

// Check cache directory
const cacheDir = path.join(__dirname, 'server', 'cache', 'videos');
if (fs.existsSync(cacheDir)) {
  const cacheFiles = fs.readdirSync(cacheDir);
  console.log('- Cache directory exists:', true);
  console.log('- Cache files count:', cacheFiles.length);
  console.log('- Cache files:', cacheFiles.slice(0, 3).join(', '));
} else {
  console.log('- Cache directory exists:', false);
}

console.log('\n🌐 Network Tests:');
// Test direct CDN access
const testUrl = 'https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/gallery_Our_vitamin_sea_rework_2_compressed.mp4';
console.log('- Testing CDN URL:', testUrl);

console.log('\n⏰ Build timestamp:', new Date().toISOString());
console.log('🔢 Process PID:', process.pid);

module.exports = { deployed: true };