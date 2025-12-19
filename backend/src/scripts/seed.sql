-- ==============================================================
--  Fire Guardian Control Center – FULL SEED DATA
--  Compatible with schema.sql (2025-10-25)
-- ==============================================================

-- Clear ALL existing data to ensure clean seed
-- This prevents duplicate key errors when re-seeding

-- First, clear foreign key references to users
UPDATE system_settings SET updated_by = NULL WHERE updated_by IS NOT NULL;
UPDATE audit_log SET changed_by = NULL WHERE changed_by IS NOT NULL;

-- Then delete data in correct order (respecting foreign keys)
DELETE FROM audit_log;
DELETE FROM notification;
DELETE FROM maintenance_ticket;
DELETE FROM equipment_assignment;
DELETE FROM equipment_instance;
DELETE FROM equipment;
DELETE FROM vendor_specialization;
DELETE FROM clients;
DELETE FROM vendors;
DELETE FROM user_sessions;
DELETE FROM password_reset;
DELETE FROM "user" WHERE user_type != 'system';

-- Reset all sequences to start from 1
ALTER SEQUENCE user_id_seq RESTART WITH 1;
ALTER SEQUENCE vendor_id_seq RESTART WITH 1;
ALTER SEQUENCE client_id_seq RESTART WITH 1;
ALTER SEQUENCE equipment_id_seq RESTART WITH 1;
ALTER SEQUENCE equipment_instance_id_seq RESTART WITH 1;
ALTER SEQUENCE equipment_assignment_id_seq RESTART WITH 1;
ALTER SEQUENCE maintenance_ticket_id_seq RESTART WITH 1;
ALTER SEQUENCE notification_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_log_id_seq RESTART WITH 1;
ALTER SEQUENCE user_sessions_id_seq RESTART WITH 1;

-- --------------------------------------------------------------
-- 1. schema_migrations
-- --------------------------------------------------------------
INSERT INTO public.schema_migrations (migration_name, executed_at, execution_time_ms, success)
VALUES
  ('001_initial_schema', '2025-10-25 11:25:00+05:30', 258, true),
  ('002_enhanced_schema', '2025-10-25 11:25:00+05:30', 200, true)
ON CONFLICT (migration_name) DO NOTHING;

-- --------------------------------------------------------------
-- 2. user  (admin, vendors, clients)
-- --------------------------------------------------------------
INSERT INTO public.user (
  id, first_name, last_name, display_name, email, password,
  user_type, role_id, is_locked, failed_login_attempts,
  last_login, last_login_ip, created_at, updated_at,
  last_password_change, phone
) VALUES
  (1,  'Admin',        'User',         'Admin User',        'admin@fireguardian.com',
   '$2b$12$p/dLwpfQ4E4jUuZcmw4uDegiUDIRclO56nonpYjTPkLq/Q0x2x0Ie',
   'admin', 1, false, 0,
   '2025-10-25 11:20:00+05:30', '::1',
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 11 123 4567'),

  (2,  'Lakmal',       'Silva',        'Lakmal Silva',      'lakmal@safefire.lk',
   '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.',
   'vendor', 2, false, 0,
   '2025-10-25 11:22:00+05:30', '::1',
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 11 234 5678'),

  (3,  'Nimali',       'Perera',       'Nimali Perera',     'nimali@proguard.lk',
   '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.',
   'vendor', 2, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 11 345 6789'),

  (4,  'Ruwan',        'Bandara',      'Ruwan Bandara',     'ruwan@fireshield.lk',
   '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.',
   'vendor', 2, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 81 456 7890'),

  (5,  'Kasun',        'Jayasinghe',   'Kasun Jayasinghe',  'kasun@royalhotels.lk',
   '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq',
   'client', 3, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 11 567 8901'),

  (6,  'Shalini',      'Fernando',     'Shalini Fernando',  'shalini@techinnovations.lk',
   '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq',
   'client', 3, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 11 678 9012'),

  (7,  'Dilshan',      'Weerasinghe',  'Dilshan Weerasinghe','dilshan@citymall.lk',
   '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq',
   'client', 3, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 91 789 0123'),

  (8,  'Priyantha',    'Fernando',     'Priyantha Fernando','priyantha@fireguardian.com',
   '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.',
   'admin', 1, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 77 123 4567'),

  (9,  'Saman',        'Dissanayake',  'Saman Dissanayake', 'saman@safehomes.lk',
   '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.',
   'vendor', 2, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 71 234 5678'),

  (10, 'Harsha',       'Gunawardena',  'Harsha Gunawardena','harsha@citybuild.lk',
   '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq',
   'client', 3, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 77 345 6789'),

  (11, 'Tharindu',     'Perera',       'Tharindu Perera',   'tharindu@fireguardian.com',
   '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.',
   'admin', 1, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 77 456 7890'),

  (12, 'Manoj',        'Seneviratne',  'Manoj Seneviratne', 'manoj@safehomes.lk',
   '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.',
   'vendor', 2, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 71 456 7890'),

  (13, 'Nadeesha',     'Wijesinghe',   'Nadeesha Wijesinghe','nadeesha@citybuild.lk',
   '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq',
   'client', 3, false, 0, NULL, NULL,
   '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30',
   '2025-10-25 11:25:00+05:30', '+94 77 567 8901')
ON CONFLICT (email) DO NOTHING;

-- --------------------------------------------------------------
-- 3. system_settings
-- --------------------------------------------------------------
INSERT INTO public.system_settings (
  id, setting_key, setting_value, setting_type, description,
  updated_at, updated_by
) VALUES
  (1, 'session_timeout_minutes',      '30',  'number',  'Session timeout in minutes',                     '2025-10-25 11:25:00+05:30', 1),
  (2, 'password_expiry_days',        '90',  'number',  'Password expiry period in days (0 = never)',    '2025-10-25 11:25:00+05:30', 1),
  (3, 'password_min_length',         '8',   'number',  'Minimum password length',                       '2025-10-25 11:25:00+05:30', 1),
  (4, 'require_password_change_on_first_login','false','boolean','Force password change on first login',         '2025-10-25 11:25:00+05:30', 1),
  (5, 'max_failed_login_attempts',   '5',   'number',  'Maximum failed login attempts before lock',    '2025-10-25 11:25:00+05:30', 1),
  (6, 'account_lock_duration_minutes','30',  'number',  'Account lock duration in minutes',             '2025-10-25 11:25:00+05:30', 1),
  (7, 'maintenance_reminder_days',   '30',  'number',  'Days before maintenance to send reminders',    '2025-10-25 11:25:00+05:30', 1),
  (8, 'expiry_reminder_days',        '60',  'number',  'Days before expiry to send reminders',         '2025-10-25 11:25:00+05:30', 1),
  (9, 'vendor_equipment_limit',      '1000','number',  'Maximum equipment instances per vendor',       '2025-10-25 11:25:00+05:30', 1),
  (10,'compliance_alert_threshold',  '90',  'number',  'Compliance alert threshold % for admin reports','2025-10-25 11:25:00+05:30', 1),
  (11,'token_refresh_threshold_minutes','5','number',  'Refresh token automatically if expiring within this many minutes','2025-10-25 11:25:00+05:30', 1)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------
-- 4. role
-- --------------------------------------------------------------
INSERT INTO public.role (id, role_name, description, created_at) VALUES
  (1, 'admin',  'Full system access',                     '2025-10-25 11:25:00+05:30'),
  (2, 'vendor', 'Manage own equipment, clients, tickets', '2025-10-25 11:25:00+05:30'),
  (3, 'client', 'View assigned equipment and tickets',   '2025-10-25 11:25:00+05:30')
ON CONFLICT (role_name) DO NOTHING;

-- --------------------------------------------------------------
-- 5. permission
-- --------------------------------------------------------------
INSERT INTO public.permission (id, permission_name, description, category, created_at) VALUES
  (1,  'manage_users',          'Create, update, delete users',          'user_management',   '2025-10-25 11:25:00+05:30'),
  (2,  'view_users',            'View user information',                 'user_management',   '2025-10-25 11:25:00+05:30'),
  (3,  'manage_vendors',        'Manage vendor accounts',                'vendor_management','2025-10-25 11:25:00+05:30'),
  (4,  'view_vendors',          'View vendor information',               'vendor_management','2025-10-25 11:25:00+05:30'),
  (5,  'manage_clients',        'Manage client accounts',                'client_management','2025-10-25 11:25:00+05:30'),
  (6,  'view_clients',          'View client information',               'client_management','2025-10-25 11:25:00+05:30'),
  (7,  'manage_equipment',      'Manage equipment catalog',              'equipment_management','2025-10-25 11:25:00+05:30'),
  (8,  'view_equipment',        'View equipment information',            'equipment_management','2025-10-25 11:25:00+05:30'),
  (9,  'assign_equipment',      'Assign equipment to clients',           'equipment_management','2025-10-25 11:25:00+05:30'),
  (10, 'manage_maintenance',    'Manage maintenance tickets',            'maintenance',       '2025-10-25 11:25:00+05:30'),
  (11, 'view_maintenance',      'View maintenance information',          'maintenance',       '2025-10-25 11:25:00+05:30'),
  (12, 'manage_permissions',    'Manage roles and permissions',          'system',            '2025-10-25 11:25:00+05:30'),
  (13, 'view_audit_logs',       'View audit logs',                       'system',            '2025-10-25 11:25:00+05:30'),
  (14, 'manage_system_settings','Manage system settings',                'system',            '2025-10-25 11:25:00+05:30')
ON CONFLICT (permission_name) DO NOTHING;

-- --------------------------------------------------------------
-- 6. role_permission
-- --------------------------------------------------------------
INSERT INTO public.role_permission (role_id, permission_id, granted_by, granted_at) VALUES
  (1, 1, 1, '2025-10-25 11:25:00+05:30'), (1, 2, 1, '2025-10-25 11:25:00+05:30'),
  (1, 3, 1, '2025-10-25 11:25:00+05:30'), (1, 4, 1, '2025-10-25 11:25:00+05:30'),
  (1, 5, 1, '2025-10-25 11:25:00+05:30'), (1, 6, 1, '2025-10-25 11:25:00+05:30'),
  (1, 7, 1, '2025-10-25 11:25:00+05:30'), (1, 8, 1, '2025-10-25 11:25:00+05:30'),
  (1, 9, 1, '2025-10-25 11:25:00+05:30'), (1,10, 1, '2025-10-25 11:25:00+05:30'),
  (1,11, 1, '2025-10-25 11:25:00+05:30'), (1,12, 1, '2025-10-25 11:25:00+05:30'),
  (1,13, 1, '2025-10-25 11:25:00+05:30'), (1,14, 1, '2025-10-25 11:25:00+05:30'),

  (2, 8, 1, '2025-10-25 11:25:00+05:30'), (2, 9, 1, '2025-10-25 11:25:00+05:30'),
  (2,10, 1, '2025-10-25 11:25:00+05:30'), (2,11, 1, '2025-10-25 11:25:00+05:30'),
  (2, 6, 1, '2025-10-25 11:25:00+05:30'),

  (3, 8, 1, '2025-10-25 11:25:00+05:30'), (3,11, 1, '2025-10-25 11:25:00+05:30')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- --------------------------------------------------------------
-- 7. specialization
-- --------------------------------------------------------------
INSERT INTO public.specialization (id, name, description, category, certification_required, created_at, updated_at) VALUES
  (1, 'Fire Extinguisher Installation','Installation of fire extinguishers','Installation', true,  '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (2, 'Fire Alarm Systems',           'Installation and maintenance of fire alarms','Installation', true,  '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (3, 'Sprinkler Systems',            'Installation of sprinkler systems','Installation', true,  '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (4, 'Fire Safety Inspection',       'Inspection services for fire safety compliance','Inspection', true,  '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (5, 'Emergency Lighting',           'Installation of emergency lighting','Installation', false, '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (6, 'Fire Door Installation',       'Installation of fire-resistant doors','Installation', true,  '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (7, 'Fire Safety Training',         'Training on fire safety procedures','Training', false, '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------
-- 8. vendors
-- --------------------------------------------------------------
INSERT INTO public.vendors (
  id, user_id, company_name, business_type, license_number,
  primary_phone, street_address, city, state, zip_code, country, status,
  created_at, updated_at
) VALUES
  (1, 2, 'SafeFire Solutions',      'Fire Safety Services',      'FS-2019-001', '+94 11 234 5678', '45 Ward Place',          'Colombo',   'Western Province', '00700', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (2, 3, 'ProGuard Fire Systems',   'Fire Protection Equipment','FS-2018-045', '+94 11 345 6789', '78 Duplication Road',    'Colombo',   'Western Province', '00400', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (3, 4, 'FireShield Technologies','Fire Safety Technology',   'FS-2020-089', '+94 81 456 7890', '12 Station Road',        'Kandy',     'Central Province','20000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (4, 9, 'SafeHomes Solutions',     'Home Safety Services',     'FS-2021-123', '+94 71 234 5678', '22 Lake Road',           'Kurunegala','North Western',   '60000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (5,12, 'SafeHomes Pro',           'Home Safety Consulting',   'FS-2022-456', '+94 71 456 7890', '55 River Road',          'Matara',    'Southern',        '81000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------
-- 9. clients
-- --------------------------------------------------------------
INSERT INTO public.clients (
  id, user_id, created_by_vendor_id, company_name, business_type,
  primary_phone, street_address, city, state, zip_code, country, status,
  created_at, updated_at
) VALUES
  (1, 5, 1, 'Royal Hotels Group',   'Hospitality',   '+94 11 567 8901', '100 Galle Road',      'Colombo','Western Province','00300','Sri Lanka','active','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (2, 6, 2, 'Tech Innovations Ltd','Technology',    '+94 11 678 9012', '25 Havelock Road',    'Colombo','Western Province','00500','Sri Lanka','active','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (3, 7, 3, 'City Mall PLC',        'Retail',        '+94 91 789 0123', '50 Main Street',      'Galle',  'Southern Province','80000','Sri Lanka','active','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (4,10, 4, 'CityBuild PLC',        'Construction',  '+94 77 345 6789', '200 Main Road',       'Kurunegala','North Western','60000','Sri Lanka','active','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (5,13, 5, 'BuildPro Ltd',         'Construction',  '+94 77 567 8901', '300 Lake Road',       'Matara',  'Southern',       '81000','Sri Lanka','active','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30');

-- --------------------------------------------------------------
-- 10. vendor_specialization
-- --------------------------------------------------------------
INSERT INTO public.vendor_specialization (vendor_id, specialization_id, certification_number, certification_expiry, added_at) VALUES
  (1,1,'CERT-001','2026-10-25','2025-10-25 11:25:00+05:30'),
  (1,4,'CERT-002','2026-10-25','2025-10-25 11:25:00+05:30'),
  (2,2,'CERT-003','2026-10-25','2025-10-25 11:25:00+05:30'),
  (2,3,'CERT-004','2026-10-25','2025-10-25 11:25:00+05:30'),
  (3,5,NULL,NULL,'2025-10-25 11:25:00+05:30'),
  (3,6,'CERT-005','2026-10-25','2025-10-25 11:25:00+05:30');

-- --------------------------------------------------------------
-- 11. equipment (catalog)
-- --------------------------------------------------------------
INSERT INTO public.equipment (
  id, vendor_id, equipment_code, equipment_name, description, equipment_type,
  manufacturer, model, specifications, weight_kg, dimensions,
  warranty_years, default_lifespan_years, created_at, updated_at
) VALUES
  (1,1,'EXT-ABC-10','Fire Extinguisher ABC 10kg','CO2 + Dry Powder','extinguisher','SafeFire','ABC-10','{"pressure":"150 psi"}',10.5,'30x20x60 cm',2,7,'2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (2,2,'LGT-EM-01','Emergency Light Standard','Battery backup 3h','lighting','ProGuard','EM-01','{"lumens":300}',2.1,'15x10x8 cm',1,5,'2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (3,3,'ALM-FAS-01','Fire Alarm System','Smoke + Heat','alarm','FireShield','FAS-01','{"zones":8}',4.8,'40x30x12 cm',3,10,'2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (4,4,'DR-FD-A','Fire Door Type A','2-hour rated','door','SafeHomes','FD-A','{"material":"steel"}',85.0,'210x90 cm',5,20,'2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (5,5,'KIT-TRN-B','Training Kit Basic','Manual + Dummy Extinguisher','training','SafeHomes','TRN-B','{}',12.0,'50x40x30 cm',0,5,'2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30');

-- --------------------------------------------------------------
-- 12. equipment_instance (24 rows – past, present, future)
-- --------------------------------------------------------------
INSERT INTO public.equipment_instance (
  id, equipment_id, serial_number, asset_tag, vendor_id, status,
  condition_rating, assigned_to, assigned_at, purchase_date,
  warranty_expiry, expiry_date, last_maintenance_date, next_maintenance_date,
  maintenance_interval_days, location, notes, compliance_status,
  created_at, updated_at
) VALUES
  (4,1,'SN-20251025-004','TAG-004',1,'assigned',5,1,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2032-10-01','2026-04-01','2026-04-01',365,'Lobby','Standard deployment','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (5,2,'SN-20251025-005','TAG-005',2,'assigned',5,2,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2032-10-01','2026-04-01','2026-04-01',365,'Hallway','Standard deployment','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (6,1,'SN-20251025-006','TAG-006',1,'available',5,NULL,NULL,'2025-10-15','2026-10-15','2030-10-15',NULL,'2026-04-15',365,'Warehouse','In stock','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (7,2,'SN-20241025-007','TAG-007',2,'available',5,NULL,NULL,'2020-10-01','2021-10-01','2024-10-01','2023-10-01','2023-10-01',365,'Warehouse','Expired – awaiting disposal','expired','2024-10-25 11:25:00+05:30','2024-10-25 11:25:00+05:30'),
  (8,3,'SN-20251027-008','TAG-008',3,'available',5,NULL,NULL,'2022-10-01','2023-10-01','2027-10-01','2025-09-01','2025-09-01',365,'Warehouse','Overdue maintenance','overdue','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (9,1,'SN-20251115-009','TAG-009',1,'assigned',5,1,'2025-10-25 11:25:00+05:30','2025-11-01','2026-11-01','2032-11-01','2025-11-20','2025-11-20',365,'Lobby','Future assignment','due_soon','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (10,2,'SN-20260101-010','TAG-010',2,'assigned',5,2,'2025-10-25 11:25:00+05:30','2026-01-01','2027-01-01','2033-01-01','2026-07-01','2026-07-01',365,'Hallway','Future purchase','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),

  (11,4,'SN-20251025-011','TAG-011',4,'available',5,NULL,NULL,'2025-10-01','2026-10-01','2040-10-01','2026-04-01','2026-04-01',365,'Warehouse','In stock','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (12,5,'SN-20251025-012','TAG-012',4,'assigned',5,4,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2028-10-01','2026-04-01','2026-04-01',365,'Training Room','Staff training','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (13,4,'SN-20251025-013','TAG-013',5,'available',5,NULL,NULL,'2025-10-01','2026-10-01','2040-10-01','2026-04-01','2026-04-01',365,'Warehouse','In stock','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (14,5,'SN-20251025-014','TAG-014',5,'assigned',5,5,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2029-10-01','2026-04-01','2026-04-01',365,'Training Room','Pro kit','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),

  (15,1,'SN-20251025-015','TAG-015',1,'available',5,NULL,NULL,'2025-10-01','2026-10-01','2045-10-01','2026-04-01','2026-04-01',365,'Warehouse','Long-life unit','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (16,2,'SN-20251025-016','TAG-016',2,'assigned',5,1,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2033-10-01','2026-04-01','2026-04-01',365,'Lobby','Extra light','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (17,3,'SN-20251025-017','TAG-017',3,'available',5,NULL,NULL,'2025-10-01','2026-10-01','2035-10-01','2026-04-01','2026-04-01',365,'Warehouse','Spare alarm','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (18,4,'SN-20251025-018','TAG-018',4,'assigned',5,2,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2032-10-01','2026-04-01','2026-04-01',365,'Main entrance','Fire door','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (19,5,'SN-20251025-019','TAG-019',5,'available',5,NULL,NULL,'2025-10-01','2026-10-01','2049-10-01','2026-04-01','2026-04-01',365,'Warehouse','Future training','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (20,1,'SN-20251025-020','TAG-020',1,'assigned',5,3,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2031-10-01','2026-04-01','2026-04-01',365,'Mall lobby','Retail unit','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (21,2,'SN-20251025-021','TAG-021',2,'available',5,NULL,NULL,'2025-10-01','2026-10-01','2037-10-01','2026-04-01','2026-04-01',365,'Warehouse','Spare light','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (22,3,'SN-20251025-022','TAG-022',3,'assigned',5,4,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2034-10-01','2026-04-01','2026-04-01',365,'Construction site','Site alarm','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (23,4,'SN-20251025-023','TAG-023',4,'available',5,NULL,NULL,'2025-10-01','2026-10-01','2055-10-01','2026-04-01','2026-04-01',365,'Warehouse','Long-term door','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (24,5,'SN-20251025-024','TAG-024',5,'assigned',5,5,'2025-10-25 11:25:00+05:30','2025-10-01','2026-10-01','2042-10-01','2026-04-01','2026-04-01',365,'Training centre','Pro kit','compliant','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30');

-- --------------------------------------------------------------
-- 13. equipment_assignment + assignment_item
-- --------------------------------------------------------------
INSERT INTO public.equipment_assignment (
  id, client_id, vendor_id, assignment_number, assigned_at, status,
  priority, notes, start_date, end_date, created_at, updated_at
) VALUES
  (1,1,1,'ASG-20251025-001','2025-10-25 11:25:00+05:30','active','normal','Initial assignment','2025-10-25','2026-10-25','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (2,2,2,'ASG-20251025-002','2025-10-25 11:25:00+05:30','active','high','Urgent replacement','2025-10-25','2026-10-25','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (3,3,3,'ASG-20241025-003','2024-10-25 11:25:00+05:30','closed','normal','Completed assignment','2024-10-25','2025-10-25','2024-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (4,1,1,'ASG-20261101-004','2026-11-01 09:00:00+05:30','pending','normal','Scheduled for next year','2026-11-01','2027-11-01','2026-11-01 09:00:00+05:30','2026-11-01 09:00:00+05:30'),
  (5,4,4,'ASG-20251025-005','2025-10-25 11:25:00+05:30','active','normal','Fire door install','2025-10-25','2026-10-25','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30'),
  (6,5,5,'ASG-20251025-006','2025-10-25 11:25:00+05:30','active','normal','Training kit install','2025-10-25','2026-10-25','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30');

INSERT INTO public.assignment_item (assignment_id, equipment_instance_id, quantity, notes) VALUES
  (1,4,1,'Fire extinguisher for lobby'),
  (2,5,1,'Emergency light for hallway'),
  (3,7,2,'Expired equipment for testing'),
  (4,9,1,'Due soon equipment for future assignment'),
  (5,12,1,'Training kit for staff'),
  (5,11,1,'Fire door for main entrance'),
  (6,14,1,'Training kit pro for staff'),
  (6,13,1,'Fire door type B for entrance');

-- --------------------------------------------------------------
-- 14. maintenance_ticket
-- --------------------------------------------------------------
INSERT INTO public.maintenance_ticket (
  id, ticket_number, equipment_instance_id, client_id, vendor_id,
  assigned_technician, ticket_status, support_type, issue_description,
  resolution_description, priority, category, estimated_hours, actual_hours,
  scheduled_date, created_at, updated_at, resolved_at, closed_at
) VALUES
  (1,'TKT-20251025-001',4,1,1,2,'open','maintenance','Pressure gauge issue',NULL,'normal','equipment',2.0,NULL,'2025-10-28 09:00:00+05:30','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30',NULL,NULL),
  (2,'TKT-20251025-002',5,2,2,3,'open','maintenance','Nozzle blockage',NULL,'normal','equipment',1.5,NULL,'2025-10-29 10:00:00+05:30','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30',NULL,NULL),
  (3,'TKT-20251025-003',NULL,1,1,2,'open','system','Dashboard access issue',NULL,'high','system',0.5,NULL,'2025-10-30 11:00:00+05:30','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30',NULL,NULL),
  (4,'TKT-20241025-004',7,3,3,4,'closed','maintenance','Expired equipment replaced','Replaced with new unit','normal','equipment',2.0,2.0,'2024-10-26 09:00:00+05:30','2024-10-25 11:25:00+05:30','2024-10-25 11:25:00+05:30','2024-10-27 12:00:00+05:30','2024-10-27 13:00:00+05:30'),
  (5,'TKT-20261101-005',10,2,2,3,'open','maintenance','Scheduled maintenance for compliant equipment',NULL,'normal','equipment',1.0,NULL,'2026-11-02 09:00:00+05:30','2026-11-01 09:00:00+05:30','2026-11-01 09:00:00+05:30',NULL,NULL),
  (6,'TKT-20251025-006',11,4,4,9,'open','maintenance','Fire door inspection',NULL,'normal','equipment',1.0,NULL,'2025-10-31 09:00:00+05:30','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30',NULL,NULL),
  (7,'TKT-20251025-007',12,4,4,9,'open','maintenance','Training kit missing items',NULL,'normal','equipment',0.5,NULL,'2025-11-01 09:00:00+05:30','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30',NULL,NULL),
  (8,'TKT-20251025-008',13,5,5,12,'open','maintenance','Fire door inspection type B',NULL,'normal','equipment',1.0,NULL,'2025-10-31 09:00:00+05:30','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30',NULL,NULL),
  (9,'TKT-20251025-009',14,5,5,12,'open','maintenance','Training kit pro missing items',NULL,'normal','equipment',0.5,NULL,'2025-11-01 09:00:00+05:30','2025-10-25 11:25:00+05:30','2025-10-25 11:25:00+05:30',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------
-- 15. notification (automatically generated by triggers when equipment with compliance issues is inserted)
-- --------------------------------------------------------------
-- Note: Notifications are auto-generated by database triggers, no manual insert needed

-- --------------------------------------------------------------
-- 16. audit_log (example rows)
-- --------------------------------------------------------------
INSERT INTO public.audit_log (
  id, table_name, record_id, action_type, changes, metadata,
  ip_address, user_agent, session_id, changed_by,
  created_at, vendor_id, client_id
) VALUES
  (1,'user','{"user_id":1}','LOGIN',NULL,'{"timestamp":"2025-10-25T11:20:00+05:30"}','::1','Mozilla/5.0','sess-001',1,'2025-10-25 11:25:00+05:30',NULL,NULL),
  (2,'user','{"user_id":2}','LOGIN',NULL,'{"timestamp":"2025-10-25T11:22:00+05:30"}','::1','Mozilla/5.0','sess-002',2,'2025-10-25 11:25:00+05:30',1,NULL),
  (3,'equipment_instance','{"equipment_instance_id":4}','ASSIGN','{"assigned_to":1}','{"timestamp":"2025-10-25T11:25:00+05:30"}','::1','Mozilla/5.0','sess-002',2,'2025-10-25 11:25:00+05:30',1,1);

-- --------------------------------------------------------------
-- 17. password_reset & user_sessions (demo rows)
-- --------------------------------------------------------------
INSERT INTO public.password_reset (id, user_id, reset_token, ip_address, user_agent, expires_at, used, created_at) VALUES
  (1,2,'reset-001','::1','Mozilla/5.0','2025-10-26 11:25:00+05:30',false,'2025-10-25 11:25:00+05:30');

INSERT INTO public.user_sessions (id, user_id, session_token, ip_address, user_agent, last_activity, expires_at, created_at, is_active) VALUES
  (1,1,'sess-001','::1','Mozilla/5.0','2025-10-25 11:25:00+05:30','2025-10-26 11:25:00+05:30','2025-10-25 11:25:00+05:30',true);

-- ==============================================================
--  SEQUENCE RESETS - Fix auto-increment after explicit inserts
-- ==============================================================

-- Reset all sequences to proper values after explicit ID inserts
SELECT setval('user_id_seq', (SELECT MAX(id) FROM public.user));
SELECT setval('system_settings_id_seq', (SELECT MAX(id) FROM public.system_settings));
SELECT setval('role_id_seq', (SELECT MAX(id) FROM public.role));
SELECT setval('vendor_id_seq', (SELECT MAX(id) FROM public.vendors));
SELECT setval('client_id_seq', (SELECT MAX(id) FROM public.clients));
SELECT setval('specialization_id_seq', (SELECT MAX(id) FROM public.specialization));
SELECT setval('equipment_id_seq', (SELECT MAX(id) FROM public.equipment));
SELECT setval('equipment_instance_id_seq', (SELECT MAX(id) FROM public.equipment_instance));
SELECT setval('equipment_assignment_id_seq', (SELECT MAX(id) FROM public.equipment_assignment));
SELECT setval('maintenance_ticket_id_seq', (SELECT MAX(id) FROM public.maintenance_ticket));
SELECT setval('notification_id_seq', (SELECT MAX(id) FROM public.notification));
SELECT setval('audit_log_id_seq', (SELECT MAX(id) FROM public.audit_log));
SELECT setval('user_sessions_id_seq', (SELECT MAX(id) FROM public.user_sessions));

-- ==============================================================
--  END OF SEED FILE
-- ==============================================================
