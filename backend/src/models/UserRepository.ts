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
        last_login, last_login_ip, created_at, deleted_at, is_temporary_password
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
        last_login, last_login_ip, created_at, deleted_at, is_temporary_password
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
   * Update user password and clear temporary password flag
   */
  static async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    const query = `
      UPDATE "user" 
      SET 
        password = $2,
        is_temporary_password = false,
        last_password_change = CURRENT_TIMESTAMP
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
        
        -- For vendors: count clients created by them
        CASE 
          WHEN u.user_type = 'vendor' THEN (
            SELECT COUNT(*) FROM clients c 
            JOIN vendors v ON c.created_by_vendor_id = v.id
            WHERE v.user_id = u.id
          )
          ELSE 0
        END as client_count,
        
        -- For vendors: count equipment instances owned by them
        -- For clients: count equipment instances assigned to them  
        CASE 
          WHEN u.user_type = 'vendor' THEN (
            SELECT COUNT(*) FROM equipment_instance ei 
            JOIN vendors v ON v.id = ei.vendor_id
            WHERE v.user_id = u.id AND ei.deleted_at IS NULL
          )
          WHEN u.user_type = 'client' THEN (
            SELECT COUNT(*) FROM equipment_instance ei
            JOIN clients c ON c.id = ei.assigned_to
            WHERE c.user_id = u.id AND ei.deleted_at IS NULL
          )
          ELSE 0
        END as equipment_count,
        
        -- For clients: count active equipment assignments
        CASE 
          WHEN u.user_type = 'client' THEN (
            SELECT COUNT(*) FROM equipment_assignment ea
            JOIN clients c ON c.id = ea.client_id
            WHERE c.user_id = u.id AND ea.status IN ('active', 'pending')
          )
          ELSE 0
        END as assignments_count,
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
   * Get users with pagination
   */
  static async getUsersPaginated(page: number = 1, limit: number = 10): Promise<{
    users: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM "user" u
      WHERE u.deleted_at IS NULL
    `;
    
    // Get paginated users
    const usersQuery = `
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
        
        -- For vendors: count clients created by them
        CASE 
          WHEN u.user_type = 'vendor' THEN (
            SELECT COUNT(*) FROM clients c 
            JOIN vendors v ON c.created_by_vendor_id = v.id
            WHERE v.user_id = u.id
          )
          ELSE 0
        END as client_count,
        
        -- For vendors: count equipment instances owned by them
        -- For clients: count equipment instances assigned to them  
        CASE 
          WHEN u.user_type = 'vendor' THEN (
            SELECT COUNT(*) FROM equipment_instance ei 
            JOIN vendors v ON v.id = ei.vendor_id
            WHERE v.user_id = u.id AND ei.deleted_at IS NULL
          )
          WHEN u.user_type = 'client' THEN (
            SELECT COUNT(*) FROM equipment_instance ei
            JOIN clients c ON c.id = ei.assigned_to
            WHERE c.user_id = u.id AND ei.deleted_at IS NULL
          )
          ELSE 0
        END as equipment_count,
        
        -- For clients: count active equipment assignments
        CASE 
          WHEN u.user_type = 'client' THEN (
            SELECT COUNT(*) FROM equipment_assignment ea
            JOIN clients c ON c.id = ea.client_id
            WHERE c.user_id = u.id AND ea.status IN ('active', 'pending')
          )
          ELSE 0
        END as assignments_count,
        CASE 
          WHEN u.last_login > NOW() - INTERVAL '30 days' THEN 'Active'
          WHEN u.is_locked THEN 'Locked'
          ELSE 'Inactive'
        END as status
      FROM "user" u
      LEFT JOIN "role" r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const [countResult, usersResult] = await Promise.all([
        pool.query(countQuery),
        pool.query(usersQuery, [limit, offset])
      ]);
      
      const totalCount = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        users: usersResult.rows,
        totalCount,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      console.error('Error getting paginated users:', error);
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
      // Validate userId
      if (!userId || isNaN(userId)) {
        console.error('Invalid userId provided:', userId);
        return null;
      }

      // Get basic user info
      const userQuery = `
        SELECT 
          u.id, u.first_name, u.last_name, u.display_name, u.email, u.user_type,
          u.is_locked, u.last_login, u.created_at, u.last_login_ip, u.phone,
          u.avatar_url, u.bio,
          r.role_name
        FROM "user" u
        LEFT JOIN role r ON u.role_id = r.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `;
      
      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        console.log('No user found with ID:', userId);
        return null;
      }

      const user = userResult.rows[0];
      let detailedInfo: any = { ...user };

      console.log('Found user:', { id: user.id, name: `${user.first_name} ${user.last_name}`, type: user.user_type });

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
    try {
      // Get vendor information from the vendors table
      const vendorQuery = `
        SELECT 
          v.id, v.company_name, v.business_type, v.license_number, 
          v.primary_phone, v.street_address, v.city, v.state, 
          v.zip_code, v.country, v.status,
          v.created_at as company_created_at, v.updated_at as company_updated_at
        FROM vendors v
        WHERE v.user_id = $1
      `;
      const vendorResult = await pool.query(vendorQuery, [userId]);
      
      if (vendorResult.rows.length === 0) {
        console.log('No vendor record found for user ID:', userId);
        return {
          ...baseInfo,
          vendor: null,
          specializations: [],
          equipment_count: 0,
          client_count: 0
        };
      }

      const vendor = vendorResult.rows[0];
      console.log('Found vendor:', { id: vendor.id, company: vendor.company_name });

      // Get vendor specializations (using vendor ID from vendors table)
      const specializationsQuery = `
        SELECT 
          s.id, s.name, s.description, s.category
        FROM vendor_specialization vs
        JOIN specialization s ON s.id = vs.specialization_id
        WHERE vs.vendor_id = $1
      `;
      const specializationsResult = await pool.query(specializationsQuery, [vendor.id]);

      // Get equipment count (using vendor ID from vendors table)
      const equipmentCountQuery = `
        SELECT COUNT(*) as equipment_count
        FROM equipment_instance ei
        WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL
      `;
      const equipmentCountResult = await pool.query(equipmentCountQuery, [vendor.id]);

      // Get client count (using vendor ID from vendors table)
      const clientCountQuery = `
        SELECT COUNT(DISTINCT c.id) as client_count
        FROM clients c
        WHERE c.created_by_vendor_id = $1
      `;
      const clientCountResult = await pool.query(clientCountQuery, [vendor.id]);

      return {
        ...baseInfo,
        vendor: vendor,
        specializations: specializationsResult.rows || [],
        equipment_count: parseInt(equipmentCountResult.rows[0]?.equipment_count || 0),
        client_count: parseInt(clientCountResult.rows[0]?.client_count || 0)
      };
    } catch (error) {
      console.error('Error getting vendor details for user:', userId, error);
      return {
        ...baseInfo,
        vendor: null,
        specializations: [],
        equipment_count: 0,
        client_count: 0
      };
    }
  }

  /**
   * Get client-specific details
   */
  private static async getClientDetails(userId: number, baseInfo: any): Promise<any> {
    try {
      // Get client information from the clients table
      const clientQuery = `
        SELECT 
          c.id, c.company_name, c.business_type, c.primary_phone,
          c.street_address, c.city, c.state, c.zip_code, c.country,
          c.status, c.created_at as company_created_at, c.updated_at as company_updated_at,
          v.company_name as created_by_vendor_name,
          v.id as vendor_id,
          vu.display_name as vendor_user_name,
          vu.email as vendor_email
        FROM clients c
        LEFT JOIN vendors v ON v.id = c.created_by_vendor_id
        LEFT JOIN "user" vu ON vu.id = v.user_id
        WHERE c.user_id = $1
      `;
      const clientResult = await pool.query(clientQuery, [userId]);
      
      if (clientResult.rows.length === 0) {
        console.log('No client record found for user ID:', userId);
        return {
          ...baseInfo,
          client: null,
          vendor: null,
          equipment: []
        };
      }

      const client = clientResult.rows[0];
      console.log('Found client:', { id: client.id, company: client.company_name });

      // Get all equipment units directly assigned to this client
      const equipmentQuery = `
        SELECT 
          e.equipment_name, e.equipment_code, e.equipment_type, e.manufacturer,
          ei.serial_number, ei.asset_tag, ei.status, ei.condition_rating,
          ei.created_at as assigned_at, ei.status as assignment_status,
          ei.purchase_date as start_date, ei.expiry_date as end_date,
          v.company_name as vendor_company,
          u.display_name as vendor_name,
          u.first_name as vendor_first_name,
          u.last_name as vendor_last_name
        FROM equipment_instance ei
        JOIN equipment e ON e.id = ei.equipment_id
        JOIN vendors v ON v.id = ei.vendor_id
        JOIN "user" u ON u.id = v.user_id
        WHERE ei.assigned_to = $1 AND ei.deleted_at IS NULL
        ORDER BY ei.created_at DESC
      `;
      const equipmentResult = await pool.query(equipmentQuery, [client.id]);

      // Structure vendor information for client details
      const vendorInfo = client.vendor_id ? {
        id: client.vendor_id,
        display_name: client.vendor_user_name,
        email: client.vendor_email,
        vendor_company: client.created_by_vendor_name
      } : null;

      return {
        ...baseInfo,
        client: client,
        vendor: vendorInfo,
        equipment: equipmentResult.rows || []
      };
    } catch (error) {
      console.error('Error getting client details for user:', userId, error);
      return {
        ...baseInfo,
        client: null,
        vendor: null,
        equipment: []
      };
    }
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

  /**
   * Check if user can be deleted based on constraints
   */
  static async checkUserDeletionConstraints(userId: number): Promise<{
    canDelete: boolean;
    userType: string;
    constraints: {
      clientsCount?: number;
      equipmentCount?: number;
      assignmentsCount?: number;
      activeTicketsCount?: number;
    };
    message: string;
  }> {
    try {
      console.log('Checking user deletion constraints for user ID:', userId);

      // First get the user type
      const userQuery = `
        SELECT u.user_type, u.first_name, u.last_name
        FROM "user" u
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `;
      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return {
          canDelete: false,
          userType: 'unknown',
          constraints: {},
          message: 'User not found'
        };
      }

      const user = userResult.rows[0];
      const userType = user.user_type;
      const userName = `${user.first_name} ${user.last_name}`.trim();

      if (userType === 'vendor') {
        // Get vendor ID
        const vendorQuery = `SELECT id FROM vendors WHERE user_id = $1`;
        const vendorResult = await pool.query(vendorQuery, [userId]);
        
        if (vendorResult.rows.length === 0) {
          return {
            canDelete: true,
            userType,
            constraints: {},
            message: 'Vendor user can be deleted (no vendor record found)'
          };
        }

        const vendorId = vendorResult.rows[0].id;

        // Check vendor constraints
        const clientsResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM clients 
          WHERE created_by_vendor_id = $1 AND status != 'inactive'
        `, [vendorId]);

        const equipmentResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM equipment_instance 
          WHERE vendor_id = $1 AND deleted_at IS NULL
        `, [vendorId]);

        const assignmentsResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM equipment_assignment 
          WHERE vendor_id = $1 AND status IN ('active', 'pending')
        `, [vendorId]);

        const ticketsResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM maintenance_ticket 
          WHERE vendor_id = $1 AND ticket_status IN ('open', 'in_progress', 'pending')
        `, [vendorId]);

        const clientsCount = parseInt(clientsResult.rows[0].count);
        const equipmentCount = parseInt(equipmentResult.rows[0].count);
        const assignmentsCount = parseInt(assignmentsResult.rows[0].count);
        const activeTicketsCount = parseInt(ticketsResult.rows[0].count);

        const canDelete = clientsCount === 0 && equipmentCount === 0 && assignmentsCount === 0 && activeTicketsCount === 0;
        
        let message = '';
        if (canDelete) {
          message = `Vendor ${userName} can be deleted`;
        } else {
          const issues = [];
          if (clientsCount > 0) issues.push(`${clientsCount} active clients`);
          if (equipmentCount > 0) issues.push(`${equipmentCount} equipment instances`);
          if (assignmentsCount > 0) issues.push(`${assignmentsCount} active assignments`);
          if (activeTicketsCount > 0) issues.push(`${activeTicketsCount} active tickets`);
          message = `Cannot delete vendor ${userName}: has ${issues.join(', ')}`;
        }

        return {
          canDelete,
          userType,
          constraints: {
            clientsCount,
            equipmentCount,
            assignmentsCount,
            activeTicketsCount
          },
          message
        };
      } else if (userType === 'client') {
        // Get client ID
        const clientQuery = `SELECT id FROM clients WHERE user_id = $1`;
        const clientResult = await pool.query(clientQuery, [userId]);
        
        if (clientResult.rows.length === 0) {
          return {
            canDelete: true,
            userType,
            constraints: {},
            message: 'Client user can be deleted (no client record found)'
          };
        }

        const clientId = clientResult.rows[0].id;

        // Check client constraints
        const equipmentResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM equipment_instance 
          WHERE assigned_to = $1 AND deleted_at IS NULL
        `, [clientId]);

        const assignmentsResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM equipment_assignment 
          WHERE client_id = $1 AND status IN ('active', 'pending')
        `, [clientId]);

        const ticketsResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM maintenance_ticket 
          WHERE client_id = $1 AND ticket_status IN ('open', 'in_progress', 'pending')
        `, [clientId]);

        const equipmentCount = parseInt(equipmentResult.rows[0].count);
        const assignmentsCount = parseInt(assignmentsResult.rows[0].count);
        const activeTicketsCount = parseInt(ticketsResult.rows[0].count);

        const canDelete = equipmentCount === 0 && assignmentsCount === 0 && activeTicketsCount === 0;
        
        let message = '';
        if (canDelete) {
          message = `Client ${userName} can be deleted`;
        } else {
          const issues = [];
          if (equipmentCount > 0) issues.push(`${equipmentCount} assigned equipment units`);
          if (assignmentsCount > 0) issues.push(`${assignmentsCount} active assignments`);
          if (activeTicketsCount > 0) issues.push(`${activeTicketsCount} active tickets`);
          message = `Cannot delete client ${userName}: has ${issues.join(', ')}`;
        }

        return {
          canDelete,
          userType,
          constraints: {
            equipmentCount,
            assignmentsCount,
            activeTicketsCount
          },
          message
        };
      } else {
        // Admin users can always be deleted (unless we want to prevent deleting the last admin)
        return {
          canDelete: true,
          userType,
          constraints: {},
          message: `Admin user ${userName} can be deleted`
        };
      }
    } catch (error) {
      console.error('Error checking user deletion constraints:', error);
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  static async deleteUser(userId: number): Promise<void> {
    const query = `
      UPDATE "user" 
      SET 
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
    `;

    try {
      console.log('Soft deleting user:', userId);
      const result = await pool.query(query, [userId]);
      
      if (result.rowCount === 0) {
        throw new Error('User not found or already deleted');
      }
      
      console.log('User soft deleted successfully:', userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}