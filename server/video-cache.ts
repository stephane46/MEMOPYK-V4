import { existsSync, createWriteStream, statSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export class VideoCache {
  private cacheDir: string;
  private maxCacheSize: number; // in bytes
  private maxCacheAge: number; // in milliseconds

  constructor() {
    this.cacheDir = join(process.cwd(), 'server/cache/videos');
    this.maxCacheSize = 500 * 1024 * 1024; // 500MB cache limit
    this.maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      require('fs').mkdirSync(this.cacheDir, { recursive: true });
    }
    
    console.log(`✅ Video cache initialized: ${this.cacheDir}`);
  }

  /**
   * Get cache file path for a video filename
   */
  private getCacheFilePath(filename: string): string {
    // Create hash of filename for safe filesystem storage
    const hash = createHash('md5').update(filename).digest('hex');
    const extension = filename.split('.').pop() || 'mp4';
    return join(this.cacheDir, `${hash}.${extension}`);
  }

  /**
   * Check if video exists in local cache and is fresh
   */
  isVideoCached(filename: string): boolean {
    const cacheFile = this.getCacheFilePath(filename);
    
    if (!existsSync(cacheFile)) {
      return false;
    }

    // Check if cache file is too old
    const stats = statSync(cacheFile);
    const age = Date.now() - stats.mtime.getTime();
    
    if (age > this.maxCacheAge) {
      console.log(`🗑️ Cache expired for ${filename}, removing...`);
      this.removeCachedVideo(filename);
      return false;
    }

    return true;
  }

  /**
   * Get cached video file path
   */
  getCachedVideoPath(filename: string): string | null {
    if (this.isVideoCached(filename)) {
      return this.getCacheFilePath(filename);
    }
    return null;
  }

  /**
   * Cache a video from Supabase response
   */
  async cacheVideo(filename: string, videoResponse: any): Promise<string> {
    const cacheFile = this.getCacheFilePath(filename);
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(cacheFile);
      
      writeStream.on('error', (error) => {
        console.error(`❌ Failed to cache video ${filename}:`, error);
        reject(error);
      });
      
      writeStream.on('finish', () => {
        console.log(`💾 Cached video: ${filename} -> ${cacheFile}`);
        this.cleanupCache(); // Cleanup old files if needed
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
   * Get cache statistics
   */
  getCacheStats(): { fileCount: number; totalSize: number; sizeMB: string } {
    try {
      const files = readdirSync(this.cacheDir);
      const totalSize = files.reduce((sum, file) => {
        const filePath = join(this.cacheDir, file);
        return sum + statSync(filePath).size;
      }, 0);
      
      return {
        fileCount: files.length,
        totalSize,
        sizeMB: (totalSize / 1024 / 1024).toFixed(1)
      };
    } catch (error) {
      return { fileCount: 0, totalSize: 0, sizeMB: '0.0' };
    }
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
}

// Export singleton instance
export const videoCache = new VideoCache();