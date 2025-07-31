// Temporary script to force clear frontend caches
console.log('🧹 FORCE CLEARING ALL FRONTEND CACHES');

// Clear the problematic item from localStorage if it exists
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('gallery-cache');
  localStorage.removeItem('galleryItems');
  localStorage.clear();
  console.log('✅ LocalStorage cleared');
}

// Clear sessionStorage
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.clear();
  console.log('✅ SessionStorage cleared');
}

// Clear all service worker caches
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        console.log(`🗑️ Deleting cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
  }).then(() => {
    console.log('✅ All caches cleared');
    location.reload(true); // Force hard reload
  });
} else {
  location.reload(true);
}