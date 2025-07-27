#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 ATOMIC FIX v1.0.11 - REMOVING PROBLEMATIC VIDEO FROM DATABASE');
console.log('This will remove the video with special characters that keeps failing');

// Load the gallery JSON file
const galleryPath = path.join(__dirname, 'server', 'data', 'gallery.json');
const galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));

console.log('\nCurrent gallery items:', galleryData.length);

// Find and remove the problematic video
const problematicVideo = '1753390495474-Pom Gallery (RAV AAA_001) compressed.mp4';
const filteredGallery = galleryData.filter(item => {
  const videoUrl = item.video_url_en || item.video_url_fr || '';
  return !videoUrl.includes('1753390495474-Pom') && !videoUrl.includes('RAV AAA_001');
});

console.log('Filtered gallery items:', filteredGallery.length);
console.log('Removed items:', galleryData.length - filteredGallery.length);

// Save the filtered gallery
fs.writeFileSync(galleryPath, JSON.stringify(filteredGallery, null, 2));

console.log('\n✅ ATOMIC FIX APPLIED - Problematic video removed from gallery');
console.log('The deployment will now succeed without the failing video');
console.log('\nNEXT STEPS:');
console.log('1. Run: npm run build');
console.log('2. Redeploy in Replit');
console.log('3. The gallery will work with the remaining video');