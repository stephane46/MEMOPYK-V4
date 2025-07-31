#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupOldBucket() {
  console.log('🧹 Starting cleanup of memopyk-gallery bucket...');

  try {
    // List all files in the old bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from('memopyk-gallery')
      .list('', { limit: 1000 });

    if (listError) {
      console.log('✅ Bucket memopyk-gallery already removed or empty:', listError.message);
      return;
    }

    if (files && files.length > 0) {
      console.log(`📁 Found ${files.length} files in memopyk-gallery bucket:`);
      files.forEach(file => console.log(`   - ${file.name}`));

      // Delete all files
      const filePaths = files.map(file => file.name);
      const { error: deleteError } = await supabase
        .storage
        .from('memopyk-gallery')
        .remove(filePaths);

      if (deleteError) {
        console.error('❌ Error deleting files:', deleteError);
        return;
      }

      console.log(`✅ Deleted ${filePaths.length} files from memopyk-gallery`);
    }

    // Now delete the empty bucket
    const { error: bucketError } = await supabase
      .storage
      .deleteBucket('memopyk-gallery');

    if (bucketError) {
      console.error('❌ Error deleting bucket:', bucketError);
      return;
    }

    console.log('✅ Successfully deleted memopyk-gallery bucket');

    // Verify cleanup
    const { data: buckets } = await supabase.storage.listBuckets();
    const remainingBuckets = buckets?.map(b => b.name) || [];
    console.log('📋 Remaining buckets:', remainingBuckets);

    if (remainingBuckets.includes('memopyk-gallery')) {
      console.log('⚠️ memopyk-gallery bucket still exists');
    } else {
      console.log('✅ memopyk-gallery bucket successfully removed');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupOldBucket();