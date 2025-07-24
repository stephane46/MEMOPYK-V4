// Force deployment cache invalidation
// This file exists solely to trigger a fresh deployment build
// Current timestamp: 2025-07-24T05:46:00Z

console.log('🚀 DEPLOYMENT CACHE BUSTER ACTIVE');
console.log('📅 Build timestamp:', new Date().toISOString());
console.log('🔄 Forcing fresh deployment to pick up gallery video CDN fixes');

// Gallery video fix verification
const galleryVideoTestUrl = 'https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/gallery_Our_vitamin_sea_rework_2_compressed.mp4';
console.log('🎬 Expected gallery video URL:', galleryVideoTestUrl);

module.exports = {
  deploymentForced: true,
  timestamp: Date.now(),
  reason: 'Gallery video CDN fix not reflecting in production'
};