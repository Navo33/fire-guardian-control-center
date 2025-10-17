/**
 * ProfileRepository
 * Handles user profile operations and password management
 */

import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  userType: 'admin' | 'vendor' | 'client';
  roleId?: number;
  roleName?: string;
  lastPasswordChange?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // User-type specific fields
  vendorId?: number;
  vendorCompanyName?: string;
  clientId?: number;
  clientCompanyName?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export class ProfileRepository {
  /**
   * Get user profile by ID with role and company information
   */
  static async getProfile(userId: number): Promise<UserProfile | null> {
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.display_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.user_type,
        u.role_id,
        u.last_password_change,
        u.last_login,
        u.created_at,
        u.updated_at,
        r.role_name,
        vc.id as vendor_id,
        vc.company_name as vendor_company_name,
        cc.id as client_id,
        cc.company_name as client_company_name
      FROM "user" u
      LEFT JOIN role r ON u.role_id = r.id
      LEFT JOIN vendor_company vc ON u.id = vc.vendor_id AND u.user_type = 'vendor'
      LEFT JOIN client_company cc ON u.id = cc.client_id AND u.user_type = 'client'
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      userType: row.user_type,
      roleId: row.role_id,
      roleName: row.role_name,
      lastPasswordChange: row.last_password_change,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      vendorId: row.vendor_id,
      vendorCompanyName: row.vendor_company_name,
      clientId: row.client_id,
      clientCompanyName: row.client_company_name
    };
  }

  /**
   * Update user profile fields
   */
  static async updateProfile(
    userId: number,
    data: UpdateProfileData
  ): Promise<UserProfile | null> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (data.firstName !== undefined) {
      updateFields.push(`first_name = $${paramCount}`);
      updateValues.push(data.firstName);
      paramCount++;
    }

    if (data.lastName !== undefined) {
      updateFields.push(`last_name = $${paramCount}`);
      updateValues.push(data.lastName);
      paramCount++;
    }

    // Update display_name if first or last name changed
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const profile = await this.getProfile(userId);
      const newFirstName = data.firstName || profile?.firstName || '';
      const newLastName = data.lastName || profile?.lastName || '';
      const newDisplayName = `${newFirstName} ${newLastName}`.trim();
      
      updateFields.push(`display_name = $${paramCount}`);
      updateValues.push(newDisplayName);
      paramCount++;
    }

    if (data.phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      updateValues.push(data.phone);
      paramCount++;
    }

    if (data.avatarUrl !== undefined) {
      updateFields.push(`avatar_url = $${paramCount}`);
      updateValues.push(data.avatarUrl);
      paramCount++;
    }

    if (updateFields.length === 0) {
      // No fields to update, return current profile
      return this.getProfile(userId);
    }

    // Always update updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(userId);

    const query = `
      UPDATE "user"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return null;
    }

    // Return full profile with joined data
    return this.getProfile(userId);
  }

  /**
   * Validate password against policy
   */
  static validatePassword(password: string, policy?: PasswordPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const defaultPolicy: PasswordPolicy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true
    };

    const activePolicy = policy || defaultPolicy;

    if (password.length < activePolicy.minLength) {
      errors.push(`Password must be at least ${activePolicy.minLength} characters long`);
    }

    if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (activePolicy.requireNumber && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (activePolicy.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; errors?: string[] }> {
    // Get current user password
    const userQuery = await pool.query(
      'SELECT password FROM "user" WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }

    const user = userQuery.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, message: 'Current password is incorrect' };
    }

    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      return { 
        success: false, 
        message: 'New password does not meet requirements', 
        errors: validation.errors 
      };
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return { success: false, message: 'New password must be different from current password' };
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and last_password_change
    const updateQuery = `
      UPDATE "user"
      SET 
        password = $1,
        last_password_change = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
    `;

    await pool.query(updateQuery, [hashedPassword, userId]);

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Check if password has expired based on system policy
   */
  static async isPasswordExpired(userId: number): Promise<boolean> {
    // Get password expiry days from system_settings
    const settingsQuery = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'password_expiry_days'`
    );

    const expiryDays = settingsQuery.rows.length > 0 ? parseInt(settingsQuery.rows[0].setting_value) : 0;

    // 0 means password never expires
    if (expiryDays === 0) {
      return false;
    }

    // Get user's last password change
    const userQuery = await pool.query(
      `SELECT last_password_change FROM "user" WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].last_password_change) {
      // No last password change recorded, consider expired
      return true;
    }

    const lastPasswordChange = new Date(userQuery.rows[0].last_password_change);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24));

    return daysSinceChange >= expiryDays;
  }

  /**
   * Get password policy from system settings
   */
  static async getPasswordPolicy(): Promise<PasswordPolicy> {
    const settingsQuery = await pool.query(
      `SELECT setting_key, setting_value 
       FROM system_settings 
       WHERE setting_key LIKE 'password_%'`
    );

    const minLength = settingsQuery.rows.find((r: any) => r.setting_key === 'password_min_length');

    return {
      minLength: minLength ? parseInt(minLength.setting_value) : 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true
    };
  }
}
