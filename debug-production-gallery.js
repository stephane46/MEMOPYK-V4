// Emergency production gallery debug script
const express = require('express');

// Test if the production deployment is the issue
console.log('🚨 PRODUCTION GALLERY DEBUG SCRIPT');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', process.cwd());

// Check if cache directory exists
const fs = require('fs');
const path = require('path');

const cacheDir = path.join(process.cwd(), 'server', 'cache', 'videos');
console.log('Cache directory path:', cacheDir);
console.log('Cache directory exists:', fs.existsSync(cacheDir));

if (fs.existsSync(cacheDir)) {
  const files = fs.readdirSync(cacheDir);
  console.log('Cache files:', files);
  files.forEach(file => {
    const filePath = path.join(cacheDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file}: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
  });
} else {
  console.log('❌ Cache directory does not exist!');
}

// Test gallery video URLs
const galleryVideos = [
  'gallery_Our_vitamin_sea_rework_2_compressed.mp4',
  '1753390495474-Pom%20Gallery%20(RAV%20AAA_001)%20compressed.mp4'
];

galleryVideos.forEach(filename => {
  console.log(`\n🎬 Testing gallery video: ${filename}`);
  const decodedFilename = decodeURIComponent(filename);
  console.log(`  - Decoded: ${decodedFilename}`);
  const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${encodeURIComponent(decodedFilename)}`;
  console.log(`  - Supabase URL: ${supabaseUrl}`);
});

console.log('\n✅ Debug script complete');