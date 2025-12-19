-- Migration 003: Add SMS System Tables
-- Adds SMS logging and user preferences for Dialog eSMS integration
-- Created: 2025-12-19

-- Create SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id SERIAL PRIMARY KEY,
    user_id INT4 REFERENCES public.user(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'HIGH_PRIORITY_TICKET', 'COMPLIANCE_EXPIRING', 'MAINTENANCE_DUE', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    dialog_response TEXT,
    dialog_status_code VARCHAR(10),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    related_entity_type VARCHAR(50), -- 'ticket', 'equipment', 'compliance'
    related_entity_id INT4
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON public.sms_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type ON public.sms_logs USING btree (message_type);

-- Add SMS notification preferences to users table
ALTER TABLE public.user 
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_high_priority_tickets BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_compliance_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_maintenance_reminders BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_user_sms_enabled ON public.user USING btree (sms_notifications_enabled);

-- Insert SMS-related system settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description) 
VALUES 
    ('sms_enabled', 'true', 'boolean', 'Enable/disable SMS notifications globally'),
    ('sms_api_key', '', 'string', 'Dialog eSMS API Key (esmsqk)'),
    ('sms_source_address', '', 'string', 'SMS Sender ID/Mask'),
    ('sms_daily_limit', '1000', 'number', 'Maximum SMS messages per day'),
    ('sms_compliance_warning_days', '7', 'number', 'Days before compliance expiry to send SMS'),
    ('sms_maintenance_warning_days', '3', 'number', 'Days before maintenance due to send SMS')
ON CONFLICT (setting_key) DO NOTHING;

-- Create table for tracking daily SMS usage
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

CREATE INDEX IF NOT EXISTS idx_sms_usage_stats_date ON public.sms_usage_stats USING btree (date);

COMMENT ON TABLE public.sms_logs IS 'Logs all SMS messages sent via Dialog eSMS';
COMMENT ON TABLE public.sms_usage_stats IS 'Daily statistics for SMS usage and quota tracking';
COMMENT ON COLUMN public.user.sms_notifications_enabled IS 'Master toggle for all SMS notifications';
COMMENT ON COLUMN public.user.sms_high_priority_tickets IS 'Receive SMS for high priority service tickets';
COMMENT ON COLUMN public.user.sms_compliance_alerts IS 'Receive SMS for compliance expiry alerts';
COMMENT ON COLUMN public.user.sms_maintenance_reminders IS 'Receive SMS for maintenance due/overdue';
