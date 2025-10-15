#!/usr/bin/env node

/**
 * Database Management CLI
 * Provides easy commands to initialize, reset, and manage the database
 */

import dotenv from 'dotenv';
import { initializeDatabase, resetDatabase, isDatabaseInitialized } from './initDatabase';
import { closePool, testConnection } from '../config/database';

// Load environment variables
dotenv.config();

const command = process.argv[2];

const showHelp = () => {
  console.log(`
🔥 Fire Guardian Database Management CLI

Usage: npm run db <command>

Commands:
  init     Initialize database with schema and seed data
  reset    Drop all tables and recreate with fresh data
  status   Check database connection and initialization status
  help     Show this help message

Examples:
  npm run db init
  npm run db reset
  npm run db status
  
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
    console.error('❌ Error checking database status:', error instanceof Error ? error.message : error);
  }
};

const runCommand = async () => {
  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing database...');
        await initializeDatabase();
        console.log('✅ Database initialized successfully!');
        break;
        
      case 'reset':
        console.log('⚠️  Resetting database (this will destroy all existing data)...');
        await resetDatabase();
        console.log('✅ Database reset completed successfully!');
        break;
        
      case 'status':
      case 'check':
        await checkStatus();
        break;
        
      case 'help':
      case undefined:
        showHelp();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await closePool();
    process.exit(0);
  }
};

// Run the command if this script is executed directly
if (require.main === module) {
  runCommand();
}