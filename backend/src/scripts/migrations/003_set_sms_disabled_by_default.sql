-- Migration: Set SMS disabled by default
-- Sets sms_enabled to false and ensures other SMS settings exist
-- Created: 2026-01-22

INSERT INTO public.system_settings (
  setting_key, 
  setting_value, 
  setting_type, 
  description, 
  updated_at, 
  updated_by
) VALUES 
  ('sms_enabled', 'false', 'boolean', 'Enable/disable SMS notifications globally', CURRENT_TIMESTAMP, NULL),
  ('sms_daily_limit', '1000', 'number', 'Maximum SMS messages per day', CURRENT_TIMESTAMP, NULL),
  ('sms_compliance_warning_days', '7', 'number', 'Days before compliance expiration to send SMS warning', CURRENT_TIMESTAMP, NULL),
  ('sms_maintenance_warning_days', '3', 'number', 'Days before maintenance due to send SMS reminder', CURRENT_TIMESTAMP, NULL)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = CASE 
    WHEN excluded.setting_key = 'sms_enabled' THEN 'false'
    ELSE excluded.setting_value
  END,
  updated_at = CURRENT_TIMESTAMP;
