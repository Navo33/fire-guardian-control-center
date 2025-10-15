import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize the database with schema and seed data
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database...');

    await checkDatabasePermissions();
    
    // Create migration tracking table first
    await createMigrationTable();
    
    // Apply all migrations including table creation
    await applyAllMigrations();
    
    console.log('✅ Database schema created successfully');

    await seedInitialData();
    console.log('✅ Database initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

/**
 * Create migration tracking table
 */
const createMigrationTable = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INT
      )
    `);
    console.log('✅ Migration tracking table ready');
  } catch (error) {
    console.error('❌ Error creating migration table:', error);
    throw error;
  }
};

/**
 * Check if a migration has been applied
 */
const isMigrationApplied = async (migrationName: string): Promise<boolean> => {
  try {
    const result = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
      [migrationName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking migration ${migrationName}:`, error);
    return false;
  }
};

/**
 * Record a successful migration
 */
const recordMigration = async (migrationName: string, executionTime: number): Promise<void> => {
  try {
    await pool.query(
      'INSERT INTO schema_migrations (migration_name, execution_time_ms) VALUES ($1, $2) ON CONFLICT (migration_name) DO NOTHING',
      [migrationName, executionTime]
    );
  } catch (error) {
    console.error(`Error recording migration ${migrationName}:`, error);
  }
};

/**
 * Apply all migrations in correct order
 */
const applyAllMigrations = async (): Promise<void> => {
  console.log('🔄 Applying database migrations...');
  
  const migrations = [
    {
      name: '001_create_initial_tables',
      description: 'Create all initial database tables',
      migration: async () => await createTablesInOrder()
    },
    {
      name: '002_schema_optimizations', 
      description: 'Apply schema optimizations for production',
      migration: async () => await applySchemaOptimizations()
    },
    {
      name: '003_create_indexes',
      description: 'Create performance indexes',
      migration: async () => await createIndexes()
    },
    {
      name: '004_create_triggers_functions',
      description: 'Create triggers and functions',
      migration: async () => await createTriggersAndFunctions()
    }
  ];

  for (const migration of migrations) {
    const startTime = Date.now();
    
    if (await isMigrationApplied(migration.name)) {
      console.log(`⚠️  Migration ${migration.name} already applied, skipping...`);
      continue;
    }

    try {
      console.log(`🔄 Applying migration: ${migration.name} - ${migration.description}`);
      await migration.migration();
      
      const executionTime = Date.now() - startTime;
      await recordMigration(migration.name, executionTime);
      
      console.log(`✅ Migration ${migration.name} completed in ${executionTime}ms`);
    } catch (error) {
      console.error(`❌ Migration ${migration.name} failed:`, error);
      throw error;
    }
  }

  console.log('✅ All migrations completed successfully');
};

/**
 * Create tables in the correct dependency order
 */
const createTablesInOrder = async (): Promise<void> => {
  const tableQueries = [
    // 1. Users table (no dependencies)
    `CREATE TABLE IF NOT EXISTS "user" (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      display_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
      email VARCHAR(320) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin','vendor','client')),
      role_id INT,
      is_locked BOOLEAN DEFAULT FALSE,
      locked_until TIMESTAMP NULL,
      failed_login_attempts SMALLINT DEFAULT 0,
      last_login TIMESTAMP NULL,
      last_login_ip INET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE NULL
    )`,

    // 2. Role table (no dependencies)
    `CREATE TABLE IF NOT EXISTS role (
      id SERIAL PRIMARY KEY,
      role_name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 3. Permission table (no dependencies)
    `CREATE TABLE IF NOT EXISTS permission (
      id SERIAL PRIMARY KEY,
      permission_name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      category VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 4. Role permission junction table (depends on role and permission)
    `CREATE TABLE IF NOT EXISTS role_permission (
      role_id INT REFERENCES role(id) ON DELETE CASCADE,
      permission_id INT REFERENCES permission(id) ON DELETE CASCADE,
      granted_by INT REFERENCES "user"(id),
      granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(role_id, permission_id)
    )`,

    // 5. Vendor company table (depends on user)
    `CREATE TABLE IF NOT EXISTS vendor_company (
      id SERIAL PRIMARY KEY,
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      company_name VARCHAR(500) NOT NULL,
      business_type VARCHAR(100) NOT NULL,
      license_number VARCHAR(200),
      tax_id VARCHAR(100),
      website VARCHAR(500),
      established_year SMALLINT,
      employee_count INT,
      annual_revenue DECIMAL(15,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 6. Vendor contact table (depends on user)
    `CREATE TABLE IF NOT EXISTS vendor_contact (
      id SERIAL PRIMARY KEY,
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      contact_person_name VARCHAR(200) NOT NULL,
      contact_title VARCHAR(150),
      primary_email VARCHAR(320) NOT NULL,
      primary_phone VARCHAR(50) NOT NULL,
      secondary_phone VARCHAR(50),
      fax VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 7. Vendor address table (depends on user)
    `CREATE TABLE IF NOT EXISTS vendor_address (
      id SERIAL PRIMARY KEY,
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      address_type VARCHAR(50) DEFAULT 'business' CHECK (address_type IN ('business','billing','shipping')),
      street_address TEXT NOT NULL,
      city VARCHAR(200) NOT NULL,
      state VARCHAR(200) NOT NULL,
      zip_code VARCHAR(50) NOT NULL,
      country VARCHAR(200) NOT NULL DEFAULT 'Sri Lanka',
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 8. Client company table (depends on user)
    `CREATE TABLE IF NOT EXISTS client_company (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      company_name VARCHAR(500) NOT NULL,
      business_type VARCHAR(100) NOT NULL,
      industry VARCHAR(100),
      tax_id VARCHAR(100),
      website VARCHAR(500),
      employee_count INT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 9. Client contact table (depends on user)
    `CREATE TABLE IF NOT EXISTS client_contact (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      contact_person_name VARCHAR(200) NOT NULL,
      contact_title VARCHAR(150),
      primary_email VARCHAR(320) NOT NULL,
      primary_phone VARCHAR(50) NOT NULL,
      secondary_phone VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 10. Client address table (depends on user)
    `CREATE TABLE IF NOT EXISTS client_address (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      address_type VARCHAR(50) DEFAULT 'business' CHECK (address_type IN ('business','billing','facility')),
      street_address TEXT NOT NULL,
      city VARCHAR(200) NOT NULL,
      state VARCHAR(200) NOT NULL,
      zip_code VARCHAR(50) NOT NULL,
      country VARCHAR(200) NOT NULL DEFAULT 'Sri Lanka',
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 11. Specialization table (no dependencies)
    `CREATE TABLE IF NOT EXISTS specialization (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) UNIQUE NOT NULL,
      description TEXT,
      category VARCHAR(100),
      certification_required BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 12. Vendor specializations junction table (depends on user and specialization)
    `CREATE TABLE IF NOT EXISTS vendor_specialization (
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      specialization_id INT REFERENCES specialization(id) ON DELETE CASCADE,
      certification_number VARCHAR(200),
      certification_expiry DATE,
      added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(vendor_id, specialization_id)
    )`,

    // 13. Equipment table (no dependencies)
    `CREATE TABLE IF NOT EXISTS equipment (
      id SERIAL PRIMARY KEY,
      equipment_code VARCHAR(100) UNIQUE,
      equipment_name VARCHAR(300) NOT NULL,
      description TEXT,
      equipment_type VARCHAR(100) NOT NULL,
      manufacturer VARCHAR(200),
      model VARCHAR(200),
      specifications JSONB,
      weight_kg DECIMAL(8,2),
      dimensions VARCHAR(100),
      warranty_years SMALLINT,
      price DECIMAL(12,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE NULL
    )`,

    // 14. Equipment instance table (depends on equipment, user)
    `CREATE TABLE IF NOT EXISTS equipment_instance (
      id SERIAL PRIMARY KEY,
      equipment_id INT REFERENCES equipment(id),
      serial_number VARCHAR(200) UNIQUE,
      asset_tag VARCHAR(100),
      vendor_id INT REFERENCES "user"(id),
      status VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','maintenance','out_of_service','retired')),
      condition_rating SMALLINT DEFAULT 5 CHECK (condition_rating BETWEEN 1 AND 5),
      assigned_to INT REFERENCES "user"(id) NULL,
      assigned_at TIMESTAMP WITH TIME ZONE NULL,
      purchase_date DATE,
      warranty_expiry DATE,
      expiry_date DATE,
      last_maintenance_date DATE,
      next_maintenance_date DATE,
      maintenance_interval_days INT DEFAULT 365,
      location TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE NULL
    )`,

    // 15. Equipment assignment table (depends on user)
    `CREATE TABLE IF NOT EXISTS equipment_assignment (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES "user"(id),
      vendor_id INT REFERENCES "user"(id),
      assignment_number VARCHAR(100) UNIQUE,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','completed','cancelled','expired')),
      priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
      notes TEXT,
      start_date DATE,
      end_date DATE,
      total_cost DECIMAL(12,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 16. Assignment item junction table (depends on equipment_assignment and equipment_instance)
    `CREATE TABLE IF NOT EXISTS assignment_item (
      assignment_id INT REFERENCES equipment_assignment(id) ON DELETE CASCADE,
      equipment_instance_id INT REFERENCES equipment_instance(id),
      quantity INT DEFAULT 1,
      unit_cost DECIMAL(10,2),
      total_cost DECIMAL(12,2),
      notes TEXT,
      PRIMARY KEY(assignment_id, equipment_instance_id)
    )`,

    // 17. Maintenance ticket table (depends on user, equipment_instance)
    `CREATE TABLE IF NOT EXISTS maintenance_ticket (
      id SERIAL PRIMARY KEY,
      ticket_number VARCHAR(100) UNIQUE,
      equipment_instance_id INT REFERENCES equipment_instance(id),
      client_id INT REFERENCES "user"(id),
      vendor_id INT REFERENCES "user"(id),
      assigned_technician INT REFERENCES "user"(id),
      ticket_status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (ticket_status IN ('open','assigned','in_progress','pending_parts','completed','cancelled','rejected')),
      issue_description TEXT NOT NULL,
      resolution_description TEXT,
      priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent','critical')),
      category VARCHAR(100),
      estimated_hours DECIMAL(5,2),
      actual_hours DECIMAL(5,2),
      cost DECIMAL(10,2),
      scheduled_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE NULL,
      closed_at TIMESTAMP WITH TIME ZONE NULL
    )`,

    // 18. Notification table (depends on user)
    `CREATE TABLE IF NOT EXISTS notification (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','warning','error','success','reminder')),
      priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
      category VARCHAR(100),
      is_read BOOLEAN DEFAULT FALSE,
      is_archived BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP WITH TIME ZONE NULL,
      action_url VARCHAR(1000),
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NULL
    )`,

    // 19. Audit log table (depends on user)
    `CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      table_name VARCHAR(100) NOT NULL,
      record_id JSONB NOT NULL,
      action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','IMPORT')),
      changes JSONB NULL,
      metadata JSONB NULL,
      ip_address INET,
      user_agent TEXT,
      session_id VARCHAR(200),
      changed_by INT REFERENCES "user"(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // 20. Password reset table (depends on user)
    `CREATE TABLE IF NOT EXISTS password_reset (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      reset_token VARCHAR(500) UNIQUE NOT NULL,
      ip_address INET,
      user_agent TEXT,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP WITH TIME ZONE NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (let i = 0; i < tableQueries.length; i++) {
    try {
      await pool.query(tableQueries[i]);
      console.log(`✅ Table ${i + 1}/${tableQueries.length} created successfully`);
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log(`⚠️  Table ${i + 1}/${tableQueries.length} already exists, skipping...`);
      } else {
        console.error(`❌ Error creating table ${i + 1}:`, error.message);
        throw error;
      }
    }
  }

  console.log('✅ Initial tables created');
};

/**
 * Apply schema optimizations for existing databases
 */
const applySchemaOptimizations = async (): Promise<void> => {
  console.log('🔄 Applying database migrations...');
  
  try {
    // Migration 1: Fix IP address column type
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'last_login_ip' 
            AND data_type = 'character varying'
          ) THEN
            ALTER TABLE "user" ALTER COLUMN last_login_ip TYPE INET USING last_login_ip::INET;
            RAISE NOTICE 'Migrated last_login_ip to INET type';
          END IF;
        END $$;
      `);
    } catch (e) {
      console.log('⚠️  Migration 1: IP address column already correct or no conversion needed');
    }

    // Migration 2: Extend user name fields
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'first_name' 
            AND character_maximum_length < 100
          ) THEN
            ALTER TABLE "user" ALTER COLUMN first_name TYPE VARCHAR(100);
            ALTER TABLE "user" ALTER COLUMN last_name TYPE VARCHAR(100);
            ALTER TABLE "user" ALTER COLUMN display_name TYPE VARCHAR(200);
            RAISE NOTICE 'Extended user name field lengths';
          END IF;
        END $$;
      `);
    } catch (e) {
      console.log('⚠️  Migration 2: User name fields already extended');
    }

    // Migration 3: Extend email field
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'email' 
            AND character_maximum_length < 320
          ) THEN
            ALTER TABLE "user" ALTER COLUMN email TYPE VARCHAR(320);
            RAISE NOTICE 'Extended email field to 320 characters';
          END IF;
        END $$;
      `);
    } catch (e) {
      console.log('⚠️  Migration 3: Email field already extended');
    }

    // Migration 4: Add timezone support to timestamps
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'created_at' 
            AND data_type = 'timestamp without time zone'
          ) THEN
            ALTER TABLE "user" ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
            ALTER TABLE "user" ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;
            ALTER TABLE "user" ALTER COLUMN deleted_at TYPE TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added timezone support to user table timestamps';
          END IF;
        END $$;
      `);
    } catch (e) {
      console.log('⚠️  Migration 4: Timezone support already added');
    }

    // Migration 5: Extend vendor company fields
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          -- Extend existing columns
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'company_name' AND character_maximum_length < 500) THEN
            ALTER TABLE vendor_company ALTER COLUMN company_name TYPE VARCHAR(500);
          END IF;
          
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'business_type' AND character_maximum_length < 100) THEN
            ALTER TABLE vendor_company ALTER COLUMN business_type TYPE VARCHAR(100);
          END IF;
          
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'license_number' AND character_maximum_length < 200) THEN
            ALTER TABLE vendor_company ALTER COLUMN license_number TYPE VARCHAR(200);
          END IF;
          
          -- Add new columns if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'tax_id') THEN
            ALTER TABLE vendor_company ADD COLUMN tax_id VARCHAR(100);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'website') THEN
            ALTER TABLE vendor_company ADD COLUMN website VARCHAR(500);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'established_year') THEN
            ALTER TABLE vendor_company ADD COLUMN established_year SMALLINT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'employee_count') THEN
            ALTER TABLE vendor_company ADD COLUMN employee_count INT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendor_company' AND column_name = 'annual_revenue') THEN
            ALTER TABLE vendor_company ADD COLUMN annual_revenue DECIMAL(15,2);
          END IF;
          
          RAISE NOTICE 'Enhanced vendor company table';
        END $$;
      `);
    } catch (e) {
      console.log('⚠️  Migration 5: Vendor company fields already enhanced');
    }

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Don't throw error for migrations - they might have already been applied
  }
};

/**
 * Create indexes for better performance
 */
const createIndexes = async (): Promise<void> => {
  const indexQueries = [
    // User table indexes
    'CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email)',
    'CREATE INDEX IF NOT EXISTS idx_user_type ON "user"(user_type)',
    'CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "user"(deleted_at)',
    'CREATE INDEX IF NOT EXISTS idx_user_is_locked ON "user"(is_locked)',
    'CREATE INDEX IF NOT EXISTS idx_user_last_login ON "user"(last_login)',
    'CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user"(created_at)',
    
    // Company and contact indexes
    'CREATE INDEX IF NOT EXISTS idx_vendor_company_vendor_id ON vendor_company(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_company_name ON vendor_company(company_name)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_company_business_type ON vendor_company(business_type)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_contact_vendor_id ON vendor_contact(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_contact_email ON vendor_contact(primary_email)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_address_vendor_id ON vendor_address(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_address_type ON vendor_address(address_type)',
    
    'CREATE INDEX IF NOT EXISTS idx_client_company_client_id ON client_company(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_company_name ON client_company(company_name)',
    'CREATE INDEX IF NOT EXISTS idx_client_contact_client_id ON client_contact(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_contact_email ON client_contact(primary_email)',
    'CREATE INDEX IF NOT EXISTS idx_client_address_client_id ON client_address(client_id)',
    
    // Specialization indexes
    'CREATE INDEX IF NOT EXISTS idx_vendor_specialization_vendor_id ON vendor_specialization(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_specialization_name ON specialization(name)',
    'CREATE INDEX IF NOT EXISTS idx_specialization_category ON specialization(category)',
    
    // Equipment indexes
    'CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment(equipment_code)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(equipment_name)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_manufacturer ON equipment(manufacturer)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_deleted_at ON equipment(deleted_at)',
    
    // Equipment instance indexes
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_serial ON equipment_instance(serial_number)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_status ON equipment_instance(status)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_vendor_id ON equipment_instance(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_assigned_to ON equipment_instance(assigned_to)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_expiry ON equipment_instance(expiry_date)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_warranty_expiry ON equipment_instance(warranty_expiry)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_next_maintenance ON equipment_instance(next_maintenance_date)',
    
    // Assignment indexes
    'CREATE INDEX IF NOT EXISTS idx_equipment_assignment_client_id ON equipment_assignment(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_assignment_vendor_id ON equipment_assignment(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_assignment_status ON equipment_assignment(status)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_assignment_priority ON equipment_assignment(priority)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_assignment_number ON equipment_assignment(assignment_number)',
    
    // Maintenance ticket indexes
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_equipment_id ON maintenance_ticket(equipment_instance_id)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_client_id ON maintenance_ticket(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_vendor_id ON maintenance_ticket(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_technician ON maintenance_ticket(assigned_technician)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_status ON maintenance_ticket(ticket_status)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_priority ON maintenance_ticket(priority)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_category ON maintenance_ticket(category)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_number ON maintenance_ticket(ticket_number)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_scheduled_date ON maintenance_ticket(scheduled_date)',
    
    // Notification indexes
    'CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notification_is_read ON notification(is_read)',
    'CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type)',
    'CREATE INDEX IF NOT EXISTS idx_notification_priority ON notification(priority)',
    'CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_notification_expires_at ON notification(expires_at)',
    
    // Audit log indexes
    'CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_ip_address ON audit_log(ip_address)',
    
    // Password reset indexes
    'CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset(reset_token)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_used ON password_reset(used)',
    
    // Role and permission indexes
    'CREATE INDEX IF NOT EXISTS idx_role_name ON role(role_name)',
    'CREATE INDEX IF NOT EXISTS idx_permission_name ON permission(permission_name)',
    'CREATE INDEX IF NOT EXISTS idx_permission_category ON permission(category)',
    'CREATE INDEX IF NOT EXISTS idx_role_permission_role_id ON role_permission(role_id)',
    'CREATE INDEX IF NOT EXISTS idx_role_permission_permission_id ON role_permission(permission_id)'
  ];

  for (const query of indexQueries) {
    try {
      await pool.query(query);
    } catch (error: any) {
      if (error.code !== '42P07') {
        console.error('Error creating index:', error.message);
      }
    }
  }

  console.log('✅ Database indexes created');
};

/**
 * Create triggers and functions for security and automation
 */
const createTriggersAndFunctions = async (): Promise<void> => {
  const triggerFunctions = [
    // 1. Update updated_at timestamp
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,

    // 2. Handle account locking
    `CREATE OR REPLACE FUNCTION handle_failed_login()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.failed_login_attempts >= 5 THEN
            NEW.is_locked = TRUE;
            NEW.locked_until = CURRENT_TIMESTAMP + INTERVAL '30 minutes';
            INSERT INTO notification (
                user_id, title, message, type, priority
            ) VALUES (
                NEW.id,
                'Account Locked',
                'Your account has been locked due to multiple failed login attempts. Please try again after 30 minutes or contact support.',
                'error',
                'high'
            );
        END IF;
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,

    // 3. Auto-unlock accounts
    `CREATE OR REPLACE FUNCTION auto_unlock_account()
    RETURNS TRIGGER AS $$
    BEGIN
        IF OLD.is_locked = TRUE 
           AND OLD.locked_until IS NOT NULL 
           AND CURRENT_TIMESTAMP > OLD.locked_until THEN
            NEW.is_locked = FALSE;
            NEW.locked_until = NULL;
            NEW.failed_login_attempts = 0;
            INSERT INTO notification (
                user_id, title, message, type, priority
            ) VALUES (
                NEW.id,
                'Account Unlocked',
                'Your account has been automatically unlocked. You can now attempt to log in again.',
                'success',
                'normal'
            );
        END IF;
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,

    // 4. Log user activities
    `CREATE OR REPLACE FUNCTION log_user_activity()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO audit_log (
                table_name, record_id, action_type, changes, metadata
            ) VALUES (
                TG_TABLE_NAME, 
                to_jsonb(NEW.id), 
                'INSERT', 
                to_jsonb(NEW),
                jsonb_build_object('timestamp', CURRENT_TIMESTAMP, 'operation', TG_OP)
            );
            RETURN NEW;
        END IF;
        
        IF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_log (
                table_name, record_id, action_type, changes, metadata
            ) VALUES (
                TG_TABLE_NAME, 
                to_jsonb(NEW.id), 
                'UPDATE', 
                jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
                jsonb_build_object('timestamp', CURRENT_TIMESTAMP, 'operation', TG_OP)
            );
            RETURN NEW;
        END IF;
        
        IF TG_OP = 'DELETE' THEN
            INSERT INTO audit_log (
                table_name, record_id, action_type, changes, metadata
            ) VALUES (
                TG_TABLE_NAME, 
                to_jsonb(OLD.id), 
                'DELETE', 
                to_jsonb(OLD),
                jsonb_build_object('timestamp', CURRENT_TIMESTAMP, 'operation', TG_OP)
            );
            RETURN OLD;
        END IF;
        
        RETURN NULL;
    END;
    $$ language 'plpgsql';`,

    // 5. Notify on equipment status change
    `CREATE OR REPLACE FUNCTION notify_equipment_status()
    RETURNS TRIGGER AS $$
    DECLARE
        user_id INT;
        equipment_name_var VARCHAR;
    BEGIN
        SELECT assigned_to INTO user_id 
        FROM equipment_instance 
        WHERE id = NEW.id;
        
        SELECT e.equipment_name INTO equipment_name_var 
        FROM equipment e 
        JOIN equipment_instance ei ON e.id = ei.equipment_id 
        WHERE ei.id = NEW.id;
        
        IF NEW.status != OLD.status THEN
            INSERT INTO notification (
                user_id, 
                title, 
                message, 
                type, 
                priority
            ) VALUES (
                user_id,
                'Equipment Status Update',
                'Equipment ' || equipment_name_var || ' status changed to ' || NEW.status,
                'info',
                'normal'
            );
        END IF;
        
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,

    // 6. Validate equipment assignment
    `CREATE OR REPLACE FUNCTION validate_equipment_assignment()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.status = 'assigned' AND NEW.assigned_to IS NULL THEN
            RAISE EXCEPTION 'Cannot assign equipment without an assigned user';
        END IF;
        
        IF NEW.status = 'assigned' THEN
            PERFORM 1 FROM equipment_instance 
            WHERE id = NEW.id AND status = 'available';
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Equipment is not available for assignment';
            END IF;
        END IF;
        
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,

    // 7. Notify on equipment expiry
    `CREATE OR REPLACE FUNCTION notify_equipment_expiry()
    RETURNS TRIGGER AS $$
    DECLARE
        vendor_id INT;
        equipment_name_var VARCHAR;
    BEGIN
        SELECT ei.vendor_id, e.equipment_name INTO vendor_id, equipment_name_var
        FROM equipment_instance ei
        JOIN equipment e ON e.id = ei.equipment_id
        WHERE ei.id = NEW.id;
        
        IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
            INSERT INTO notification (
                user_id, 
                title, 
                message, 
                type, 
                priority
            ) VALUES (
                vendor_id,
                'Equipment Expiry Alert',
                'Equipment ' || equipment_name_var || ' (Serial: ' || NEW.serial_number || ') is nearing expiry on ' || NEW.expiry_date,
                'warning',
                'high'
            );
        END IF;
        
        RETURN NEW;
    END;
    $$ language 'plpgsql';`,

    // 8. Handle maintenance ticket status change
    `CREATE OR REPLACE FUNCTION handle_maintenance_ticket_status()
    RETURNS TRIGGER AS $$
    DECLARE
        equipment_name_var VARCHAR;
        client_id INT;
        vendor_id INT;
    BEGIN
        SELECT e.equipment_name, ei.assigned_to, ei.vendor_id 
        INTO equipment_name_var, client_id, vendor_id
        FROM equipment_instance ei
        JOIN equipment e ON e.id = ei.equipment_id
        WHERE ei.id = NEW.equipment_instance_id;
        
        IF NEW.ticket_status != OLD.ticket_status THEN
            INSERT INTO notification (
                user_id, 
                title, 
                message, 
                type, 
                priority
            ) VALUES (
                client_id,
                'Maintenance Ticket Update',
                'Maintenance ticket for ' || equipment_name_var || ' has changed to ' || NEW.ticket_status,
                'info',
                'normal'
            );
            
            INSERT INTO notification (
                user_id, 
                title, 
                message, 
                type, 
                priority
            ) VALUES (
                vendor_id,
                'Maintenance Ticket Update',
                'Maintenance ticket for ' || equipment_name_var || ' has changed to ' || NEW.ticket_status,
                'info',
                'normal'
            );
            
            IF NEW.ticket_status = 'completed' THEN
                UPDATE equipment_instance 
                SET last_maintenance_date = CURRENT_DATE,
                    status = 'available'
                WHERE id = NEW.equipment_instance_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END;
    $$ language 'plpgsql';`
  ];

  const triggerQueries = [
    'DROP TRIGGER IF EXISTS update_user_updated_at ON "user"',
    'CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_vendor_company_updated_at ON vendor_company',
    'CREATE TRIGGER update_vendor_company_updated_at BEFORE UPDATE ON vendor_company FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_vendor_contact_updated_at ON vendor_contact',
    'CREATE TRIGGER update_vendor_contact_updated_at BEFORE UPDATE ON vendor_contact FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_vendor_address_updated_at ON vendor_address',
    'CREATE TRIGGER update_vendor_address_updated_at BEFORE UPDATE ON vendor_address FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_client_company_updated_at ON client_company',
    'CREATE TRIGGER update_client_company_updated_at BEFORE UPDATE ON client_company FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_client_contact_updated_at ON client_contact',
    'CREATE TRIGGER update_client_contact_updated_at BEFORE UPDATE ON client_contact FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_client_address_updated_at ON client_address',
    'CREATE TRIGGER update_client_address_updated_at BEFORE UPDATE ON client_address FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_specialization_updated_at ON specialization',
    'CREATE TRIGGER update_specialization_updated_at BEFORE UPDATE ON specialization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment',
    'CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_equipment_instance_updated_at ON equipment_instance',
    'CREATE TRIGGER update_equipment_instance_updated_at BEFORE UPDATE ON equipment_instance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_equipment_assignment_updated_at ON equipment_assignment',
    'CREATE TRIGGER update_equipment_assignment_updated_at BEFORE UPDATE ON equipment_assignment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS update_maintenance_ticket_updated_at ON maintenance_ticket',
    'CREATE TRIGGER update_maintenance_ticket_updated_at BEFORE UPDATE ON maintenance_ticket FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    'DROP TRIGGER IF EXISTS handle_failed_login_trigger ON "user"',
    'CREATE TRIGGER handle_failed_login_trigger BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION handle_failed_login()',
    'DROP TRIGGER IF EXISTS auto_unlock_account_trigger ON "user"',
    'CREATE TRIGGER auto_unlock_account_trigger BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION auto_unlock_account()',
    'DROP TRIGGER IF EXISTS notify_equipment_status_trigger ON equipment_instance',
    'CREATE TRIGGER notify_equipment_status_trigger AFTER UPDATE ON equipment_instance FOR EACH ROW EXECUTE FUNCTION notify_equipment_status()',
    'DROP TRIGGER IF EXISTS validate_equipment_assignment_trigger ON equipment_instance',
    'CREATE TRIGGER validate_equipment_assignment_trigger BEFORE UPDATE ON equipment_instance FOR EACH ROW EXECUTE FUNCTION validate_equipment_assignment()',
    'DROP TRIGGER IF EXISTS notify_equipment_expiry_trigger ON equipment_instance',
    'CREATE TRIGGER notify_equipment_expiry_trigger AFTER INSERT OR UPDATE ON equipment_instance FOR EACH ROW EXECUTE FUNCTION notify_equipment_expiry()',
    'DROP TRIGGER IF EXISTS handle_maintenance_ticket_status_trigger ON maintenance_ticket',
    'CREATE TRIGGER handle_maintenance_ticket_status_trigger AFTER UPDATE ON maintenance_ticket FOR EACH ROW EXECUTE FUNCTION handle_maintenance_ticket_status()',
    'DROP TRIGGER IF EXISTS audit_user_changes ON "user"',
    'CREATE TRIGGER audit_user_changes AFTER INSERT OR UPDATE OR DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    'DROP TRIGGER IF EXISTS audit_vendor_company_changes ON vendor_company',
    'CREATE TRIGGER audit_vendor_company_changes AFTER INSERT OR UPDATE OR DELETE ON vendor_company FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    'DROP TRIGGER IF EXISTS audit_client_company_changes ON client_company',
    'CREATE TRIGGER audit_client_company_changes AFTER INSERT OR UPDATE OR DELETE ON client_company FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    'DROP TRIGGER IF EXISTS audit_equipment_changes ON equipment',
    'CREATE TRIGGER audit_equipment_changes AFTER INSERT OR UPDATE OR DELETE ON equipment FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    'DROP TRIGGER IF EXISTS audit_equipment_instance_changes ON equipment_instance',
    'CREATE TRIGGER audit_equipment_instance_changes AFTER INSERT OR UPDATE OR DELETE ON equipment_instance FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    'DROP TRIGGER IF EXISTS audit_equipment_assignment_changes ON equipment_assignment',
    'CREATE TRIGGER audit_equipment_assignment_changes AFTER INSERT OR UPDATE OR DELETE ON equipment_assignment FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    'DROP TRIGGER IF EXISTS audit_maintenance_ticket_changes ON maintenance_ticket',
    'CREATE TRIGGER audit_maintenance_ticket_changes AFTER INSERT OR UPDATE OR DELETE ON maintenance_ticket FOR EACH ROW EXECUTE FUNCTION log_user_activity()'
  ];

  for (const query of triggerFunctions) {
    try {
      await pool.query(query);
    } catch (error: any) {
      console.error('Error creating trigger function:', error.message);
    }
  }

  for (const query of triggerQueries) {
    try {
      await pool.query(query);
    } catch (error: any) {
      console.error('Error creating trigger:', error.message);
    }
  }

  console.log('✅ Database triggers and functions created');
};

/**
 * Run only database migrations (for deployment scenarios)
 */
export const runMigrations = async (): Promise<void> => {
  try {
    console.log('🚀 Running database migrations for deployment...');
    
    await checkDatabasePermissions();
    await createMigrationTable();
    await applyAllMigrations();
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
};

/**
 * Check database readiness for deployment
 */
export const checkDeploymentReadiness = async (): Promise<{
  isReady: boolean;
  pendingMigrations: string[];
  lastMigration?: string;
  migrationCount: number;
}> => {
  try {
    // Check if migration table exists
    const migrationTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    if (!migrationTableExists.rows[0].exists) {
      return {
        isReady: false,
        pendingMigrations: ['001_create_initial_tables', '002_schema_optimizations', '003_create_indexes', '004_create_triggers_functions'],
        migrationCount: 0
      };
    }

    // Get applied migrations
    const appliedMigrations = await pool.query(`
      SELECT migration_name, applied_at 
      FROM schema_migrations 
      ORDER BY applied_at DESC
    `);

    const appliedNames = appliedMigrations.rows.map(row => row.migration_name);
    const allMigrations = ['001_create_initial_tables', '002_schema_optimizations', '003_create_indexes', '004_create_triggers_functions'];
    const pendingMigrations = allMigrations.filter(migration => !appliedNames.includes(migration));

    return {
      isReady: pendingMigrations.length === 0,
      pendingMigrations,
      lastMigration: appliedMigrations.rows[0]?.migration_name,
      migrationCount: appliedMigrations.rows.length
    };
  } catch (error) {
    console.error('❌ Error checking deployment readiness:', error);
    return {
      isReady: false,
      pendingMigrations: ['Unknown - database connection failed'],
      migrationCount: 0
    };
  }
};

/**
 * Create a database backup before deployment
 */
export const createPreDeploymentBackup = async (): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `pre_deployment_backup_${timestamp}`;
  
  try {
    console.log(`🔄 Creating pre-deployment backup: ${backupName}`);
    
    // Log backup attempt in audit log
    await pool.query(`
      INSERT INTO audit_log (
        table_name, 
        record_id, 
        action_type, 
        metadata
      ) VALUES (
        'system', 
        '{"backup_name": "${backupName}"}', 
        'EXPORT', 
        '{"type": "pre_deployment_backup", "timestamp": "${new Date().toISOString()}"}'
      )
    `);
    
    console.log(`✅ Pre-deployment backup logged: ${backupName}`);
    return backupName;
  } catch (error) {
    console.error('❌ Error creating pre-deployment backup:', error);
    throw error;
  }
};

/**
 * Check if the current user has sufficient database permissions
 */
const checkDatabasePermissions = async (): Promise<void> => {
  try {
    const testTableName = `temp_permission_test_${Date.now()}`;
    await pool.query(`CREATE TEMP TABLE ${testTableName} (id SERIAL)`);
    await pool.query(`DROP TABLE ${testTableName}`);
    console.log('✅ Database permissions verified');
  } catch (error: any) {
    if (error.code === '42501') {
      console.error('❌ Insufficient database permissions!');
      console.error('To fix this, run the following command as the PostgreSQL superuser:');
      console.error(`psql -U postgres -f setup_database.sql`);
      console.error('Or manually grant permissions:');
      console.error(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${process.env.DB_USER};`);
      console.error(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${process.env.DB_USER};`);
      console.error(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${process.env.DB_USER};`);
      throw new Error('Database permission check failed');
    }
    throw error;
  }
};

/**
 * Seed initial data
 */
const seedInitialData = async (): Promise<void> => {
  try {
    const userCountResult = await pool.query('SELECT COUNT(*) FROM "user"');
    const userCount = parseInt(userCountResult.rows[0].count);

    if (userCount > 0) {
      console.log('📊 Database already contains data, skipping seed');
      return;
    }

    console.log('🌱 Seeding initial data...');

    await seedRoles();
    await seedAdminUser();
    await seedPermissions();
    await seedSpecializations();
    await seedMockVendors();
    await seedMockClients();
    await seedMockEquipment();
    await seedMockEquipmentInstances();
    await seedMockAssignments();
    await seedMockMaintenanceTickets();

    console.log('✅ Initial data seeded successfully');

  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
    throw error;
  }
};

/**
 * Seed roles
 */
const seedRoles = async (): Promise<void> => {
  const roles = [
    { role_name: 'admin', description: 'Administrator with full system access' },
    { role_name: 'vendor', description: 'Vendor with equipment and client management capabilities' },
    { role_name: 'client', description: 'Client with equipment monitoring and ticket creation capabilities' }
  ];

  for (const role of roles) {
    await pool.query(
      'INSERT INTO role (role_name, description) VALUES ($1, $2) ON CONFLICT (role_name) DO NOTHING',
      [role.role_name, role.description]
    );
  }

  console.log('✅ Roles seeded (admin, vendor, client)');
};

/**
 * Seed permissions
 */
const seedPermissions = async (): Promise<void> => {
  const permissions = [
    // Admin permissions
    { permission_name: 'manage_vendors', description: 'Create and manage vendor accounts', category: 'admin' },
    { permission_name: 'view_all_users', description: 'View all system users', category: 'admin' },
    { permission_name: 'system_settings', description: 'Manage system settings', category: 'admin' },
    { permission_name: 'view_audit_logs', description: 'View system audit logs', category: 'admin' },
    
    // Vendor permissions
    { permission_name: 'manage_clients', description: 'Create and manage client accounts', category: 'vendor' },
    { permission_name: 'manage_equipment', description: 'Create and manage equipment', category: 'vendor' },
    { permission_name: 'assign_equipment', description: 'Assign equipment to clients', category: 'vendor' },
    { permission_name: 'manage_maintenance', description: 'Handle maintenance tickets', category: 'vendor' },
    
    // Client permissions
    { permission_name: 'view_equipment', description: 'View assigned equipment', category: 'client' },
    { permission_name: 'create_tickets', description: 'Create maintenance tickets', category: 'client' },
    { permission_name: 'view_notifications', description: 'View notifications', category: 'client' }
  ];

  for (const permission of permissions) {
    await pool.query(
      'INSERT INTO permission (permission_name, description, category) VALUES ($1, $2, $3) ON CONFLICT (permission_name) DO NOTHING',
      [permission.permission_name, permission.description, permission.category]
    );
  }

  const rolePermissions = [
    { role: 'admin', permissions: ['manage_vendors', 'view_all_users', 'system_settings', 'view_audit_logs'] },
    { role: 'vendor', permissions: ['manage_clients', 'manage_equipment', 'assign_equipment', 'manage_maintenance'] },
    { role: 'client', permissions: ['view_equipment', 'create_tickets', 'view_notifications'] }
  ];

  for (const rp of rolePermissions) {
    const roleResult = await pool.query('SELECT id FROM role WHERE role_name = $1', [rp.role]);
    const roleId = roleResult.rows[0]?.id;

    if (roleId) {
      for (const perm of rp.permissions) {
        const permResult = await pool.query('SELECT id FROM permission WHERE permission_name = $1', [perm]);
        const permId = permResult.rows[0]?.id;

        if (permId) {
          await pool.query(
            'INSERT INTO role_permission (role_id, permission_id, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [roleId, permId, 1]
          );
        }
      }
    }
  }

  console.log('✅ Permissions and role assignments seeded');
};

/**
 * Seed specializations
 */
const seedSpecializations = async (): Promise<void> => {
  const specializations = [
    { name: 'Fire Extinguishers', description: 'Installation and maintenance of fire extinguishers', category: 'Equipment' },
    { name: 'Sprinkler Systems', description: 'Design and installation of sprinkler systems', category: 'Equipment' },
    { name: 'Fire Alarms', description: 'Fire detection and alarm systems', category: 'Equipment' },
    { name: 'Emergency Lighting', description: 'Emergency lighting systems', category: 'Equipment' },
    { name: 'Fire Suppression Systems', description: 'Advanced fire suppression systems', category: 'Equipment' },
    { name: 'Exit Signs', description: 'Emergency exit signage', category: 'Equipment' },
    { name: 'Fire Safety Inspections', description: 'Regular fire safety inspections', category: 'Service' },
    { name: 'Fire Safety Training', description: 'Fire safety training programs', category: 'Service' }
  ];

  for (const spec of specializations) {
    await pool.query(
      'INSERT INTO specialization (name, description, category) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
      [spec.name, spec.description, spec.category]
    );
  }

  console.log('✅ Specializations seeded');
};

/**
 * Seed admin user
 */
const seedAdminUser = async (): Promise<void> => {
  const roleResult = await pool.query('SELECT id FROM role WHERE role_name = $1', ['admin']);
  const roleId = roleResult.rows[0]?.id;

  if (!roleId) {
    throw new Error('Admin role not found');
  }

  const password = 'AdminPass2025!';
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  await pool.query(
    `INSERT INTO "user" (first_name, last_name, email, password, user_type, role_id) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     ON CONFLICT (email) DO NOTHING`,
    ['System', 'Administrator', 'admin@fireguardian.lk', hashedPassword, 'admin', roleId]
  );

  console.log('✅ Admin user seeded');
  console.log('📧 Admin email: admin@fireguardian.lk');
  console.log('🔑 Admin password: AdminPass2025!');
};

/**
 * Seed mock vendor users with detailed information
 */
const seedMockVendors = async (): Promise<void> => {
  const password = 'VendorPass2025!';
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const vendors = [
    {
      first_name: 'Lakmal',
      last_name: 'Perera',
      email: 'lakmal@safefire.lk',
      company_name: 'SafeFire Solutions Pvt Ltd',
      business_type: 'Private Limited',
      license_number: 'FSL-2025-001',
      contact_person_name: 'Lakmal Perera',
      contact_title: 'Managing Director',
      primary_email: 'lakmal@safefire.lk',
      primary_phone: '+94 11 234 5678',
      street_address: '125/3 Nawala Road, Colombo 05',
      city: 'Colombo',
      state: 'Western Province',
      zip_code: '00500',
      specializations: ['Fire Extinguishers', 'Fire Alarms', 'Fire Safety Inspections', 'Fire Safety Training']
    },
    {
      first_name: 'Nimali',
      last_name: 'Gunawardena',
      email: 'nimali@proguard.lk',
      company_name: 'ProGuard Fire Systems',
      business_type: 'LLC',
      license_number: 'FSL-2025-002',
      contact_person_name: 'Nimali Gunawardena',
      contact_title: 'Technical Director',
      primary_email: 'nimali@proguard.lk',
      primary_phone: '+94 81 234 5679',
      street_address: '56 Katugastota Road, Kandy',
      city: 'Kandy',
      state: 'Central Province',
      zip_code: '20000',
      specializations: ['Sprinkler Systems', 'Fire Suppression Systems', 'Fire Safety Inspections']
    },
    {
      first_name: 'Ruwan',
      last_name: 'Silva',
      email: 'ruwan@fireshield.lk',
      company_name: 'FireShield Technologies',
      business_type: 'Partnership',
      license_number: 'FSL-2025-003',
      contact_person_name: 'Ruwan Silva',
      contact_title: 'Operations Manager',
      primary_email: 'ruwan@fireshield.lk',
      primary_phone: '+94 91 234 5680',
      street_address: '89 Light House Street, Galle',
      city: 'Galle',
      state: 'Southern Province',
      zip_code: '80000',
      specializations: ['Emergency Lighting', 'Exit Signs', 'Fire Safety Training']
    }
  ];

  for (const vendor of vendors) {
    const userResult = await pool.query(
      `INSERT INTO "user" (first_name, last_name, email, password, user_type, role_id) 
       VALUES ($1, $2, $3, $4, $5, (SELECT id FROM role WHERE role_name = 'vendor')) 
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [vendor.first_name, vendor.last_name, vendor.email, hashedPassword, 'vendor']
    );

    if (userResult.rows.length > 0) {
      const vendorId = userResult.rows[0].id;

      await pool.query(
        `INSERT INTO vendor_company (
          vendor_id, company_name, business_type, license_number
        ) VALUES ($1, $2, $3, $4)`,
        [vendorId, vendor.company_name, vendor.business_type, vendor.license_number]
      );

      await pool.query(
        `INSERT INTO vendor_contact (
          vendor_id, contact_person_name, contact_title, primary_email, primary_phone
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          vendorId, vendor.contact_person_name, vendor.contact_title,
          vendor.primary_email, vendor.primary_phone
        ]
      );

      await pool.query(
        `INSERT INTO vendor_address (
          vendor_id, street_address, city, state, zip_code, country
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          vendorId, vendor.street_address, vendor.city, vendor.state,
          vendor.zip_code, 'Sri Lanka'
        ]
      );

      for (const specName of vendor.specializations) {
        const specResult = await pool.query(
          'SELECT id FROM specialization WHERE name = $1',
          [specName]
        );
        
        if (specResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO vendor_specialization (vendor_id, specialization_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [vendorId, specResult.rows[0].id]
          );
        }
      }
    }
  }

  console.log('✅ Mock vendors seeded');
  console.log('🔑 Vendor login credentials:');
  vendors.forEach(vendor => {
    console.log(`   📧 ${vendor.email} | 🔑 VendorPass2025!`);
  });
};

/**
 * Seed mock client users
 */
const seedMockClients = async (): Promise<void> => {
  const password = 'ClientPass2025!';
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const clients = [
    {
      first_name: 'Kasun',
      last_name: 'Jayasinghe',
      email: 'kasun@royalhotels.lk',
      company_name: 'Royal Hotels Group',
      business_type: 'Hospitality',
      contact_person_name: 'Kasun Jayasinghe',
      contact_title: 'Facilities Manager',
      primary_email: 'kasun@royalhotels.lk',
      primary_phone: '+94 11 345 6789',
      street_address: '100 Galle Road, Colombo 03',
      city: 'Colombo',
      state: 'Western Province',
      zip_code: '00300'
    },
    {
      first_name: 'Shalini',
      last_name: 'Fernando',
      email: 'shalini@techinnovations.lk',
      company_name: 'Tech Innovations Ltd',
      business_type: 'Technology',
      contact_person_name: 'Shalini Fernando',
      contact_title: 'Operations Manager',
      primary_email: 'shalini@techinnovations.lk',
      primary_phone: '+94 11 456 7890',
      street_address: '25 Havelock Road, Colombo 05',
      city: 'Colombo',
      state: 'Western Province',
      zip_code: '00500'
    },
    {
      first_name: 'Dilshan',
      last_name: 'Weerasinghe',
      email: 'dilshan@citymall.lk',
      company_name: 'City Mall PLC',
      business_type: 'Retail',
      contact_person_name: 'Dilshan Weerasinghe',
      contact_title: 'Property Manager',
      primary_email: 'dilshan@citymall.lk',
      primary_phone: '+94 91 567 8901',
      street_address: '50 Main Street, Galle',
      city: 'Galle',
      state: 'Southern Province',
      zip_code: '80000'
    }
  ];

  for (const client of clients) {
    const userResult = await pool.query(
      `INSERT INTO "user" (first_name, last_name, email, password, user_type, role_id) 
       VALUES ($1, $2, $3, $4, $5, (SELECT id FROM role WHERE role_name = 'client')) 
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [client.first_name, client.last_name, client.email, hashedPassword, 'client']
    );

    if (userResult.rows.length > 0) {
      const clientId = userResult.rows[0].id;

      await pool.query(
        `INSERT INTO client_company (
          client_id, company_name, business_type
        ) VALUES ($1, $2, $3)`,
        [clientId, client.company_name, client.business_type]
      );

      await pool.query(
        `INSERT INTO client_contact (
          client_id, contact_person_name, contact_title, primary_email, primary_phone
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          clientId, client.contact_person_name, client.contact_title,
          client.primary_email, client.primary_phone
        ]
      );

      await pool.query(
        `INSERT INTO client_address (
          client_id, street_address, city, state, zip_code, country
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          clientId, client.street_address, client.city, client.state,
          client.zip_code, 'Sri Lanka'
        ]
      );
    }
  }

  console.log('✅ Mock clients seeded');
  console.log('🔑 Client login password: ClientPass2025!');
};

/**
 * Seed mock equipment data
 */
const seedMockEquipment = async (): Promise<void> => {
  const equipment = [
    { 
      equipment_code: 'FE-001', 
      equipment_name: 'Dry Powder Fire Extinguisher 5kg', 
      description: 'ABC dry powder fire extinguisher for Class A, B, and C fires',
      equipment_type: 'Fire Extinguisher',
      manufacturer: 'SafeFire Industries'
    },
    { 
      equipment_code: 'FE-002', 
      equipment_name: 'CO2 Fire Extinguisher 2kg', 
      description: 'Carbon dioxide fire extinguisher for electrical fires',
      equipment_type: 'Fire Extinguisher',
      manufacturer: 'ProGuard Systems'
    },
    { 
      equipment_code: 'FA-001', 
      equipment_name: 'Conventional Fire Alarm Panel', 
      description: '8-zone conventional fire alarm control panel',
      equipment_type: 'Fire Alarm',
      manufacturer: 'SafeFire Industries'
    },
    { 
      equipment_code: 'EL-001', 
      equipment_name: 'LED Emergency Light', 
      description: '3W LED emergency light with 3-hour backup',
      equipment_type: 'Emergency Lighting',
      manufacturer: 'FireShield Tech'
    }
  ];

  for (const equip of equipment) {
    await pool.query(
      `INSERT INTO equipment (
        equipment_code, equipment_name, description, equipment_type, manufacturer
      ) VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (equipment_code) DO NOTHING`,
      [
        equip.equipment_code, 
        equip.equipment_name, 
        equip.description,
        equip.equipment_type,
        equip.manufacturer
      ]
    );
  }

  console.log('✅ Mock equipment seeded');
};

/**
 * Seed mock equipment instances
 */
const seedMockEquipmentInstances = async (): Promise<void> => {
  const vendors = await pool.query('SELECT id, email FROM "user" WHERE user_type = $1', ['vendor']);
  const equipment = await pool.query('SELECT id, equipment_code FROM equipment');

  const instances = [
    { 
      equipment_code: 'FE-001', 
      serial_number: `FE${uuidv4().slice(0,8)}`, 
      vendor_email: 'lakmal@safefire.lk',
      status: 'available', 
      expiry_date: '2026-04-15',
      last_maintenance_date: '2025-04-15',
      maintenance_interval_days: 180
    },
    { 
      equipment_code: 'FE-002', 
      serial_number: `CO${uuidv4().slice(0,8)}`, 
      vendor_email: 'nimali@proguard.lk',
      status: 'available', 
      expiry_date: '2026-03-31',
      last_maintenance_date: '2025-03-31',
      maintenance_interval_days: 180
    },
    { 
      equipment_code: 'FA-001', 
      serial_number: `FA${uuidv4().slice(0,8)}`, 
      vendor_email: 'lakmal@safefire.lk',
      status: 'available', 
      expiry_date: '2026-01-15',
      last_maintenance_date: '2025-01-15',
      maintenance_interval_days: 365
    },
    { 
      equipment_code: 'EL-001', 
      serial_number: `EL${uuidv4().slice(0,8)}`, 
      vendor_email: 'ruwan@fireshield.lk',
      status: 'available', 
      expiry_date: '2026-02-28',
      last_maintenance_date: '2025-02-28',
      maintenance_interval_days: 365
    }
  ];

  for (const instance of instances) {
    const equipmentResult = equipment.rows.find(e => e.equipment_code === instance.equipment_code);
    const vendorResult = vendors.rows.find(v => v.email === instance.vendor_email);

    if (equipmentResult && vendorResult) {
      await pool.query(
        `INSERT INTO equipment_instance (
          equipment_id, serial_number, vendor_id, status, 
          expiry_date, last_maintenance_date, maintenance_interval_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (serial_number) DO NOTHING`,
        [
          equipmentResult.id,
          instance.serial_number,
          vendorResult.id,
          instance.status,
          instance.expiry_date,
          instance.last_maintenance_date,
          instance.maintenance_interval_days
        ]
      );
    }
  }

  console.log('✅ Mock equipment instances seeded');
};

/**
 * Seed mock equipment assignments
 */
const seedMockAssignments = async (): Promise<void> => {
  const clients = await pool.query('SELECT id, email FROM "user" WHERE user_type = $1', ['client']);
  const vendors = await pool.query('SELECT id, email FROM "user" WHERE user_type = $1', ['vendor']);
  const equipmentInstances = await pool.query('SELECT id, serial_number FROM equipment_instance WHERE status = $1', ['available']);

  const assignments = [
    {
      client_email: 'kasun@royalhotels.lk',
      vendor_email: 'lakmal@safefire.lk',
      equipment_serials: [equipmentInstances.rows[0]?.serial_number],
      start_date: '2025-10-01',
      end_date: '2026-03-31',
      notes: 'Annual fire safety contract for hotel premises'
    },
    {
      client_email: 'shalini@techinnovations.lk',
      vendor_email: 'nimali@proguard.lk',
      equipment_serials: [equipmentInstances.rows[1]?.serial_number],
      start_date: '2025-09-15',
      end_date: '2026-02-28',
      notes: 'Data center fire protection equipment'
    }
  ];

  for (const assignment of assignments) {
    const client = clients.rows.find(c => c.email === assignment.client_email);
    const vendor = vendors.rows.find(v => v.email === assignment.vendor_email);

    if (client && vendor && assignment.equipment_serials[0]) {
      const assignmentResult = await pool.query(
        `INSERT INTO equipment_assignment (
          client_id, vendor_id, start_date, end_date, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          client.id,
          vendor.id,
          assignment.start_date,
          assignment.end_date,
          assignment.notes,
          'active'
        ]
      );

      if (assignmentResult.rows[0]) {
        const assignmentId = assignmentResult.rows[0].id;
        for (const serial of assignment.equipment_serials) {
          const instance = equipmentInstances.rows.find(e => e.serial_number === serial);
          if (instance) {
            await pool.query(
              'INSERT INTO assignment_item (assignment_id, equipment_instance_id) VALUES ($1, $2)',
              [assignmentId, instance.id]
            );

            await pool.query(
              'UPDATE equipment_instance SET status = $1, assigned_to = $2, assigned_at = $3, expiry_date = $4 WHERE id = $5',
              ['assigned', client.id, new Date(), assignment.end_date, instance.id]
            );
          }
        }
      }
    }
  }

  console.log('✅ Mock equipment assignments seeded');
};

/**
 * Seed mock maintenance tickets
 */
const seedMockMaintenanceTickets = async (): Promise<void> => {
  const clients = await pool.query('SELECT id, email FROM "user" WHERE user_type = $1', ['client']);
  const vendors = await pool.query('SELECT id, email FROM "user" WHERE user_type = $1', ['vendor']);
  const equipmentInstances = await pool.query('SELECT id, serial_number, vendor_id FROM equipment_instance');

  const tickets = [
    {
      client_email: 'kasun@royalhotels.lk',
      vendor_email: 'lakmal@safefire.lk',
      equipment_serial: equipmentInstances.rows[0]?.serial_number,
      issue_description: 'Fire extinguisher pressure gauge reading low',
      priority: 'high',
      ticket_status: 'open'
    },
    {
      client_email: 'shalini@techinnovations.lk',
      vendor_email: 'nimali@proguard.lk',
      equipment_serial: equipmentInstances.rows[1]?.serial_number,
      issue_description: 'CO2 extinguisher requires annual inspection',
      priority: 'normal',
      ticket_status: 'open'
    }
  ];

  for (const ticket of tickets) {
    const client = clients.rows.find(c => c.email === ticket.client_email);
    const vendor = vendors.rows.find(v => v.email === ticket.vendor_email);
    const instance = equipmentInstances.rows.find(e => e.serial_number === ticket.equipment_serial);

    if (client && vendor && instance) {
      await pool.query(
        `INSERT INTO maintenance_ticket (
          equipment_instance_id, client_id, vendor_id, 
          issue_description, priority, ticket_status
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          instance.id,
          client.id,
          vendor.id,
          ticket.issue_description,
          ticket.priority,
          ticket.ticket_status
        ]
      );
    }
  }

  console.log('✅ Mock maintenance tickets seeded');
};

/**
 * Reset database (drop all tables and recreate)
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Resetting database...');

    const dropQueries = [
      'DROP TABLE IF EXISTS vendor_specialization CASCADE',
      'DROP TABLE IF EXISTS specialization CASCADE',
      'DROP TABLE IF EXISTS maintenance_ticket CASCADE',
      'DROP TABLE IF EXISTS assignment_item CASCADE',
      'DROP TABLE IF EXISTS equipment_assignment CASCADE',
      'DROP TABLE IF EXISTS equipment_instance CASCADE',
      'DROP TABLE IF EXISTS equipment CASCADE',
      'DROP TABLE IF EXISTS client_address CASCADE',
      'DROP TABLE IF EXISTS client_contact CASCADE',
      'DROP TABLE IF EXISTS client_company CASCADE',
      'DROP TABLE IF EXISTS vendor_address CASCADE',
      'DROP TABLE IF EXISTS vendor_contact CASCADE',
      'DROP TABLE IF EXISTS vendor_company CASCADE',
      'DROP TABLE IF EXISTS password_reset CASCADE',
      'DROP TABLE IF EXISTS audit_log CASCADE',
      'DROP TABLE IF EXISTS notification CASCADE',
      'DROP TABLE IF EXISTS role_permission CASCADE',
      'DROP TABLE IF EXISTS permission CASCADE',
      'DROP TABLE IF EXISTS role CASCADE',
      'DROP TABLE IF EXISTS "user" CASCADE'
    ];

    for (const query of dropQueries) {
      await pool.query(query);
    }

    console.log('✅ All tables dropped');
    await initializeDatabase();

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
};

/**
 * Check if database is initialized
 */
export const isDatabaseInitialized = async (): Promise<boolean> => {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
      );
    `);
    
    if (!result.rows[0].exists) {
      return false;
    }

    const userCount = await pool.query('SELECT COUNT(*) FROM "user"');
    return parseInt(userCount.rows[0].count) > 0;

  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
};