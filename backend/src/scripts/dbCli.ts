#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeDatabase, resetDatabase, isDatabaseInitialized } from './initDatabase';
#!/usr/bin/env node

/**
 * Database Management CLI
 * Provides easy commands to initialize, reset, and manage the database
 */

import { initializeDatabase, resetDatabase, isDatabaseInitialized } from './initDatabase';
import { closePool } from '../config/database';

const command = process.argv[2];

const showHelp = () => {
  console.log(`
🔥 Fire Guardian Database Management CLI

Usage: npm run db <command>

Commands:
  init     Initialize database with schema and seed data
  reset    Drop all tables and recreate with fresh data
  check    Check if database is initialized
  help     Show this help message

Examples:
  npm run db init
  npm run db reset
  npm run db check
  
Features:
  ✅ Complete database schema with vendor tables
  ✅ Security triggers for account locking
  ✅ Audit logging for all changes
  ✅ Comprehensive mock data including:
     - Admin user (admin@fireguardian.com | FireGuardian2024!)
     - 3 Mock vendors with detailed company info
     - 5 Mock clients
     - Fire safety equipment catalog
  ✅ Database indexes for performance
  ✅ Auto-unlock accounts after 30 minutes
  ✅ Password attempt tracking
  
🔑 Default Login Credentials:
   Admin: admin@fireguardian.com | FireGuardian2024!
   Vendors: VendorPass123! (see reset output for emails)
   Clients: ClientPass123! (see reset output for emails)
`);
};

const runCommand = async () => {
  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing database...');
        await initializeDatabase();
        break;

      case 'reset':
        console.log('⚠️  This will DELETE ALL DATA and recreate the database!');
        console.log('🔄 Resetting database in 3 seconds... (Ctrl+C to cancel)');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        await resetDatabase();
        break;

      case 'check':
        const isInitialized = await isDatabaseInitialized();
        if (isInitialized) {
          console.log('✅ Database is initialized and ready');
        } else {
          console.log('❌ Database is not initialized. Run: npm run db init');
        }
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.log('❌ Unknown command:', command);
        showHelp();
        process.exit(1);
    }

    await closePool();
    console.log('🎉 Operation completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    await closePool();
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runCommand();
}

// Load environment variables
dotenv.config();

const command = process.argv[2];

const showHelp = () => {
  console.log(`
🔥 Fire Guardian Database CLI

Usage: npm run db <command>

Commands:
  init     Initialize database with schema and seed data
  reset    Drop all tables and reinitialize (WARNING: destroys all data)
  status   Check database connection and initialization status
  help     Show this help message

Examples:
  npm run db init
  npm run db reset
  npm run db status
  `);
};

const checkStatus = async () => {
  try {
    console.log('🔄 Checking database status...');
    
    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log('❌ Database connection failed');
      return;
    }

    // Check initialization
    const isInitialized = await isDatabaseInitialized();
    
    console.log('📊 Database Status:');
    console.log(`   Connection: ✅ Connected`);
    console.log(`   Initialized: ${isInitialized ? '✅ Yes' : '❌ No'}`);
    
    if (isInitialized) {
      console.log('✅ Database is ready for use');
    } else {
      console.log('⚠️  Database needs initialization. Run: npm run db init');
    }

  } catch (error) {
    console.error('❌ Error checking database status:', error);
  }
};

const main = async () => {
  try {
    switch (command) {
      case 'init':
        await initializeDatabase();
        break;
        
      case 'reset':
        console.log('⚠️  WARNING: This will destroy all data in the database!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        await resetDatabase();
        break;
        
      case 'status':
        await checkStatus();
        break;
        
      case 'help':
      case '-h':
      case '--help':
        showHelp();
        break;
        
      default:
        console.log('❌ Unknown command:', command);
        showHelp();
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  } finally {
    await closePool();
    process.exit(0);
  }
};

// Run the CLI
main();