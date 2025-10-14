import { pool } from '../config/database';
import { User, CreateUserRequest, JwtPayload } from '../types';
import { PoolClient } from 'pg';

export class UserRepository {
  
  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT 
        id, first_name, last_name, display_name, email, password, 
        user_type, role_id, is_locked, locked_until, failed_login_attempts,
        last_login, last_login_ip, created_at, deleted_at
      FROM "user" 
      WHERE email = $1 AND deleted_at IS NULL
    `;
    
    try {
      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const query = `
      SELECT 
        id, first_name, last_name, display_name, email, password, 
        user_type, role_id, is_locked, locked_until, failed_login_attempts,
        last_login, last_login_ip, created_at, deleted_at
      FROM "user" 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  static async create(userData: CreateUserRequest): Promise<User> {
    const query = `
      INSERT INTO "user" (first_name, last_name, email, password, user_type, role_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, first_name, last_name, display_name, email, password, 
        user_type, role_id, is_locked, locked_until, failed_login_attempts,
        last_login, last_login_ip, created_at, deleted_at
    `;
    
    const values = [
      userData.first_name,
      userData.last_name,
      userData.email,
      userData.password,
      userData.user_type,
      userData.role_id
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user's last login information
   */
  static async updateLastLogin(userId: number, ipAddress?: string): Promise<void> {
    const query = `
      UPDATE "user" 
      SET 
        last_login = CURRENT_TIMESTAMP,
        last_login_ip = $2,
        failed_login_attempts = 0
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId, ipAddress]);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   */
  static async incrementFailedAttempts(userId: number): Promise<void> {
    const query = `
      UPDATE "user" 
      SET failed_login_attempts = failed_login_attempts + 1
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error incrementing failed attempts:', error);
      throw error;
    }
  }

  /**
   * Lock user account
   */
  static async lockAccount(userId: number, lockDuration: number = 30): Promise<void> {
    const query = `
      UPDATE "user" 
      SET 
        is_locked = true,
        locked_until = CURRENT_TIMESTAMP + INTERVAL '${lockDuration} minutes'
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error locking account:', error);
      throw error;
    }
  }

  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId: number): Promise<boolean> {
    const query = `
      SELECT is_locked, locked_until 
      FROM "user" 
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      const user = result.rows[0];
      
      if (!user) return false;
      
      // If account is locked and lock time hasn't expired
      if (user.is_locked && user.locked_until && new Date() < user.locked_until) {
        return true;
      }
      
      // If lock time has expired, unlock the account
      if (user.is_locked && user.locked_until && new Date() >= user.locked_until) {
        await this.unlockAccount(userId);
        return false;
      }
      
      return user.is_locked;
    } catch (error) {
      console.error('Error checking account lock status:', error);
      throw error;
    }
  }

  /**
   * Unlock user account
   */
  static async unlockAccount(userId: number): Promise<void> {
    const query = `
      UPDATE "user" 
      SET 
        is_locked = false,
        locked_until = NULL,
        failed_login_attempts = 0
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error unlocking account:', error);
      throw error;
    }
  }

  /**
   * Get users by type
   */
  static async findByUserType(userType: 'admin' | 'vendor' | 'client'): Promise<User[]> {
    const query = `
      SELECT 
        id, first_name, last_name, display_name, email, 
        user_type, role_id, is_locked, locked_until, failed_login_attempts,
        last_login, last_login_ip, created_at
      FROM "user" 
      WHERE user_type = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userType]);
      return result.rows;
    } catch (error) {
      console.error('Error finding users by type:', error);
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  static async softDelete(userId: number): Promise<void> {
    const query = `
      UPDATE "user" 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error soft deleting user:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    const query = `
      UPDATE "user" 
      SET password = $2
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId, hashedPassword]);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Get recent vendors
   */
  static async getRecentVendors(limit: number = 5): Promise<User[]> {
    const query = `
      SELECT 
        id, first_name, last_name, display_name, email, 
        user_type, created_at
      FROM "user" 
      WHERE user_type = 'vendor' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    try {
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting recent vendors:', error);
      throw error;
    }
  }

  /**
   * Get all vendors
   */
  static async getVendors(): Promise<User[]> {
    const query = `
      SELECT 
        id, first_name, last_name, display_name, email, 
        user_type, created_at, last_login
      FROM "user" 
      WHERE user_type = 'vendor' AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting vendors:', error);
      throw error;
    }
  }
}