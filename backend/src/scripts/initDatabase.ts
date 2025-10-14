import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the database with schema and seed data
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database...');

    // Check permissions first
    await checkDatabasePermissions();

    // Create tables in the correct order
    await createTablesInOrder();
    
    console.log('✅ Database schema created successfully');

    // Seed initial data
    await seedInitialData();
    console.log('✅ Database initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

/**
 * Create tables in the correct dependency order
 */
const createTablesInOrder = async (): Promise<void> => {
  const tableQueries = [
    // 1. Users table (no dependencies)
    `CREATE TABLE IF NOT EXISTS "user" (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(50),
      last_name VARCHAR(50),
      display_name VARCHAR(100) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('admin','vendor','client')),
      role_id INT,
      is_locked BOOLEAN DEFAULT FALSE,
      locked_until TIMESTAMP NULL,
      failed_login_attempts SMALLINT DEFAULT 0,
      last_login TIMESTAMP NULL,
      last_login_ip VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL
    )`,

    // 2. Role table (no dependencies)
    `CREATE TABLE IF NOT EXISTS role (
      id SERIAL PRIMARY KEY,
      role_name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 3. Permission table (no dependencies)
    `CREATE TABLE IF NOT EXISTS permission (
      id SERIAL PRIMARY KEY,
      permission_name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 4. Role permission junction table (depends on role and permission)
    `CREATE TABLE IF NOT EXISTS role_permission (
      role_id INT REFERENCES role(id) ON DELETE CASCADE,
      permission_id INT REFERENCES permission(id) ON DELETE CASCADE,
      granted_by INT REFERENCES "user"(id),
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(role_id, permission_id)
    )`,

    // 5. Vendor location table (depends on user)
    `CREATE TABLE IF NOT EXISTS vendor_location (
      id SERIAL PRIMARY KEY,
      vendor_id INT REFERENCES "user"(id),
      location_name VARCHAR(100),
      address TEXT,
      phone VARCHAR(20),
      email VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 6. Equipment table (no dependencies)
    `CREATE TABLE IF NOT EXISTS equipment (
      id SERIAL PRIMARY KEY,
      equipment_code VARCHAR(50) UNIQUE,
      equipment_name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL
    )`,

    // 7. Equipment instance table (depends on equipment, vendor_location, user)
    `CREATE TABLE IF NOT EXISTS equipment_instance (
      id SERIAL PRIMARY KEY,
      equipment_id INT REFERENCES equipment(id),
      serial_number VARCHAR(100) UNIQUE,
      vendor_location_id INT REFERENCES vendor_location(id),
      status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','maintenance','retired')),
      assigned_to INT REFERENCES "user"(id) NULL,
      assigned_at TIMESTAMP NULL,
      due_date TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL
    )`,

    // 8. Equipment assignment table (depends on user)
    `CREATE TABLE IF NOT EXISTS equipment_assignment (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES "user"(id),
      assigned_by INT REFERENCES "user"(id),
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
      notes TEXT
    )`,

    // 9. Assignment item junction table (depends on equipment_assignment and equipment_instance)
    `CREATE TABLE IF NOT EXISTS assignment_item (
      assignment_id INT REFERENCES equipment_assignment(id),
      equipment_instance_id INT REFERENCES equipment_instance(id),
      PRIMARY KEY(assignment_id, equipment_instance_id)
    )`,

    // 10. Equipment return table (depends on equipment_assignment and user)
    `CREATE TABLE IF NOT EXISTS equipment_return (
      id SERIAL PRIMARY KEY,
      assignment_id INT REFERENCES equipment_assignment(id),
      returned_by INT REFERENCES "user"(id),
      return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
      notes TEXT
    )`,

    // 11. Equipment return item junction table (depends on equipment_return and equipment_instance)
    `CREATE TABLE IF NOT EXISTS equipment_return_item (
      return_id INT REFERENCES equipment_return(id),
      equipment_instance_id INT REFERENCES equipment_instance(id),
      PRIMARY KEY(return_id, equipment_instance_id)
    )`,

    // 12. Notification table (depends on user)
    `CREATE TABLE IF NOT EXISTS notification (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(10) DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
      priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL
    )`,

    // 13. Audit log table (depends on user)
    `CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      table_name VARCHAR(50) NOT NULL,
      record_id JSONB NOT NULL,
      action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('INSERT','UPDATE','DELETE','LOGIN','LOGOUT')),
      changes JSONB NULL,
      metadata JSONB NULL,
      changed_by INT REFERENCES "user"(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 14. Password reset table (depends on user)
    `CREATE TABLE IF NOT EXISTS password_reset (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      reset_token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 15. Vendor Company Details Table
    `CREATE TABLE IF NOT EXISTS vendor_company (
      id SERIAL PRIMARY KEY,
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      company_name VARCHAR(200) NOT NULL,
      business_type VARCHAR(50) NOT NULL,
      license_number VARCHAR(100),
      tax_id VARCHAR(100),
      website VARCHAR(255),
      years_in_business INTEGER DEFAULT 0,
      employee_count INTEGER DEFAULT 1,
      service_areas TEXT,
      certifications TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 16. Vendor Contact Information Table
    `CREATE TABLE IF NOT EXISTS vendor_contact (
      id SERIAL PRIMARY KEY,
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      contact_person_name VARCHAR(100) NOT NULL,
      contact_title VARCHAR(100),
      primary_email VARCHAR(100) NOT NULL,
      secondary_email VARCHAR(100),
      primary_phone VARCHAR(20) NOT NULL,
      secondary_phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 17. Vendor Address Information Table
    `CREATE TABLE IF NOT EXISTS vendor_address (
      id SERIAL PRIMARY KEY,
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      street_address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      zip_code VARCHAR(20) NOT NULL,
      country VARCHAR(100) NOT NULL DEFAULT 'Sri Lanka',
      is_primary BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 18. Specializations Table
    `CREATE TABLE IF NOT EXISTS specialization (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      category VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 19. Vendor Specializations Junction Table
    `CREATE TABLE IF NOT EXISTS vendor_specialization (
      vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
      specialization_id INT REFERENCES specialization(id) ON DELETE CASCADE,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(vendor_id, specialization_id)
    )`
  ];

  // Execute each table creation query
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

  // Create indexes for better performance
  await createIndexes();

  // Create triggers and functions
  await createTriggersAndFunctions();
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

    // Vendor table indexes
    'CREATE INDEX IF NOT EXISTS idx_vendor_company_vendor_id ON vendor_company(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_contact_vendor_id ON vendor_contact(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_address_vendor_id ON vendor_address(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_specialization_vendor_id ON vendor_specialization(vendor_id)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_company_company_name ON vendor_company(company_name)',
    'CREATE INDEX IF NOT EXISTS idx_vendor_contact_primary_email ON vendor_contact(primary_email)',

    // Equipment table indexes
    'CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment(equipment_code)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_serial ON equipment_instance(serial_number)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_instance_status ON equipment_instance(status)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_assignment_client_id ON equipment_assignment(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_assignment_assigned_by ON equipment_assignment(assigned_by)',

    // Audit and security indexes
    'CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by)',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset(reset_token)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset(expires_at)'
  ];

  for (const query of indexQueries) {
    try {
      await pool.query(query);
    } catch (error: any) {
      if (error.code !== '42P07') { // Ignore "already exists" errors
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
  // 1. Function to update updated_at timestamp
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // 2. Function to handle account locking
  await pool.query(`
    CREATE OR REPLACE FUNCTION handle_failed_login()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Check if failed attempts reached threshold
        IF NEW.failed_login_attempts >= 5 THEN
            NEW.is_locked = TRUE;
            NEW.locked_until = CURRENT_TIMESTAMP + INTERVAL '30 minutes';
        END IF;
        
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // 3. Function to auto-unlock accounts after lock period
  await pool.query(`
    CREATE OR REPLACE FUNCTION auto_unlock_account()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Auto unlock if lock period has expired
        IF OLD.is_locked = TRUE 
           AND OLD.locked_until IS NOT NULL 
           AND CURRENT_TIMESTAMP > OLD.locked_until THEN
            NEW.is_locked = FALSE;
            NEW.locked_until = NULL;
            NEW.failed_login_attempts = 0;
        END IF;
        
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // 4. Function to log user activities automatically
  await pool.query(`
    CREATE OR REPLACE FUNCTION log_user_activity()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Log INSERT operations
        IF TG_OP = 'INSERT' THEN
            INSERT INTO audit_log (table_name, record_id, action_type, changes)
            VALUES (TG_TABLE_NAME, to_jsonb(NEW.id), 'INSERT', to_jsonb(NEW));
            RETURN NEW;
        END IF;
        
        -- Log UPDATE operations
        IF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_log (table_name, record_id, action_type, changes)
            VALUES (TG_TABLE_NAME, to_jsonb(NEW.id), 'UPDATE', 
                   jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
            RETURN NEW;
        END IF;
        
        -- Log DELETE operations
        IF TG_OP = 'DELETE' THEN
            INSERT INTO audit_log (table_name, record_id, action_type, changes)
            VALUES (TG_TABLE_NAME, to_jsonb(OLD.id), 'DELETE', to_jsonb(OLD));
            RETURN OLD;
        END IF;
        
        RETURN NULL;
    END;
    $$ language 'plpgsql';
  `);

  // Create triggers
  const triggerQueries = [
    // Updated_at triggers
    'DROP TRIGGER IF EXISTS update_vendor_company_updated_at ON vendor_company',
    'CREATE TRIGGER update_vendor_company_updated_at BEFORE UPDATE ON vendor_company FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    
    'DROP TRIGGER IF EXISTS update_vendor_contact_updated_at ON vendor_contact',
    'CREATE TRIGGER update_vendor_contact_updated_at BEFORE UPDATE ON vendor_contact FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
    
    'DROP TRIGGER IF EXISTS update_vendor_address_updated_at ON vendor_address',
    'CREATE TRIGGER update_vendor_address_updated_at BEFORE UPDATE ON vendor_address FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',

    // Account security triggers
    'DROP TRIGGER IF EXISTS handle_failed_login_trigger ON "user"',
    'CREATE TRIGGER handle_failed_login_trigger BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION handle_failed_login()',
    
    'DROP TRIGGER IF EXISTS auto_unlock_account_trigger ON "user"',
    'CREATE TRIGGER auto_unlock_account_trigger BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION auto_unlock_account()',

    // Audit logging triggers (optional - can be enabled/disabled)
    'DROP TRIGGER IF EXISTS audit_user_changes ON "user"',
    'CREATE TRIGGER audit_user_changes AFTER INSERT OR UPDATE OR DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    
    'DROP TRIGGER IF EXISTS audit_vendor_company_changes ON vendor_company',
    'CREATE TRIGGER audit_vendor_company_changes AFTER INSERT OR UPDATE OR DELETE ON vendor_company FOR EACH ROW EXECUTE FUNCTION log_user_activity()',
    
    'DROP TRIGGER IF EXISTS audit_equipment_changes ON equipment',
    'CREATE TRIGGER audit_equipment_changes AFTER INSERT OR UPDATE OR DELETE ON equipment FOR EACH ROW EXECUTE FUNCTION log_user_activity()'
  ];

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
 * Check if the current user has sufficient database permissions
 */
const checkDatabasePermissions = async (): Promise<void> => {
  try {
    // Test if we can create a temporary table
    const testTableName = 'temp_permission_test_' + Date.now();
    
    await pool.query(`CREATE TEMP TABLE ${testTableName} (id SERIAL)`);
    await pool.query(`DROP TABLE ${testTableName}`);
    
    console.log('✅ Database permissions verified');
  } catch (error: any) {
    if (error.code === '42501') {
      console.error('❌ Insufficient database permissions!');
      console.error('');
      console.error('To fix this, run the following command as the PostgreSQL superuser:');
      console.error(`psql -U postgres -f setup_database.sql`);
      console.error('');
      console.error('Or manually grant permissions:');
      console.error(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${process.env.DB_USER};`);
      console.error(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${process.env.DB_USER};`);
      console.error(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${process.env.DB_USER};`);
      console.error('');
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
    // Check if we already have users
    const userCountResult = await pool.query('SELECT COUNT(*) FROM "user"');
    const userCount = parseInt(userCountResult.rows[0].count);

    if (userCount > 0) {
      console.log('📊 Database already contains data, skipping seed');
      return;
    }

    console.log('🌱 Seeding initial data...');

    // Create roles
    await seedRoles();

    // Create permissions
    await seedPermissions();

    // Create specializations
    await seedSpecializations();

    // Create initial admin user
    await seedAdminUser();

    // Create mock vendor users with detailed information
    await seedMockVendors();

    // Create mock client users
    await seedMockClients();

    // Create mock equipment data
    await seedMockEquipment();

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
    { role_name: 'vendor', description: 'Vendor with client management capabilities' },
    { role_name: 'client', description: 'Client with equipment viewing capabilities' }
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
    { permission_name: 'view_reports', description: 'View vendor reports', category: 'vendor' },
    
    // Client permissions
    { permission_name: 'view_equipment', description: 'View assigned equipment', category: 'client' },
    { permission_name: 'submit_requests', description: 'Submit service requests', category: 'client' },
    { permission_name: 'view_notifications', description: 'View notifications', category: 'client' }
  ];

  for (const permission of permissions) {
    await pool.query(
      'INSERT INTO permission (permission_name, description, category) VALUES ($1, $2, $3) ON CONFLICT (permission_name) DO NOTHING',
      [permission.permission_name, permission.description, permission.category]
    );
  }

  console.log('✅ Permissions seeded');
};

/**
 * Seed admin user
 */
const seedAdminUser = async (): Promise<void> => {
  // Get admin role ID
  const roleResult = await pool.query('SELECT id FROM role WHERE role_name = $1', ['admin']);
  const roleId = roleResult.rows[0]?.id;

  if (!roleId) {
    throw new Error('Admin role not found');
  }

  // Hash password
  const password = 'FireGuardian2024!';
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create admin user
  await pool.query(
    `INSERT INTO "user" (first_name, last_name, email, password, user_type, role_id) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     ON CONFLICT (email) DO NOTHING`,
    ['Super', 'Admin', 'admin@fireguardian.com', hashedPassword, 'admin', roleId]
  );

  console.log('✅ Admin user seeded');
  console.log('📧 Admin email: admin@fireguardian.com');
  console.log('🔑 Admin password: FireGuardian2024!');
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
    { name: 'Emergency Equipment', description: 'General emergency equipment', category: 'Equipment' },
    { name: 'Fire Safety Inspections', description: 'Regular fire safety inspections', category: 'Service' },
    { name: 'Fire Safety Training', description: 'Fire safety training programs', category: 'Service' },
    { name: 'Hazmat Services', description: 'Hazardous material handling', category: 'Service' }
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
 * Seed mock vendor users with detailed information
 */
const seedMockVendors = async (): Promise<void> => {
  const password = 'VendorPass123!';
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const vendors = [
    {
      // User info
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@firesafetyplus.com',
      
      // Company info
      company_name: 'Fire Safety Plus Ltd',
      business_type: 'Corporation',
      license_number: 'FS-2024-001',
      tax_id: 'TAX-FSP-001',
      website: 'https://firesafetyplus.com',
      years_in_business: 15,
      employee_count: 25,
      service_areas: 'Colombo, Gampaha, Kalutara',
      certifications: 'ISO 9001:2015, NFPA Certified',
      notes: 'Leading fire safety equipment provider in Sri Lanka',
      
      // Contact info
      contact_person_name: 'John Smith',
      contact_title: 'Operations Manager',
      primary_email: 'john@firesafetyplus.com',
      secondary_email: 'operations@firesafetyplus.com',
      primary_phone: '+94771234567',
      secondary_phone: '+94112345678',
      
      // Address info
      street_address: '123 Galle Road, Bambalapitiya',
      city: 'Colombo',
      state: 'Western Province',
      zip_code: '00400',
      
      // Specializations
      specializations: ['Fire Extinguishers', 'Fire Alarms', 'Fire Safety Inspections']
    },
    {
      // User info
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah@emerguard.lk',
      
      // Company info
      company_name: 'EmeguGuard Solutions',
      business_type: 'LLC',
      license_number: 'FS-2024-002',
      tax_id: 'TAX-EGS-002',
      website: 'https://emerguard.lk',
      years_in_business: 8,
      employee_count: 12,
      service_areas: 'Kandy, Matale, Nuwara Eliya',
      certifications: 'NFPA 10, NFPA 72',
      notes: 'Specialized in fire suppression systems for commercial buildings',
      
      // Contact info
      contact_person_name: 'Sarah Johnson',
      contact_title: 'Technical Director',
      primary_email: 'sarah@emerguard.lk',
      secondary_email: 'tech@emerguard.lk',
      primary_phone: '+94771234568',
      secondary_phone: '+94812345679',
      
      // Address info
      street_address: '45 Peradeniya Road, Kandy',
      city: 'Kandy',
      state: 'Central Province',
      zip_code: '20000',
      
      // Specializations
      specializations: ['Sprinkler Systems', 'Fire Suppression Systems', 'Emergency Equipment']
    },
    {
      // User info
      first_name: 'Michael',
      last_name: 'Fernando',
      email: 'michael@securefires.com',
      
      // Company info
      company_name: 'SecureFire Systems',
      business_type: 'Partnership',
      license_number: 'FS-2024-003',
      tax_id: 'TAX-SFS-003',
      website: 'https://securefires.com',
      years_in_business: 12,
      employee_count: 18,
      service_areas: 'Galle, Hambantota, Matara',
      certifications: 'NFPA 13, NFPA 20, Fire Safety Engineering',
      notes: 'Expert in industrial fire safety solutions',
      
      // Contact info
      contact_person_name: 'Michael Fernando',
      contact_title: 'Managing Partner',
      primary_email: 'michael@securefires.com',
      secondary_email: 'info@securefires.com',
      primary_phone: '+94771234569',
      secondary_phone: '+94912345680',
      
      // Address info
      street_address: '78 Wakwella Road, Galle',
      city: 'Galle',
      state: 'Southern Province',
      zip_code: '80000',
      
      // Specializations
      specializations: ['Emergency Lighting', 'Exit Signs', 'Fire Safety Training', 'Hazmat Services']
    }
  ];

  for (const vendor of vendors) {
    // Create user
    const userResult = await pool.query(
      `INSERT INTO "user" (first_name, last_name, email, password, user_type) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [vendor.first_name, vendor.last_name, vendor.email, hashedPassword, 'vendor']
    );

    if (userResult.rows.length > 0) {
      const vendorId = userResult.rows[0].id;

      // Create company record
      await pool.query(
        `INSERT INTO vendor_company (
          vendor_id, company_name, business_type, license_number, tax_id,
          website, years_in_business, employee_count, service_areas, certifications, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          vendorId, vendor.company_name, vendor.business_type, vendor.license_number,
          vendor.tax_id, vendor.website, vendor.years_in_business, vendor.employee_count,
          vendor.service_areas, vendor.certifications, vendor.notes
        ]
      );

      // Create contact record
      await pool.query(
        `INSERT INTO vendor_contact (
          vendor_id, contact_person_name, contact_title, primary_email, secondary_email,
          primary_phone, secondary_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          vendorId, vendor.contact_person_name, vendor.contact_title, vendor.primary_email,
          vendor.secondary_email, vendor.primary_phone, vendor.secondary_phone
        ]
      );

      // Create address record
      await pool.query(
        `INSERT INTO vendor_address (
          vendor_id, street_address, city, state, zip_code, country, is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          vendorId, vendor.street_address, vendor.city, vendor.state,
          vendor.zip_code, 'Sri Lanka', true
        ]
      );

      // Add specializations
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

      // Create vendor location
      await pool.query(
        `INSERT INTO vendor_location (vendor_id, location_name, address, phone, email)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          vendorId,
          `${vendor.company_name} - Main Office`,
          `${vendor.street_address}, ${vendor.city}`,
          vendor.primary_phone,
          vendor.primary_email
        ]
      );
    }
  }

  console.log('✅ Mock vendors seeded');
  console.log('🔑 Vendor login credentials:');
  console.log('   📧 john@firesafetyplus.com | 🔑 VendorPass123!');
  console.log('   📧 sarah@emerguard.lk | 🔑 VendorPass123!');
  console.log('   📧 michael@securefires.com | 🔑 VendorPass123!');
};

/**
 * Seed mock client users
 */
const seedMockClients = async (): Promise<void> => {
  const password = 'ClientPass123!';
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const clients = [
    { first_name: 'David', last_name: 'Perera', email: 'david@grandhotel.lk' },
    { first_name: 'Priya', last_name: 'Silva', email: 'priya@techcorp.lk' },
    { first_name: 'James', last_name: 'Wilson', email: 'james@retailmax.com' },
    { first_name: 'Nishani', last_name: 'Jayawardena', email: 'nishani@hospitalgroup.lk' },
    { first_name: 'Robert', last_name: 'Brown', email: 'robert@manufacturing.lk' }
  ];

  for (const client of clients) {
    await pool.query(
      `INSERT INTO "user" (first_name, last_name, email, password, user_type) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (email) DO NOTHING`,
      [client.first_name, client.last_name, client.email, hashedPassword, 'client']
    );
  }

  console.log('✅ Mock clients seeded');
  console.log('🔑 Client login password: ClientPass123!');
};

/**
 * Seed mock equipment data
 */
const seedMockEquipment = async (): Promise<void> => {
  const equipment = [
    { equipment_code: 'FE-001', equipment_name: 'Dry Powder Fire Extinguisher 5kg', description: 'ABC dry powder fire extinguisher suitable for Class A, B, and C fires' },
    { equipment_code: 'FE-002', equipment_name: 'CO2 Fire Extinguisher 2kg', description: 'Carbon dioxide fire extinguisher for electrical fires' },
    { equipment_code: 'FE-003', equipment_name: 'Foam Fire Extinguisher 9L', description: 'AFFF foam fire extinguisher for Class A and B fires' },
    { equipment_code: 'FA-001', equipment_name: 'Conventional Fire Alarm Panel', description: '8-zone conventional fire alarm control panel' },
    { equipment_code: 'FA-002', equipment_name: 'Addressable Fire Alarm Panel', description: '64-device addressable fire alarm control panel' },
    { equipment_code: 'FA-003', equipment_name: 'Smoke Detector', description: 'Optical smoke detector with base' },
    { equipment_code: 'EL-001', equipment_name: 'LED Emergency Light', description: '3W LED emergency light with 3-hour backup' },
    { equipment_code: 'EL-002', equipment_name: 'Exit Sign', description: 'LED illuminated exit sign with battery backup' },
    { equipment_code: 'SP-001', equipment_name: 'Sprinkler Head', description: 'Standard response sprinkler head 68°C' },
    { equipment_code: 'SP-002', equipment_name: 'Fire Hose Reel', description: '25m fire hose reel with automatic rewinding' }
  ];

  for (const equip of equipment) {
    await pool.query(
      'INSERT INTO equipment (equipment_code, equipment_name, description) VALUES ($1, $2, $3) ON CONFLICT (equipment_code) DO NOTHING',
      [equip.equipment_code, equip.equipment_name, equip.description]
    );
  }

  console.log('✅ Mock equipment seeded');
};

/**
 * Reset database (drop all tables and recreate)
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Resetting database...');

    // Drop all tables in correct order (reverse of dependencies)
    const dropQueries = [
      'DROP TABLE IF EXISTS vendor_specialization CASCADE',
      'DROP TABLE IF EXISTS specialization CASCADE',
      'DROP TABLE IF EXISTS vendor_address CASCADE',
      'DROP TABLE IF EXISTS vendor_contact CASCADE',
      'DROP TABLE IF EXISTS vendor_company CASCADE',
      'DROP TABLE IF EXISTS password_reset CASCADE',
      'DROP TABLE IF EXISTS audit_log CASCADE',
      'DROP TABLE IF EXISTS notification CASCADE',
      'DROP TABLE IF EXISTS equipment_return_item CASCADE',
      'DROP TABLE IF EXISTS equipment_return CASCADE',
      'DROP TABLE IF EXISTS assignment_item CASCADE',
      'DROP TABLE IF EXISTS equipment_assignment CASCADE',
      'DROP TABLE IF EXISTS equipment_instance CASCADE',
      'DROP TABLE IF EXISTS equipment CASCADE',
      'DROP TABLE IF EXISTS vendor_location CASCADE',
      'DROP TABLE IF EXISTS role_permission CASCADE',
      'DROP TABLE IF EXISTS permission CASCADE',
      'DROP TABLE IF EXISTS role CASCADE',
      'DROP TABLE IF EXISTS "user" CASCADE'
    ];

    for (const query of dropQueries) {
      await pool.query(query);
    }

    console.log('✅ All tables dropped');

    // Reinitialize
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
    // Check if user table exists and has data
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

    // Check if we have any users
    const userCount = await pool.query('SELECT COUNT(*) FROM "user"');
    return parseInt(userCount.rows[0].count) > 0;

  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
};