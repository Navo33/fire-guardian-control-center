-- Fire Guardian Control Center Database Schema
-- Generated on 2025-10-25 11:21 AM +0530
-- Drops all existing tables and creates a new schema to support admin and vendor needs, including system_settings.

-- Drop all existing tables to ensure clean setup
DROP TABLE IF EXISTS public.schema_migrations CASCADE;
DROP TABLE IF EXISTS public.user CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.role CASCADE;
DROP TABLE IF EXISTS public.role_permission CASCADE;
DROP TABLE IF EXISTS public.permission CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.vendor_specialization CASCADE;
DROP TABLE IF EXISTS public.specialization CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.equipment_instance CASCADE;
DROP TABLE IF EXISTS public.equipment_assignment CASCADE;
DROP TABLE IF EXISTS public.assignment_item CASCADE;
DROP TABLE IF EXISTS public.maintenance_ticket CASCADE;
DROP TABLE IF EXISTS public.notification CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.password_reset CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- Sequence and Table: schema_migrations
CREATE SEQUENCE IF NOT EXISTS schema_migrations_id_seq;
CREATE TABLE public.schema_migrations (
    id int4 NOT NULL DEFAULT nextval('schema_migrations_id_seq'::regclass),
    migration_name varchar(255) NOT NULL,
    executed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms int4,
    success bool DEFAULT true,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX schema_migrations_migration_name_key ON public.schema_migrations USING btree (migration_name);

-- Sequence and Table: user
CREATE SEQUENCE IF NOT EXISTS user_id_seq;
CREATE TABLE public.user (
    id int4 NOT NULL DEFAULT nextval('user_id_seq'::regclass),
    first_name varchar(100),
    last_name varchar(100),
    display_name varchar(200),
    email varchar(320) NOT NULL,
    password varchar(255) NOT NULL,
    user_type varchar(20) NOT NULL,
    role_id int4,
    is_locked bool DEFAULT false,
    locked_until timestamp,
    failed_login_attempts int2 DEFAULT 0,
    last_login timestamp,
    last_login_ip inet,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz,
    last_password_change timestamptz DEFAULT CURRENT_TIMESTAMP,
    is_temporary_password bool DEFAULT false,
    phone varchar(50),
    avatar_url varchar(500),
    bio text,
    CONSTRAINT check_user_type CHECK (user_type IN ('admin', 'vendor', 'client')),
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX user_email_key ON public.user USING btree (email);
CREATE INDEX idx_user_email ON public.user USING btree (email);
CREATE INDEX idx_user_type ON public.user USING btree (user_type);
CREATE INDEX idx_user_deleted_at ON public.user USING btree (deleted_at);
CREATE INDEX idx_user_is_locked ON public.user USING btree (is_locked);
CREATE INDEX idx_user_last_login ON public.user USING btree (last_login);
CREATE INDEX idx_user_created_at ON public.user USING btree (created_at);
CREATE INDEX idx_user_is_temporary_password ON public.user USING btree (is_temporary_password);
CREATE INDEX idx_user_last_password_change ON public.user USING btree (last_password_change);

-- Sequence and Table: system_settings
CREATE SEQUENCE IF NOT EXISTS system_settings_id_seq;
CREATE TABLE public.system_settings (
    id int4 NOT NULL DEFAULT nextval('system_settings_id_seq'::regclass),
    setting_key varchar(100) NOT NULL,
    setting_value text NOT NULL,
    setting_type varchar(50) NOT NULL,
    description text,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_by int4,
    CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user(id) ON DELETE SET NULL,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX system_settings_setting_key_key ON public.system_settings USING btree (setting_key);
CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);

-- Sequence and Table: role
CREATE SEQUENCE IF NOT EXISTS role_id_seq;
CREATE TABLE public.role (
    id int4 NOT NULL DEFAULT nextval('role_id_seq'::regclass),
    role_name varchar(100) NOT NULL,
    description text,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX role_role_name_key ON public.role USING btree (role_name);
CREATE INDEX idx_role_name ON public.role USING btree (role_name);

-- Sequence and Table: permission
CREATE SEQUENCE IF NOT EXISTS permission_id_seq;
CREATE TABLE public.permission (
    id int4 NOT NULL DEFAULT nextval('permission_id_seq'::regclass),
    permission_name varchar(100) NOT NULL,
    description text,
    category varchar(100) NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX permission_permission_name_key ON public.permission USING btree (permission_name);
CREATE INDEX idx_permission_name ON public.permission USING btree (permission_name);
CREATE INDEX idx_permission_category ON public.permission USING btree (category);

-- Table: role_permission
CREATE TABLE public.role_permission (
    role_id int4 NOT NULL,
    permission_id int4 NOT NULL,
    granted_by int4,
    granted_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_permission_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(id) ON DELETE CASCADE,
    CONSTRAINT role_permission_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permission(id) ON DELETE CASCADE,
    CONSTRAINT role_permission_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user(id),
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permission_role_id ON public.role_permission USING btree (role_id);
CREATE INDEX idx_role_permission_permission_id ON public.role_permission USING btree (permission_id);

-- Sequence and Table: specialization (needs to be created before vendor_specialization)
CREATE SEQUENCE IF NOT EXISTS specialization_id_seq;
CREATE TABLE public.specialization (
    id int4 NOT NULL DEFAULT nextval('specialization_id_seq'::regclass),
    name varchar(200) NOT NULL,
    description text,
    category varchar(100),
    certification_required bool DEFAULT false,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX specialization_name_key ON public.specialization USING btree (name);
CREATE INDEX idx_specialization_name ON public.specialization USING btree (name);
CREATE INDEX idx_specialization_category ON public.specialization USING btree (category);

-- Sequence and Table: vendors
CREATE SEQUENCE IF NOT EXISTS vendor_id_seq;
CREATE TABLE public.vendors (
    id int4 NOT NULL DEFAULT nextval('vendor_id_seq'::regclass),
    user_id int4 NOT NULL,
    company_name varchar(500) NOT NULL,
    business_type varchar(100) NOT NULL,
    license_number varchar(200),
    primary_phone varchar(50),
    street_address text,
    city varchar(200),
    state varchar(200),
    zip_code varchar(50),
    country varchar(200) DEFAULT 'Sri Lanka',
    status varchar(20) DEFAULT 'active',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE,
    CONSTRAINT check_vendor_status CHECK (status IN ('active', 'inactive', 'pending')),
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX vendors_user_id_key ON public.vendors USING btree (user_id);
CREATE INDEX idx_vendors_company_name ON public.vendors USING btree (company_name);
CREATE INDEX idx_vendors_business_type ON public.vendors USING btree (business_type);
CREATE INDEX idx_vendors_status ON public.vendors USING btree (status);

-- Sequence and Table: clients
CREATE SEQUENCE IF NOT EXISTS client_id_seq;
CREATE TABLE public.clients (
    id int4 NOT NULL DEFAULT nextval('client_id_seq'::regclass),
    user_id int4 NOT NULL,
    created_by_vendor_id int4,
    company_name varchar(500) NOT NULL,
    business_type varchar(100),
    primary_phone varchar(50),
    street_address text,
    city varchar(200),
    state varchar(200),
    zip_code varchar(50),
    country varchar(200) DEFAULT 'Sri Lanka',
    status varchar(20) DEFAULT 'active',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE,
    CONSTRAINT clients_created_by_vendor_id_fkey FOREIGN KEY (created_by_vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL,
    CONSTRAINT check_client_status CHECK (status IN ('active', 'inactive', 'pending')),
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX clients_user_id_key ON public.clients USING btree (user_id);
CREATE INDEX idx_clients_company_name ON public.clients USING btree (company_name);
CREATE INDEX idx_clients_created_by_vendor_id ON public.clients USING btree (created_by_vendor_id);
CREATE INDEX idx_clients_status ON public.clients USING btree (status);

-- Table: vendor_specialization
CREATE TABLE public.vendor_specialization (
    vendor_id int4 NOT NULL,
    specialization_id int4 NOT NULL,
    certification_number varchar(200),
    certification_expiry date,
    added_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendor_specialization_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
    CONSTRAINT vendor_specialization_specialization_id_fkey FOREIGN KEY (specialization_id) REFERENCES public.specialization(id) ON DELETE CASCADE,
    PRIMARY KEY (vendor_id, specialization_id)
);
CREATE INDEX idx_vendor_specialization_vendor_id ON public.vendor_specialization USING btree (vendor_id);

-- Sequence and Table: equipment
CREATE SEQUENCE IF NOT EXISTS equipment_id_seq;
CREATE TABLE public.equipment (
    id int4 NOT NULL DEFAULT nextval('equipment_id_seq'::regclass),
    vendor_id int4 NOT NULL,
    equipment_code varchar(100),
    equipment_name varchar(300) NOT NULL,
    description text,
    equipment_type varchar(100) NOT NULL,
    manufacturer varchar(200),
    model varchar(200),
    specifications jsonb,
    weight_kg numeric(8,2),
    dimensions varchar(100),
    warranty_years int2,
    default_lifespan_years int2,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz,
    CONSTRAINT equipment_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX equipment_equipment_code_key ON public.equipment USING btree (equipment_code);
CREATE INDEX idx_equipment_code ON public.equipment USING btree (equipment_code);
CREATE INDEX idx_equipment_name ON public.equipment USING btree (equipment_name);
CREATE INDEX idx_equipment_type ON public.equipment USING btree (equipment_type);
CREATE INDEX idx_equipment_manufacturer ON public.equipment USING btree (manufacturer);
CREATE INDEX idx_equipment_vendor_id ON public.equipment USING btree (vendor_id);
CREATE INDEX idx_equipment_deleted_at ON public.equipment USING btree (deleted_at);

-- Sequence and Table: equipment_instance
CREATE SEQUENCE IF NOT EXISTS equipment_instance_id_seq;
CREATE TABLE public.equipment_instance (
    id int4 NOT NULL DEFAULT nextval('equipment_instance_id_seq'::regclass),
    equipment_id int4,
    serial_number varchar(200),
    asset_tag varchar(100),
    vendor_id int4,
    status varchar(30) NOT NULL DEFAULT 'available',
    condition_rating int2 DEFAULT 5,
    assigned_to int4,
    assigned_at timestamptz,
    purchase_date date,
    warranty_expiry date,
    expiry_date date NOT NULL,
    last_maintenance_date date,
    next_maintenance_date date,
    maintenance_interval_days int4 DEFAULT 365,
    location text,
    notes text,
    compliance_status varchar(20) DEFAULT 'compliant',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz,
    CONSTRAINT equipment_instance_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id),
    CONSTRAINT equipment_instance_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
    CONSTRAINT equipment_instance_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.clients(id),
    CONSTRAINT check_expiry_date CHECK (expiry_date >= purchase_date),
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX equipment_instance_serial_number_key ON public.equipment_instance USING btree (serial_number);
CREATE INDEX idx_equipment_instance_serial ON public.equipment_instance USING btree (serial_number);
CREATE INDEX idx_equipment_instance_status ON public.equipment_instance USING btree (status);
CREATE INDEX idx_equipment_instance_vendor_id ON public.equipment_instance USING btree (vendor_id);
CREATE INDEX idx_equipment_instance_assigned_to ON public.equipment_instance USING btree (assigned_to);
CREATE INDEX idx_equipment_instance_expiry ON public.equipment_instance USING btree (expiry_date);
CREATE INDEX idx_equipment_instance_warranty_expiry ON public.equipment_instance USING btree (warranty_expiry);
CREATE INDEX idx_equipment_instance_next_maintenance ON public.equipment_instance USING btree (next_maintenance_date);
CREATE INDEX idx_equipment_instance_compliance_status ON public.equipment_instance USING btree (compliance_status);

-- Sequence and Table: equipment_assignment
CREATE SEQUENCE IF NOT EXISTS equipment_assignment_id_seq;
CREATE TABLE public.equipment_assignment (
    id int4 NOT NULL DEFAULT nextval('equipment_assignment_id_seq'::regclass),
    client_id int4,
    vendor_id int4,
    assignment_number varchar(100),
    assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    status varchar(30) NOT NULL DEFAULT 'active',
    priority varchar(20) DEFAULT 'normal',
    notes text,
    start_date date,
    end_date date,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT equipment_assignment_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
    CONSTRAINT equipment_assignment_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX equipment_assignment_assignment_number_key ON public.equipment_assignment USING btree (assignment_number);
CREATE INDEX idx_equipment_assignment_client_id ON public.equipment_assignment USING btree (client_id);
CREATE INDEX idx_equipment_assignment_vendor_id ON public.equipment_assignment USING btree (vendor_id);
CREATE INDEX idx_equipment_assignment_status ON public.equipment_assignment USING btree (status);
CREATE INDEX idx_equipment_assignment_priority ON public.equipment_assignment USING btree (priority);

-- Table: assignment_item
CREATE TABLE public.assignment_item (
    assignment_id int4 NOT NULL,
    equipment_instance_id int4 NOT NULL,
    quantity int4 DEFAULT 1,
    notes text,
    CONSTRAINT assignment_item_equipment_instance_id_fkey FOREIGN KEY (equipment_instance_id) REFERENCES public.equipment_instance(id),
    CONSTRAINT assignment_item_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.equipment_assignment(id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_id, equipment_instance_id)
);

-- Sequence and Table: maintenance_ticket
CREATE SEQUENCE IF NOT EXISTS maintenance_ticket_id_seq;
CREATE TABLE public.maintenance_ticket (
    id int4 NOT NULL DEFAULT nextval('maintenance_ticket_id_seq'::regclass),
    ticket_number varchar(100),
    equipment_instance_id int4,
    client_id int4,
    vendor_id int4,
    assigned_technician int4,
    ticket_status varchar(30) NOT NULL DEFAULT 'open',
    support_type varchar(20) DEFAULT 'maintenance',
    issue_description text NOT NULL,
    resolution_description text,
    priority varchar(20) DEFAULT 'normal',
    category varchar(100),
    estimated_hours numeric(5,2),
    actual_hours numeric(5,2),
    scheduled_date timestamptz,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamptz,
    closed_at timestamptz,
    CONSTRAINT maintenance_ticket_equipment_instance_id_fkey FOREIGN KEY (equipment_instance_id) REFERENCES public.equipment_instance(id),
    CONSTRAINT maintenance_ticket_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
    CONSTRAINT maintenance_ticket_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
    CONSTRAINT maintenance_ticket_assigned_technician_fkey FOREIGN KEY (assigned_technician) REFERENCES public.user(id),
    CONSTRAINT check_support_type CHECK (support_type IN ('maintenance', 'system', 'user')),
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX maintenance_ticket_ticket_number_key ON public.maintenance_ticket USING btree (ticket_number);
CREATE INDEX idx_maintenance_ticket_equipment_id ON public.maintenance_ticket USING btree (equipment_instance_id);
CREATE INDEX idx_maintenance_ticket_client_id ON public.maintenance_ticket USING btree (client_id);
CREATE INDEX idx_maintenance_ticket_vendor_id ON public.maintenance_ticket USING btree (vendor_id);
CREATE INDEX idx_maintenance_ticket_technician ON public.maintenance_ticket USING btree (assigned_technician);
CREATE INDEX idx_maintenance_ticket_status ON public.maintenance_ticket USING btree (ticket_status);
CREATE INDEX idx_maintenance_ticket_priority ON public.maintenance_ticket USING btree (priority);
CREATE INDEX idx_maintenance_ticket_category ON public.maintenance_ticket USING btree (category);
CREATE INDEX idx_maintenance_ticket_scheduled_date ON public.maintenance_ticket USING btree (scheduled_date);
CREATE INDEX idx_maintenance_ticket_support_type ON public.maintenance_ticket USING btree (support_type);

-- Sequence and Table: notification
CREATE SEQUENCE IF NOT EXISTS notification_id_seq;
CREATE TABLE public.notification (
    id int4 NOT NULL DEFAULT nextval('notification_id_seq'::regclass),
    user_id int4,
    title varchar(500) NOT NULL,
    message text NOT NULL,
    type varchar(20) DEFAULT 'info',
    priority varchar(20) DEFAULT 'normal',
    category varchar(100),
    is_read bool DEFAULT false,
    is_archived bool DEFAULT false,
    read_at timestamptz,
    action_url varchar(1000),
    metadata jsonb,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz,
    CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);
CREATE INDEX idx_notification_user_id ON public.notification USING btree (user_id);
CREATE INDEX idx_notification_is_read ON public.notification USING btree (is_read);
CREATE INDEX idx_notification_type ON public.notification USING btree (type);
CREATE INDEX idx_notification_priority ON public.notification USING btree (priority);
CREATE INDEX idx_notification_created_at ON public.notification USING btree (created_at);
CREATE INDEX idx_notification_expires_at ON public.notification USING btree (expires_at);

-- Sequence and Table: audit_log
CREATE SEQUENCE IF NOT EXISTS audit_log_id_seq;
CREATE TABLE public.audit_log (
    id int4 NOT NULL DEFAULT nextval('audit_log_id_seq'::regclass),
    table_name varchar(100) NOT NULL,
    record_id jsonb NOT NULL,
    action_type varchar(20) NOT NULL,
    changes jsonb,
    metadata jsonb,
    ip_address inet,
    user_agent text,
    session_id varchar(200),
    changed_by int4,
    vendor_id int4,
    client_id int4,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.user(id),
    CONSTRAINT audit_log_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
    CONSTRAINT audit_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
    PRIMARY KEY (id)
);
CREATE INDEX idx_audit_log_table_name ON public.audit_log USING btree (table_name);
CREATE INDEX idx_audit_log_action_type ON public.audit_log USING btree (action_type);
CREATE INDEX idx_audit_log_changed_by ON public.audit_log USING btree (changed_by);
CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);
CREATE INDEX idx_audit_log_ip_address ON public.audit_log USING btree (ip_address);

-- Sequence and Table: password_reset
CREATE SEQUENCE IF NOT EXISTS password_reset_id_seq;
CREATE TABLE public.password_reset (
    id int4 NOT NULL DEFAULT nextval('password_reset_id_seq'::regclass),
    user_id int4,
    reset_token varchar(500) NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamptz NOT NULL,
    used bool DEFAULT false,
    used_at timestamptz,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT password_reset_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX password_reset_reset_token_key ON public.password_reset USING btree (reset_token);
CREATE INDEX idx_password_reset_token ON public.password_reset USING btree (reset_token);
CREATE INDEX idx_password_reset_user_id ON public.password_reset USING btree (user_id);
CREATE INDEX idx_password_reset_expires_at ON public.password_reset USING btree (expires_at);
CREATE INDEX idx_password_reset_used ON public.password_reset USING btree (used);

-- Sequence and Table: user_sessions
CREATE SEQUENCE IF NOT EXISTS user_sessions_id_seq;
CREATE TABLE public.user_sessions (
    id int4 NOT NULL DEFAULT nextval('user_sessions_id_seq'::regclass),
    user_id int4,
    session_token varchar(500) NOT NULL,
    ip_address inet,
    user_agent text,
    last_activity timestamptz DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    is_active bool DEFAULT true,
    CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (session_token);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions USING btree (last_activity);

-- Trigger: Auto-set expiry_date for equipment_instance
CREATE OR REPLACE FUNCTION set_default_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiry_date IS NULL THEN
        NEW.expiry_date := NEW.purchase_date + (
            SELECT default_lifespan_years * INTERVAL '1 year'
            FROM public.equipment
            WHERE id = NEW.equipment_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_expiry_date
    BEFORE INSERT ON public.equipment_instance
    FOR EACH ROW
    EXECUTE FUNCTION set_default_expiry_date();

-- Trigger: Auto-update compliance_status for equipment_instance
CREATE OR REPLACE FUNCTION update_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.compliance_status := CASE 
        WHEN NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN NEW.next_maintenance_date IS NOT NULL AND NEW.next_maintenance_date < CURRENT_DATE THEN 'overdue'
        WHEN NEW.next_maintenance_date IS NOT NULL AND NEW.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'compliant'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance
    BEFORE INSERT OR UPDATE ON public.equipment_instance
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_status();

-- Trigger: Auto-generate notifications for compliance issues
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
BEGIN
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Compliance trigger is created in migration 002_enhanced_maintenance_system
-- This function is kept for backward compatibility but the trigger is managed by migrations

-- View: Vendor Compliance (for admin and vendor dashboards)
CREATE VIEW vendor_compliance AS
SELECT 
    v.id, 
    v.company_name, 
    v.business_type, 
    v.status, 
    COUNT(ei.id) AS total_equipment,
    SUM(CASE WHEN ei.expiry_date > CURRENT_DATE AND ei.next_maintenance_date > CURRENT_DATE THEN 1 ELSE 0 END) AS compliant_equipment
FROM public.vendors v
LEFT JOIN public.equipment_instance ei ON v.id = ei.vendor_id
GROUP BY v.id;

-- View: Equipment Inventory (for admin and vendor dashboards)
CREATE VIEW equipment_inventory AS
SELECT 
    ei.id, 
    ei.serial_number, 
    e.equipment_name, 
    e.equipment_type, 
    v.company_name AS vendor, 
    c.company_name AS client, 
    ei.status, 
    ei.compliance_status, 
    ei.next_maintenance_date, 
    ei.expiry_date
FROM public.equipment_instance ei
JOIN public.equipment e ON ei.equipment_id = e.id
JOIN public.vendors v ON ei.vendor_id = v.id
LEFT JOIN public.clients c ON ei.assigned_to = c.id;

-- View: Compliance Report (primarily for admin, accessible to vendors for their own data)
CREATE VIEW compliance_report AS
SELECT 
    v.id AS vendor_id, 
    v.company_name, 
    COUNT(ei.id) AS total_equipment,
    SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END) AS compliant,
    SUM(CASE WHEN ei.compliance_status = 'expired' THEN 1 ELSE 0 END) AS expired,
    SUM(CASE WHEN ei.compliance_status = 'overdue' THEN 1 ELSE 0 END) AS overdue
FROM public.vendors v
LEFT JOIN public.equipment_instance ei ON v.id = ei.vendor_id
GROUP BY v.id, v.company_name;

-- =====================================
-- MAINTENANCE TICKET NUMBER GENERATION
-- =====================================

-- Function: Automatic ticket number generation
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

-- Trigger: Auto-generate ticket numbers on insert
DROP TRIGGER IF EXISTS auto_generate_ticket_number ON maintenance_ticket;
CREATE TRIGGER auto_generate_ticket_number
    BEFORE INSERT ON maintenance_ticket
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
    EXECUTE FUNCTION generate_ticket_number();

-- =====================================
-- COMPREHENSIVE NOTIFICATION TRIGGERS
-- =====================================

-- Function: Create notification for vendor account creation (notify admin)
CREATE OR REPLACE FUNCTION notify_vendor_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all admin users when a new vendor is created
    INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
    SELECT 
        u.id,
        'New Vendor Account Created',
        'Vendor "' || NEW.company_name || '" has been created and requires approval. Business type: ' || NEW.business_type,
        'info',
        'normal',
        'vendor_management',
        '/vendors/' || NEW.id,
        jsonb_build_object(
            'vendor_id', NEW.id,
            'company_name', NEW.company_name,
            'business_type', NEW.business_type,
            'status', NEW.status
        ),
        CURRENT_TIMESTAMP
    FROM public.user u
    WHERE u.user_type = 'admin' AND u.deleted_at IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_vendor_created
    AFTER INSERT ON public.vendors
    FOR EACH ROW
    EXECUTE FUNCTION notify_vendor_created();

-- Function: Create notification for client account creation (notify vendor and admin)
CREATE OR REPLACE FUNCTION notify_client_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify the vendor who created the client
    IF NEW.created_by_vendor_id IS NOT NULL THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        SELECT 
            v.user_id,
            'Client Account Created Successfully',
            'Client "' || NEW.company_name || '" has been added to your account. Status: ' || NEW.status,
            'success',
            'normal',
            'client_management',
            '/clients/' || NEW.id,
            jsonb_build_object(
                'client_id', NEW.id,
                'company_name', NEW.company_name,
                'business_type', NEW.business_type,
                'status', NEW.status,
                'vendor_id', NEW.created_by_vendor_id
            ),
            CURRENT_TIMESTAMP
        FROM public.vendors v
        WHERE v.id = NEW.created_by_vendor_id;
    END IF;

    -- Notify all admin users
    INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
    SELECT 
        u.id,
        'New Client Account Created',
        'Client "' || NEW.company_name || '" has been created by vendor. Business type: ' || COALESCE(NEW.business_type, 'Not specified'),
        'info',
        'normal',
        'client_management',
        '/clients/' || NEW.id,
        jsonb_build_object(
            'client_id', NEW.id,
            'company_name', NEW.company_name,
            'business_type', NEW.business_type,
            'status', NEW.status,
            'vendor_id', NEW.created_by_vendor_id
        ),
        CURRENT_TIMESTAMP
    FROM public.user u
    WHERE u.user_type = 'admin' AND u.deleted_at IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_client_created
    AFTER INSERT ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION notify_client_created();

-- Function: Create notification for ticket status changes
CREATE OR REPLACE FUNCTION notify_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
    client_user_id INTEGER;
    vendor_user_id INTEGER;
    equipment_serial VARCHAR(200);
BEGIN
    -- Only trigger on status changes, not on initial creation
    IF TG_OP = 'UPDATE' AND OLD.ticket_status = NEW.ticket_status THEN
        RETURN NEW;
    END IF;

    -- Get client user ID
    SELECT u.id INTO client_user_id
    FROM public.clients c
    JOIN public.user u ON c.user_id = u.id
    WHERE c.id = NEW.client_id;

    -- Get vendor user ID
    SELECT u.id INTO vendor_user_id
    FROM public.vendors v
    JOIN public.user u ON v.user_id = u.id
    WHERE v.id = NEW.vendor_id;

    -- Get equipment serial number
    SELECT ei.serial_number INTO equipment_serial
    FROM public.equipment_instance ei
    WHERE ei.id = NEW.equipment_instance_id;

    -- Notify client about ticket status change
    IF client_user_id IS NOT NULL THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            client_user_id,
            'Service Request Status Updated',
            'Your service request #' || NEW.ticket_number || ' for equipment ' || COALESCE(equipment_serial, 'N/A') || ' is now ' || NEW.ticket_status,
            CASE NEW.ticket_status 
                WHEN 'resolved' THEN 'success'
                WHEN 'closed' THEN 'success'
                WHEN 'in_progress' THEN 'info'
                ELSE 'info'
            END,
            CASE NEW.priority
                WHEN 'urgent' THEN 'high'
                WHEN 'high' THEN 'high'
                ELSE 'normal'
            END,
            'service_request',
            '/maintenance-tickets/' || NEW.id,
            jsonb_build_object(
                'ticket_id', NEW.id,
                'ticket_number', NEW.ticket_number,
                'status', NEW.ticket_status,
                'priority', NEW.priority,
                'equipment_serial', equipment_serial,
                'client_id', NEW.client_id
            ),
            CURRENT_TIMESTAMP
        );
    END IF;

    -- Notify vendor about ticket status change (for technician assignments or client updates)
    IF vendor_user_id IS NOT NULL AND TG_OP = 'UPDATE' THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            vendor_user_id,
            'Ticket Status Updated',
            'Ticket #' || NEW.ticket_number || ' status changed to ' || NEW.ticket_status || '. Equipment: ' || COALESCE(equipment_serial, 'N/A'),
            'info',
            'normal',
            'ticket_management',
            '/maintenance-tickets/' || NEW.id,
            jsonb_build_object(
                'ticket_id', NEW.id,
                'ticket_number', NEW.ticket_number,
                'status', NEW.ticket_status,
                'priority', NEW.priority,
                'equipment_serial', equipment_serial,
                'vendor_id', NEW.vendor_id
            ),
            CURRENT_TIMESTAMP
        );
    END IF;

    -- Notify assigned technician
    IF NEW.assigned_technician IS NOT NULL AND NEW.assigned_technician != vendor_user_id THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            NEW.assigned_technician,
            'Ticket Assignment Updated',
            'You have been assigned to ticket #' || NEW.ticket_number || '. Status: ' || NEW.ticket_status,
            'info',
            CASE NEW.priority
                WHEN 'urgent' THEN 'high'
                WHEN 'high' THEN 'high'
                ELSE 'normal'
            END,
            'assignment',
            '/maintenance-tickets/' || NEW.id,
            jsonb_build_object(
                'ticket_id', NEW.id,
                'ticket_number', NEW.ticket_number,
                'status', NEW.ticket_status,
                'priority', NEW.priority,
                'equipment_serial', equipment_serial
            ),
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_ticket_status_change
    AFTER INSERT OR UPDATE ON public.maintenance_ticket
    FOR EACH ROW
    EXECUTE FUNCTION notify_ticket_status_change();

-- Function: Create notification for equipment assignments
CREATE OR REPLACE FUNCTION notify_equipment_assignment()
RETURNS TRIGGER AS $$
DECLARE
    client_user_id INTEGER;
    vendor_user_id INTEGER;
    equipment_info RECORD;
BEGIN
    -- Get client user ID
    SELECT u.id INTO client_user_id
    FROM public.clients c
    JOIN public.user u ON c.user_id = u.id
    WHERE c.id = NEW.client_id;

    -- Get vendor user ID
    SELECT u.id INTO vendor_user_id
    FROM public.vendors v
    JOIN public.user u ON v.user_id = u.id
    WHERE v.id = NEW.vendor_id;

    -- Notify client about new equipment assignment
    IF client_user_id IS NOT NULL THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            client_user_id,
            'New Equipment Assignment',
            'New equipment has been assigned to your account. Assignment #' || NEW.assignment_number,
            'info',
            CASE NEW.priority
                WHEN 'urgent' THEN 'high'
                WHEN 'high' THEN 'high'
                ELSE 'normal'
            END,
            'equipment_assignment',
            '/equipment?assignment=' || NEW.id,
            jsonb_build_object(
                'assignment_id', NEW.id,
                'assignment_number', NEW.assignment_number,
                'status', NEW.status,
                'priority', NEW.priority,
                'client_id', NEW.client_id,
                'vendor_id', NEW.vendor_id
            ),
            CURRENT_TIMESTAMP
        );
    END IF;

    -- Notify vendor about assignment confirmation
    IF vendor_user_id IS NOT NULL THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            vendor_user_id,
            'Equipment Assignment Created',
            'Equipment assignment #' || NEW.assignment_number || ' has been created successfully.',
            'success',
            'normal',
            'equipment_management',
            '/equipment/assignments/' || NEW.id,
            jsonb_build_object(
                'assignment_id', NEW.id,
                'assignment_number', NEW.assignment_number,
                'status', NEW.status,
                'priority', NEW.priority,
                'client_id', NEW.client_id,
                'vendor_id', NEW.vendor_id
            ),
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_equipment_assignment
    AFTER INSERT ON public.equipment_assignment
    FOR EACH ROW
    EXECUTE FUNCTION notify_equipment_assignment();

-- Function: Create notification for equipment instance status changes
CREATE OR REPLACE FUNCTION notify_equipment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    client_user_id INTEGER;
    vendor_user_id INTEGER;
BEGIN
    -- Only trigger on status changes
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Get vendor user ID
    SELECT u.id INTO vendor_user_id
    FROM public.vendors v
    JOIN public.user u ON v.user_id = u.id
    WHERE v.id = NEW.vendor_id;

    -- Get client user ID if assigned
    IF NEW.assigned_to IS NOT NULL THEN
        SELECT u.id INTO client_user_id
        FROM public.clients c
        JOIN public.user u ON c.user_id = u.id
        WHERE c.id = NEW.assigned_to;
    END IF;

    -- Notify vendor about equipment status change
    IF vendor_user_id IS NOT NULL THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            vendor_user_id,
            'Equipment Status Updated',
            'Equipment ' || NEW.serial_number || ' status changed to ' || NEW.status,
            CASE NEW.status
                WHEN 'maintenance' THEN 'warning'
                WHEN 'retired' THEN 'info'
                WHEN 'available' THEN 'success'
                ELSE 'info'
            END,
            'normal',
            'equipment_status',
            '/equipment/' || NEW.id,
            jsonb_build_object(
                'equipment_instance_id', NEW.id,
                'serial_number', NEW.serial_number,
                'status', NEW.status,
                'vendor_id', NEW.vendor_id,
                'assigned_to', NEW.assigned_to
            ),
            CURRENT_TIMESTAMP
        );
    END IF;

    -- Notify client if equipment is assigned to them
    IF client_user_id IS NOT NULL AND NEW.status IN ('maintenance', 'retired', 'recalled') THEN
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            client_user_id,
            'Equipment Status Alert',
            'Your assigned equipment ' || NEW.serial_number || ' status has changed to ' || NEW.status || '. Please contact your vendor if needed.',
            'warning',
            CASE NEW.status
                WHEN 'recalled' THEN 'high'
                ELSE 'normal'
            END,
            'equipment_alert',
            '/equipment/' || NEW.id,
            jsonb_build_object(
                'equipment_instance_id', NEW.id,
                'serial_number', NEW.serial_number,
                'status', NEW.status,
                'assigned_to', NEW.assigned_to
            ),
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_equipment_status_change
    AFTER UPDATE OF status ON public.equipment_instance
    FOR EACH ROW
    EXECUTE FUNCTION notify_equipment_status_change();

-- Function: Create notification for vendor status changes
CREATE OR REPLACE FUNCTION notify_vendor_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger on status changes
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Notify the vendor about their status change
    INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
    SELECT 
        v.user_id,
        'Account Status Updated',
        'Your vendor account status has been changed to ' || NEW.status || 
        CASE NEW.status
            WHEN 'active' THEN '. You can now access all features.'
            WHEN 'inactive' THEN '. Your account has been temporarily disabled.'
            WHEN 'pending' THEN '. Your account is under review.'
            ELSE '.'
        END,
        CASE NEW.status
            WHEN 'active' THEN 'success'
            WHEN 'inactive' THEN 'warning'
            WHEN 'pending' THEN 'info'
            ELSE 'info'
        END,
        CASE NEW.status
            WHEN 'inactive' THEN 'high'
            ELSE 'normal'
        END,
        'vendor_management',
        '/dashboard',
        jsonb_build_object(
            'vendor_id', NEW.id,
            'company_name', NEW.company_name,
            'old_status', OLD.status,
            'new_status', NEW.status
        ),
        CURRENT_TIMESTAMP
    FROM public.vendors v
    WHERE v.id = NEW.id;

    -- Notify all admin users about vendor status changes
    INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
    SELECT 
        u.id,
        'Vendor Status Updated',
        'Vendor "' || NEW.company_name || '" status changed from ' || OLD.status || ' to ' || NEW.status,
        'info',
        'normal',
        'vendor_management',
        '/vendors/' || NEW.id,
        jsonb_build_object(
            'vendor_id', NEW.id,
            'company_name', NEW.company_name,
            'old_status', OLD.status,
            'new_status', NEW.status
        ),
        CURRENT_TIMESTAMP
    FROM public.user u
    WHERE u.user_type = 'admin' AND u.deleted_at IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_vendor_status_change
    AFTER UPDATE OF status ON public.vendors
    FOR EACH ROW
    EXECUTE FUNCTION notify_vendor_status_change();

-- Function: Create notification for client status changes
CREATE OR REPLACE FUNCTION notify_client_status_change()
RETURNS TRIGGER AS $$
DECLARE
    vendor_user_id INTEGER;
BEGIN
    -- Only trigger on status changes
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Notify the client about their status change
    INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
    SELECT 
        c.user_id,
        'Account Status Updated',
        'Your client account status has been changed to ' || NEW.status ||
        CASE NEW.status
            WHEN 'active' THEN '. You can now access all features.'
            WHEN 'inactive' THEN '. Your account has been temporarily disabled.'
            WHEN 'pending' THEN '. Your account is under review.'
            ELSE '.'
        END,
        CASE NEW.status
            WHEN 'active' THEN 'success'
            WHEN 'inactive' THEN 'warning'
            WHEN 'pending' THEN 'info'
            ELSE 'info'
        END,
        CASE NEW.status
            WHEN 'inactive' THEN 'high'
            ELSE 'normal'
        END,
        'client_management',
        '/dashboard',
        jsonb_build_object(
            'client_id', NEW.id,
            'company_name', NEW.company_name,
            'old_status', OLD.status,
            'new_status', NEW.status
        ),
        CURRENT_TIMESTAMP
    FROM public.clients c
    WHERE c.id = NEW.id;

    -- Notify the vendor who created this client
    IF NEW.created_by_vendor_id IS NOT NULL THEN
        SELECT u.id INTO vendor_user_id
        FROM public.vendors v
        JOIN public.user u ON v.user_id = u.id
        WHERE v.id = NEW.created_by_vendor_id;

        IF vendor_user_id IS NOT NULL THEN
            INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
            VALUES (
                vendor_user_id,
                'Client Status Updated',
                'Client "' || NEW.company_name || '" status changed from ' || OLD.status || ' to ' || NEW.status,
                'info',
                'normal',
                'client_management',
                '/clients/' || NEW.id,
                jsonb_build_object(
                    'client_id', NEW.id,
                    'company_name', NEW.company_name,
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'vendor_id', NEW.created_by_vendor_id
                ),
                CURRENT_TIMESTAMP
            );
        END IF;
    END IF;

    -- Notify all admin users about client status changes
    INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
    SELECT 
        u.id,
        'Client Status Updated',
        'Client "' || NEW.company_name || '" status changed from ' || OLD.status || ' to ' || NEW.status,
        'info',
        'normal',
        'client_management',
        '/users?type=client',
        jsonb_build_object(
            'client_id', NEW.id,
            'company_name', NEW.company_name,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'vendor_id', NEW.created_by_vendor_id
        ),
        CURRENT_TIMESTAMP
    FROM public.user u
    WHERE u.user_type = 'admin' AND u.deleted_at IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_client_status_change
    AFTER UPDATE OF status ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION notify_client_status_change();

-- Function: Create notification for user account lockouts
CREATE OR REPLACE FUNCTION notify_user_lockout()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when account gets locked
    IF TG_OP = 'UPDATE' AND OLD.is_locked = false AND NEW.is_locked = true THEN
        -- Notify the user about their account lockout
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        VALUES (
            NEW.id,
            'Account Temporarily Locked',
            'Your account has been temporarily locked due to multiple failed login attempts. Please contact support or wait for the lockout period to expire.',
            'warning',
            'high',
            'security',
            '/login',
            jsonb_build_object(
                'locked_until', NEW.locked_until,
                'failed_attempts', NEW.failed_login_attempts
            ),
            CURRENT_TIMESTAMP
        );

        -- Notify admins about account lockouts
        INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
        SELECT 
            u.id,
            'User Account Locked',
            'User account for ' || NEW.email || ' (' || COALESCE(NEW.display_name, NEW.first_name || ' ' || NEW.last_name) || ') has been locked due to failed login attempts.',
            'alert',
            'normal',
            'security',
            '/users/' || NEW.id,
            jsonb_build_object(
                'user_id', NEW.id,
                'user_email', NEW.email,
                'user_type', NEW.user_type,
                'locked_until', NEW.locked_until,
                'failed_attempts', NEW.failed_login_attempts
            ),
            CURRENT_TIMESTAMP
        FROM public.user u
        WHERE u.user_type = 'admin' AND u.deleted_at IS NULL AND u.id != NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_user_lockout
    AFTER UPDATE OF is_locked ON public.user
    FOR EACH ROW
    EXECUTE FUNCTION notify_user_lockout();

-- Function: Create notification for upcoming equipment warranty expirations
CREATE OR REPLACE FUNCTION notify_warranty_expiration()
RETURNS TRIGGER AS $$
DECLARE
    vendor_user_id INTEGER;
    client_user_id INTEGER;
    days_until_expiry INTEGER;
BEGIN
    -- Only check on updates to warranty_expiry
    IF TG_OP = 'UPDATE' AND OLD.warranty_expiry = NEW.warranty_expiry THEN
        RETURN NEW;
    END IF;

    -- Calculate days until expiry
    days_until_expiry := (NEW.warranty_expiry - CURRENT_DATE);

    -- Only notify if warranty expires within 60 days
    IF NEW.warranty_expiry IS NOT NULL AND days_until_expiry <= 60 AND days_until_expiry > 0 THEN
        -- Get vendor user ID
        SELECT u.id INTO vendor_user_id
        FROM public.vendors v
        JOIN public.user u ON v.user_id = u.id
        WHERE v.id = NEW.vendor_id;

        -- Get client user ID if assigned
        IF NEW.assigned_to IS NOT NULL THEN
            SELECT u.id INTO client_user_id
            FROM public.clients c
            JOIN public.user u ON c.user_id = u.id
            WHERE c.id = NEW.assigned_to;
        END IF;

        -- Notify vendor about warranty expiration
        IF vendor_user_id IS NOT NULL THEN
            INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
            VALUES (
                vendor_user_id,
                'Equipment Warranty Expiring Soon',
                'Equipment ' || NEW.serial_number || ' warranty will expire in ' || days_until_expiry || ' days (' || NEW.warranty_expiry || '). Consider renewal or replacement.',
                'warning',
                CASE WHEN days_until_expiry <= 14 THEN 'high' ELSE 'normal' END,
                'equipment',
                '/equipment/' || NEW.id,
                jsonb_build_object(
                    'equipment_instance_id', NEW.id,
                    'serial_number', NEW.serial_number,
                    'warranty_expiry', NEW.warranty_expiry,
                    'days_until_expiry', days_until_expiry
                ),
                CURRENT_TIMESTAMP
            );
        END IF;

        -- Notify client about warranty expiration
        IF client_user_id IS NOT NULL THEN
            INSERT INTO public.notification (user_id, title, message, type, priority, category, action_url, metadata, created_at)
            VALUES (
                client_user_id,
                'Equipment Warranty Expiring',
                'The warranty for your equipment ' || NEW.serial_number || ' will expire in ' || days_until_expiry || ' days. Please contact your vendor for renewal options.',
                'info',
                'normal',
                'equipment_alert',
                '/client-equipment',
                jsonb_build_object(
                    'equipment_instance_id', NEW.id,
                    'serial_number', NEW.serial_number,
                    'warranty_expiry', NEW.warranty_expiry,
                    'days_until_expiry', days_until_expiry
                ),
                CURRENT_TIMESTAMP
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_warranty_expiration
    AFTER INSERT OR UPDATE OF warranty_expiry ON public.equipment_instance
    FOR EACH ROW
    EXECUTE FUNCTION notify_warranty_expiration();
-- =====================================================
-- EMAIL SYSTEM TABLES
-- =====================================================

-- Email Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(320) NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs USING btree (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON public.email_logs USING btree (template_type);

COMMENT ON TABLE public.email_logs IS 'Logs all email messages sent via email service';
COMMENT ON COLUMN public.email_logs.template_type IS 'Type of email template used (e.g., password_reset, notification, etc.)';
COMMENT ON COLUMN public.email_logs.status IS 'Status of email delivery attempt';

-- =====================================================
-- SMS SYSTEM TABLES (Dialog eSMS Integration)
-- =====================================================

-- SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id SERIAL PRIMARY KEY,
    user_id INT4 REFERENCES public.user(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    dialog_response TEXT,
    dialog_status_code VARCHAR(10),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id INT4
);

CREATE INDEX idx_sms_logs_user_id ON public.sms_logs USING btree (user_id);
CREATE INDEX idx_sms_logs_status ON public.sms_logs USING btree (status);
CREATE INDEX idx_sms_logs_created_at ON public.sms_logs USING btree (created_at);
CREATE INDEX idx_sms_logs_message_type ON public.sms_logs USING btree (message_type);

-- SMS Usage Statistics Table
CREATE TABLE IF NOT EXISTS public.sms_usage_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_sent INT4 DEFAULT 0,
    total_failed INT4 DEFAULT 0,
    high_priority_tickets INT4 DEFAULT 0,
    compliance_alerts INT4 DEFAULT 0,
    maintenance_reminders INT4 DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_usage_stats_date ON public.sms_usage_stats USING btree (date);

-- Add SMS preferences to user table
ALTER TABLE public.user 
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_high_priority_tickets BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_compliance_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_maintenance_reminders BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_user_sms_enabled ON public.user USING btree (sms_notifications_enabled);

COMMENT ON TABLE public.sms_logs IS 'Logs all SMS messages sent via Dialog eSMS';
COMMENT ON TABLE public.sms_usage_stats IS 'Daily statistics for SMS usage and quota tracking';
COMMENT ON COLUMN public.user.sms_notifications_enabled IS 'Master toggle for all SMS notifications';
COMMENT ON COLUMN public.user.sms_high_priority_tickets IS 'Receive SMS for high priority service tickets';
COMMENT ON COLUMN public.user.sms_compliance_alerts IS 'Receive SMS for compliance expiry alerts';
COMMENT ON COLUMN public.user.sms_maintenance_reminders IS 'Receive SMS for maintenance due/overdue';