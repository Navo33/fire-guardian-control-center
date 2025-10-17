-- Fire Guardian Control Center Database Schema
-- Version: 1.0.0
-- Description: Complete database schema for fire safety equipment management

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (supports admin, vendor, and client user types)
CREATE TABLE IF NOT EXISTS "user" (
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
);

-- Roles table for permission management
CREATE TABLE IF NOT EXISTS role (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permission (
  id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permission (
  role_id INT REFERENCES role(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permission(id) ON DELETE CASCADE,
  granted_by INT REFERENCES "user"(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(role_id, permission_id)
);

-- ============================================================================
-- VENDOR TABLES
-- ============================================================================

-- Vendor company information
CREATE TABLE IF NOT EXISTS vendor_company (
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
);

-- Vendor contact information
CREATE TABLE IF NOT EXISTS vendor_contact (
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
);

-- Vendor address information
CREATE TABLE IF NOT EXISTS vendor_address (
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
);

-- ============================================================================
-- CLIENT TABLES
-- ============================================================================

-- Client company information (with vendor relationship)
CREATE TABLE IF NOT EXISTS client_company (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  created_by_vendor_id INT REFERENCES "user"(id) ON DELETE SET NULL,
  company_name VARCHAR(500) NOT NULL,
  business_type VARCHAR(100) NOT NULL,
  industry VARCHAR(100),
  tax_id VARCHAR(100),
  website VARCHAR(500),
  employee_count INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client contact information
CREATE TABLE IF NOT EXISTS client_contact (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  created_by_vendor_id INT REFERENCES "user"(id) ON DELETE SET NULL,
  contact_person_name VARCHAR(200) NOT NULL,
  contact_title VARCHAR(150),
  primary_email VARCHAR(320) NOT NULL,
  primary_phone VARCHAR(50) NOT NULL,
  secondary_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client address information
CREATE TABLE IF NOT EXISTS client_address (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  created_by_vendor_id INT REFERENCES "user"(id) ON DELETE SET NULL,
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
);

-- ============================================================================
-- SPECIALIZATION TABLES
-- ============================================================================

-- Specializations (fire safety certifications, skills, etc.)
CREATE TABLE IF NOT EXISTS specialization (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  certification_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendor specializations (many-to-many)
CREATE TABLE IF NOT EXISTS vendor_specialization (
  vendor_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  specialization_id INT REFERENCES specialization(id) ON DELETE CASCADE,
  certification_number VARCHAR(200),
  certification_expiry DATE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(vendor_id, specialization_id)
);

-- ============================================================================
-- EQUIPMENT TABLES
-- ============================================================================

-- Equipment catalog (types/models of equipment)
CREATE TABLE IF NOT EXISTS equipment (
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
);

-- Equipment instances (actual physical equipment units)
CREATE TABLE IF NOT EXISTS equipment_instance (
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
);

-- Equipment assignments (tracking which vendor assigned equipment to which client)
CREATE TABLE IF NOT EXISTS equipment_assignment (
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
);

-- Assignment items (specific equipment instances in an assignment)
CREATE TABLE IF NOT EXISTS assignment_item (
  assignment_id INT REFERENCES equipment_assignment(id) ON DELETE CASCADE,
  equipment_instance_id INT REFERENCES equipment_instance(id),
  quantity INT DEFAULT 1,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  notes TEXT,
  PRIMARY KEY(assignment_id, equipment_instance_id)
);

-- ============================================================================
-- MAINTENANCE TABLES
-- ============================================================================

-- Maintenance tickets
CREATE TABLE IF NOT EXISTS maintenance_ticket (
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
);

-- ============================================================================
-- NOTIFICATION & AUDIT TABLES
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notification (
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
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
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
);

-- ============================================================================
-- SECURITY TABLES
-- ============================================================================

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  reset_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INT,
  success BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_type ON "user"(user_type);
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "user"(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_is_locked ON "user"(is_locked);
CREATE INDEX IF NOT EXISTS idx_user_last_login ON "user"(last_login);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user"(created_at);

-- Vendor indexes
CREATE INDEX IF NOT EXISTS idx_vendor_company_vendor_id ON vendor_company(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_company_name ON vendor_company(company_name);
CREATE INDEX IF NOT EXISTS idx_vendor_company_business_type ON vendor_company(business_type);
CREATE INDEX IF NOT EXISTS idx_vendor_contact_vendor_id ON vendor_contact(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contact_email ON vendor_contact(primary_email);
CREATE INDEX IF NOT EXISTS idx_vendor_address_vendor_id ON vendor_address(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_address_type ON vendor_address(address_type);

-- Client indexes
CREATE INDEX IF NOT EXISTS idx_client_company_client_id ON client_company(client_id);
CREATE INDEX IF NOT EXISTS idx_client_company_created_by_vendor ON client_company(created_by_vendor_id);
CREATE INDEX IF NOT EXISTS idx_client_company_name ON client_company(company_name);
CREATE INDEX IF NOT EXISTS idx_client_contact_client_id ON client_contact(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contact_created_by_vendor ON client_contact(created_by_vendor_id);
CREATE INDEX IF NOT EXISTS idx_client_contact_email ON client_contact(primary_email);
CREATE INDEX IF NOT EXISTS idx_client_address_client_id ON client_address(client_id);
CREATE INDEX IF NOT EXISTS idx_client_address_created_by_vendor ON client_address(created_by_vendor_id);

-- Specialization indexes
CREATE INDEX IF NOT EXISTS idx_vendor_specialization_vendor_id ON vendor_specialization(vendor_id);
CREATE INDEX IF NOT EXISTS idx_specialization_name ON specialization(name);
CREATE INDEX IF NOT EXISTS idx_specialization_category ON specialization(category);

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment(equipment_code);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(equipment_name);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_manufacturer ON equipment(manufacturer);
CREATE INDEX IF NOT EXISTS idx_equipment_deleted_at ON equipment(deleted_at);

-- Equipment instance indexes
CREATE INDEX IF NOT EXISTS idx_equipment_instance_serial ON equipment_instance(serial_number);
CREATE INDEX IF NOT EXISTS idx_equipment_instance_status ON equipment_instance(status);
CREATE INDEX IF NOT EXISTS idx_equipment_instance_vendor_id ON equipment_instance(vendor_id);
CREATE INDEX IF NOT EXISTS idx_equipment_instance_assigned_to ON equipment_instance(assigned_to);
CREATE INDEX IF NOT EXISTS idx_equipment_instance_expiry ON equipment_instance(expiry_date);
CREATE INDEX IF NOT EXISTS idx_equipment_instance_warranty_expiry ON equipment_instance(warranty_expiry);
CREATE INDEX IF NOT EXISTS idx_equipment_instance_next_maintenance ON equipment_instance(next_maintenance_date);

-- Assignment indexes
CREATE INDEX IF NOT EXISTS idx_equipment_assignment_client_id ON equipment_assignment(client_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignment_vendor_id ON equipment_assignment(vendor_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignment_status ON equipment_assignment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_assignment_priority ON equipment_assignment(priority);
CREATE INDEX IF NOT EXISTS idx_equipment_assignment_number ON equipment_assignment(assignment_number);

-- Maintenance indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_equipment_id ON maintenance_ticket(equipment_instance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_client_id ON maintenance_ticket(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_vendor_id ON maintenance_ticket(vendor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_technician ON maintenance_ticket(assigned_technician);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_status ON maintenance_ticket(ticket_status);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_priority ON maintenance_ticket(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_category ON maintenance_ticket(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_number ON maintenance_ticket(ticket_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_scheduled_date ON maintenance_ticket(scheduled_date);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_is_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);
CREATE INDEX IF NOT EXISTS idx_notification_priority ON notification(priority);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_expires_at ON notification(expires_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_ip_address ON audit_log(ip_address);

-- Password reset indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_used ON password_reset(used);

-- Role/Permission indexes
CREATE INDEX IF NOT EXISTS idx_role_name ON role(role_name);
CREATE INDEX IF NOT EXISTS idx_permission_name ON permission(permission_name);
CREATE INDEX IF NOT EXISTS idx_permission_category ON permission(category);
CREATE INDEX IF NOT EXISTS idx_role_permission_role_id ON role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission_id ON role_permission(permission_id);
