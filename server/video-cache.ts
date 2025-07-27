import { existsSync, createWriteStream, statSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export class VideoCache {
  private cacheDir: string;
  private maxCacheSize: number; // in bytes
  private maxCacheAge: number; // in milliseconds

  constructor() {
    this.cacheDir = join(process.cwd(), 'server/cache/videos');
    this.maxCacheSize = 5000 * 1024 * 1024; // 5000MB cache limit  
    this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days (extended since we use smart replacement)
    
    // Ensure cache directory exists
    try {
      if (!existsSync(this.cacheDir)) {
        require('fs').mkdirSync(this.cacheDir, { recursive: true });
        console.log(`📁 Created cache directory: ${this.cacheDir}`);
      }
      
      console.log(`✅ Video cache initialized: ${this.cacheDir}`);
      console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
      
      // Proactively preload critical videos on startup
      this.preloadCriticalVideos();
    } catch (error: any) {
      console.error(`❌ Cache directory creation failed: ${error.message}`);
      console.error(`❌ Cache dir path: ${this.cacheDir}`);
      console.error(`❌ Process CWD: ${process.cwd()}`);
      // Don't throw - allow server to continue without cache
      console.log(`⚠️ Server will continue without video cache - videos will stream directly from CDN`);
    }
  }

  /**
   * Get cache file path for a video filename
   */
  private getCacheFilePath(filename: string): string {
    if (!filename || filename.trim() === '') {
      throw new Error(`Invalid filename provided: ${filename}`);
    }
    // Create hash of filename for safe filesystem storage
    const hash = createHash('md5').update(filename.trim()).digest('hex');
    const extension = filename.split('.').pop() || 'mp4';
    return join(this.cacheDir, `${hash}.${extension}`);
  }

  /**
   * Public method to get cache file path (for external use)
   */
  getCachedFilePath(filename: string): string {
    return this.getCacheFilePath(filename);
  }

  /**
   * Check if video exists in local cache
   */
  isVideoCached(filename: string): boolean {
    try {
      const cacheFile = this.getCacheFilePath(filename);
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
        return this.getCacheFilePath(filename);
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
    const cacheFile = this.getCacheFilePath(filename);
    
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
    const cacheFile = this.getCacheFilePath(filename);
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
      const files = readdirSync(this.cacheDir);
      
      // If we have more than 8 videos (keeping some buffer below max 10), remove oldest
      if (files.length >= 8) {
        const fileStats = files.map(file => {
          const filePath = join(this.cacheDir, file);
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
      const files = readdirSync(this.cacheDir);
      const fileStats = files.map(file => {
        const filePath = join(this.cacheDir, file);
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
      const files = readdirSync(this.cacheDir);
      const fileDetails: Array<{filename: string; size: number; lastModified: string}> = [];
      
      const totalSize = files.reduce((sum, file) => {
        const filePath = join(this.cacheDir, file);
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
    const cacheFile = this.getCacheFilePath(filename);
    return existsSync(cacheFile);
  }

  /**
   * Get detailed cache status for multiple videos (for admin interface)
   */
  getVideoCacheStatus(filenames: string[]): Record<string, {cached: boolean; size?: number; lastModified?: string}> {
    const status: Record<string, {cached: boolean; size?: number; lastModified?: string}> = {};
    
    filenames.forEach(filename => {
      const cacheFile = this.getCacheFilePath(filename);
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
   * Clear entire cache
   */
  clearCache(): void {
    try {
      const files = readdirSync(this.cacheDir);
      files.forEach(file => {
        unlinkSync(join(this.cacheDir, file));
      });
      console.log(`🗑️ Cleared video cache (${files.length} files removed)`);
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Clear a specific cached file
   */
  clearSpecificFile(filename: string): void {
    try {
      const cacheFile = this.getCacheFilePath(filename);
      if (existsSync(cacheFile)) {
        unlinkSync(cacheFile);
        console.log(`🗑️ Cleared cached file: ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Failed to clear cached file ${filename}:`, error);
    }
  }

  /**
   * Proactively preload critical videos (hero videos that auto-play) and gallery videos
   */
  private async preloadCriticalVideos(): Promise<void> {
    // Critical videos that should ALWAYS be cached (hero videos auto-play)
    const criticalVideos = [
      'VideoHero1.mp4',
      'VideoHero2.mp4', 
      'VideoHero3.mp4'
    ];

    console.log('🚀 Starting proactive cache preloading for critical videos...');
    
    for (const filename of criticalVideos) {
      try {
        if (!this.isVideoCached(filename)) {
          console.log(`⬇️ Preloading critical video: ${filename}`);
          await this.downloadAndCacheVideo(filename);
        } else {
          console.log(`✅ Critical video already cached: ${filename}`);
        }
      } catch (error) {
        console.error(`❌ Failed to preload ${filename}:`, error);
      }
    }
    
    // Now preload gallery videos
    await this.preloadGalleryVideos();
    
    const stats = this.getCacheStats();
    console.log(`🎯 Critical video preloading complete! Cache: ${stats.fileCount} files, ${stats.sizeMB}MB`);
  }

  /**
   * Preload all gallery videos for instant deployment availability
   */
  private async preloadGalleryVideos(): Promise<void> {
    console.log('📸 Starting gallery video preloading...');
    
    try {
      // Import hybrid storage to get gallery items
      const { hybridStorage } = await import('./hybrid-storage');
      const galleryItems = await hybridStorage.getGalleryItems();
      
      const galleryVideos = galleryItems
        .filter(item => item.video_url_en)
        .map(item => item.video_url_en!.split('/').pop()!)
        .filter(filename => filename);

      console.log(`📋 Found ${galleryVideos.length} gallery videos to preload`);
      
      for (const filename of galleryVideos) {
        try {
          if (!this.isVideoCached(filename)) {
            console.log(`⬇️ Preloading gallery video: ${filename}`);
            await this.downloadAndCacheVideo(filename);
          } else {
            console.log(`✅ Gallery video already cached: ${filename}`);
          }
        } catch (error) {
          console.error(`❌ Failed to preload gallery video ${filename}:`, error);
        }
      }
      
      console.log(`🎬 Gallery video preloading complete! ${galleryVideos.length} videos processed`);
    } catch (error) {
      console.error('❌ Failed to preload gallery videos:', error);
    }
  }

  /**
   * Download and cache a video from Supabase
   */
  async downloadAndCacheVideo(filename: string, customUrl?: string): Promise<void> {
    try {
      // Ensure cache directory exists before downloading
      if (!existsSync(this.cacheDir)) {
        require('fs').mkdirSync(this.cacheDir, { recursive: true });
        console.log(`📁 Created cache directory for download: ${this.cacheDir}`);
      }
      
      const fullVideoUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${filename}`;
      const cacheFile = this.getCacheFilePath(filename);
      
      console.log(`📥 Downloading ${filename} from Supabase...`);
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(fullVideoUrl, {
        headers: { 'User-Agent': 'MEMOPYK-CachePreloader/1.0' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download ${filename}: ${response.status} ${response.statusText}`);
      }
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(cacheFile);
      
      writeStream.on('error', reject);
      writeStream.on('finish', () => {
        console.log(`💾 Successfully cached critical video: ${filename}`);
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
      console.error(`❌ Failed to download and cache ${filename}: ${error.message}`);
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