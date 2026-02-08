#!/usr/bin/env node

/**
 * Order Automation Runner
 * 
 * This script runs order automation tasks. It can be:
 * 1. Called directly: node scripts/run-automation.js
 * 2. Scheduled via cron: */15 * * * * cd /path/to/backend && node scripts/run-automation.js
 * 3. Called via API endpoint (for hosted environments like Render)
 * 
 * Options:
 *   --dry-run     Show what would be done without making changes
 *   --verbose     Show detailed output
 */

require('dotenv').config();

const { runAutomation } = require('../src/services/orderAutomation');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  console.log('='.repeat(60));
  console.log('Order Automation Runner');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('='.repeat(60));
  
  try {
    const results = await runAutomation({ dryRun });
    
    // Summary
    console.log('\n--- SUMMARY ---');
    console.log(`Auto-cancel stale NEW orders: ${results.autoCancelNewOrders?.canceled || 0}/${results.autoCancelNewOrders?.total || 0}`);
    console.log(`Stuck PENDING orders (need attention): ${results.stuckPendingOrders?.total || 0}`);
    console.log(`Duration: ${results.duration}ms`);
    
    // Verbose output
    if (verbose) {
      console.log('\n--- DETAILS ---');
      console.log(JSON.stringify(results, null, 2));
    }
    
    // Exit with appropriate code
    if (results.error) {
      console.error('\nAutomation completed with errors');
      process.exit(1);
    }
    
    console.log('\nAutomation completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
