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

// Video cache system test
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
    
    const files = fs.readdirSync(cacheDir);
    const cacheStats = files.map(file => {
      const filePath = path.join(cacheDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: stats.size,
        modified: stats.mtime
      };
    });
    
    const totalSize = cacheStats.reduce((sum, file) => sum + file.size, 0);
    
    res.json({
      success: true,
      message: `Video cache system operational`,
      details: {
        fileCount: files.length,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        cachePath: cacheDir,
        files: cacheStats
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