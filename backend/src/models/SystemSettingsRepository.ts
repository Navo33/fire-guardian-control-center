/**
 * SystemSettingsRepository
 * Handles system-wide settings and configurations
 */

import { pool } from '../config/database';

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  updatedAt: Date;
  updatedBy?: number;
}

export interface UpdateSettingData {
  settingValue: string;
  updatedBy: number;
}

export class SystemSettingsRepository {
  /**
   * Get all system settings
   */
  static async getAllSettings(): Promise<SystemSetting[]> {
    const query = `
      SELECT 
        id,
        setting_key,
        setting_value,
        setting_type,
        description,
        updated_at,
        updated_by
      FROM system_settings
      ORDER BY setting_key
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      id: row.id,
      settingKey: row.setting_key,
      settingValue: row.setting_value,
      settingType: row.setting_type,
      description: row.description,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    }));
  }

  /**
   * Get a specific setting by key
   */
  static async getSettingByKey(key: string): Promise<SystemSetting | null> {
    const query = `
      SELECT 
        id,
        setting_key,
        setting_value,
        setting_type,
        description,
        updated_at,
        updated_by
      FROM system_settings
      WHERE setting_key = $1
    `;

    const result = await pool.query(query, [key]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      settingKey: row.setting_key,
      settingValue: row.setting_value,
      settingType: row.setting_type,
      description: row.description,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    };
  }

  /**
   * Update a system setting
   */
  static async updateSetting(
    key: string,
    data: UpdateSettingData
  ): Promise<SystemSetting | null> {
    const query = `
      UPDATE system_settings
      SET 
        setting_value = $1,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $2
      WHERE setting_key = $3
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.settingValue,
      data.updatedBy,
      key
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      settingKey: row.setting_key,
      settingValue: row.setting_value,
      settingType: row.setting_type,
      description: row.description,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    };
  }

  /**
   * Update multiple settings at once
   */
  static async updateMultipleSettings(
    settings: { key: string; value: string }[],
    updatedBy: number
  ): Promise<SystemSetting[]> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const updatedSettings: SystemSetting[] = [];

      for (const setting of settings) {
        const query = `
          UPDATE system_settings
          SET 
            setting_value = $1,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = $2
          WHERE setting_key = $3
          RETURNING *
        `;

        const result = await client.query(query, [
          setting.value,
          updatedBy,
          setting.key
        ]);

        if (result.rows.length > 0) {
          const row = result.rows[0];
          updatedSettings.push({
            id: row.id,
            settingKey: row.setting_key,
            settingValue: row.setting_value,
            settingType: row.setting_type,
            description: row.description,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by
          });
        }
      }

      await client.query('COMMIT');
      return updatedSettings;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get typed setting value
   */
  static async getTypedValue<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await this.getSettingByKey(key);

    if (!setting) {
      return defaultValue;
    }

    switch (setting.settingType) {
      case 'number':
        return Number(setting.settingValue) as T;
      case 'boolean':
        return (setting.settingValue === 'true') as T;
      case 'json':
        try {
          return JSON.parse(setting.settingValue) as T;
        } catch {
          return defaultValue;
        }
      case 'string':
      default:
        return setting.settingValue as T;
    }
  }

  /**
   * Get security settings as an object
   */
  static async getSecuritySettings(): Promise<{
    sessionTimeoutMinutes: number;
    passwordExpiryDays: number;
    passwordMinLength: number;
    requirePasswordChangeOnFirstLogin: boolean;
    maxFailedLoginAttempts: number;
    accountLockDurationMinutes: number;
  }> {
    const settings = await this.getAllSettings();

    const findSetting = (key: string) => 
      settings.find(s => s.settingKey === key);

    return {
      sessionTimeoutMinutes: Number(findSetting('session_timeout_minutes')?.settingValue || 30),
      passwordExpiryDays: Number(findSetting('password_expiry_days')?.settingValue || 90),
      passwordMinLength: Number(findSetting('password_min_length')?.settingValue || 8),
      requirePasswordChangeOnFirstLogin: findSetting('require_password_change_on_first_login')?.settingValue === 'true',
      maxFailedLoginAttempts: Number(findSetting('max_failed_login_attempts')?.settingValue || 5),
      accountLockDurationMinutes: Number(findSetting('account_lock_duration_minutes')?.settingValue || 30)
    };
  }
}
