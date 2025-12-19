-- Migration 007: Fix Database Sequences
-- Synchronizes all sequence values with existing data to prevent primary key constraint violations
-- Created: 2025-12-19

-- Fix all database sequences to be in sync with actual data
SELECT setval('user_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.user), false);
SELECT setval('system_settings_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.system_settings), false);
SELECT setval('role_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.role), false);
SELECT setval('vendor_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.vendors), false);
SELECT setval('client_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.clients), false);
SELECT setval('specialization_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.specialization), false);
SELECT setval('equipment_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.equipment), false);
SELECT setval('equipment_instance_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.equipment_instance), false);
SELECT setval('equipment_assignment_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.equipment_assignment), false);
SELECT setval('maintenance_ticket_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.maintenance_ticket), false);
SELECT setval('notification_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.notification), false);
SELECT setval('audit_log_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.audit_log), false);
SELECT setval('user_sessions_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.user_sessions), false);
SELECT setval('password_reset_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.password_reset), false);
SELECT setval('sms_logs_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.sms_logs), false);
SELECT setval('sms_usage_stats_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.sms_usage_stats), false);
SELECT setval('schema_migrations_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM public.schema_migrations), false);
