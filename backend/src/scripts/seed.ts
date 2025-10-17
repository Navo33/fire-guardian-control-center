/**
 * Database Seed Runner
 * Manages seeding of initial data
 */

import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

/**
 * Seed all initial data
 */
export const seedAll = async (): Promise<void> => {
  console.log('🌱 Seeding database...');
  
  await seedRoles();
  await seedPermissions();
  await seedSpecializations();
  await seedAdminUser();
  await seedMockVendors();
  await seedMockClients();
  await seedMockEquipment();
  await seedMockEquipmentInstances();
  await seedMockAssignments();
  await seedMockMaintenanceTickets();
  
  console.log('✅ All seeds completed');
};

/**
 * Seed roles
 */
export const seedRoles = async (): Promise<void> => {
  const roles = ['admin', 'vendor', 'client'];
  
  for (const role of roles) {
    await pool.query(
      `INSERT INTO role (role_name, description) 
       VALUES ($1, $2) 
       ON CONFLICT (role_name) DO NOTHING`,
      [role, `${role.charAt(0).toUpperCase() + role.slice(1)} role`]
    );
  }
  
  console.log('✅ Roles seeded');
};

/**
 * Seed permissions
 */
export const seedPermissions = async (): Promise<void> => {
  const permissions = [
    { name: 'manage_users', description: 'Create, update, delete users', category: 'user_management' },
    { name: 'view_users', description: 'View user information', category: 'user_management' },
    { name: 'manage_vendors', description: 'Manage vendor accounts', category: 'vendor_management' },
    { name: 'view_vendors', description: 'View vendor information', category: 'vendor_management' },
    { name: 'manage_clients', description: 'Manage client accounts', category: 'client_management' },
    { name: 'view_clients', description: 'View client information', category: 'client_management' },
    { name: 'manage_equipment', description: 'Manage equipment catalog', category: 'equipment_management' },
    { name: 'view_equipment', description: 'View equipment information', category: 'equipment_management' },
    { name: 'assign_equipment', description: 'Assign equipment to clients', category: 'equipment_management' },
    { name: 'manage_maintenance', description: 'Manage maintenance tickets', category: 'maintenance' },
    { name: 'view_maintenance', description: 'View maintenance information', category: 'maintenance' },
    { name: 'manage_permissions', description: 'Manage roles and permissions', category: 'system' },
    { name: 'view_audit_logs', description: 'View audit logs', category: 'system' },
    { name: 'system_settings', description: 'Manage system settings', category: 'system' }
  ];
  
  for (const perm of permissions) {
    await pool.query(
      `INSERT INTO permission (permission_name, description, category) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (permission_name) DO NOTHING`,
      [perm.name, perm.description, perm.category]
    );
  }
  
  console.log('✅ Permissions seeded');
};

/**
 * Seed specializations
 */
export const seedSpecializations = async (): Promise<void> => {
  const specializations = [
    { name: 'Fire Extinguisher Installation', category: 'Installation', certification_required: true },
    { name: 'Fire Alarm Systems', category: 'Installation', certification_required: true },
    { name: 'Sprinkler Systems', category: 'Installation', certification_required: true },
    { name: 'Fire Safety Inspection', category: 'Inspection', certification_required: true },
    { name: 'Emergency Lighting', category: 'Installation', certification_required: false },
    { name: 'Fire Door Installation', category: 'Installation', certification_required: true },
    { name: 'Fire Safety Training', category: 'Training', certification_required: false }
  ];
  
  for (const spec of specializations) {
    await pool.query(
      `INSERT INTO specialization (name, category, certification_required) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (name) DO NOTHING`,
      [spec.name, spec.category, spec.certification_required]
    );
  }
  
  console.log('✅ Specializations seeded');
};

/**
 * Seed admin user
 */
export const seedAdminUser = async (): Promise<void> => {
  const password = 'FireGuardian2024!';
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await pool.query(
    `INSERT INTO "user" (first_name, last_name, email, password, user_type, role_id) 
     VALUES ($1, $2, $3, $4, $5, (SELECT id FROM role WHERE role_name = 'admin')) 
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['Admin', 'User', 'admin@fireguardian.com', hashedPassword, 'admin']
  );
  
  if (result.rows.length > 0) {
    console.log('✅ Admin user created');
    console.log('🔑 Admin credentials: admin@fireguardian.com | FireGuardian2024!');
  } else {
    console.log('ℹ️  Admin user already exists');
  }
};

/**
 * Seed mock vendor users
 */
export const seedMockVendors = async (): Promise<void> => {
  const password = 'VendorPass2025!';
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  const vendors = [
    {
      first_name: 'Lakmal',
      last_name: 'Silva',
      email: 'lakmal@safefire.lk',
      company_name: 'SafeFire Solutions',
      business_type: 'Fire Safety Services',
      license_number: 'FS-2019-001',
      contact_person_name: 'Lakmal Silva',
      contact_title: 'Managing Director',
      primary_email: 'lakmal@safefire.lk',
      primary_phone: '+94 11 234 5678',
      street_address: '45 Ward Place, Colombo 07',
      city: 'Colombo',
      state: 'Western Province',
      zip_code: '00700',
      specializations: ['Fire Extinguisher Installation', 'Fire Safety Inspection']
    },
    {
      first_name: 'Nimali',
      last_name: 'Perera',
      email: 'nimali@proguard.lk',
      company_name: 'ProGuard Fire Systems',
      business_type: 'Fire Protection Equipment',
      license_number: 'FS-2018-045',
      contact_person_name: 'Nimali Perera',
      contact_title: 'Director',
      primary_email: 'nimali@proguard.lk',
      primary_phone: '+94 11 345 6789',
      street_address: '78 Duplication Road, Colombo 04',
      city: 'Colombo',
      state: 'Western Province',
      zip_code: '00400',
      specializations: ['Fire Alarm Systems', 'Sprinkler Systems']
    },
    {
      first_name: 'Ruwan',
      last_name: 'Bandara',
      email: 'ruwan@fireshield.lk',
      company_name: 'FireShield Technologies',
      business_type: 'Fire Safety Technology',
      license_number: 'FS-2020-089',
      contact_person_name: 'Ruwan Bandara',
      contact_title: 'CEO',
      primary_email: 'ruwan@fireshield.lk',
      primary_phone: '+94 81 456 7890',
      street_address: '12 Station Road, Kandy',
      city: 'Kandy',
      state: 'Central Province',
      zip_code: '20000',
      specializations: ['Fire Door Installation', 'Emergency Lighting']
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
        `INSERT INTO vendor_company (vendor_id, company_name, business_type, license_number) 
         VALUES ($1, $2, $3, $4)`,
        [vendorId, vendor.company_name, vendor.business_type, vendor.license_number]
      );
      
      await pool.query(
        `INSERT INTO vendor_contact (vendor_id, contact_person_name, contact_title, primary_email, primary_phone) 
         VALUES ($1, $2, $3, $4, $5)`,
        [vendorId, vendor.contact_person_name, vendor.contact_title, vendor.primary_email, vendor.primary_phone]
      );
      
      await pool.query(
        `INSERT INTO vendor_address (vendor_id, street_address, city, state, zip_code, country) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [vendorId, vendor.street_address, vendor.city, vendor.state, vendor.zip_code, 'Sri Lanka']
      );
      
      // Add specializations
      for (const specName of vendor.specializations) {
        await pool.query(
          `INSERT INTO vendor_specialization (vendor_id, specialization_id) 
           VALUES ($1, (SELECT id FROM specialization WHERE name = $2))
           ON CONFLICT DO NOTHING`,
          [vendorId, specName]
        );
      }
    }
  }
  
  console.log('✅ Mock vendors seeded');
  console.log('🔑 Vendor credentials: VendorPass2025!');
};

/**
 * Seed mock client users
 */
export const seedMockClients = async (): Promise<void> => {
  const password = 'ClientPass2025!';
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
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
      zip_code: '00300',
      created_by_vendor_email: 'lakmal@safefire.lk'
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
      zip_code: '00500',
      created_by_vendor_email: 'nimali@proguard.lk'
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
      zip_code: '80000',
      created_by_vendor_email: 'ruwan@fireshield.lk'
    }
  ];
  
  for (const client of clients) {
    const vendorResult = await pool.query(
      'SELECT id FROM "user" WHERE email = $1 AND user_type = $2',
      [client.created_by_vendor_email, 'vendor']
    );
    
    if (vendorResult.rows.length === 0) {
      console.log(`⚠️  Vendor not found: ${client.created_by_vendor_email}`);
      continue;
    }
    
    const vendorId = vendorResult.rows[0].id;
    
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
        `INSERT INTO client_company (client_id, created_by_vendor_id, company_name, business_type) 
         VALUES ($1, $2, $3, $4)`,
        [clientId, vendorId, client.company_name, client.business_type]
      );
      
      await pool.query(
        `INSERT INTO client_contact (client_id, created_by_vendor_id, contact_person_name, contact_title, primary_email, primary_phone) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, vendorId, client.contact_person_name, client.contact_title, client.primary_email, client.primary_phone]
      );
      
      await pool.query(
        `INSERT INTO client_address (client_id, created_by_vendor_id, street_address, city, state, zip_code, country) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [clientId, vendorId, client.street_address, client.city, client.state, client.zip_code, 'Sri Lanka']
      );
    }
  }
  
  console.log('✅ Mock clients seeded');
  console.log('🔑 Client credentials: ClientPass2025!');
};

/**
 * Seed mock equipment
 */
export const seedMockEquipment = async (): Promise<void> => {
  const equipment = [
    {
      equipment_code: 'FE-ABC-001',
      equipment_name: 'ABC Dry Powder Fire Extinguisher 9kg',
      equipment_type: 'Fire Extinguisher',
      manufacturer: 'FirePro Industries',
      model: 'FP-ABC-9KG',
      price: 15000.00
    },
    {
      equipment_code: 'FE-CO2-001',
      equipment_name: 'CO2 Fire Extinguisher 5kg',
      equipment_type: 'Fire Extinguisher',
      manufacturer: 'SafeGuard Systems',
      model: 'SG-CO2-5KG',
      price: 18000.00
    },
    {
      equipment_code: 'FA-SMOKE-001',
      equipment_name: 'Photoelectric Smoke Detector',
      equipment_type: 'Fire Alarm',
      manufacturer: 'AlertTech',
      model: 'AT-SD-100',
      price: 5000.00
    },
    {
      equipment_code: 'SP-HEAD-001',
      equipment_name: 'Standard Sprinkler Head',
      equipment_type: 'Sprinkler System',
      manufacturer: 'AquaFire',
      model: 'AF-SH-200',
      price: 3500.00
    },
    {
      equipment_code: 'EL-LED-001',
      equipment_name: 'LED Emergency Exit Light',
      equipment_type: 'Emergency Lighting',
      manufacturer: 'BrightPath',
      model: 'BP-EXIT-LED',
      price: 8000.00
    }
  ];
  
  for (const eq of equipment) {
    await pool.query(
      `INSERT INTO equipment (equipment_code, equipment_name, equipment_type, manufacturer, model, price) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (equipment_code) DO NOTHING`,
      [eq.equipment_code, eq.equipment_name, eq.equipment_type, eq.manufacturer, eq.model, eq.price]
    );
  }
  
  console.log('✅ Mock equipment seeded');
};

/**
 * Seed mock equipment instances
 */
export const seedMockEquipmentInstances = async (): Promise<void> => {
  const vendors = await pool.query('SELECT id FROM "user" WHERE user_type = $1 LIMIT 3', ['vendor']);
  const equipment = await pool.query('SELECT id FROM equipment LIMIT 5');
  
  if (vendors.rows.length === 0 || equipment.rows.length === 0) {
    console.log('⚠️  No vendors or equipment found, skipping equipment instances');
    return;
  }
  
  for (let i = 0; i < 10; i++) {
    const vendorId = vendors.rows[i % vendors.rows.length].id;
    const equipmentId = equipment.rows[i % equipment.rows.length].id;
    
    await pool.query(
      `INSERT INTO equipment_instance (
        equipment_id, serial_number, vendor_id, status, 
        purchase_date, warranty_expiry, next_maintenance_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (serial_number) DO NOTHING`,
      [
        equipmentId,
        `SN-${Date.now()}-${i}`,
        vendorId,
        'available',
        new Date(),
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)  // 6 months from now
      ]
    );
  }
  
  console.log('✅ Mock equipment instances seeded');
};

/**
 * Seed mock assignments
 */
export const seedMockAssignments = async (): Promise<void> => {
  const clients = await pool.query('SELECT id FROM "user" WHERE user_type = $1', ['client']);
  const vendors = await pool.query('SELECT id FROM "user" WHERE user_type = $1', ['vendor']);
  
  if (clients.rows.length === 0 || vendors.rows.length === 0) {
    console.log('⚠️  No clients or vendors found, skipping assignments');
    return;
  }
  
  for (let i = 0; i < clients.rows.length; i++) {
    const clientId = clients.rows[i].id;
    const vendorId = vendors.rows[i % vendors.rows.length].id;
    
    await pool.query(
      `INSERT INTO equipment_assignment (
        client_id, vendor_id, assignment_number, status, priority
      ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (assignment_number) DO NOTHING`,
      [clientId, vendorId, `ASG-${Date.now()}-${i}`, 'active', 'normal']
    );
  }
  
  console.log('✅ Mock assignments seeded');
};

/**
 * Seed mock maintenance tickets
 */
export const seedMockMaintenanceTickets = async (): Promise<void> => {
  const instances = await pool.query('SELECT id, vendor_id FROM equipment_instance LIMIT 5');
  const clients = await pool.query('SELECT id FROM "user" WHERE user_type = $1 LIMIT 3', ['client']);
  
  if (instances.rows.length === 0 || clients.rows.length === 0) {
    console.log('⚠️  No equipment instances or clients found, skipping tickets');
    return;
  }
  
  const issues = [
    'Pressure gauge showing low pressure',
    'Safety pin missing',
    'Annual inspection due',
    'Visible corrosion on cylinder',
    'Nozzle blockage detected'
  ];
  
  for (let i = 0; i < 5; i++) {
    const instance = instances.rows[i];
    const clientId = clients.rows[i % clients.rows.length].id;
    
    await pool.query(
      `INSERT INTO maintenance_ticket (
        ticket_number, equipment_instance_id, client_id, vendor_id,
        ticket_status, issue_description, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (ticket_number) DO NOTHING`,
      [
        `TKT-${Date.now()}-${i}`,
        instance.id,
        clientId,
        instance.vendor_id,
        'open',
        issues[i],
        'normal'
      ]
    );
  }
  
  console.log('✅ Mock maintenance tickets seeded');
};
