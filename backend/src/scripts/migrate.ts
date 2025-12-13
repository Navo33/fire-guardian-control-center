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
      name: '002_add_ticket_number_trigger',
      description: 'Add automatic ticket number generation trigger (legacy - now in schema.sql)',
      up: async () => {
        // Check if the trigger already exists (it should be in schema.sql now)
        const triggerCheck = await pool.query(`
          SELECT 1 FROM information_schema.triggers 
          WHERE trigger_name = 'auto_generate_ticket_number' 
          AND event_object_table = 'maintenance_ticket'
        `);
        
        if (triggerCheck.rows.length > 0) {
          console.log('✅ Ticket number trigger already exists (from schema.sql)');
        } else {
          console.log('📝 Creating ticket number generation function...');
          
          // Create the function to generate ticket numbers
          await pool.query(`
            CREATE OR REPLACE FUNCTION generate_ticket_number()
            RETURNS TRIGGER AS $$
            DECLARE
                date_str TEXT;
                daily_count INTEGER;
                ticket_num TEXT;
            BEGIN
                -- Get current date in YYYYMMDD format
                date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
                
                -- Get the count of tickets created today + 1
                SELECT COALESCE(MAX(
                    CASE 
                        WHEN ticket_number LIKE 'TKT-' || date_str || '-%' 
                        THEN CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)
                        ELSE 0
                    END
                ), 0) + 1
                INTO daily_count
                FROM maintenance_ticket
                WHERE DATE(created_at) = CURRENT_DATE;
                
                -- Generate ticket number
                ticket_num := 'TKT-' || date_str || '-' || LPAD(daily_count::TEXT, 3, '0');
                
                -- Ensure uniqueness (in case of race condition)
                WHILE EXISTS (SELECT 1 FROM maintenance_ticket WHERE ticket_number = ticket_num) LOOP
                    daily_count := daily_count + 1;
                    ticket_num := 'TKT-' || date_str || '-' || LPAD(daily_count::TEXT, 3, '0');
                END LOOP;
                
                -- Set the ticket number
                NEW.ticket_number := ticket_num;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
          `);
          
          console.log('📝 Creating ticket number trigger...');
          
          // Create the trigger
          await pool.query(`
            CREATE TRIGGER auto_generate_ticket_number
                BEFORE INSERT ON maintenance_ticket
                FOR EACH ROW
                WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
                EXECUTE FUNCTION generate_ticket_number();
          `);
        }
        
        console.log('📝 Updating existing records with proper ticket numbers...');
        
        // Update existing records that might have empty ticket numbers
        await pool.query(`
          UPDATE maintenance_ticket 
          SET ticket_number = 'TKT-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(id::TEXT, 3, '0')
          WHERE ticket_number IS NULL OR ticket_number = ''
        `);
        
        console.log('📝 Ensuring sequence synchronization...');
        
        // Reset the sequence to be in sync with the current max ID
        await pool.query(`
          SELECT setval(
            'maintenance_ticket_id_seq', 
            COALESCE((SELECT MAX(id) FROM maintenance_ticket), 0) + 1, 
            false
          )
        `);
        
        console.log('✅ Ticket number trigger system ready');
      }
    },
    {
      name: '003_fix_sequence_sync',
      description: 'Fix maintenance_ticket_id_seq synchronization with existing data',
      up: async () => {
        console.log('📝 Synchronizing maintenance_ticket_id_seq with existing data...');
        
        // Reset the sequence to be in sync with the current max ID
        const result = await pool.query(`
          SELECT setval(
            'maintenance_ticket_id_seq', 
            COALESCE((SELECT MAX(id) FROM maintenance_ticket), 0) + 1, 
            false
          )
        `);
        
        const newSeqValue = result.rows[0].setval;
        console.log(`✅ Sequence reset to: ${newSeqValue}`);
      }
    },
    {
      name: '004_enhanced_maintenance_system',
      description: 'Enhanced maintenance system with automatic ticket creation and equipment date updates',
      up: async () => {
        console.log('🔧 Implementing enhanced maintenance system...');
        
        // Drop existing trigger and function
        console.log('📝 Dropping existing compliance trigger...');
        await pool.query('DROP TRIGGER IF EXISTS trigger_notify_compliance ON public.equipment_instance');
        await pool.query('DROP FUNCTION IF EXISTS create_notification()');
        
        // Enhanced function that creates notifications and maintenance tickets
        console.log('📝 Creating enhanced compliance function...');
        await pool.query(`
          CREATE OR REPLACE FUNCTION create_maintenance_notification_and_ticket()
          RETURNS TRIGGER AS $$
          BEGIN
              -- Create notification (existing logic)
              IF NEW.compliance_status IN ('expired', 'overdue', 'due_soon') THEN
                  INSERT INTO public.notification (user_id, title, message, type, priority, category, created_at)
                  SELECT 
                      v.user_id,
                      CASE NEW.compliance_status
                          WHEN 'expired' THEN 'Equipment Expired'
                          WHEN 'overdue' THEN 'Maintenance Overdue'
                          ELSE 'Maintenance Due Soon'
                      END,
                      'Equipment ' || NEW.serial_number || ' is ' || NEW.compliance_status || '. Action required by ' || COALESCE(NEW.next_maintenance_date::text, NEW.expiry_date::text),
                      'alert',
                      CASE NEW.compliance_status WHEN 'expired' THEN 'high' ELSE 'normal' END,
                      'equipment',
                      CURRENT_TIMESTAMP
                  FROM public.vendors v
                  WHERE v.id = NEW.vendor_id;
                  
                  -- Auto-create maintenance ticket for overdue equipment (NEW LOGIC)
                  IF NEW.compliance_status = 'overdue' AND NOT EXISTS (
                      SELECT 1 FROM maintenance_ticket 
                      WHERE equipment_instance_id = NEW.id 
                        AND ticket_status IN ('open', 'resolved')
                        AND support_type = 'maintenance'
                  ) THEN
                      -- Get equipment details for ticket description
                      INSERT INTO maintenance_ticket (
                          equipment_instance_id, 
                          client_id, 
                          vendor_id,
                          ticket_status, 
                          support_type, 
                          priority,
                          issue_description, 
                          category
                      )
                      SELECT 
                          NEW.id,
                          NEW.assigned_to,
                          NEW.vendor_id,
                          'open',
                          'maintenance',
                          'normal',
                          'Automated maintenance ticket for overdue equipment.' || E'\\n' ||
                          'Equipment: ' || e.equipment_name || ' (' || e.equipment_type || ')' || E'\\n' ||
                          'Serial Number: ' || NEW.serial_number || E'\\n' ||
                          'Last Maintenance Due: ' || COALESCE(NEW.next_maintenance_date::text, 'Not scheduled') || E'\\n' ||
                          'Client: ' || COALESCE(c.company_name, 'Unassigned') || E'\\n' || E'\\n' ||
                          'This ticket was automatically created by the system when equipment became overdue for maintenance.',
                          'Scheduled Maintenance'
                      FROM public.equipment e
                      LEFT JOIN public.clients c ON NEW.assigned_to = c.id
                      WHERE e.id = NEW.equipment_id;
                  END IF;
              END IF;
              RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);
        
        // Create the enhanced trigger
        console.log('📝 Creating enhanced compliance trigger...');
        await pool.query(`
          CREATE TRIGGER trigger_notify_compliance_and_create_tickets
              AFTER INSERT OR UPDATE OF compliance_status ON public.equipment_instance
              FOR EACH ROW
              EXECUTE FUNCTION create_maintenance_notification_and_ticket();
        `);
        
        // Data validation and fixes
        console.log('📝 Validating equipment maintenance intervals...');
        await pool.query(`
          UPDATE equipment_instance 
          SET maintenance_interval_days = 365 
          WHERE maintenance_interval_days IS NULL
        `);
        
        console.log('📝 Setting next maintenance dates for equipment without them...');
        await pool.query(`
          UPDATE equipment_instance 
          SET next_maintenance_date = COALESCE(
              last_maintenance_date + INTERVAL '1 day' * maintenance_interval_days,
              created_at::date + INTERVAL '1 day' * maintenance_interval_days
          )
          WHERE next_maintenance_date IS NULL
        `);
        
        // Verify implementation
        console.log('📋 Verifying enhanced maintenance system...');
        const verificationResult = await pool.query(`
          SELECT 
              (SELECT COUNT(*) FROM equipment_instance WHERE maintenance_interval_days IS NULL) as null_intervals,
              (SELECT COUNT(*) FROM equipment_instance WHERE next_maintenance_date IS NULL) as null_dates,
              (SELECT COUNT(*) FROM equipment_instance WHERE compliance_status = 'overdue') as overdue_count,
              (SELECT EXISTS (
                  SELECT 1 FROM pg_trigger 
                  WHERE tgname = 'trigger_notify_compliance_and_create_tickets'
              )) as trigger_exists
        `);
        
        const stats = verificationResult.rows[0];
        console.log(`✅ Enhanced maintenance system implemented successfully:`);
        console.log(`   - Trigger exists: ${stats.trigger_exists}`);
        console.log(`   - Equipment without intervals: ${stats.null_intervals}`);
        console.log(`   - Equipment without next maintenance dates: ${stats.null_dates}`);
        console.log(`   - Overdue equipment (will get auto-tickets): ${stats.overdue_count}`);
        
        if (stats.overdue_count > 0) {
          console.log(`🎫 Note: ${stats.overdue_count} overdue equipment items will get automatic maintenance tickets when compliance status updates.`);
        }
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
