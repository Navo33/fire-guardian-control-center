-- Migration 004: Add Token Refresh Setting
-- Adds configuration for automatic token refresh threshold
-- Created: 2025-12-19

INSERT INTO public.system_settings (
  setting_key, 
  setting_value, 
  setting_type, 
  description, 
  updated_at, 
  updated_by
) VALUES (
  'token_refresh_threshold_minutes', 
  '5', 
  'number', 
  'Refresh token automatically if expiring within this many minutes', 
  CURRENT_TIMESTAMP, 
  NULL
) ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = '5',
  description = 'Refresh token automatically if expiring within this many minutes',
  updated_at = CURRENT_TIMESTAMP;
