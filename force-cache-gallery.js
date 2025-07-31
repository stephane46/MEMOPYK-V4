// Emergency script to force-cache the gallery video
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create cache directory if it doesn't exist
const cacheDir = './server/cache/videos';
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Gallery video that needs to be cached
const videoName = 'gallery_Our_vitamin_sea_rework_2_compressed.mp4';
const decodedName = videoName.replace(/_/g, ' ');
const encodedName = encodeURIComponent(decodedName);
const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${encodedName}`;

// Generate cache filename (MD5 hash)
const hash = crypto.createHash('md5').update(decodedName).digest('hex');
const cacheFilePath = path.join(cacheDir, `${hash}.mp4`);

console.log('🚀 FORCE CACHE GALLERY VIDEO');
console.log('Video name:', videoName);
console.log('Decoded name:', decodedName);
console.log('Encoded name:', encodedName);
console.log('Supabase URL:', supabaseUrl);
console.log('Cache file:', cacheFilePath);

if (fs.existsSync(cacheFilePath)) {
  console.log('✅ Video already cached!');
  process.exit(0);
}

console.log('📥 Downloading video...');

const file = fs.createWriteStream(cacheFilePath);
https.get(supabaseUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error('❌ Download failed:', response.statusCode, response.statusMessage);
    process.exit(1);
  }
  
  const totalSize = parseInt(response.headers['content-length'], 10);
  let downloaded = 0;
  
  response.on('data', (chunk) => {
    downloaded += chunk.length;
    const percent = ((downloaded / totalSize) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
  });
  
  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('\n✅ Video cached successfully!');
    console.log('Cache file size:', fs.statSync(cacheFilePath).size, 'bytes');
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('❌ Download error:', err.message);
  fs.unlinkSync(cacheFilePath);
  process.exit(1);
});