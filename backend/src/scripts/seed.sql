-- Insert into schema_migrations
INSERT INTO public.schema_migrations (migration_name, executed_at, execution_time_ms, success) VALUES
('001_initial_schema', '2025-10-25 11:25:00+05:30', 258, true),
('002_enhanced_schema', '2025-10-25 11:25:00+05:30', 200, true)
ON CONFLICT (migration_name) DO NOTHING;

-- Insert into user
INSERT INTO public.user (id, first_name, last_name, display_name, email, password, user_type, role_id, is_locked, failed_login_attempts, last_login, last_login_ip, created_at, updated_at, last_password_change, phone) VALUES
(1, 'Admin', 'User', 'Admin User', 'admin@fireguardian.com', '$2b$12$p/dLwpfQ4E4jUuZcmw4uDegiUDIRclO56nonpYjTPkLq/Q0x2x0Ie', 'admin', 1, false, 0, '2025-10-25 11:20:00+05:30', '::1', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 123 4567'),
(2, 'Lakmal', 'Silva', 'Lakmal Silva', 'lakmal@safefire.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, '2025-10-25 11:22:00+05:30', '::1', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 234 5678'),
(3, 'Nimali', 'Perera', 'Nimali Perera', 'nimali@proguard.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 345 6789'),
(4, 'Ruwan', 'Bandara', 'Ruwan Bandara', 'ruwan@fireshield.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 81 456 7890'),
(5, 'Kasun', 'Jayasinghe', 'Kasun Jayasinghe', 'kasun@royalhotels.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 567 8901'),
(6, 'Shalini', 'Fernando', 'Shalini Fernando', 'shalini@techinnovations.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 678 9012'),
(7, 'Dilshan', 'Weerasinghe', 'Dilshan Weerasinghe', 'dilshan@citymall.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 91 789 0123')
(8, 'Priyantha', 'Fernando', 'Priyantha Fernando', 'priyantha@fireguardian.com', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'admin', 1, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 77 123 4567'),
(9, 'Saman', 'Dissanayake', 'Saman Dissanayake', 'saman@safehomes.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 71 234 5678'),
(10, 'Harsha', 'Gunawardena', 'Harsha Gunawardena', 'harsha@citybuild.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 77 345 6789')
(11, 'Tharindu', 'Perera', 'Tharindu Perera', 'tharindu@fireguardian.com', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'admin', 1, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 77 456 7890'),
(12, 'Manoj', 'Seneviratne', 'Manoj Seneviratne', 'manoj@safehomes.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 71 456 7890'),
(13, 'Nadeesha', 'Wijesinghe', 'Nadeesha Wijesinghe', 'nadeesha@citybuild.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 77 567 8901')
ON CONFLICT (email) DO NOTHING;

-- Insert into system_settings
INSERT INTO public.system_settings (id, setting_key, setting_value, setting_type, description, updated_at, updated_by) VALUES
(1, 'session_timeout_minutes', '30', 'number', 'Session timeout in minutes', '2025-10-25 11:25:00+05:30', 1),
(2, 'password_expiry_days', '90', 'number', 'Password expiry period in days (0 = never)', '2025-10-25 11:25:00+05:30', 1),
(3, 'password_min_length', '8', 'number', 'Minimum password length', '2025-10-25 11:25:00+05:30', 1),
(4, 'require_password_change_on_first_login', 'false', 'boolean', 'Force password change on first login', '2025-10-25 11:25:00+05:30', 1),
(5, 'max_failed_login_attempts', '5', 'number', 'Maximum failed login attempts before account lock', '2025-10-25 11:25:00+05:30', 1),
(6, 'account_lock_duration_minutes', '30', 'number', 'Account lock duration in minutes', '2025-10-25 11:25:00+05:30', 1),
(7, 'maintenance_reminder_days', '30', 'number', 'Days before maintenance to send reminders', '2025-10-25 11:25:00+05:30', 1),
(8, 'expiry_reminder_days', '60', 'number', 'Days before expiry to send reminders', '2025-10-25 11:25:00+05:30', 1),
(9, 'vendor_equipment_limit', '1000', 'number', 'Maximum equipment instances per vendor', '2025-10-25 11:25:00+05:30', 1),
(10, 'compliance_alert_threshold', '90', 'number', 'Compliance alert threshold percentage for admin reports', '2025-10-25 11:25:00+05:30', 1);

-- Insert into role
INSERT INTO public.role (id, role_name, description, created_at) VALUES
(1, 'admin', 'Full system access', '2025-10-25 11:25:00+05:30'),
(2, 'vendor', 'Manage own equipment, clients, and tickets', '2025-10-25 11:25:00+05:30'),
(3, 'client', 'View assigned equipment and tickets', '2025-10-25 11:25:00+05:30')
ON CONFLICT (role_name) DO NOTHING;

-- Insert into permission
INSERT INTO public.permission (id, permission_name, description, category, created_at) VALUES
(1, 'manage_users', 'Create, update, delete users', 'user_management', '2025-10-25 11:25:00+05:30'),
(2, 'view_users', 'View user information', 'user_management', '2025-10-25 11:25:00+05:30'),
(3, 'manage_vendors', 'Manage vendor accounts', 'vendor_management', '2025-10-25 11:25:00+05:30'),
(4, 'view_vendors', 'View vendor information', 'vendor_management', '2025-10-25 11:25:00+05:30'),
(5, 'manage_clients', 'Manage client accounts', 'client_management', '2025-10-25 11:25:00+05:30'),
(6, 'view_clients', 'View client information', 'client_management', '2025-10-25 11:25:00+05:30'),
(7, 'manage_equipment', 'Manage equipment catalog', 'equipment_management', '2025-10-25 11:25:00+05:30'),
(8, 'view_equipment', 'View equipment information', 'equipment_management', '2025-10-25 11:25:00+05:30'),
(9, 'assign_equipment', 'Assign equipment to clients', 'equipment_management', '2025-10-25 11:25:00+05:30'),
(10, 'manage_maintenance', 'Manage maintenance tickets', 'maintenance', '2025-10-25 11:25:00+05:30'),
(11, 'view_maintenance', 'View maintenance information', 'maintenance', '2025-10-25 11:25:00+05:30'),
(12, 'manage_permissions', 'Manage roles and permissions', 'system', '2025-10-25 11:25:00+05:30'),
(13, 'view_audit_logs', 'View audit logs', 'system', '2025-10-25 11:25:00+05:30'),
(14, 'manage_system_settings', 'Manage system settings', 'system', '2025-10-25 11:25:00+05:30')
ON CONFLICT (permission_name) DO NOTHING;

-- Insert into role_permission
INSERT INTO public.role_permission (role_id, permission_id, granted_by, granted_at) VALUES
(1, 1, 1, '2025-10-25 11:25:00+05:30'), -- admin: manage_users
(1, 2, 1, '2025-10-25 11:25:00+05:30'), -- admin: view_users
(1, 3, 1, '2025-10-25 11:25:00+05:30'), -- admin: manage_vendors
(1, 4, 1, '2025-10-25 11:25:00+05:30'), -- admin: view_vendors
(1, 5, 1, '2025-10-25 11:25:00+05:30'), -- admin: manage_clients
(1, 6, 1, '2025-10-25 11:25:00+05:30'), -- admin: view_clients
(1, 7, 1, '2025-10-25 11:25:00+05:30'), -- admin: manage_equipment
(1, 8, 1, '2025-10-25 11:25:00+05:30'), -- admin: view_equipment
(1, 9, 1, '2025-10-25 11:25:00+05:30'), -- admin: assign_equipment
(1, 10, 1, '2025-10-25 11:25:00+05:30'), -- admin: manage_maintenance
(1, 11, 1, '2025-10-25 11:25:00+05:30'), -- admin: view_maintenance
(1, 12, 1, '2025-10-25 11:25:00+05:30'), -- admin: manage_permissions
(1, 13, 1, '2025-10-25 11:25:00+05:30'), -- admin: view_audit_logs
(1, 14, 1, '2025-10-25 11:25:00+05:30'), -- admin: manage_system_settings
(2, 8, 1, '2025-10-25 11:25:00+05:30'), -- vendor: view_equipment
(2, 9, 1, '2025-10-25 11:25:00+05:30'), -- vendor: assign_equipment
(2, 10, 1, '2025-10-25 11:25:00+05:30'), -- vendor: manage_maintenance
(2, 11, 1, '2025-10-25 11:25:00+05:30'), -- vendor: view_maintenance
(2, 6, 1, '2025-10-25 11:25:00+05:30'), -- vendor: view_clients
(3, 8, 1, '2025-10-25 11:25:00+05:30'), -- client: view_equipment
(3, 11, 1, '2025-10-25 11:25:00+05:30') -- client: view_maintenance
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert into vendors
INSERT INTO public.vendors (id, user_id, company_name, business_type, license_number, primary_phone, street_address, city, state, zip_code, country, status, created_at, updated_at) VALUES
(1, 2, 'SafeFire Solutions', 'Fire Safety Services', 'FS-2019-001', '+94 11 234 5678', '45 Ward Place', 'Colombo', 'Western Province', '00700', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 3, 'ProGuard Fire Systems', 'Fire Protection Equipment', 'FS-2018-045', '+94 11 345 6789', '78 Duplication Road', 'Colombo', 'Western Province', '00400', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 4, 'FireShield Technologies', 'Fire Safety Technology', 'FS-2020-089', '+94 81 456 7890', '12 Station Road', 'Kandy', 'Central Province', '20000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(4, 9, 'SafeHomes Solutions', 'Home Safety Services', 'FS-2021-123', '+94 71 234 5678', '22 Lake Road', 'Kurunegala', 'North Western', '60000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(5, 12, 'SafeHomes Pro', 'Home Safety Consulting', 'FS-2022-456', '+94 71 456 7890', '55 River Road', 'Matara', 'Southern', '81000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into clients
INSERT INTO public.clients (id, user_id, created_by_vendor_id, company_name, business_type, primary_phone, street_address, city, state, zip_code, country, status, created_at, updated_at) VALUES
(1, 5, 1, 'Royal Hotels Group', 'Hospitality', '+94 11 567 8901', '100 Galle Road', 'Colombo', 'Western Province', '00300', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 6, 2, 'Tech Innovations Ltd', 'Technology', '+94 11 678 9012', '25 Havelock Road', 'Colombo', 'Western Province', '00500', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 7, 3, 'City Mall PLC', 'Retail', '+94 91 789 0123', '50 Main Street', 'Galle', 'Southern Province', '80000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(4, 10, 4, 'CityBuild PLC', 'Construction', '+94 77 345 6789', '200 Main Road', 'Kurunegala', 'North Western', '60000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(5, 13, 5, 'BuildPro Ltd', 'Construction', '+94 77 567 8901', '300 Lake Road', 'Matara', 'Southern', '81000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into specialization
INSERT INTO public.specialization (id, name, description, category, certification_required, created_at, updated_at) VALUES
(1, 'Fire Extinguisher Installation', 'Installation of fire extinguishers', 'Installation', true, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 'Fire Alarm Systems', 'Installation and maintenance of fire alarms', 'Installation', true, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 'Sprinkler Systems', 'Installation of sprinkler systems', 'Installation', true, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(4, 'Fire Safety Inspection', 'Inspection services for fire safety compliance', 'Inspection', true, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(5, 'Emergency Lighting', 'Installation of emergency lighting', 'Installation', false, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(6, 'Fire Door Installation', 'Installation of fire-resistant doors', 'Installation', true, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(7, 'Fire Safety Training', 'Training on fire safety procedures', 'Training', false, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into vendor_specialization
INSERT INTO public.vendor_specialization (vendor_id, specialization_id, certification_number, certification_expiry, added_at) VALUES
(1, 1, 'CERT-001', '2026-10-25', '2025-10-25 11:25:00+05:30'),
(1, 4, 'CERT-002', '2026-10-25', '2025-10-25 11:25:00+05:30'),
(2, 2, 'CERT-003', '2026-10-25', '2025-10-25 11:25:00+05:30'),
(2, 3, 'CERT-004', '2026-10-25', '2025-10-25 11:25:00+05:30'),
(3, 5, NULL, NULL, '2025-10-25 11:25:00+05:30'),
(3, 6, 'CERT-005', '2026-10-25', '2025-10-25 11:25:00+05:30');

-- Insert into equipment
INSERT INTO public.equipment (id, equipment_code, equipment_name, equipment_type, manufacturer, model, specifications, price, default_lifespan_years, created_at, updated_at) VALUES
(1, 'FE-ABC-001', 'ABC Dry Powder Fire Extinguisher 9kg', 'Fire Extinguisher', 'FirePro Industries', 'FP-ABC-9KG', '{"capacity": "9kg", "type": "Dry Powder"}', 15000.00, 5, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 'FE-CO2-001', 'CO2 Fire Extinguisher 5kg', 'Fire Extinguisher', 'SafeGuard Systems', 'SG-CO2-5KG', '{"capacity": "5kg", "type": "CO2"}', 18000.00, 5, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 'FA-SMOKE-001', 'Photoelectric Smoke Detector', 'Fire Alarm', 'AlertTech', 'AT-SD-100', '{"type": "Photoelectric"}', 5000.00, 10, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(4, 'SP-HEAD-001', 'Standard Sprinkler Head', 'Sprinkler System', 'AquaFire', 'AF-SH-200', '{"type": "Standard"}', 3500.00, 7, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(5, 'EL-LED-001', 'LED Emergency Exit Light', 'Emergency Lighting', 'BrightPath', 'BP-EXIT-LED', '{"type": "LED"}', 8000.00, 7, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(6, 'FD-DOOR-001', 'Fire Door Type A', 'Fire Door', 'DoorSafe', 'DS-FD-A', '{"type": "Type A"}', 25000.00, 15, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(7, 'FS-TRAIN-001', 'Fire Safety Training Kit', 'Training Kit', 'SafeTrain', 'ST-KIT-01', '{"type": "Training"}', 12000.00, 3, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(8, 'FD-DOOR-002', 'Fire Door Type B', 'Fire Door', 'DoorSafe', 'DS-FD-B', '{"type": "Type B"}', 26000.00, 15, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(9, 'FS-TRAIN-002', 'Fire Safety Training Kit Pro', 'Training Kit', 'SafeTrain', 'ST-KIT-02', '{"type": "Training Pro"}', 15000.00, 4, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');
(10, 'FD-DOOR-003', 'Fire Door Type C', 'Fire Door', 'DoorSafe', 'DS-FD-C', '{"type": "Type C", "fire_rating": "120min"}', 27000.00, 20, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(11, 'FA-HEAT-001', 'Heat Detector', 'Fire Alarm', 'AlertTech', 'AT-HD-200', '{"type": "Heat", "sensitivity": "High"}', 6000.00, 8, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(12, 'SP-HEAD-002', 'Quick Response Sprinkler Head', 'Sprinkler System', 'AquaFire', 'AF-QR-300', '{"type": "Quick Response"}', 4000.00, 10, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(13, 'EL-LED-002', 'LED Emergency Exit Light Pro', 'Emergency Lighting', 'BrightPath', 'BP-EXIT-LED-PRO', '{"type": "LED", "battery_backup": "Yes"}', 9500.00, 10, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(14, 'FD-DOOR-004', 'Fire Door Type D', 'Fire Door', 'DoorSafe', 'DS-FD-D', '{"type": "Type D", "fire_rating": "180min"}', 30000.00, 25, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(15, 'FA-GAS-001', 'Gas Detector', 'Fire Alarm', 'AlertTech', 'AT-GD-300', '{"type": "Gas", "sensitivity": "Medium"}', 7000.00, 6, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(16, 'SP-HEAD-003', 'Residential Sprinkler Head', 'Sprinkler System', 'AquaFire', 'AF-RS-400', '{"type": "Residential"}', 3200.00, 12, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(17, 'EL-LED-003', 'LED Emergency Exit Light Mini', 'Emergency Lighting', 'BrightPath', 'BP-EXIT-LED-MINI', '{"type": "LED", "size": "Mini"}', 7000.00, 5, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(18, 'FD-DOOR-005', 'Fire Door Type E', 'Fire Door', 'DoorSafe', 'DS-FD-E', '{"type": "Type E", "fire_rating": "240min"}', 35000.00, 30, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

INSERT INTO public.equipment_instance (id, equipment_id, serial_number, vendor_id, status, purchase_date, warranty_expiry, expiry_date, next_maintenance_date, maintenance_interval_days, created_at, updated_at, assigned_to) VALUES
(1, 1, 'SN-20251025-001', 1, 'available', '2025-10-01', '2026-10-01', '2030-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(2, 2, 'SN-20251025-002', 2, 'available', '2025-10-01', '2026-10-01', '2030-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(3, 3, 'SN-20251025-003', 3, 'available', '2025-10-01', '2026-10-01', '2035-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(4, 4, 'SN-20251025-004', 1, 'assigned', '2025-10-01', '2026-10-01', '2032-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 1),
(5, 5, 'SN-20251025-005', 2, 'assigned', '2025-10-01', '2026-10-01', '2032-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 2),
(6, 1, 'SN-20251025-006', 1, 'available', '2025-10-15', '2026-10-15', '2030-10-15', '2026-04-15', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(7, 2, 'SN-20241025-007', 2, 'available', '2020-10-01', '2021-10-01', '2024-10-01', '2023-10-01', 365, '2024-10-25 11:25:00+05:30', '2024-10-25 11:25:00+05:30', NULL),
(8, 3, 'SN-20251027-008', 3, 'available', '2022-10-01', '2023-10-01', '2027-10-01', '2025-09-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(9, 4, 'SN-20251115-009', 1, 'assigned', '2025-11-01', '2026-11-01', '2032-11-01', '2025-11-20', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 1),
(10, 5, 'SN-20260101-010', 2, 'assigned', '2026-01-01', '2027-01-01', '2033-01-01', '2026-07-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 2),
(11, 6, 'SN-20251025-011', 4, 'available', '2025-10-01', '2026-10-01', '2040-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(12, 7, 'SN-20251025-012', 4, 'assigned', '2025-10-01', '2026-10-01', '2028-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 4),
(13, 8, 'SN-20251025-013', 5, 'available', '2025-10-01', '2026-10-01', '2040-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(14, 9, 'SN-20251025-014', 5, 'assigned', '2025-10-01', '2026-10-01', '2029-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 5),
(15, 10, 'SN-20251025-015', 1, 'available', '2025-10-01', '2026-10-01', '2045-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(16, 11, 'SN-20251025-016', 2, 'assigned', '2025-10-01', '2026-10-01', '2033-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 1),
(17, 12, 'SN-20251025-017', 3, 'available', '2025-10-01', '2026-10-01', '2035-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(18, 13, 'SN-20251025-018', 4, 'assigned', '2025-10-01', '2026-10-01', '2032-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 2),
(19, 14, 'SN-20251025-019', 5, 'available', '2025-10-01', '2026-10-01', '2049-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(20, 15, 'SN-20251025-020', 1, 'assigned', '2025-10-01', '2026-10-01', '2031-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 3),
(21, 16, 'SN-20251025-021', 2, 'available', '2025-10-01', '2026-10-01', '2037-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(22, 17, 'SN-20251025-022', 3, 'assigned', '2025-10-01', '2026-10-01', '2034-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 4),
(23, 18, 'SN-20251025-023', 4, 'available', '2025-10-01', '2026-10-01', '2055-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL),
(24, 10, 'SN-20251025-024', 5, 'assigned', '2025-10-01', '2026-10-01', '2042-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', 5);

INSERT INTO public.equipment_assignment (id, client_id, vendor_id, assignment_number, assigned_at, status, priority, notes, start_date, end_date, created_at, updated_at) VALUES
(1, 1, 1, 'ASG-20251025-001', '2025-10-25 11:25:00+05:30', 'active', 'normal', 'Initial assignment', '2025-10-25', '2026-10-25', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 2, 2, 'ASG-20251025-002', '2025-10-25 11:25:00+05:30', 'active', 'high', 'Urgent replacement', '2025-10-25', '2026-10-25', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 3, 3, 'ASG-20241025-003', '2024-10-25 11:25:00+05:30', 'closed', 'normal', 'Completed assignment', '2024-10-25', '2025-10-25', '2024-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(4, 1, 1, 'ASG-20261101-004', '2026-11-01 09:00:00+05:30', 'pending', 'normal', 'Scheduled for next year', '2026-11-01', '2027-11-01', '2026-11-01 09:00:00+05:30', '2026-11-01 09:00:00+05:30'),
(5, 4, 4, 'ASG-20251025-005', '2025-10-25 11:25:00+05:30', 'active', 'normal', 'Fire door install', '2025-10-25', '2026-10-25', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(6, 5, 5, 'ASG-20251025-006', '2025-10-25 11:25:00+05:30', 'active', 'normal', 'Training kit install', '2025-10-25', '2026-10-25', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

INSERT INTO public.assignment_item (assignment_id, equipment_instance_id, quantity, notes) VALUES
(1, 4, 1, 'Fire extinguisher for lobby'),
(2, 5, 1, 'Emergency light for hallway'),
(3, 7, 2, 'Expired equipment for testing'),
(4, 9, 1, 'Due soon equipment for future assignment'),
(5, 12, 1, 'Training kit for staff'),
(5, 11, 1, 'Fire door for main entrance'),
(6, 14, 1, 'Training kit pro for staff'),
(6, 13, 1, 'Fire door type B for entrance');

INSERT INTO public.maintenance_ticket (id, ticket_number, equipment_instance_id, client_id, vendor_id, assigned_technician, ticket_status, support_type, issue_description, resolution_description, priority, category, estimated_hours, actual_hours, scheduled_date, created_at, updated_at, resolved_at, closed_at) VALUES
(1, 'TKT-20251025-001', 4, 1, 1, 2, 'open', 'maintenance', 'Pressure gauge issue', NULL, 'normal', 'equipment', 2.0, NULL, '2025-10-28 09:00:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL, NULL),
(2, 'TKT-20251025-002', 5, 2, 2, 3, 'open', 'maintenance', 'Nozzle blockage', NULL, 'normal', 'equipment', 1.5, NULL, '2025-10-29 10:00:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL, NULL),
(3, 'TKT-20251025-003', NULL, 1, 1, 2, 'open', 'system', 'Dashboard access issue', NULL, 'high', 'system', 0.5, NULL, '2025-10-30 11:00:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL, NULL),
(4, 'TKT-20241025-004', 7, 3, 3, 4, 'closed', 'maintenance', 'Expired equipment replaced', 'Replaced with new unit', 'normal', 'equipment', 2.0, 2.0, '2024-10-26 09:00:00+05:30', '2024-10-25 11:25:00+05:30', '2024-10-25 11:25:00+05:30', '2024-10-27 12:00:00+05:30', '2024-10-27 13:00:00+05:30'),
(5, 'TKT-20261101-005', 10, 2, 2, 3, 'open', 'maintenance', 'Scheduled maintenance for compliant equipment', NULL, 'normal', 'equipment', 1.0, NULL, '2026-11-02 09:00:00+05:30', '2026-11-01 09:00:00+05:30', '2026-11-01 09:00:00+05:30', NULL, NULL),
(6, 'TKT-20251025-006', 11, 4, 4, 9, 'open', 'maintenance', 'Fire door inspection', NULL, 'normal', 'equipment', 1.0, NULL, '2025-10-31 09:00:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL, NULL),
(7, 'TKT-20251025-007', 12, 4, 4, 9, 'open', 'maintenance', 'Training kit missing items', NULL, 'normal', 'equipment', 0.5, NULL, '2025-11-01 09:00:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL, NULL),
(8, 'TKT-20251025-008', 13, 5, 5, 12, 'open', 'maintenance', 'Fire door inspection type B', NULL, 'normal', 'equipment', 1.0, NULL, '2025-10-31 09:00:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL, NULL),
(9, 'TKT-20251025-009', 14, 5, 5, 12, 'open', 'maintenance', 'Training kit pro missing items', NULL, 'normal', 'equipment', 0.5, NULL, '2025-11-01 09:00:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', NULL, NULL);

INSERT INTO public.notification (id, user_id, title, message, type, priority, category, is_read, is_archived, read_at, action_url, metadata, created_at, expires_at) VALUES
(1, 2, 'Equipment Due Soon', 'Equipment SN-20251025-001 is due for maintenance soon. Action required by 2026-04-01.', 'alert', 'normal', 'equipment', false, false, NULL, NULL, NULL, '2025-10-25 11:25:00+05:30', NULL),
(2, 3, 'Equipment Expired', 'Equipment SN-20241025-007 has expired. Immediate action required.', 'alert', 'high', 'equipment', false, false, NULL, NULL, NULL, '2024-10-25 11:25:00+05:30', NULL),
(3, 4, 'Maintenance Overdue', 'Equipment SN-20251027-008 is overdue for maintenance. Please schedule service.', 'alert', 'high', 'equipment', false, false, NULL, NULL, NULL, '2025-10-25 11:25:00+05:30', NULL),
(4, 5, 'Maintenance Scheduled', 'Maintenance for SN-20260101-010 scheduled for 2026-11-02.', 'info', 'normal', 'equipment', false, false, NULL, NULL, NULL, '2026-11-01 09:00:00+05:30', NULL),
(5, 9, 'Fire Door Inspection', 'Fire door SN-20251025-011 scheduled for inspection.', 'info', 'normal', 'equipment', false, false, NULL, NULL, NULL, '2025-10-25 11:25:00+05:30', NULL),
(6, 10, 'Training Kit Issue', 'Training kit SN-20251025-012 reported missing items.', 'alert', 'normal', 'equipment', false, false, NULL, NULL, NULL, '2025-10-25 11:25:00+05:30', NULL),
(7, 12, 'Fire Door Inspection Type B', 'Fire door SN-20251025-013 scheduled for inspection.', 'info', 'normal', 'equipment', false, false, NULL, NULL, NULL, '2025-10-25 11:25:00+05:30', NULL),
(8, 13, 'Training Kit Pro Issue', 'Training kit SN-20251025-014 reported missing items.', 'alert', 'normal', 'equipment', false, false, NULL, NULL, NULL, '2025-10-25 11:25:00+05:30', NULL);

INSERT INTO public.audit_log (id, table_name, record_id, action_type, changes, metadata, ip_address, user_agent, session_id, changed_by, created_at, vendor_id, client_id) VALUES
(1, 'user', '{"user_id": 1}', 'LOGIN', NULL, '{"timestamp": "2025-10-25T11:20:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-001', 1, '2025-10-25 11:25:00+05:30', NULL, NULL),
(2, 'user', '{"user_id": 2}', 'LOGIN', NULL, '{"timestamp": "2025-10-25T11:22:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-002', 2, '2025-10-25 11:25:00+05:30', 1, NULL),
(3, 'equipment_instance', '{"equipment_instance_id": 4}', 'ASSIGN', '{"assigned_to": 1}', '{"timestamp": "2025-10-25T11:25:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-002', 2, '2025-10-25 11:25:00+05:30', 1, 1),
(4, 'equipment_instance', '{"equipment_instance_id": 5}', 'ASSIGN', '{"assigned_to": 2}', '{"timestamp": "2025-10-25T11:25:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-002', 3, '2025-10-25 11:25:00+05:30', 2, 2),
(5, 'equipment_instance', '{"equipment_instance_id": 7}', 'EXPIRE', '{"expired": true}', '{"timestamp": "2024-10-25T11:25:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-002', 3, '2024-10-25 11:25:00+05:30', 2, 3),
(6, 'maintenance_ticket', '{"ticket_id": 5}', 'SCHEDULE', '{"scheduled_date": "2026-11-02"}', '{"timestamp": "2026-11-01T09:00:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-002', 3, '2026-11-01 09:00:00+05:30', 2, 2),
(7, 'equipment_instance', '{"equipment_instance_id": 11}', 'INSPECT', '{"inspected": true}', '{"timestamp": "2025-10-31T09:00:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-003', 9, '2025-10-31 09:00:00+05:30', 4, 4),
(8, 'equipment_instance', '{"equipment_instance_id": 12}', 'REPORT', '{"missing_items": true}', '{"timestamp": "2025-11-01T09:00:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-004', 9, '2025-11-01 09:00:00+05:30', 4, 4),
(9, 'equipment_instance', '{"equipment_instance_id": 13}', 'INSPECT', '{"inspected": true}', '{"timestamp": "2025-10-31T09:00:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-005', 12, '2025-10-31 09:00:00+05:30', 5, 5),
(10, 'equipment_instance', '{"equipment_instance_id": 14}', 'REPORT', '{"missing_items": true}', '{"timestamp": "2025-11-01T09:00:00+05:30"}', '::1', 'Mozilla/5.0', 'session-token-006', 12, '2025-11-01 09:00:00+05:30', 5, 5);

-- Insert into password_reset
INSERT INTO public.password_reset (id, user_id, reset_token, ip_address, user_agent, expires_at, used, created_at) VALUES
(1, 2, 'reset-token-001', '::1', 'Mozilla/5.0', '2025-10-26 11:25:00+05:30', false, '2025-10-25 11:25:00+05:30'),
(2, 9, 'reset-token-002', '::1', 'Mozilla/5.0', '2025-10-28 11:25:00+05:30', false, '2025-10-28 11:25:00+05:30'),
(3, 10, 'reset-token-003', '::1', 'Mozilla/5.0', '2025-10-29 11:25:00+05:30', false, '2025-10-29 11:25:00+05:30'),
(4, 12, 'reset-token-004', '::1', 'Mozilla/5.0', '2025-10-30 11:25:00+05:30', false, '2025-10-30 11:25:00+05:30'),
(5, 13, 'reset-token-005', '::1', 'Mozilla/5.0', '2025-10-31 11:25:00+05:30', false, '2025-10-31 11:25:00+05:30');

-- Insert into user_sessions
INSERT INTO public.user_sessions (id, user_id, session_token, ip_address, user_agent, last_activity, expires_at, created_at, is_active) VALUES
(1, 1, 'session-token-001', '::1', 'Mozilla/5.0', '2025-10-25 11:25:00+05:30', '2025-10-26 11:25:00+05:30', '2025-10-25 11:25:00+05:30', true),
(2, 2, 'session-token-002', '::1', 'Mozilla/5.0', '2025-10-25 11:25:00+05:30', '2025-10-26 11:25:00+05:30', '2025-10-25 11:25:00+05:30', true),
(3, 9, 'session-token-003', '::1', 'Mozilla/5.0', '2025-10-28 11:25:00+05:30', '2025-10-29 11:25:00+05:30', '2025-10-28 11:25:00+05:30', true),
(4, 10, 'session-token-004', '::1', 'Mozilla/5.0', '2025-10-29 11:25:00+05:30', '2025-10-30 11:25:00+05:30', '2025-10-29 11:25:00+05:30', true),
(5, 12, 'session-token-005', '::1', 'Mozilla/5.0', '2025-10-30 11:25:00+05:30', '2025-10-31 11:25:00+05:30', '2025-10-30 11:25:00+05:30', true),
(6, 13, 'session-token-006', '::1', 'Mozilla/5.0', '2025-10-31 11:25:00+05:30', '2025-11-01 11:25:00+05:30', '2025-10-31 11:25:00+05:30', true);