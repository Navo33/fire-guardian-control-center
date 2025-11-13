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
   * Get recent vendors with comprehensive data for dashboard (same structure as VendorRepository.getVendors)
   */
  static async getRecentVendors(limit: number = 5): Promise<any[]> {
    const query = `
      SELECT 
        v.id as vendor_id,  -- This is the vendors.id that frontend needs
        u.id as user_id, u.first_name, u.last_name, u.display_name, u.email, 
        u.user_type, u.is_locked, u.last_login, u.created_at,
        
        -- Company details from vendors table
        v.company_name, v.business_type, v.license_number,
        v.primary_phone, v.street_address, v.city, v.state, v.zip_code, v.country,
        v.status as vendor_status,
        
        -- Equipment count
        (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = v.id AND deleted_at IS NULL) as equipment_count,
        
        -- Client count (clients created by this vendor)
        (SELECT COUNT(*) FROM clients WHERE created_by_vendor_id = v.id) as client_count,
        
        -- Specializations (comma-separated)
        (SELECT STRING_AGG(s.name, ', ') 
         FROM vendor_specialization vs 
         JOIN specialization s ON s.id = vs.specialization_id 
         WHERE vs.vendor_id = v.id) as specializations,
         
        -- Last activity (most recent from audit log)
        (SELECT MAX(created_at) FROM audit_log WHERE changed_by = u.id) as last_activity
         
      FROM "user" u
      INNER JOIN vendors v ON v.user_id = u.id
      WHERE u.user_type = 'vendor' AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT $1
    `;
    
    try {
      const result = await pool.query(query, [limit]);
      
      // Map to same structure as VendorRepository.getVendors
      return result.rows.map(row => ({
        ...row,
        id: row.vendor_id,  // Use vendor_id as the primary id for frontend
        equipment_count: parseInt(row.equipment_count) || 0,
        client_count: parseInt(row.client_count) || 0,
        // Add computed fields that frontend expects
        name: row.company_name || row.display_name || `${row.first_name} ${row.last_name}`,
        phone: row.primary_phone || '',
        location: row.city && row.state ? `${row.city}, ${row.state}` : '',
        category: row.specializations || 'General',
        status: row.is_locked ? 'Inactive' : 'Active',
        joinDate: new Date(row.created_at).toLocaleDateString(),
        lastActivity: row.last_activity ? new Date(row.last_activity).toLocaleDateString() : 
                     row.last_login ? new Date(row.last_login).toLocaleDateString() : 'Never',
        compliance: Math.floor(Math.random() * 30) + 70, // Temporary mock data
        clients: parseInt(row.client_count) || 0,
        equipment: parseInt(row.equipment_count) || 0
      }));
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

  /**
   * Get all users with detailed information for management
   */
  static async getAllUsers(): Promise<any[]> {
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.display_name,
        u.email,
        u.user_type,
        u.is_locked,
        u.last_login,
        u.created_at,
        r.role_name as role_name,
        CASE 
          WHEN u.user_type = 'vendor' THEN (
            SELECT COUNT(*) FROM vendors v WHERE v.user_id = u.id
          )
          WHEN u.user_type = 'client' THEN (
            SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id
          )
          ELSE 0
        END as companies_count,
        CASE 
          WHEN u.user_type = 'vendor' THEN (
            SELECT COUNT(*) FROM equipment_instance ei 
            JOIN vendors v ON v.id = ei.vendor_id
            WHERE v.user_id = u.id AND ei.deleted_at IS NULL
          )
          ELSE 0
        END as equipment_count,
        CASE 
          WHEN u.last_login > NOW() - INTERVAL '30 days' THEN 'Active'
          WHEN u.is_locked THEN 'Locked'
          ELSE 'Inactive'
        END as status
      FROM "user" u
      LEFT JOIN "role" r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get user statistics for insights
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    vendorUsers: number;
    clientUsers: number;
    adminUsers: number;
    recentlyJoined: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
        COUNT(CASE WHEN is_locked = true THEN 1 END) as locked_users,
        COUNT(CASE WHEN user_type = 'vendor' THEN 1 END) as vendor_users,
        COUNT(CASE WHEN user_type = 'client' THEN 1 END) as client_users,
        COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recently_joined
      FROM "user"
      WHERE deleted_at IS NULL
    `;
    
    try {
      const result = await pool.query(query);
      const row = result.rows[0];
      return {
        totalUsers: parseInt(row.total_users),
        activeUsers: parseInt(row.active_users),
        lockedUsers: parseInt(row.locked_users),
        vendorUsers: parseInt(row.vendor_users),
        clientUsers: parseInt(row.client_users),
        adminUsers: parseInt(row.admin_users),
        recentlyJoined: parseInt(row.recently_joined)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Update user status (lock/unlock)
   */
  static async updateUserStatus(userId: number, isLocked: boolean): Promise<void> {
    const query = `
      UPDATE "user" 
      SET is_locked = $1, locked_until = $2, failed_login_attempts = 0
      WHERE id = $3 AND deleted_at IS NULL
    `;
    
    const lockedUntil = isLocked ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null; // 24 hours if locked
    
    try {
      await pool.query(query, [isLocked, lockedUntil, userId]);
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Get vendor statistics for insights
   */
  static async getVendorStats(): Promise<{
    totalVendors: number;
    activeVendors: number;
    inactiveVendors: number;
    totalClients: number;
    totalEquipment: number;
    recentlyJoined: number;
  }> {
    const query = `
      SELECT 
        COUNT(DISTINCT u.id) as total_vendors,
        COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN u.id END) as active_vendors,
        COUNT(DISTINCT CASE WHEN u.last_login <= NOW() - INTERVAL '30 days' OR u.last_login IS NULL THEN u.id END) as inactive_vendors,
        (SELECT COUNT(DISTINCT id) FROM "user" WHERE user_type = 'client' AND deleted_at IS NULL) as total_clients,
        COUNT(DISTINCT ei.id) as total_equipment,
        COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '7 days' THEN u.id END) as recently_joined
      FROM "user" u
      LEFT JOIN vendors v ON v.user_id = u.id
      LEFT JOIN equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
      WHERE u.user_type = 'vendor' AND u.deleted_at IS NULL
    `;
    
    try {
      const result = await pool.query(query);
      const row = result.rows[0];
      return {
        totalVendors: parseInt(row.total_vendors),
        activeVendors: parseInt(row.active_vendors),
        inactiveVendors: parseInt(row.inactive_vendors),
        totalClients: parseInt(row.total_clients),
        totalEquipment: parseInt(row.total_equipment),
        recentlyJoined: parseInt(row.recently_joined)
      };
    } catch (error) {
      console.error('Error getting vendor stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed user information with role-specific data
   */
  static async getUserDetailById(userId: number): Promise<any> {
    try {
      // Get basic user info
      const userQuery = `
        SELECT 
          u.id, u.first_name, u.last_name, u.display_name, u.email, u.user_type,
          u.is_locked, u.last_login, u.created_at, u.last_login_ip,
          r.role_name
        FROM "user" u
        LEFT JOIN role r ON u.role_id = r.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `;
      
      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];
      let detailedInfo: any = { ...user };

      // Fetch role-specific information
      if (user.user_type === 'vendor') {
        detailedInfo = await this.getVendorDetails(userId, detailedInfo);
      } else if (user.user_type === 'client') {
        detailedInfo = await this.getClientDetails(userId, detailedInfo);
      }

      return detailedInfo;
    } catch (error) {
      console.error('Error getting user detail:', error);
      throw error;
    }
  }

  /**
   * Get vendor-specific details
   */
  private static async getVendorDetails(userId: number, baseInfo: any): Promise<any> {
    // Get vendor information from the vendors table
    const vendorQuery = `
      SELECT 
        v.company_name, v.business_type, v.license_number, 
        v.primary_phone, v.street_address, v.city, v.state, 
        v.zip_code, v.country, v.status,
        v.created_at as company_created_at, v.updated_at as company_updated_at
      FROM vendors v
      WHERE v.user_id = $1
    `;
    const vendorResult = await pool.query(vendorQuery, [userId]);

    // Get vendor specializations (using vendor ID from vendors table)
    const specializationsQuery = `
      SELECT 
        s.id, s.name, s.description, s.category
      FROM vendor_specialization vs
      JOIN specialization s ON s.id = vs.specialization_id
      JOIN vendors v ON v.id = vs.vendor_id
      WHERE v.user_id = $1
    `;
    const specializationsResult = await pool.query(specializationsQuery, [userId]);

    // Get equipment count (using vendor ID from vendors table)
    const equipmentCountQuery = `
      SELECT COUNT(*) as equipment_count
      FROM equipment_instance ei
      JOIN vendors v ON v.id = ei.vendor_id
      WHERE v.user_id = $1 AND ei.deleted_at IS NULL
    `;
    const equipmentCountResult = await pool.query(equipmentCountQuery, [userId]);

    // Get client count (using vendor ID from vendors table)
    const clientCountQuery = `
      SELECT COUNT(DISTINCT ea.client_id) as client_count
      FROM equipment_assignment ea
      JOIN vendors v ON v.id = ea.vendor_id
      WHERE v.user_id = $1
    `;
    const clientCountResult = await pool.query(clientCountQuery, [userId]);

    return {
      ...baseInfo,
      vendor: vendorResult.rows[0] || null,
      specializations: specializationsResult.rows,
      equipment_count: parseInt(equipmentCountResult.rows[0]?.equipment_count || 0),
      client_count: parseInt(clientCountResult.rows[0]?.client_count || 0)
    };
  }

  /**
   * Get client-specific details
   */
  private static async getClientDetails(userId: number, baseInfo: any): Promise<any> {
    // Get client information from the clients table
    const clientQuery = `
      SELECT 
        c.company_name, c.business_type, c.primary_phone,
        c.street_address, c.city, c.state, c.zip_code, c.country,
        c.status, c.created_at as company_created_at, c.updated_at as company_updated_at,
        v.company_name as created_by_vendor_name
      FROM clients c
      LEFT JOIN vendors v ON v.id = c.created_by_vendor_id
      WHERE c.user_id = $1
    `;
    const clientResult = await pool.query(clientQuery, [userId]);

    // Get equipment assigned to this client (using proper table relationships)
    const equipmentQuery = `
      SELECT 
        e.equipment_name, e.equipment_code, e.equipment_type, e.manufacturer,
        ei.serial_number, ei.status,
        ea.assigned_at, ea.status as assignment_status,
        ea.start_date, ea.end_date,
        v.company_name as vendor_company,
        u.display_name as vendor_name
      FROM equipment_assignment ea
      JOIN assignment_item ai ON ai.assignment_id = ea.id
      JOIN equipment_instance ei ON ei.id = ai.equipment_instance_id
      JOIN equipment e ON e.id = ei.equipment_id
      JOIN vendors v ON v.id = ea.vendor_id
      JOIN "user" u ON u.id = v.user_id
      JOIN clients c ON c.id = ea.client_id
      WHERE c.user_id = $1 AND ea.status = 'active'
      ORDER BY ea.assigned_at DESC
    `;
    const equipmentResult = await pool.query(equipmentQuery, [userId]);

    return {
      ...baseInfo,
      client: clientResult.rows[0] || null,
      equipment: equipmentResult.rows
    };
  }

  /**
   * Update user basic information
   */
  static async updateUserInfo(
    userId: number, 
    data: { first_name?: string; last_name?: string; email?: string }
  ): Promise<any> {
    const query = `
      UPDATE "user"
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email)
      WHERE id = $4 AND deleted_at IS NULL
      RETURNING id, first_name, last_name, display_name, email
    `;

    try {
      const result = await pool.query(query, [
        data.first_name || null,
        data.last_name || null,
        data.email || null,
        userId
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user info:', error);
      throw error;
    }
  }
}