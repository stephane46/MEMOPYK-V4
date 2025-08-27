import cron from 'node-cron';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🕐 GA4 Analytics Scheduler starting...');
console.log('⏰ Scheduled for 00:15 UTC daily');

// Schedule GA4 sync to run daily at 00:15 UTC
cron.schedule('15 0 * * *', () => {
  console.log('🚀 Starting GA4 → Supabase sync at', new Date().toISOString());
  
  const syncPath = join(__dirname, '..', 'scripts', 'ga4-sync-service.js');
  const child = spawn('node', [syncPath], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ GA4 sync completed successfully');
    } else {
      console.error(`❌ GA4 sync failed with code ${code}`);
    }
  });
  
  child.on('error', (error) => {
    console.error('❌ GA4 sync error:', error);
  });
}, {
  timezone: 'UTC'
});

console.log('✅ GA4 Analytics Scheduler active');