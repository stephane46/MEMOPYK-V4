#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function copyVideo(sourceFilename, targetFilename) {
  try {
    console.log(`📋 Copying ${sourceFilename} → ${targetFilename}...`);
    
    // Download the source video
    const { data: sourceData, error: downloadError } = await supabase.storage
      .from('memopyk-videos')
      .download(sourceFilename);
    
    if (downloadError) {
      console.error(`❌ Failed to download ${sourceFilename}:`, downloadError.message);
      return false;
    }
    
    console.log(`✅ Downloaded ${sourceFilename} (${sourceData.size} bytes)`);
    
    // Upload as new filename
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memopyk-videos')
      .upload(targetFilename, sourceData, {
        contentType: 'video/mp4',
        upsert: true // Allow overwrite if exists
      });
    
    if (uploadError) {
      console.error(`❌ Failed to upload ${targetFilename}:`, uploadError.message);
      return false;
    }
    
    console.log(`✅ Successfully copied ${sourceFilename} → ${targetFilename}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error copying ${sourceFilename} → ${targetFilename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting video copy process...');
  
  const copyTasks = [
    { source: 'VideoHero1.mp4', target: 'G1.mp4' },
    { source: 'VideoHero2.mp4', target: 'G2.mp4' },
    { source: 'VideoHero3.mp4', target: 'G3.mp4' }
  ];
  
  const results = [];
  
  for (const task of copyTasks) {
    const success = await copyVideo(task.source, task.target);
    results.push({ ...task, success });
  }
  
  console.log('\n📊 Copy Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.source} → ${result.target}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Successfully copied ${successCount}/${results.length} videos`);
  
  if (successCount === results.length) {
    console.log('🎉 All videos copied successfully! Ready to update gallery.');
  } else {
    console.log('⚠️ Some videos failed to copy. Check errors above.');
  }
}

main().catch(console.error);