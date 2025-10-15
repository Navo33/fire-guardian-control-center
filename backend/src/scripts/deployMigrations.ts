#!/usr/bin/env node

/**
 * Database deployment migration script
 * This script handles database migrations during deployment
 */

import { runMigrations, checkDeploymentReadiness, createPreDeploymentBackup } from './initDatabase';
import { pool } from '../config/database';

const runDeploymentMigrations = async (): Promise<void> => {
  let backupName: string | null = null;
  
  try {
    console.log('🚀 Starting database deployment migrations...');
    console.log('📅 Deployment time:', new Date().toISOString());
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    
    // Check current database state
    console.log('\n📊 Checking deployment readiness...');
    const readiness = await checkDeploymentReadiness();
    
    console.log(`📈 Current migration count: ${readiness.migrationCount}`);
    console.log(`📋 Pending migrations: ${readiness.pendingMigrations.length}`);
    
    if (readiness.lastMigration) {
      console.log(`🏷️  Last applied migration: ${readiness.lastMigration}`);
    }
    
    if (readiness.isReady) {
      console.log('✅ Database is already up to date!');
      return;
    }

    console.log('\n📋 Pending migrations:');
    readiness.pendingMigrations.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration}`);
    });

    // Create backup before applying migrations
    if (readiness.migrationCount > 0) {
      console.log('\n💾 Creating pre-deployment backup...');
      backupName = await createPreDeploymentBackup();
    }

    // Apply migrations
    console.log('\n🔄 Applying migrations...');
    await runMigrations();

    // Verify final state
    console.log('\n🔍 Verifying deployment...');
    const finalState = await checkDeploymentReadiness();
    
    if (finalState.isReady) {
      console.log('✅ Deployment completed successfully!');
      console.log(`📈 Total migrations applied: ${finalState.migrationCount}`);
      if (finalState.lastMigration) {
        console.log(`🏷️  Latest migration: ${finalState.lastMigration}`);
      }
    } else {
      throw new Error(`Deployment verification failed. Pending migrations: ${finalState.pendingMigrations.join(', ')}`);
    }

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    
    if (backupName) {
      console.error(`💾 Backup available: ${backupName}`);
      console.error('📝 Consider restoring from backup if needed');
    }
    
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
};

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'check':
    // Check deployment readiness without applying migrations
    checkDeploymentReadiness()
      .then(async (readiness) => {
        console.log('📊 Database Deployment Readiness Report');
        console.log('=====================================');
        console.log(`Status: ${readiness.isReady ? '✅ Ready' : '⚠️  Migrations needed'}`);
        console.log(`Applied migrations: ${readiness.migrationCount}`);
        console.log(`Pending migrations: ${readiness.pendingMigrations.length}`);
        
        if (readiness.lastMigration) {
          console.log(`Last migration: ${readiness.lastMigration}`);
        }
        
        if (readiness.pendingMigrations.length > 0) {
          console.log('\nPending migrations:');
          readiness.pendingMigrations.forEach((migration, index) => {
            console.log(`  ${index + 1}. ${migration}`);
          });
        }
        
        await pool.end();
        process.exit(readiness.isReady ? 0 : 1);
      })
      .catch(async (error) => {
        console.error('❌ Error checking deployment readiness:', error);
        await pool.end();
        process.exit(1);
      });
    break;

  case 'backup':
    // Create backup only
    createPreDeploymentBackup()
      .then(async (backupName) => {
        console.log(`✅ Backup created: ${backupName}`);
        await pool.end();
        process.exit(0);
      })
      .catch(async (error) => {
        console.error('❌ Error creating backup:', error);
        await pool.end();
        process.exit(1);
      });
    break;

  case 'migrate':
  case undefined:
    // Default: run full migration process
    runDeploymentMigrations();
    break;

  default:
    console.log('🔧 Fire Guardian Database Deployment Tool');
    console.log('==========================================');
    console.log('');
    console.log('Usage:');
    console.log('  npm run db:deploy           Run full deployment migrations');
    console.log('  npm run db:deploy check     Check deployment readiness');
    console.log('  npm run db:deploy migrate   Run migrations');
    console.log('  npm run db:deploy backup    Create backup only');
    console.log('');
    console.log('Environment Variables:');
    console.log('  DATABASE_URL                Database connection string');
    console.log('  NODE_ENV                    Environment (development/production)');
    console.log('');
    process.exit(0);
}