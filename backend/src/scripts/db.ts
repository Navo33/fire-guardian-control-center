#!/usr/bin/env node

/**
 * Fire Guardian Database CLI
 * Main command-line interface for database operations
 */

import dotenv from 'dotenv';
import { pool, closePool } from '../config/database';
import { runMigrations, resetMigrations, getMigrationStatus } from './migrate';
import { seedAll } from './seed';

// Load environment variables
dotenv.config();

const command = process.argv[2];
const options = process.argv.slice(3);

const showHelp = () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         🔥 Fire Guardian Database Management CLI             ║
╚══════════════════════════════════════════════════════════════╝

Usage: npm run db <command> [options]

Commands:
  migrate       Run pending database migrations
  seed          Seed database with initial data
  reset         Drop all tables and recreate (DANGEROUS!)
  init          Initialize database (migrate + seed)
  status        Show migration status
  help          Show this help message

Examples:
  npm run db init          # First time setup
  npm run db migrate       # Apply pending migrations
  npm run db seed          # Seed initial data
  npm run db reset         # Reset everything (dev only)
  npm run db status        # Check migration status

Features:
  ✅ Schema-driven migrations (uses schema.sql)
  ✅ Migration tracking (no duplicate runs)
  ✅ Seed data management
  ✅ Safe mid-development updates
  ✅ Comprehensive mock data:
     - Admin user
     - 3 Mock vendors with specializations
     - 3 Mock clients (owned by vendors)
     - Fire safety equipment catalog
     - Equipment instances and assignments
     - Maintenance tickets
  
🔑 Default Credentials:
   Admin:  admin@fireguardian.com | FireGuardian2024!
   Vendor: lakmal@safefire.lk      | VendorPass2025!
   Client: kasun@royalhotels.lk    | ClientPass2025!

Database: ${process.env.DB_NAME || 'Not configured'}
Host:     ${process.env.DB_HOST || 'Not configured'}
`);
};

const runCommand = async () => {
  try {
    console.log('\n🔥 Fire Guardian Database CLI\n');

    switch (command) {
      case 'migrate':
        await runMigrations();
        break;

      case 'seed':
        await seedAll();
        break;

      case 'reset':
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ Cannot reset database in production!');
          process.exit(1);
        }
        console.log('⚠️  WARNING: This will delete ALL data!');
        console.log('⚠️  Press Ctrl+C now to cancel...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await resetMigrations();
        await runMigrations();
        await seedAll();
        console.log('\n✅ Database reset complete!');
        break;

      case 'init':
        console.log('🚀 Initializing database...\n');
        await runMigrations();
        await seedAll();
        console.log('\n✅ Database initialization complete!');
        console.log('\n🎉 You can now start the application');
        break;

      case 'status':
        const status = await getMigrationStatus();
        console.log('\n📊 Migration Status:');
        console.log(`\nApplied (${status.applied.length}):`);
        status.applied.forEach(m => console.log(`  ✅ ${m}`));
        if (status.failed.length > 0) {
          console.log(`\nFailed (${status.failed.length}):`);
          status.failed.forEach(m => console.log(`  ❌ ${m}`));
        }
        console.log('');
        break;

      case 'help':
      default:
        showHelp();
        process.exit(command === 'help' ? 0 : 1);
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await closePool();
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('unhandledRejection', async (error) => {
  console.error('\n❌ Unhandled error:', error);
  await closePool();
  process.exit(1);
});

// Run the command
runCommand();
