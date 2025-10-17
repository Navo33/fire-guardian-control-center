/**
 * Database Migration Runner
 * Handles applying and tracking database migrations
 */

import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  name: string;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

/**
 * Ensure migration table exists with correct structure
 */
export const ensureMigrationTable = async (): Promise<void> => {
  // Check if old migration table exists
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'schema_migrations'
    ) as exists
  `);

  const tableExists = tableCheck.rows[0].exists;

  if (tableExists) {
    // Check if table has correct structure
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schema_migrations'
      ORDER BY ordinal_position
    `);

    const columns = columnCheck.rows.map((r: any) => r.column_name);
    const expectedColumns = ['id', 'migration_name', 'executed_at', 'execution_time_ms', 'success'];
    const hasCorrectStructure = expectedColumns.every(col => columns.includes(col));

    if (!hasCorrectStructure) {
      console.log('⚠️  Old schema_migrations table found, backing up and recreating...');
      
      // Backup old migration records
      const oldRecords = await pool.query('SELECT * FROM schema_migrations');
      
      // Drop old table
      await pool.query('DROP TABLE schema_migrations');
      
      // Create new table
      await pool.query(`
        CREATE TABLE schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          execution_time_ms INT,
          success BOOLEAN DEFAULT TRUE
        )
      `);

      // Restore migration records
      for (const record of oldRecords.rows) {
        await pool.query(
          `INSERT INTO schema_migrations (migration_name, executed_at, execution_time_ms, success) 
           VALUES ($1, COALESCE($2, CURRENT_TIMESTAMP), $3, TRUE)
           ON CONFLICT (migration_name) DO NOTHING`,
          [record.migration_name, record.executed_at, record.execution_time_ms]
        );
      }

      console.log('✅ Migration table updated');
    }
  } else {
    // Create new table
    await pool.query(`
      CREATE TABLE schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INT,
        success BOOLEAN DEFAULT TRUE
      )
    `);
  }
};

/**
 * Check if a migration has been applied
 */
export const isMigrationApplied = async (migrationName: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT * FROM schema_migrations WHERE migration_name = $1 AND success = TRUE',
    [migrationName]
  );
  return result.rows.length > 0;
};

/**
 * Record a migration
 */
export const recordMigration = async (
  migrationName: string,
  executionTime: number,
  success: boolean = true
): Promise<void> => {
  await pool.query(
    `INSERT INTO schema_migrations (migration_name, execution_time_ms, success) 
     VALUES ($1, $2, $3)
     ON CONFLICT (migration_name) DO UPDATE 
     SET executed_at = CURRENT_TIMESTAMP, execution_time_ms = $2, success = $3`,
    [migrationName, executionTime, success]
  );
};

/**
 * Apply initial schema from schema.sql file
 */
export const applyInitialSchema = async (): Promise<void> => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  
  console.log('📝 Applying schema.sql...');
  await pool.query(schemaSql);
  console.log('✅ Schema applied successfully');
};

/**
 * Run all pending migrations
 */
export const runMigrations = async (): Promise<void> => {
  console.log('🔄 Checking for pending migrations...');
  
  await ensureMigrationTable();
  
  const migrations: Migration[] = [
    {
      name: '001_initial_schema',
      description: 'Apply initial database schema from schema.sql',
      up: async () => {
        await applyInitialSchema();
      }
    },
    {
      name: '002_add_profile_security_tracking',
      description: 'Add profile and security tracking columns (last_password_change, phone, avatar_url, bio) and system_settings/user_sessions tables',
      up: async () => {
        const migrationPath = path.join(__dirname, 'migrations', '002_add_profile_security_tracking.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        await pool.query(migrationSql);
        console.log('✅ Added profile and security tracking columns');
      }
    }
  ];

  let appliedCount = 0;
  
  for (const migration of migrations) {
    const isApplied = await isMigrationApplied(migration.name);
    
    if (isApplied) {
      console.log(`⏭️  Skipping ${migration.name} (already applied)`);
      continue;
    }

    console.log(`🔄 Applying ${migration.name}: ${migration.description}`);
    const startTime = Date.now();
    
    try {
      await migration.up();
      const executionTime = Date.now() - startTime;
      await recordMigration(migration.name, executionTime, true);
      console.log(`✅ ${migration.name} applied successfully (${executionTime}ms)`);
      appliedCount++;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await recordMigration(migration.name, executionTime, false);
      console.error(`❌ Failed to apply ${migration.name}:`, error);
      throw error;
    }
  }

  if (appliedCount === 0) {
    console.log('✅ No pending migrations');
  } else {
    console.log(`✅ Applied ${appliedCount} migration(s)`);
  }
};

/**
 * Get migration status
 */
export const getMigrationStatus = async (): Promise<{
  applied: string[];
  pending: string[];
  failed: string[];
}> => {
  await ensureMigrationTable();
  
  const result = await pool.query(`
    SELECT migration_name, success, executed_at 
    FROM schema_migrations 
    ORDER BY executed_at DESC
  `);
  
  const applied = result.rows.filter(r => r.success).map(r => r.migration_name);
  const failed = result.rows.filter(r => !r.success).map(r => r.migration_name);
  
  return {
    applied,
    pending: [], // Would need to scan migration files to determine pending
    failed
  };
};

/**
 * Reset all migrations (dangerous - drops all tables)
 */
export const resetMigrations = async (): Promise<void> => {
  console.log('⚠️  WARNING: Dropping all tables...');
  
  try {
    // Try to drop schema (preferred method if permissions allow)
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
  } catch (error: any) {
    if (error.code === '42501') {
      // No permission to drop schema, drop tables individually
      console.log('ℹ️  Dropping tables individually...');
      
      // Get all tables
      const result = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      
      // Drop each table
      for (const row of result.rows) {
        await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        console.log(`  Dropped ${row.tablename}`);
      }
    } else {
      throw error;
    }
  }
  
  console.log('✅ All tables dropped');
  await ensureMigrationTable();
  console.log('✅ Migration table recreated');
};
