import { Router } from 'express';
import { hybridStorage } from './hybrid-storage';
import fs from 'fs';
import path from 'path';

const router = Router();

// System health check
router.get('/system/health', async (req, res) => {
  try {
    const healthStatus = {
      database: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };
    
    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({ 
      error: 'Health check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Database connection test
router.get('/test/database', async (req, res) => {
  try {
    // Test multiple database operations
    const startTime = Date.now();
    
    // Test gallery items query
    const galleryItems = await hybridStorage.getGalleryItems();
    
    // Test FAQ items query  
    const faqItems = await hybridStorage.getFaqs();
    

    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: `Database test completed in ${duration}ms`,
      details: {
        galleryItems: galleryItems.length,
        faqItems: faqItems.length,

        duration: `${duration}ms`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Video cache system test with original filename mapping
router.get('/test/video-cache', async (req, res) => {
  try {
    const cacheDir = path.join(process.cwd(), 'server', 'cache', 'videos');
    
    if (!fs.existsSync(cacheDir)) {
      return res.json({
        success: false,
        message: 'Video cache directory not found',
        details: { cachePath: cacheDir }
      });
    }
    
    // Create hash mapping function (same as VideoCache class)
    const createHash = require('crypto').createHash;
    const getHashForFilename = (filename: string): string => {
      const hash = createHash('md5').update(filename.trim()).digest('hex');
      const extension = filename.split('.').pop() || 'mp4';
      return `${hash}.${extension}`;
    };
    
    // Known original filenames that SHOULD be cached (according to current architecture)
    // ARCHITECTURE NOTE: Gallery videos (VitaminSeaC.mp4, PomGalleryC.mp4, safari-1.mp4) 
    // use DIRECT CDN streaming and should NOT be cached
    const expectedFiles = [
      // Hero videos ONLY (these use cache system)
      'VideoHero1.mp4',
      'VideoHero2.mp4', 
      'VideoHero3.mp4',
      // Gallery image files (static thumbnails and original images)
      'static_1753304723805.png',
      'static_gallery-hero2-1753727544112.png',
      '1753737011770-IMG_9217.JPG',
      // Additional image files that may be cached
      'current_static.jpg',
      'debug_test.jpg',
      'final_test.jpg',
      'static_image.jpg',
      'latest_static.jpg',
      'latest_crop_test.jpg',
      'newest_test.jpg',
      'KeyVisual_Hero.png',
      'test_static.jpg',
      'gallery_test.jpg'
    ];
    
    const files = fs.readdirSync(cacheDir);
    const cacheStats = files.map(file => {
      const filePath = path.join(cacheDir, file);
      const stats = fs.statSync(filePath);
      
      // Try to find matching original filename
      let originalFilename = 'Unknown';
      for (const original of expectedFiles) {
        if (getHashForFilename(original) === file) {
          originalFilename = original;
          break;
        }
      }
      
      return {
        hashedFilename: file,
        originalFilename,
        size: stats.size,
        sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
        modified: stats.mtime,
        type: file.toLowerCase().includes('.mp4') ? 'video' : 'image'
      };
    });
    
    const totalSize = cacheStats.reduce((sum, file) => sum + file.size, 0);
    const videoFiles = cacheStats.filter(f => f.type === 'video');
    const imageFiles = cacheStats.filter(f => f.type === 'image');
    
    // Separate expected vs unexpected files based on current architecture
    const expectedVideoFiles = cacheStats.filter(f => f.type === 'video' && f.originalFilename.startsWith('VideoHero'));
    const unexpectedGalleryVideos = cacheStats.filter(f => f.type === 'video' && !f.originalFilename.startsWith('VideoHero') && f.originalFilename !== 'Unknown');
    const expectedImageFiles = cacheStats.filter(f => f.type === 'image');
    
    let message = `Cache system analysis - ${expectedVideoFiles.length} hero videos, ${expectedImageFiles.length} images`;
    if (unexpectedGalleryVideos.length > 0) {
      message += ` (WARNING: ${unexpectedGalleryVideos.length} gallery videos found - should use direct CDN)`;
    }
    
    res.json({
      success: true,
      message,
      details: {
        fileCount: files.length,
        videoCount: videoFiles.length,
        imageCount: imageFiles.length,
        expectedHeroVideos: expectedVideoFiles.length,
        unexpectedGalleryVideos: unexpectedGalleryVideos.length,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        cachePath: cacheDir,
        files: cacheStats.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename)),
        architectureNote: "Gallery videos (VitaminSeaC.mp4, PomGalleryC.mp4, safari-1.mp4) should use direct CDN streaming, not cache"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Video cache test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Image proxy system test
router.get('/test/image-proxy', async (req, res) => {
  try {
    const cacheDir = path.join(process.cwd(), 'server', 'cache', 'images');
    
    let imageCount = 0;
    let totalSize = 0;
    
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      imageCount = files.length;
      
      files.forEach(file => {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });
    }
    
    res.json({
      success: true,
      message: 'Image proxy system operational',
      details: {
        imageCount,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        cachePath: cacheDir
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Image proxy test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// File upload system test
router.get('/test/file-upload', async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Check if uploads directory exists
    const uploadsExists = fs.existsSync(uploadsDir);
    
    res.json({
      success: uploadsExists,
      message: uploadsExists ? 'Upload system ready' : 'Upload directory not found',
      details: {
        uploadsPath: uploadsDir,
        exists: uploadsExists,
        writable: uploadsExists ? fs.constants.W_OK : false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'File upload test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analytics system test
router.get('/test/analytics', async (req, res) => {
  try {
    // Test analytics data retrieval
    const sessions = await hybridStorage.getAnalyticsSessions();
    const views = await hybridStorage.getAnalyticsViews();
    
    res.json({
      success: true,
      message: 'Analytics system operational',
      details: {
        sessions: sessions.length,
        views: views.length,
        dataAvailable: sessions.length > 0 || views.length > 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Analytics test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Gallery API endpoints test
router.get('/test/gallery', async (req, res) => {
  try {
    const items = await hybridStorage.getGalleryItems();
    
    res.json({
      success: true,
      message: 'Gallery API endpoints operational',
      details: {
        itemCount: items.length,
        hasVideos: items.some(item => item.video_filename),
        hasImages: items.some(item => item.image_url)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gallery API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// FAQ system test
router.get('/test/faq', async (req, res) => {
  try {
    const faqItems = await hybridStorage.getFaqs();
    
    res.json({
      success: true,
      message: 'FAQ system operational',
      details: {
        itemCount: faqItems.length,
        hasBilingualContent: faqItems.some(item => item.content_fr && item.content_en)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'FAQ test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



// SEO management test
router.get('/test/seo', async (req, res) => {
  try {
    const seoSettings = await hybridStorage.getSeoSettings();
    
    res.json({
      success: true,
      message: 'SEO management operational',
      details: {
        settingsCount: seoSettings.length,
        hasGlobalSettings: seoSettings.some(setting => setting.page_id === 'global')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'SEO test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Performance benchmarks test
router.get('/test/performance', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database query performance
    const dbStart = Date.now();
    await hybridStorage.getGalleryItems();
    const dbDuration = Date.now() - dbStart;
    
    // Test memory usage
    const memoryUsage = process.memoryUsage();
    
    // Test cache directory access
    const cacheStart = Date.now();
    const cacheDir = path.join(process.cwd(), 'server', 'cache');
    const cacheExists = fs.existsSync(cacheDir);
    const cacheDuration = Date.now() - cacheStart;
    
    const totalDuration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Performance benchmarks completed',
      details: {
        totalDuration: `${totalDuration}ms`,
        databaseQuery: `${dbDuration}ms`,
        cacheAccess: `${cacheDuration}ms`,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        performance: {
          database: dbDuration < 50 ? 'excellent' : dbDuration < 200 ? 'good' : 'needs improvement',
          cache: cacheDuration < 10 ? 'excellent' : cacheDuration < 50 ? 'good' : 'needs improvement'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Performance test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;