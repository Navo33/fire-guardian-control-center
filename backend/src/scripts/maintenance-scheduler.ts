#!/usr/bin/env node

/**
 * Maintenance Scheduler Service
 * Run this script manually or via cron to create automatic maintenance tickets
 * 
 * Usage:
 * - Manual: node maintenance-scheduler.js
 * - Cron: 0 6 * * * /usr/bin/node /path/to/maintenance-scheduler.js
 */

import { MaintenanceScheduler } from '../utils/MaintenanceScheduler';
import { DebugLogger } from '../utils/DebugLogger';

async function runMaintenanceScheduler() {
  try {
    console.log('='.repeat(60));
    console.log('Fire Guardian Maintenance Scheduler Started');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    // Run the scheduled tasks
    const results = await MaintenanceScheduler.runScheduledTasks();
    
    // Log results to console
    console.log('\n' + '='.repeat(60));
    console.log('MAINTENANCE SCHEDULER RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n📋 OVERDUE MAINTENANCE TICKETS:`);
    console.log(`   ✅ Created: ${results.overdue.created}`);
    console.log(`   ❌ Errors: ${results.overdue.errors.length}`);
    
    console.log(`\n🔮 PROACTIVE MAINTENANCE TICKETS:`);
    console.log(`   ✅ Created: ${results.proactive.created}`);
    console.log(`   ❌ Errors: ${results.proactive.errors.length}`);
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tickets Created: ${results.overdue.created + results.proactive.created}`);
    console.log(`   Total Errors: ${results.overdue.errors.length + results.proactive.errors.length}`);
    
    if (results.overdue.errors.length > 0 || results.proactive.errors.length > 0) {
      console.log(`\n❌ ERRORS ENCOUNTERED:`);
      [...results.overdue.errors, ...results.proactive.errors].forEach((error, index) => {
        console.log(`   ${index + 1}. Equipment ${error.serial_number}: ${error.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Fire Guardian Maintenance Scheduler Completed');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    // Exit with appropriate code
    process.exit(results.overdue.errors.length + results.proactive.errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR in Maintenance Scheduler:');
    console.error(error);
    DebugLogger.error('Fatal error in maintenance scheduler service', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Maintenance Scheduler interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Maintenance Scheduler terminated');
  process.exit(143);
});

// Run the scheduler
runMaintenanceScheduler();