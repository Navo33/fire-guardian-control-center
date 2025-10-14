import { pool } from '../config/database';
import { AuditLog } from '../types';

export class AuditRepository {
  
  /**
   * Create audit log entry
   */
  static async createLog(
    tableName: string,
    recordId: any,
    actionType: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT',
    changes?: any,
    metadata?: any,
    changedBy?: number
  ): Promise<AuditLog> {
    const query = `
      INSERT INTO audit_log (table_name, record_id, action_type, changes, metadata, changed_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, table_name, record_id, action_type, changes, metadata, changed_by, created_at
    `;
    
    const values = [
      tableName,
      JSON.stringify(recordId),
      actionType,
      changes ? JSON.stringify(changes) : null,
      metadata ? JSON.stringify(metadata) : null,
      changedBy
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }

  /**
   * Log user login
   */
  static async logLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    const metadata = {
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString()
    };

    try {
      await this.createLog(
        'user',
        { user_id: userId },
        'LOGIN',
        null,
        metadata,
        userId
      );
    } catch (error) {
      console.error('Error logging login:', error);
      // Don't throw error as this shouldn't break the login process
    }
  }

  /**
   * Log user logout
   */
  static async logLogout(userId: number, ipAddress?: string): Promise<void> {
    const metadata = {
      ip_address: ipAddress,
      timestamp: new Date().toISOString()
    };

    try {
      await this.createLog(
        'user',
        { user_id: userId },
        'LOGOUT',
        null,
        metadata,
        userId
      );
    } catch (error) {
      console.error('Error logging logout:', error);
      // Don't throw error as this shouldn't break the logout process
    }
  }

  /**
   * Get audit logs for a specific table
   */
  static async getLogsByTable(tableName: string, limit: number = 100): Promise<AuditLog[]> {
    const query = `
      SELECT id, table_name, record_id, action_type, changes, metadata, changed_by, created_at
      FROM audit_log
      WHERE table_name = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [tableName, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting audit logs by table:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getLogsByUser(userId: number, limit: number = 100): Promise<AuditLog[]> {
    const query = `
      SELECT id, table_name, record_id, action_type, changes, metadata, changed_by, created_at
      FROM audit_log
      WHERE changed_by = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting audit logs by user:', error);
      throw error;
    }
  }
}