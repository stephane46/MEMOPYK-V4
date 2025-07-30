import { existsSync, createWriteStream, statSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export class VideoCache {
  private videoCacheDir: string;
  private imageCacheDir: string;
  private maxCacheSize: number; // in bytes
  private maxCacheAge: number; // in milliseconds

  constructor() {
    this.videoCacheDir = join(process.cwd(), 'server/cache/videos');
    this.imageCacheDir = join(process.cwd(), 'server/cache/images');
    this.maxCacheSize = 1000 * 1024 * 1024; // 1GB total cache limit (sufficient for max 6 videos)
    this.maxCacheAge = 30 * 24 * 60 * 60 * 1000; // 30 days (manual cleanup preferred)
    
    // Ensure cache directories exist
    try {
      if (!existsSync(this.videoCacheDir)) {
        require('fs').mkdirSync(this.videoCacheDir, { recursive: true });
        console.log(`📁 Created video cache directory: ${this.videoCacheDir}`);
      }
      if (!existsSync(this.imageCacheDir)) {
        require('fs').mkdirSync(this.imageCacheDir, { recursive: true });
        console.log(`📁 Created image cache directory: ${this.imageCacheDir}`);
      }
      
      console.log(`✅ Video & Image cache initialized`);
      console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
      
      // Skip automatic cleanup - manual management preferred for small video set
      console.log(`📋 Manual cache management enabled for max 6 videos (3 hero + 3 gallery)`);
      
      // Immediate preloading to ensure first visitors get instant performance
      this.immediatePreloadCriticalAssets();
    } catch (error: any) {
      console.error(`❌ Cache directory creation failed: ${error.message}`);
      console.error(`❌ Video cache dir path: ${this.videoCacheDir}`);
      console.error(`❌ Image cache dir path: ${this.imageCacheDir}`);
      console.error(`❌ Process CWD: ${process.cwd()}`);
      // Don't throw - allow server to continue without cache
      console.log(`⚠️ Server will continue without cache - media will stream directly from CDN`);
    }
  }

  /**
   * Get cache file path for a video filename
   */
  private getVideoCacheFilePath(filename: string): string {
    if (!filename || filename.trim() === '') {
      throw new Error(`Invalid filename provided: ${filename}`);
    }
    // Use original filename directly for consistency and transparency
    return join(this.videoCacheDir, filename.trim());
  }

  /**
   * Get cache file path for an image filename
   */
  private getImageCacheFilePath(filename: string): string {
    if (!filename || filename.trim() === '') {
      throw new Error(`Invalid filename provided: ${filename}`);
    }
    // Remove query parameters from filename before caching
    let cleanFilename = filename.trim();
    if (cleanFilename.includes('?')) {
      cleanFilename = cleanFilename.split('?')[0];
    }
    // Use original filename directly for consistency with videos
    return join(this.imageCacheDir, cleanFilename);
  }

  /**
   * Public method to get cache file path (for external use)
   */
  getCachedFilePath(filename: string): string {
    return this.getVideoCacheFilePath(filename);
  }

  /**
   * Check if video exists in local cache
   */
  isVideoCached(filename: string): boolean {
    try {
      const cacheFile = this.getVideoCacheFilePath(filename);
      return existsSync(cacheFile);
    } catch (error: any) {
      console.error(`❌ Cache check failed for ${filename}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cached video file path
   */
  getCachedVideoPath(filename: string): string | null {
    try {
      if (this.isVideoCached(filename)) {
        return this.getVideoCacheFilePath(filename);
      }
      return null;
    } catch (error: any) {
      console.error(`❌ Failed to get cached video path for ${filename}: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache a video from Supabase response
   */
  async cacheVideo(filename: string, videoResponse: any): Promise<string> {
    const cacheFile = this.getVideoCacheFilePath(filename);
    
    // Smart replacement: Remove old video if it exists
    if (existsSync(cacheFile)) {
      console.log(`🔄 Replacing existing cached video: ${filename}`);
      unlinkSync(cacheFile);
    }
    
    // Smart cleanup: Remove old videos before caching new one
    this.smartCleanupBeforeCache();
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(cacheFile);
      
      writeStream.on('error', (error) => {
        console.error(`❌ Failed to cache video ${filename}:`, error);
        reject(error);
      });
      
      writeStream.on('finish', () => {
        console.log(`💾 Cached video: ${filename} -> ${cacheFile}`);
        resolve(cacheFile);
      });
      
      // Pipe video stream to cache file
      if (videoResponse.body) {
        videoResponse.body.pipe(writeStream);
      } else {
        writeStream.end();
        reject(new Error('No video body to cache'));
      }
    });
  }

  /**
   * Remove a specific video from cache
   */
  removeCachedVideo(filename: string): void {
    const cacheFile = this.getVideoCacheFilePath(filename);
    if (existsSync(cacheFile)) {
      unlinkSync(cacheFile);
      console.log(`🗑️ Removed cached video: ${filename}`);
    }
  }

  /**
   * Smart cleanup before caching - removes oldest videos if cache is getting full
   */
  private smartCleanupBeforeCache(): void {
    try {
      const files = readdirSync(this.videoCacheDir);
      
      // If we have more than 8 videos (keeping some buffer below max 10), remove oldest
      if (files.length >= 8) {
        const fileStats = files.map(file => {
          const filePath = join(this.videoCacheDir, file);
          const stats = statSync(filePath);
          return {
            path: filePath,
            file: file,
            mtime: stats.mtime.getTime()
          };
        }).sort((a, b) => a.mtime - b.mtime); // Sort by oldest first
        
        // Remove oldest files to make room
        const toRemove = fileStats.slice(0, files.length - 6); // Keep max 6, remove rest
        toRemove.forEach(file => {
          unlinkSync(file.path);
          console.log(`🗑️ Smart cleanup removed: ${file.file}`);
        });
      }
    } catch (error: any) {
      console.error('❌ Smart cleanup failed:', error.message);
    }
  }

  /**
   * Clean up cache based on size and age limits
   */
  private cleanupCache(): void {
    try {
      const files = readdirSync(this.videoCacheDir);
      const fileStats = files.map(file => {
        const filePath = join(this.videoCacheDir, file);
        const stats = statSync(filePath);
        return {
          path: filePath,
          size: stats.size,
          mtime: stats.mtime.getTime(),
          age: Date.now() - stats.mtime.getTime()
        };
      });

      // Remove files older than max age
      fileStats.forEach(file => {
        if (file.age > this.maxCacheAge) {
          unlinkSync(file.path);
          console.log(`🗑️ Removed expired cache file: ${file.path}`);
        }
      });

      // Check total cache size
      const totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);
      
      if (totalSize > this.maxCacheSize) {
        // Remove oldest files until under limit
        const sortedFiles = fileStats
          .filter(file => file.age <= this.maxCacheAge) // Keep only non-expired files
          .sort((a, b) => b.mtime - a.mtime); // Sort by modification time (newest first)
        
        let currentSize = totalSize;
        for (let i = sortedFiles.length - 1; i >= 0 && currentSize > this.maxCacheSize; i--) {
          const file = sortedFiles[i];
          unlinkSync(file.path);
          currentSize -= file.size;
          console.log(`🗑️ Removed cache file to free space: ${file.path}`);
        }
      }

      console.log(`📊 Cache cleanup complete. Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  /**
   * Get cache statistics with detailed file information for admin interface
   */
  getCacheStats(): { fileCount: number; totalSize: number; sizeMB: string; files: string[]; fileDetails: Array<{filename: string; size: number; lastModified: string}> } {
    try {
      const files = readdirSync(this.videoCacheDir);
      const fileDetails: Array<{filename: string; size: number; lastModified: string}> = [];
      
      const totalSize = files.reduce((sum, file) => {
        const filePath = join(this.videoCacheDir, file);
        const stats = statSync(filePath);
        
        fileDetails.push({
          filename: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        });
        
        return sum + stats.size;
      }, 0);
      
      return {
        fileCount: files.length,
        totalSize,
        sizeMB: (totalSize / 1024 / 1024).toFixed(1),
        files: files,
        fileDetails: fileDetails.sort((a, b) => b.lastModified.localeCompare(a.lastModified))
      };
    } catch (error) {
      return { fileCount: 0, totalSize: 0, sizeMB: '0.0', files: [], fileDetails: [] };
    }
  }

  /**
   * Check if a specific video is cached (for admin interface indicators)
   */
  isVideoCachedByFilename(filename: string): boolean {
    const cacheFile = this.getVideoCacheFilePath(filename);
    return existsSync(cacheFile);
  }

  // ========================
  // IMAGE CACHING METHODS
  // ========================

  /**
   * Check if image exists in local cache
   */
  isImageCached(filename: string): boolean {
    try {
      const cacheFile = this.getImageCacheFilePath(filename);
      return existsSync(cacheFile);
    } catch (error: any) {
      console.error(`❌ Image cache check failed for ${filename}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cached image file path
   */
  getCachedImagePath(filename: string): string | null {
    try {
      if (this.isImageCached(filename)) {
        return this.getImageCacheFilePath(filename);
      }
      return null;
    } catch (error: any) {
      console.error(`❌ Failed to get cached image path for ${filename}: ${error.message}`);
      return null;
    }
  }

  /**
   * Download and cache an image from Supabase
   */
  async downloadAndCacheImage(filename: string, customUrl?: string): Promise<void> {
    try {
      // Ensure cache directory exists before downloading
      if (!existsSync(this.imageCacheDir)) {
        require('fs').mkdirSync(this.imageCacheDir, { recursive: true });
        console.log(`📁 Created image cache directory for download: ${this.imageCacheDir}`);
      }
      
      // Remove query parameters from filename for clean display and caching
      let cleanFilename = filename;
      if (cleanFilename.includes('?')) {
        cleanFilename = cleanFilename.split('?')[0];
      }
      
      const fullImageUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      const cacheFile = this.getImageCacheFilePath(cleanFilename);
      
      console.log(`📥 Downloading image ${cleanFilename} from Supabase...`);
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(fullImageUrl, {
        headers: { 'User-Agent': 'MEMOPYK-ImageCachePreloader/1.0' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download image ${cleanFilename}: ${response.status} ${response.statusText}`);
      }
    
      return new Promise((resolve, reject) => {
        const writeStream = createWriteStream(cacheFile);
        
        writeStream.on('error', reject);
        writeStream.on('finish', () => {
          console.log(`💾 Successfully cached image: ${cleanFilename}`);
          resolve();
        });
        
        if (response.body) {
          response.body.pipe(writeStream);
        } else {
          writeStream.end();
          reject(new Error('No response body'));
        }
      });
    } catch (error: any) {
      console.error(`❌ Failed to download and cache image ${filename}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get image cache statistics
   */
  getImageCacheStats(): { fileCount: number; totalSize: number; sizeMB: string; files: string[] } {
    try {
      const files = readdirSync(this.imageCacheDir);
      const totalSize = files.reduce((sum, file) => {
        const filePath = join(this.imageCacheDir, file);
        const stats = statSync(filePath);
        return sum + stats.size;
      }, 0);
      
      return {
        fileCount: files.length,
        totalSize,
        sizeMB: (totalSize / 1024 / 1024).toFixed(1),
        files: files
      };
    } catch (error) {
      return { fileCount: 0, totalSize: 0, sizeMB: '0.0', files: [] };
    }
  }

  /**
   * Get unified cache statistics (videos + images) with storage management info
   */
  getUnifiedCacheStats(): { 
    videos: { fileCount: number; totalSize: number; sizeMB: string };
    images: { fileCount: number; totalSize: number; sizeMB: string };
    total: { fileCount: number; totalSize: number; sizeMB: string; limitMB: string; usagePercent: number };
    management: { maxCacheDays: number; autoCleanup: boolean; nextCleanup: string };
  } {
    const videoStats = this.getCacheStats();
    const imageStats = this.getImageCacheStats();
    
    const totalSize = videoStats.totalSize + imageStats.totalSize;
    const totalFiles = videoStats.fileCount + imageStats.fileCount;
    const usagePercent = Math.round((totalSize / this.maxCacheSize) * 100);
    
    return {
      videos: {
        fileCount: videoStats.fileCount,
        totalSize: videoStats.totalSize,
        sizeMB: videoStats.sizeMB
      },
      images: {
        fileCount: imageStats.fileCount,
        totalSize: imageStats.totalSize,
        sizeMB: imageStats.sizeMB
      },
      total: {
        fileCount: totalFiles,
        totalSize: totalSize,
        sizeMB: (totalSize / 1024 / 1024).toFixed(1),
        limitMB: (this.maxCacheSize / 1024 / 1024).toFixed(0),
        usagePercent: usagePercent
      },
      management: {
        maxCacheDays: Math.round(this.maxCacheAge / (24 * 60 * 60 * 1000)),
        autoCleanup: false, // Manual management preferred for small video set (max 6 videos)
        nextCleanup: "Manual" // User manages cleanup as needed
      }
    };
  }

  /**
   * Clear all cached images
   */
  clearImageCache(): void {
    try {
      const files = readdirSync(this.imageCacheDir);
      files.forEach(file => {
        unlinkSync(join(this.imageCacheDir, file));
      });
      console.log(`🗑️ Cleared image cache (${files.length} files removed)`);
    } catch (error) {
      console.error('❌ Failed to clear image cache:', error);
    }
  }

  /**
   * Get detailed cache status for multiple videos (for admin interface)
   */
  getVideoCacheStatus(filenames: string[]): Record<string, {cached: boolean; size?: number; lastModified?: string}> {
    const status: Record<string, {cached: boolean; size?: number; lastModified?: string}> = {};
    
    filenames.forEach(filename => {
      const cacheFile = this.getVideoCacheFilePath(filename);
      if (existsSync(cacheFile)) {
        try {
          const stats = statSync(cacheFile);
          status[filename] = {
            cached: true,
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          };
        } catch (error) {
          status[filename] = { cached: false };
        }
      } else {
        status[filename] = { cached: false };
      }
    });
    
    return status;
  }

  /**
   * Clear entire cache and immediately preload critical assets
   */
  async clearCache(): Promise<void> {
    try {
      const videoFiles = readdirSync(this.videoCacheDir);
      const imageFiles = readdirSync(this.imageCacheDir);
      
      // Clear video cache
      videoFiles.forEach(file => {
        unlinkSync(join(this.videoCacheDir, file));
      });
      
      // Clear image cache  
      imageFiles.forEach(file => {
        unlinkSync(join(this.imageCacheDir, file));
      });
      
      console.log(`🗑️ Cache cleared: ${videoFiles.length} videos, ${imageFiles.length} images removed`);
      console.log(`🚀 Immediately preloading critical assets to ensure instant visitor performance...`);
      
      // Immediate preload after cleanup ensures first visitors never wait for Supabase downloads
      await this.immediatePreloadCriticalAssets();
      
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Clear cache completely without immediate repreload (for admin interface)
   * This gives users the visual feedback they expect when clearing cache
   */
  async clearCacheCompletely(): Promise<{ videosRemoved: number; imagesRemoved: number }> {
    try {
      const videoFiles = readdirSync(this.videoCacheDir);
      const imageFiles = readdirSync(this.imageCacheDir);
      
      // Clear video cache
      videoFiles.forEach(file => {
        unlinkSync(join(this.videoCacheDir, file));
      });
      
      // Clear image cache  
      imageFiles.forEach(file => {
        unlinkSync(join(this.imageCacheDir, file));
      });
      
      console.log(`🗑️ ADMIN CACHE CLEAR: ${videoFiles.length} videos, ${imageFiles.length} images removed`);
      console.log(`⚠️ Cache is now empty - videos will download when requested by visitors`);
      
      return {
        videosRemoved: videoFiles.length,
        imagesRemoved: imageFiles.length
      };
      
    } catch (error) {
      console.error('❌ Failed to clear cache completely:', error);
      throw error;
    }
  }

  /**
   * Smart cache refresh - clears outdated gallery videos and caches current ones
   * Called when admin updates gallery videos to sync cache with database
   */
  async refreshGalleryCache(): Promise<{ removed: string[]; cached: string[] }> {
    try {
      console.log('🔄 SMART GALLERY CACHE REFRESH - Syncing cache with current database...');
      
      // Get current gallery videos from database
      const { hybridStorage } = await import('./hybrid-storage');
      const galleryItems = await hybridStorage.getGalleryItems();
      
      const currentGalleryVideos = galleryItems
        .filter(item => item.video_filename || item.video_url_en)
        .map(item => (item.video_filename || item.video_url_en!).split('/').pop()!)
        .filter(filename => filename);

      const currentGalleryImages = galleryItems
        .filter(item => item.static_image_url)
        .map(item => item.static_image_url!.split('/').pop()!)
        .filter(filename => filename);

      console.log(`📋 Current gallery videos in database:`, currentGalleryVideos);
      console.log(`📋 Current gallery images in database:`, currentGalleryImages);
      
      // Get currently cached files
      const cachedVideoFiles = readdirSync(this.videoCacheDir);
      const cachedImageFiles = readdirSync(this.imageCacheDir);
      
      // Hero videos should never be removed (they're not gallery-managed)
      const heroVideos = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
      
      const removed: string[] = [];
      const cached: string[] = [];
      
      // Remove outdated gallery videos (not hero videos, not in current database)
      for (const cachedFile of cachedVideoFiles) {
        // Check if this cached file corresponds to a current gallery video
        let isCurrentGalleryVideo = false;
        for (const currentVideo of currentGalleryVideos) {
          if (this.getVideoCacheFilePath(currentVideo).endsWith(cachedFile)) {
            isCurrentGalleryVideo = true;
            break;
          }
        }
        
        // Check if it's a hero video (never remove)
        let isHeroVideo = false;
        for (const heroVideo of heroVideos) {
          if (this.getVideoCacheFilePath(heroVideo).endsWith(cachedFile)) {
            isHeroVideo = true;
            break;
          }
        }
        
        // Remove if it's not a current gallery video and not a hero video
        if (!isCurrentGalleryVideo && !isHeroVideo) {
          unlinkSync(join(this.videoCacheDir, cachedFile));
          removed.push(cachedFile);
          console.log(`🗑️ Removed outdated gallery video cache: ${cachedFile}`);
        }
      }
      
      // Remove outdated gallery images
      for (const cachedFile of cachedImageFiles) {
        let isCurrentGalleryImage = false;
        for (const currentImage of currentGalleryImages) {
          if (this.getImageCacheFilePath(currentImage).endsWith(cachedFile)) {
            isCurrentGalleryImage = true;
            break;
          }
        }
        
        if (!isCurrentGalleryImage) {
          unlinkSync(join(this.imageCacheDir, cachedFile));
          removed.push(cachedFile);
          console.log(`🗑️ Removed outdated gallery image cache: ${cachedFile}`);
        }
      }
      
      // Cache new gallery videos that aren't cached yet
      for (const filename of currentGalleryVideos) {
        if (!this.isVideoCached(filename)) {
          console.log(`⬇️ Caching new gallery video: ${filename}`);
          await this.downloadAndCacheVideo(filename);
          cached.push(filename);
        }
      }
      
      // Cache new gallery images that aren't cached yet
      for (const filename of currentGalleryImages) {
        if (!this.isImageCached(filename)) {
          console.log(`⬇️ Caching new gallery image: ${filename}`);
          await this.downloadAndCacheImage(filename);
          cached.push(filename);
        }
      }
      
      console.log(`🔄 SMART CACHE REFRESH COMPLETE!`);
      console.log(`🗑️ Removed ${removed.length} outdated files: ${removed.join(', ')}`);
      console.log(`⬇️ Cached ${cached.length} new files: ${cached.join(', ')}`);
      
      return { removed, cached };
      
    } catch (error) {
      console.error('❌ Failed to refresh gallery cache:', error);
      throw error;
    }
  }

  /**
   * Clear a specific cached file
   */
  clearSpecificFile(filename: string): void {
    try {
      const cacheFile = this.getVideoCacheFilePath(filename);
      if (existsSync(cacheFile)) {
        unlinkSync(cacheFile);
        console.log(`🗑️ Cleared cached file: ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Failed to clear cached file ${filename}:`, error);
    }
  }

  /**
   * Preload only hero videos (gallery videos excluded - they don't work in production)
   */
  private async preloadCriticalVideos(): Promise<void> {
    console.log('🚀 Starting HERO-ONLY video preloading - gallery videos excluded...');
    
    // Load only hero videos (gallery videos fail in production)
    await this.preloadHeroVideosOnly();
    
    const stats = this.getCacheStats();
    console.log(`🎯 Hero-only video preloading complete! Cache: ${stats.fileCount} files, ${stats.sizeMB}MB`);
  }

  /**
   * Preload all videos from storage without any filename restrictions
   */
  private async preloadHeroVideosOnly(): Promise<void> {
    console.log('📥 HERO-ONLY PRELOAD v1.0.66 - Loading ONLY hero videos (gallery uses direct CDN)...');
    
    try {
      // Import hybrid storage to get hero video sources only
      const { hybridStorage } = await import('./hybrid-storage');
      
      // Get ONLY hero videos (gallery videos use direct CDN streaming per architecture)
      const heroVideos = await hybridStorage.getHeroVideos();
      const heroVideoFilenames = heroVideos
        .filter(video => video.url_en)
        .map(video => video.url_en.split('/').pop()!)
        .filter(filename => filename && filename.endsWith('.mp4'));
      
      // ARCHITECTURE COMPLIANCE: Only cache hero videos, gallery uses direct CDN
      const uniqueFilenames = [...new Set(heroVideoFilenames)]; // Remove duplicates
      
      console.log(`📋 HERO-ONLY PRELOAD: Found ${uniqueFilenames.length} hero videos to cache`);
      console.log(`🎬 Hero video filenames:`, uniqueFilenames);
      console.log(`🚫 Gallery videos excluded - using direct CDN streaming per architecture`);
      
      let videosProcessed = 0;
      let videoErrors = 0;

      // Preload all videos without any filename restrictions
      for (const filename of uniqueFilenames) {
        try {
          console.log(`🔍 Checking cache status for video: ${filename}`);
          const cacheFile = this.getVideoCacheFilePath(filename);
          const fileExists = this.isVideoCached(filename);
          console.log(`📂 DEPLOYMENT CHECK - File: ${filename}, Exists: ${fileExists}, Path: ${cacheFile}`);
          
          if (!fileExists) {
            console.log(`⬇️ UNIVERSAL DOWNLOAD v1.0.40 - Preloading video: ${filename}`);
            await this.downloadAndCacheVideo(filename);
            videosProcessed++;
            
            // CRITICAL: Verify file was actually written after download
            const postDownloadExists = this.isVideoCached(filename);
            const postDownloadSize = postDownloadExists ? statSync(cacheFile).size : 0;
            console.log(`📂 POST-DOWNLOAD VERIFICATION - File: ${filename}, Exists: ${postDownloadExists}, Size: ${postDownloadSize} bytes`);
            console.log(`✅ SUCCESS: Video cached: ${filename}`);
          } else {
            const fileSize = statSync(cacheFile).size;
            console.log(`✅ Video already cached: ${filename} (${fileSize} bytes)`);
          }
        } catch (error) {
          videoErrors++;
          console.error(`❌ UNIVERSAL ERROR v1.0.40 - Failed to preload video ${filename}:`, error);
        }
      }
      
      console.log(`🎬 HERO-ONLY PRELOAD COMPLETE v1.0.66!`);
      console.log(`📊 Results: ${videosProcessed} hero videos cached, ${videoErrors} errors`);
      console.log(`✅ Success rate: ${uniqueFilenames.length > 0 ? Math.round((videosProcessed / uniqueFilenames.length) * 100) : 100}%`);
      console.log(`🏗️ Architecture compliant: Hero videos cached, gallery videos use direct CDN`);
      
    } catch (error) {
      console.error('❌ HERO-ONLY PRELOAD FATAL ERROR v1.0.66:', error);
    }
  }

  /**
   * DISABLED - Gallery videos now use direct CDN streaming (don't work in production cache)
   */
  private async preloadGalleryVideos(): Promise<void> {
    console.log('🚫 GALLERY PRELOAD DISABLED v1.0.66 - Gallery videos use direct CDN streaming...');
    console.log('🎯 ARCHITECTURE: Gallery videos don\'t work in production cache, using direct CDN instead');
    return; // Exit early - no gallery video caching
    
    try {
      // Import hybrid storage to get gallery items
      console.log('📊 Importing hybrid storage to get gallery items...');
      const { hybridStorage } = await import('./hybrid-storage');
      const galleryItems = await hybridStorage.getGalleryItems();
      
      console.log(`📋 Retrieved ${galleryItems.length} gallery items from storage`);
      
      const galleryVideos = galleryItems
        .filter(item => item.video_filename || item.video_url_en)
        .map(item => (item.video_filename || item.video_url_en!).split('/').pop()!)
        .filter(filename => filename);

      const galleryImages = galleryItems
        .filter(item => item.static_image_url)
        .map(item => item.static_image_url!.split('/').pop()!)
        .filter(filename => filename);

      console.log(`📋 PRODUCTION GALLERY ANALYSIS v1.0.11: ${galleryVideos.length} videos, ${galleryImages.length} images to preload`);
      console.log(`🎬 Gallery video filenames:`, galleryVideos);
      console.log(`🖼️ Gallery image filenames:`, galleryImages);
      
      let videosProcessed = 0;
      let imagesProcessed = 0;
      let videoErrors = 0;
      let imageErrors = 0;

      // Preload videos
      for (const filename of galleryVideos) {
        try {
          console.log(`🔍 Checking cache status for gallery video: ${filename}`);
          if (!this.isVideoCached(filename)) {
            console.log(`⬇️ PRODUCTION DOWNLOAD v1.0.11 - Preloading gallery video: ${filename}`);
            await this.downloadAndCacheVideo(filename);
            videosProcessed++;
            console.log(`✅ SUCCESS: Gallery video cached: ${filename}`);
          } else {
            console.log(`✅ Gallery video already cached: ${filename}`);
          }
        } catch (error) {
          videoErrors++;
          console.error(`❌ PRODUCTION ERROR v1.0.11 - Failed to preload gallery video ${filename}:`, error);
          console.error(`❌ Error details:`, {
            message: error.message,
            stack: error.stack?.substring(0, 200)
          });
        }
      }

      // Preload images
      for (const filename of galleryImages) {
        try {
          console.log(`🔍 Checking cache status for gallery image: ${filename}`);
          if (!this.isImageCached(filename)) {
            console.log(`⬇️ PRODUCTION DOWNLOAD v1.0.11 - Preloading gallery image: ${filename}`);
            await this.downloadAndCacheImage(filename);
            imagesProcessed++;
            console.log(`✅ SUCCESS: Gallery image cached: ${filename}`);
          } else {
            console.log(`✅ Gallery image already cached: ${filename}`);
          }
        } catch (error) {
          imageErrors++;
          console.error(`❌ PRODUCTION ERROR v1.0.11 - Failed to preload gallery image ${filename}:`, error);
          console.error(`❌ Error details:`, {
            message: error.message,
            stack: error.stack?.substring(0, 200)
          });
        }
      }
      
      console.log(`🎬 PRODUCTION GALLERY PRELOAD COMPLETE v1.0.11!`);
      console.log(`📊 Results: ${videosProcessed} videos cached, ${imagesProcessed} images cached`);
      console.log(`❌ Errors: ${videoErrors} video errors, ${imageErrors} image errors`);
      console.log(`✅ Total success rate: ${Math.round(((videosProcessed + imagesProcessed) / (galleryVideos.length + galleryImages.length)) * 100)}%`);
    } catch (error) {
      console.error('❌ PRODUCTION GALLERY PRELOAD FATAL ERROR v1.0.11:', error);
      console.error('❌ Fatal error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }

  /**
   * Universal video download system - handles any valid filename
   */
  async downloadAndCacheVideo(filename: string, customUrl?: string): Promise<void> {
    try {
      // Ensure cache directory exists
      if (!existsSync(this.videoCacheDir)) {
        require('fs').mkdirSync(this.videoCacheDir, { recursive: true });
        console.log(`📁 Created cache directory: ${this.videoCacheDir}`);
      }
      
      // Clean filename handling - no special cases or assumptions
      const cleanFilename = filename.trim();
      const encodedFilename = encodeURIComponent(cleanFilename);
      const fullVideoUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
      const cacheFile = this.getVideoCacheFilePath(cleanFilename);
      
      console.log(`📥 UNIVERSAL DOWNLOAD v1.0.40: ${cleanFilename}`);
      console.log(`   - Encoded filename: "${encodedFilename}"`);
      console.log(`   - Supabase URL: "${fullVideoUrl}"`);
      console.log(`   - Cache path: "${cacheFile}"`);
      
      // Enhanced fetch with better error handling
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(fullVideoUrl, {
        headers: { 
          'User-Agent': 'MEMOPYK-Universal-Cache/1.0',
          'Accept': 'video/mp4,video/*,*/*'
        },
        timeout: 30000 // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${cleanFilename}`);
      }

      const contentLength = response.headers.get('content-length');
      console.log(`   - Content-Length: ${contentLength} bytes`);
      
      return new Promise((resolve, reject) => {
        const writeStream = createWriteStream(cacheFile);
        
        writeStream.on('error', (error) => {
          console.error(`❌ Write stream error for ${cleanFilename}:`, error);
          reject(error);
        });
        
        writeStream.on('finish', () => {
          // CRITICAL: Verify file was actually written to disk
          const fileExists = existsSync(cacheFile);
          const fileSize = fileExists ? statSync(cacheFile).size : 0;
          console.log(`✅ Successfully cached: ${cleanFilename}`);
          console.log(`📂 DEPLOYMENT VERIFICATION - Cache file exists: ${fileExists}, size: ${fileSize} bytes`);
          console.log(`📂 Cache file path: ${cacheFile}`);
          
          if (!fileExists) {
            console.error(`🚨 CRITICAL: Cache file was not written to disk! Path: ${cacheFile}`);
            reject(new Error(`Cache file was not written to disk: ${cacheFile}`));
          } else {
            resolve();
          }
        });
        
        if (response.body) {
          response.body.on('error', (error) => {
            console.error(`❌ Response body error for ${cleanFilename}:`, error);
            reject(error);
          });
          
          response.body.pipe(writeStream);
        } else {
          writeStream.end();
          reject(new Error(`No response body for ${cleanFilename}`));
        }
      });
      
    } catch (error: any) {
      console.error(`❌ UNIVERSAL DOWNLOAD FAILED for ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Preload a specific video by URL
   */
  async preloadVideo(videoUrl: string): Promise<void> {
    try {
      const filename = this.extractFilenameFromUrl(videoUrl);
      if (!this.isVideoCached(filename)) {
        console.log(`📥 Preloading video: ${filename}`);
        await this.downloadAndCacheVideo(filename);
      } else {
        console.log(`✅ Video already cached: ${filename}`);
      }
    } catch (error) {
      console.error('❌ Failed to preload video:', error);
    }
  }

  /**
   * Extract filename from Supabase URL
   */
  private extractFilenameFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Immediate preloading of all critical assets (videos + images) on startup
   * Ensures first visitors get instant performance, never wait for Supabase downloads
   */
  async immediatePreloadCriticalAssets(): Promise<void> {
    console.log(`🚀 MEMOPYK HERO-ONLY PRELOAD v1.0.66 - Starting immediate preload of hero videos only...`);
    console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`📁 Cache directories: videos=${this.videoCacheDir}, images=${this.imageCacheDir}`);
    console.log(`🎯 ARCHITECTURE: Hero videos = cache system, Gallery videos = direct CDN streaming`);
    
    try {
      // Only preload hero videos - gallery videos use direct CDN per architecture decision
      console.log(`🎬 Starting hero video preload only (gallery videos excluded)...`);
      await this.preloadCriticalVideos();
      
      const finalStats = this.getCacheStats();
      console.log(`✅ HERO-ONLY PRELOAD COMPLETE v1.0.66! Cache: ${finalStats.fileCount} files, ${finalStats.sizeMB}MB`);
      console.log(`🎯 Hero videos: instant ~50ms performance from cache`);
      console.log(`🎯 Gallery videos: direct CDN streaming (slower but reliable in production)`);
    } catch (error) {
      console.error('❌ HERO PRELOAD FAILED v1.0.66:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      console.log(`⚠️ Some hero videos may need manual caching or will download on first request`);
    }
  }

  /**
   * Force refresh cache for all critical videos (admin tool)
   */
  async refreshCriticalVideos(): Promise<{ success: boolean; cached: string[]; errors: string[] }> {
    const criticalVideos = [
      'VideoHero1.mp4',
      '1752156356886_VideoHero2.mp4', 
      '1752159228374_VideoHero3.mp4'
    ];

    const cached: string[] = [];
    const errors: string[] = [];

    console.log('🔄 Admin-triggered critical video cache refresh...');

    for (const filename of criticalVideos) {
      try {
        // Remove from cache if exists
        this.removeCachedVideo(filename);
        // Download fresh copy
        await this.downloadAndCacheVideo(filename);
        cached.push(filename);
      } catch (error: any) {
        console.error(`❌ Failed to refresh ${filename}:`, error);
        errors.push(`${filename}: ${error.message}`);
      }
    }

    const stats = this.getCacheStats();
    console.log(`✅ Cache refresh complete! Success: ${cached.length}, Errors: ${errors.length}`);
    
    return {
      success: errors.length === 0,
      cached,
      errors
    };
  }
}

// Export singleton instance
export const videoCache = new VideoCache();