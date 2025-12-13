-- Fix database sequences after seed data inserts
-- Run this if you're getting primary key constraint violations

SELECT setval('user_id_seq', (SELECT MAX(id) FROM public.user));
SELECT setval('system_settings_id_seq', (SELECT MAX(id) FROM public.system_settings));
SELECT setval('role_id_seq', (SELECT MAX(id) FROM public.role));
SELECT setval('vendors_id_seq', (SELECT MAX(id) FROM public.vendors));
SELECT setval('clients_id_seq', (SELECT MAX(id) FROM public.clients));
SELECT setval('specialization_id_seq', (SELECT MAX(id) FROM public.specialization));
SELECT setval('equipment_id_seq', (SELECT MAX(id) FROM public.equipment));
SELECT setval('equipment_instance_id_seq', (SELECT MAX(id) FROM public.equipment_instance));
SELECT setval('equipment_assignment_id_seq', (SELECT MAX(id) FROM public.equipment_assignment));
SELECT setval('assignment_item_id_seq', (SELECT MAX(id) FROM public.assignment_item));
SELECT setval('maintenance_ticket_id_seq', (SELECT MAX(id) FROM public.maintenance_ticket));
SELECT setval('notification_id_seq', (SELECT MAX(id) FROM public.notification));
SELECT setval('audit_log_id_seq', (SELECT MAX(id) FROM public.audit_log));
SELECT setval('user_sessions_id_seq', (SELECT MAX(id) FROM public.user_sessions));

-- Verify sequences are properly set
SELECT 'user_id_seq' as sequence_name, last_value FROM user_id_seq
UNION ALL
SELECT 'equipment_id_seq', last_value FROM equipment_id_seq
UNION ALL
SELECT 'equipment_instance_id_seq', last_value FROM equipment_instance_id_seq
UNION ALL
SELECT 'equipment_assignment_id_seq', last_value FROM equipment_assignment_id_seq;