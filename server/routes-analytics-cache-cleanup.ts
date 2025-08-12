import { Router } from 'express';
import { jsonCleanup } from './json-cleanup';

const router = Router();

/**
 * API endpoint to manually trigger JSON cache cleanup
 * Maintains 7-day rolling window in JSON files
 */
router.post('/api/analytics/cleanup-cache', async (req, res) => {
  try {
    console.log('🧹 Manual JSON cache cleanup triggered');
    
    // Run the cleanup
    await jsonCleanup.cleanupAllAnalyticsFiles();
    await jsonCleanup.cleanupOldBackups();
    
    // Get stats after cleanup
    const stats = await jsonCleanup.getCleanupStats();
    
    res.json({
      success: true,
      message: 'JSON cache cleanup completed',
      stats
    });
  } catch (error) {
    console.error('❌ JSON cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

/**
 * API endpoint to get JSON cache statistics
 */
router.get('/api/analytics/cache-stats', async (req, res) => {
  try {
    const stats = await jsonCleanup.getCleanupStats();
    res.json({
      success: true,
      stats,
      strategy: '7-day rolling cache',
      description: 'JSON files contain last 7 days for fast access. Historical data retrieved from Supabase.'
    });
  } catch (error) {
    console.error('❌ Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

export { router as analyticsCleanupRoutes };