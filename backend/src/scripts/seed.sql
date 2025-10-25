-- Insert into schema_migrations
INSERT INTO public.schema_migrations (migration_name, executed_at, execution_time_ms, success) VALUES
('001_initial_schema', '2025-10-25 11:25:00+05:30', 258, true),
('002_enhanced_schema', '2025-10-25 11:25:00+05:30', 200, true);

-- Insert into user
INSERT INTO public.user (id, first_name, last_name, display_name, email, password, user_type, role_id, is_locked, failed_login_attempts, last_login, last_login_ip, created_at, updated_at, last_password_change, phone) VALUES
(1, 'Admin', 'User', 'Admin User', 'admin@fireguardian.com', '$2b$12$p/dLwpfQ4E4jUuZcmw4uDegiUDIRclO56nonpYjTPkLq/Q0x2x0Ie', 'admin', 1, false, 0, '2025-10-25 11:20:00+05:30', '::1', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 123 4567'),
(2, 'Lakmal', 'Silva', 'Lakmal Silva', 'lakmal@safefire.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, '2025-10-25 11:22:00+05:30', '::1', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 234 5678'),
(3, 'Nimali', 'Perera', 'Nimali Perera', 'nimali@proguard.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 345 6789'),
(4, 'Ruwan', 'Bandara', 'Ruwan Bandara', 'ruwan@fireshield.lk', '$2b$12$RJncseQumfTlZBZmPRR/WehxSkVQOFljsvzzHEJV5A9Sg140kjF6.', 'vendor', 2, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 81 456 7890'),
(5, 'Kasun', 'Jayasinghe', 'Kasun Jayasinghe', 'kasun@royalhotels.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 567 8901'),
(6, 'Shalini', 'Fernando', 'Shalini Fernando', 'shalini@techinnovations.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 11 678 9012'),
(7, 'Dilshan', 'Weerasinghe', 'Dilshan Weerasinghe', 'dilshan@citymall.lk', '$2b$12$cE0ghM8sGqpxo3NesiCAs.WT7KsGbrbJglAH03vGt2hrN3Fx.Rcvq', 'client', 3, false, 0, NULL, NULL, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30', '+94 91 789 0123');

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
(3, 'client', 'View assigned equipment and tickets', '2025-10-25 11:25:00+05:30');

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
(14, 'manage_system_settings', 'Manage system settings', 'system', '2025-10-25 11:25:00+05:30');

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
(3, 11, 1, '2025-10-25 11:25:00+05:30'); -- client: view_maintenance

-- Insert into vendors
INSERT INTO public.vendors (id, user_id, company_name, business_type, license_number, primary_phone, street_address, city, state, zip_code, country, status, created_at, updated_at) VALUES
(1, 2, 'SafeFire Solutions', 'Fire Safety Services', 'FS-2019-001', '+94 11 234 5678', '45 Ward Place', 'Colombo', 'Western Province', '00700', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 3, 'ProGuard Fire Systems', 'Fire Protection Equipment', 'FS-2018-045', '+94 11 345 6789', '78 Duplication Road', 'Colombo', 'Western Province', '00400', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 4, 'FireShield Technologies', 'Fire Safety Technology', 'FS-2020-089', '+94 81 456 7890', '12 Station Road', 'Kandy', 'Central Province', '20000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into clients
INSERT INTO public.clients (id, user_id, created_by_vendor_id, company_name, business_type, primary_phone, street_address, city, state, zip_code, country, status, created_at, updated_at) VALUES
(1, 5, 1, 'Royal Hotels Group', 'Hospitality', '+94 11 567 8901', '100 Galle Road', 'Colombo', 'Western Province', '00300', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 6, 2, 'Tech Innovations Ltd', 'Technology', '+94 11 678 9012', '25 Havelock Road', 'Colombo', 'Western Province', '00500', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 7, 3, 'City Mall PLC', 'Retail', '+94 91 789 0123', '50 Main Street', 'Galle', 'Southern Province', '80000', 'Sri Lanka', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

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
(5, 'EL-LED-001', 'LED Emergency Exit Light', 'Emergency Lighting', 'BrightPath', 'BP-EXIT-LED', '{"type": "LED"}', 8000.00, 7, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into equipment_instance
INSERT INTO public.equipment_instance (id, equipment_id, serial_number, vendor_id, status, purchase_date, warranty_expiry, expiry_date, next_maintenance_date, maintenance_interval_days, created_at, updated_at) VALUES
(1, 1, 'SN-20251025-001', 1, 'available', '2025-10-01', '2026-10-01', '2030-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 2, 'SN-20251025-002', 2, 'available', '2025-10-01', '2026-10-01', '2030-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 3, 'SN-20251025-003', 3, 'available', '2025-10-01', '2026-10-01', '2035-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(4, 4, 'SN-20251025-004', 1, 'assigned', '2025-10-01', '2026-10-01', '2032-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(5, 5, 'SN-20251025-005', 2, 'assigned', '2025-10-01', '2026-10-01', '2032-10-01', '2026-04-01', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(6, 1, 'SN-20251025-006', 1, 'available', '2025-10-15', '2026-10-15', '2030-10-15', '2026-04-15', 365, '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into equipment_assignment
INSERT INTO public.equipment_assignment (id, client_id, vendor_id, assignment_number, assigned_at, status, created_at, updated_at) VALUES
(1, 1, 1, 'ASG-20251025-001', '2025-10-25 11:25:00+05:30', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 2, 2, 'ASG-20251025-002', '2025-10-25 11:25:00+05:30', 'active', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into assignment_item
INSERT INTO public.assignment_item (assignment_id, equipment_instance_id, quantity, unit_cost, total_cost) VALUES
(1, 4, 1, 3500.00, 3500.00),
(2, 5, 1, 8000.00, 8000.00);

-- Insert into maintenance_ticket
INSERT INTO public.maintenance_ticket (id, ticket_number, equipment_instance_id, client_id, vendor_id, ticket_status, support_type, issue_description, priority, created_at, updated_at) VALUES
(1, 'TKT-20251025-001', 4, 1, 1, 'open', 'maintenance', 'Pressure gauge issue', 'normal', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(2, 'TKT-20251025-002', 5, 2, 2, 'open', 'maintenance', 'Nozzle blockage', 'normal', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30'),
(3, 'TKT-20251025-003', NULL, 1, 1, 'open', 'system', 'Dashboard access issue', 'high', '2025-10-25 11:25:00+05:30', '2025-10-25 11:25:00+05:30');

-- Insert into notification
INSERT INTO public.notification (id, user_id, title, message, type, priority, category, is_read, created_at) VALUES
(1, 2, 'Equipment Due Soon', 'Equipment SN-20251025-001 is due for maintenance soon. Action required by 2026-04-01.', 'alert', 'normal', 'equipment', false, '2025-10-25 11:25:00+05:30'),
(2, 3, 'Equipment Due Soon', 'Equipment SN-20251025-002 is due for maintenance soon. Action required by 2026-04-01.', 'alert', 'normal', 'equipment', false, '2025-10-25 11:25:00+05:30'),
(3, 4, 'Equipment Due Soon', 'Equipment SN-20251025-003 is due for maintenance soon. Action required by 2026-04-01.', 'alert', 'normal', 'equipment', false, '2025-10-25 11:25:00+05:30');

-- Insert into audit_log
INSERT INTO public.audit_log (id, table_name, record_id, action_type, changes, metadata, ip_address, changed_by, created_at, vendor_id) VALUES
(1, 'user', '{"user_id": 1}', 'LOGIN', NULL, '{"timestamp": "2025-10-25T11:20:00+05:30"}', '::1', 1, '2025-10-25 11:25:00+05:30', NULL),
(2, 'user', '{"user_id": 2}', 'LOGIN', NULL, '{"timestamp": "2025-10-25T11:22:00+05:30"}', '::1', 2, '2025-10-25 11:25:00+05:30', 1),
(3, 'equipment_instance', '{"equipment_instance_id": 4}', 'ASSIGN', '{"assigned_to": 1}', '{"timestamp": "2025-10-25T11:25:00+05:30"}', '::1', 2, '2025-10-25 11:25:00+05:30', 1),
(4, 'equipment_instance', '{"equipment_instance_id": 5}', 'ASSIGN', '{"assigned_to": 2}', '{"timestamp": "2025-10-25T11:25:00+05:30"}', '::1', 3, '2025-10-25 11:25:00+05:30', 2);

-- Insert into password_reset
INSERT INTO public.password_reset (id, user_id, reset_token, ip_address, user_agent, expires_at, used, created_at) VALUES
(1, 2, 'reset-token-001', '::1', 'Mozilla/5.0', '2025-10-26 11:25:00+05:30', false, '2025-10-25 11:25:00+05:30');

-- Insert into user_sessions
INSERT INTO public.user_sessions (id, user_id, session_token, ip_address, user_agent, last_activity, expires_at, created_at, is_active) VALUES
(1, 1, 'session-token-001', '::1', 'Mozilla/5.0', '2025-10-25 11:25:00+05:30', '2025-10-26 11:25:00+05:30', '2025-10-25 11:25:00+05:30', true),
(2, 2, 'session-token-002', '::1', 'Mozilla/5.0', '2025-10-25 11:25:00+05:30', '2025-10-26 11:25:00+05:30', '2025-10-25 11:25:00+05:30', true);