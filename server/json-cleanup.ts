import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from "fs";
import { join } from "path";

interface CleanupConfig {
  maxRecords: number;
  maxAgeInDays: number;
  maxFileSizeMB: number;
}

export class JsonCleanupManager {
  private dataPath: string;
  
  // Configuration for different data types
  private cleanupConfigs: Record<string, CleanupConfig> = {
    'analytics-sessions.json': {
      maxRecords: 10000,      // Keep last 10k sessions
      maxAgeInDays: 90,       // Keep last 90 days
      maxFileSizeMB: 50       // Max 50MB per file
    },
    'analytics-views.json': {
      maxRecords: 50000,      // Keep last 50k video views
      maxAgeInDays: 90,       // Keep last 90 days  
      maxFileSizeMB: 100      // Max 100MB per file
    },
    'performance-metrics.json': {
      maxRecords: 5000,       // Keep last 5k performance records
      maxAgeInDays: 30,       // Keep last 30 days
      maxFileSizeMB: 10       // Max 10MB per file
    },
    'realtime-visitors.json': {
      maxRecords: 1000,       // Keep last 1k visitors
      maxAgeInDays: 7,        // Keep last 7 days
      maxFileSizeMB: 5        // Max 5MB per file
    },
    'engagement-heatmap.json': {
      maxRecords: 5000,       // Keep last 5k engagement events
      maxAgeInDays: 30,       // Keep last 30 days
      maxFileSizeMB: 20       // Max 20MB per file
    },
    'conversion-funnel.json': {
      maxRecords: 5000,       // Keep last 5k conversion events
      maxAgeInDays: 60,       // Keep last 60 days
      maxFileSizeMB: 15       // Max 15MB per file
    }
  };

  constructor() {
    this.dataPath = join(process.cwd(), 'server/data');
  }

  /**
   * Clean up all analytics JSON files based on their configurations
   */
  async cleanupAllAnalyticsFiles(): Promise<void> {
    console.log('🧹 JSON CLEANUP MANAGER: Starting cleanup of analytics files...');
    
    for (const [filename, config] of Object.entries(this.cleanupConfigs)) {
      try {
        await this.cleanupJsonFile(filename, config);
      } catch (error) {
        console.error(`❌ Failed to cleanup ${filename}:`, error);
      }
    }
    
    console.log('✅ JSON CLEANUP MANAGER: Cleanup complete');
  }

  /**
   * Clean up a specific JSON file based on its configuration
   */
  private async cleanupJsonFile(filename: string, config: CleanupConfig): Promise<void> {
    const filePath = join(this.dataPath, filename);
    
    if (!existsSync(filePath)) {
      return; // File doesn't exist, nothing to clean
    }

    // Check file size first
    const stats = statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    console.log(`🔍 CLEANUP: ${filename} - Size: ${fileSizeMB.toFixed(2)}MB`);

    // Skip cleanup if file is small enough
    if (fileSizeMB < config.maxFileSizeMB * 0.8) {
      console.log(`✅ SKIP: ${filename} is under threshold (${config.maxFileSizeMB}MB)`);
      return;
    }

    try {
      // Load and parse the JSON data
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      
      if (!Array.isArray(data) || data.length === 0) {
        return; // Not an array or empty, nothing to clean
      }

      const originalCount = data.length;
      
      // Apply cleanup rules
      let cleanedData = this.applyRecordLimit(data, config.maxRecords);
      cleanedData = this.applyAgeLimit(cleanedData, config.maxAgeInDays);
      
      const finalCount = cleanedData.length;
      const removedCount = originalCount - finalCount;
      
      if (removedCount > 0) {
        // Create backup before cleanup
        await this.createBackup(filename, data);
        
        // Write cleaned data back to file
        writeFileSync(filePath, JSON.stringify(cleanedData, null, 2));
        
        const newStats = statSync(filePath);
        const newSizeMB = newStats.size / (1024 * 1024);
        
        console.log(`🧹 CLEANED: ${filename}`);
        console.log(`   - Records: ${originalCount} → ${finalCount} (removed ${removedCount})`);
        console.log(`   - Size: ${fileSizeMB.toFixed(2)}MB → ${newSizeMB.toFixed(2)}MB`);
      } else {
        console.log(`✅ NO CLEANUP NEEDED: ${filename} - All records are recent`);
      }

    } catch (error) {
      console.error(`❌ Error cleaning ${filename}:`, error);
    }
  }

  /**
   * Limit records by count (keep most recent)
   */
  private applyRecordLimit(data: any[], maxRecords: number): any[] {
    if (data.length <= maxRecords) {
      return data;
    }

    // Sort by timestamp (most recent first) and take the limit
    return data
      .sort((a, b) => {
        const timeA = new Date(a.created_at || a.timestamp || a.created || 0).getTime();
        const timeB = new Date(b.created_at || b.timestamp || b.created || 0).getTime();
        return timeB - timeA; // Descending order (newest first)
      })
      .slice(0, maxRecords);
  }

  /**
   * Remove records older than specified days
   */
  private applyAgeLimit(data: any[], maxAgeInDays: number): any[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
    const cutoffTime = cutoffDate.getTime();

    return data.filter(record => {
      const recordTime = new Date(
        record.created_at || record.timestamp || record.created || 0
      ).getTime();
      
      return recordTime >= cutoffTime;
    });
  }

  /**
   * Create a backup of the original data before cleanup
   */
  private async createBackup(filename: string, originalData: any[]): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const backupFilename = filename.replace('.json', `-backup-${timestamp}.json`);
    const backupPath = join(this.dataPath, backupFilename);
    
    // Only create backup if it doesn't exist for today
    if (!existsSync(backupPath)) {
      writeFileSync(backupPath, JSON.stringify(originalData, null, 2));
      console.log(`💾 BACKUP: Created ${backupFilename}`);
    }
  }

  /**
   * Clean up old backup files (keep only last 7 days)
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const { readdirSync } = await import('fs');
      const files = readdirSync(this.dataPath);
      const backupFiles = files.filter(file => file.includes('-backup-'));
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      for (const backupFile of backupFiles) {
        const filePath = join(this.dataPath, backupFile);
        const stats = statSync(filePath);
        
        if (stats.mtime < sevenDaysAgo) {
          unlinkSync(filePath);
          console.log(`🗑️ REMOVED OLD BACKUP: ${backupFile}`);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up old backups:', error);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<any> {
    const stats: any = {
      totalFiles: 0,
      totalSizeMB: 0,
      fileStats: {}
    };

    for (const filename of Object.keys(this.cleanupConfigs)) {
      const filePath = join(this.dataPath, filename);
      
      if (existsSync(filePath)) {
        const fileStats = statSync(filePath);
        const sizeMB = fileStats.size / (1024 * 1024);
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        
        stats.totalFiles++;
        stats.totalSizeMB += sizeMB;
        stats.fileStats[filename] = {
          sizeMB: Math.round(sizeMB * 100) / 100,
          recordCount: Array.isArray(data) ? data.length : 'N/A',
          lastModified: fileStats.mtime
        };
      }
    }

    stats.totalSizeMB = Math.round(stats.totalSizeMB * 100) / 100;
    return stats;
  }
}

// Export singleton instance
export const jsonCleanup = new JsonCleanupManager();