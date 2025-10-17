-- Migration: Add profile and security tracking columns
-- Date: 2025-10-17
-- Description: Add columns for password change tracking and profile management

-- Add last_password_change column to track when password was last changed
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add phone column for user profiles
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add profile picture URL
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Add bio/description for user profiles
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create index on last_password_change for password expiry queries
CREATE INDEX IF NOT EXISTS idx_user_last_password_change ON "user"(last_password_change);

-- Create system_settings table for session timeout and password expiry policies
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES "user"(id)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('session_timeout_minutes', '30', 'number', 'Session timeout in minutes'),
  ('password_expiry_days', '90', 'number', 'Password expiry period in days (0 = never)'),
  ('password_min_length', '8', 'number', 'Minimum password length'),
  ('require_password_change_on_first_login', 'false', 'boolean', 'Force password change on first login'),
  ('max_failed_login_attempts', '5', 'number', 'Maximum failed login attempts before account lock'),
  ('account_lock_duration_minutes', '30', 'number', 'Account lock duration in minutes')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Create user_sessions table for better session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- Update existing users to have last_password_change set to created_at
UPDATE "user" 
SET last_password_change = created_at 
WHERE last_password_change IS NULL;
