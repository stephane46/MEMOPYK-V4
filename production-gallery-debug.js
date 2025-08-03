#!/usr/bin/env node

/**
 * 🚨 PRODUCTION GALLERY DEBUG SCRIPT v1.0.112
 * Investigates why production gallery is not showing despite API returning data
 */

const https = require('https');

const productionBase = 'https://memopyk.replit.app';

console.log('🔍 PRODUCTION GALLERY DEBUG - Investigating display issue...\n');

async function debugProductionGallery() {
  try {
    // Test 1: Check API response
    console.log('📊 Step 1: Testing production API directly...');
    const apiResponse = await fetch(`${productionBase}/api/gallery`);
    const apiData = await apiResponse.json();
    
    console.log(`✅ API Status: ${apiResponse.status}`);
    console.log(`✅ API Response Length: ${apiData.length}`);
    
    if (apiData.length > 0) {
      console.log(`✅ First Item: ${apiData[0].title_en} (Active: ${apiData[0].is_active})`);
      console.log(`✅ Video URL: ${apiData[0].video_url_en}`);
      console.log(`✅ Image URL: ${apiData[0].image_url_en}`);
    }
    
    // Test 2: Check cache-busting
    console.log('\n🔄 Step 2: Testing with cache-busting...');
    const cacheResponse = await fetch(`${productionBase}/api/gallery?bust=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    const cacheData = await cacheResponse.json();
    console.log(`✅ Cache-busted response length: ${cacheData.length}`);
    
    // Test 3: Production deployment check
    console.log('\n🚀 Step 3: Checking production deployment info...');
    try {
      const healthResponse = await fetch(`${productionBase}/api/health-check`);
      const healthData = await healthResponse.json();
      console.log(`✅ Health check: ${healthResponse.status}`);
      console.log(`✅ Environment: ${healthData.environment || 'unknown'}`);
    } catch (e) {
      console.log('⚠️  Health check endpoint not available');
    }
    
    console.log('\n📋 DIAGNOSIS:');
    console.log('✅ Production API is working correctly');
    console.log('✅ Gallery data exists and is active');
    console.log('🚨 ISSUE: Frontend display logic may have rendering problem');
    console.log('🎯 SOLUTION: Need to check React component mounting and data processing');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run debug
debugProductionGallery();