#!/usr/bin/env node

/**
 * Creates force clean deployment markers to prevent Replit deployment cache issues
 * Usage: node create-force-clean-marker.js [description]
 */

const fs = require('fs');
const path = require('path');

const timestamp = Date.now();
const version = `v1.0.${timestamp}`;
const description = process.argv[2] || 'force-clean-deployment';

const markerContent = `FORCE_CLEAN_DEPLOYMENT_${timestamp}
Generated: ${new Date().toISOString()}
Description: ${description}
Purpose: Prevent Replit from packaging cached/inconsistent code snapshots
`;

const filename = `FORCE_CLEAN_DEPLOYMENT_${version}.txt`;

try {
  fs.writeFileSync(filename, markerContent);
  console.log(`✅ Created force clean marker: ${filename}`);
  console.log(`📋 Content:\n${markerContent}`);
} catch (error) {
  console.error(`❌ Failed to create marker: ${error.message}`);
  process.exit(1);
}