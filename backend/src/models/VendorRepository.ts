import { pool } from '../config/database';
import bcrypt from 'bcryptjs';
import { User, CreateVendorRequest, DetailedVendor, VendorCompany, VendorContact, VendorAddress } from '../types';
import { PaginationQuery } from '../types/api';
import { DebugLogger } from '../utils/DebugLogger';

export interface VendorFilters {
  status?: string;
  search?: string;
  specialization?: string;
}

export interface VendorUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Vendor Repository
 * Handles all vendor-related database operations
 */
export class VendorRepository {

  /**
   * Get paginated list of vendors with filters
   */
  static async getVendors(
    pagination: PaginationQuery, 
    filters: VendorFilters = {}
  ): Promise<User[]> {
    const offset = ((pagination.page || 1) - 1) * (pagination.limit || 10);
    
    let whereClause = `WHERE user_type = 'vendor' AND deleted_at IS NULL`;
    const queryParams: any[] = [];
    let paramCount = 0;

    // Add search filter
    if (filters.search) {
      paramCount++;
      whereClause += ` AND (
        u.first_name ILIKE $${paramCount} OR 
        u.last_name ILIKE $${paramCount} OR 
        u.display_name ILIKE $${paramCount} OR 
        u.email ILIKE $${paramCount} OR
        vc.company_name ILIKE $${paramCount} OR
        va.city ILIKE $${paramCount} OR
        va.state ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filters.search}%`);
    }

    // Add status filter
    if (filters.status) {
      paramCount++;
      whereClause += ` AND u.is_locked = $${paramCount}`;
      queryParams.push(filters.status === 'inactive');
    }

    // Add specialization filter
    if (filters.specialization) {
      paramCount++;
      whereClause += ` AND u.id IN (
        SELECT vs.vendor_id 
        FROM vendor_specialization vs 
        JOIN specialization s ON vs.specialization_id = s.id 
        WHERE s.name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filters.specialization}%`);
    }

    // Add sorting
    const orderBy = pagination.sort === 'name' ? 'display_name' : 
                   pagination.sort === 'email' ? 'email' : 
                   pagination.sort === 'created' ? 'created_at' : 'created_at';
    const orderDirection = pagination.order === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.display_name, u.email, 
        u.user_type, u.is_locked, u.last_login, u.created_at,
        
        -- Company details
        vc.company_name, vc.business_type, vc.license_number,
        
        -- Contact details
        vcon.contact_person_name, vcon.contact_title, vcon.primary_email, vcon.primary_phone,
        
        -- Address details
        va.street_address, va.city, va.state, va.zip_code, va.country,
        
        -- Equipment count
        (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = u.id AND deleted_at IS NULL) as equipment_count,
        
        -- Client assignments count  
        (SELECT COUNT(DISTINCT client_id) FROM equipment_assignment WHERE vendor_id = u.id) as client_count,
        
        -- Specializations (comma-separated)
        (SELECT STRING_AGG(s.name, ', ') 
         FROM vendor_specialization vs 
         JOIN specialization s ON s.id = vs.specialization_id 
         WHERE vs.vendor_id = u.id) as specializations
         
      FROM "user" u
      LEFT JOIN vendor_company vc ON vc.vendor_id = u.id
      LEFT JOIN vendor_contact vcon ON vcon.vendor_id = u.id
      LEFT JOIN vendor_address va ON va.vendor_id = u.id
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(pagination.limit, offset);

    DebugLogger.database('GET_VENDORS', query, queryParams);

    try {
      const result = await pool.query(query, queryParams);
      
      DebugLogger.database('GET_VENDORS_RESULT', undefined, undefined, result.rows);

      return result.rows.map(row => ({
        ...row,
        equipment_count: parseInt(row.equipment_count) || 0,
        client_count: parseInt(row.client_count) || 0,
        // Add computed fields that frontend expects
        name: row.company_name || row.display_name || `${row.first_name} ${row.last_name}`,
        phone: row.primary_phone || '',
        location: row.city && row.state ? `${row.city}, ${row.state}` : '',
        category: row.specializations || 'General',
        status: row.is_locked ? 'Inactive' : 'Active',
        joinDate: new Date(row.created_at).toLocaleDateString(),
        lastActivity: row.last_login ? new Date(row.last_login).toLocaleDateString() : 'Never',
        compliance: Math.floor(Math.random() * 30) + 70, // Temporary mock data
        clients: parseInt(row.client_count) || 0,
        equipment: parseInt(row.equipment_count) || 0
      }));
    } catch (error) {
      DebugLogger.error('Error getting vendors', error);
      throw error;
    }
  }

  /**
   * Get total count of vendors with filters
   */
  static async getVendorsCount(filters: VendorFilters = {}): Promise<number> {
    let whereClause = `WHERE user_type = 'vendor' AND deleted_at IS NULL`;
    const queryParams: any[] = [];
    let paramCount = 0;

    // Add search filter
    if (filters.search) {
      paramCount++;
      whereClause += ` AND (
        u.first_name ILIKE $${paramCount} OR 
        u.last_name ILIKE $${paramCount} OR 
        u.display_name ILIKE $${paramCount} OR 
        u.email ILIKE $${paramCount} OR
        vc.company_name ILIKE $${paramCount} OR
        va.city ILIKE $${paramCount} OR
        va.state ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filters.search}%`);
    }

    // Add status filter
    if (filters.status) {
      paramCount++;
      whereClause += ` AND u.is_locked = $${paramCount}`;
      queryParams.push(filters.status === 'inactive');
    }

    // Add specialization filter
    if (filters.specialization) {
      paramCount++;
      whereClause += ` AND u.id IN (
        SELECT vs.vendor_id 
        FROM vendor_specialization vs 
        JOIN specialization s ON vs.specialization_id = s.id 
        WHERE s.name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${filters.specialization}%`);
    }

    const query = `
      SELECT COUNT(DISTINCT u.id) 
      FROM "user" u
      LEFT JOIN vendor_company vc ON vc.vendor_id = u.id
      LEFT JOIN vendor_address va ON va.vendor_id = u.id
      ${whereClause}
    `;

    DebugLogger.database('GET_VENDORS_COUNT', query, queryParams);

    try {
      const result = await pool.query(query, queryParams);
      const count = parseInt(result.rows[0].count);
      
      DebugLogger.database('GET_VENDORS_COUNT_RESULT', undefined, undefined, { count });

      return count;
    } catch (error) {
      DebugLogger.error('Error getting vendors count', error);
      throw error;
    }
  }

  /**
   * Get vendor by ID with complete details
   */
  static async getVendorById(id: number): Promise<DetailedVendor | null> {
    const query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.display_name, u.email, 
        u.user_type, u.is_locked, u.last_login, u.created_at,
        
        -- Company details
        vc.company_name, vc.business_type, vc.license_number,
        
        -- Contact details
        vcon.contact_person_name, vcon.contact_title, vcon.primary_email as contact_primary_email,
        vcon.primary_phone,
        
        -- Address details
        va.street_address, va.city, va.state, va.zip_code, va.country,
        
        -- Aggregated counts
        (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = u.id AND deleted_at IS NULL) as equipment_count,
        (SELECT COUNT(*) FROM equipment_assignment ea WHERE ea.vendor_id = u.id) as assignments_count
         
      FROM "user" u
      LEFT JOIN vendor_company vc ON vc.vendor_id = u.id
      LEFT JOIN vendor_contact vcon ON vcon.vendor_id = u.id
      LEFT JOIN vendor_address va ON va.vendor_id = u.id
      WHERE u.id = $1 AND u.user_type = 'vendor' AND u.deleted_at IS NULL
    `;

    DebugLogger.database('GET_DETAILED_VENDOR_BY_ID', query, [id]);

    try {
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        DebugLogger.database('GET_DETAILED_VENDOR_BY_ID_RESULT', undefined, undefined, { found: false });
        return null;
      }

      const row = result.rows[0];

      // Get specializations
      const specializationQuery = `
        SELECT s.name 
        FROM vendor_specialization vs
        JOIN specialization s ON s.id = vs.specialization_id
        WHERE vs.vendor_id = $1
      `;
      
      const specializationResult = await pool.query(specializationQuery, [id]);
      const specializations = specializationResult.rows.map(row => row.name);

      const detailedVendor: DetailedVendor = {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        display_name: row.display_name,
        email: row.email,
        password: '', // Never return password
        user_type: row.user_type,
        is_locked: row.is_locked,
        failed_login_attempts: 0,
        last_login: row.last_login,
        created_at: row.created_at,
        
        company: row.company_name ? {
          vendor_id: row.id,
          company_name: row.company_name,
          business_type: row.business_type,
          license_number: row.license_number
        } : undefined,
        
        contact: row.contact_person_name ? {
          vendor_id: row.id,
          contact_person_name: row.contact_person_name,
          contact_title: row.contact_title,
          primary_email: row.contact_primary_email,
          primary_phone: row.primary_phone
        } : undefined,
        
        address: row.street_address ? {
          vendor_id: row.id,
          street_address: row.street_address,
          city: row.city,
          state: row.state,
          zip_code: row.zip_code,
          country: row.country
        } : undefined,
        
        specializations: specializations,
        
        // Add the counts as additional properties
        equipment_count: parseInt(row.equipment_count) || 0,
        assignments_count: parseInt(row.assignments_count) || 0
      };

      DebugLogger.database('GET_DETAILED_VENDOR_BY_ID_RESULT', undefined, undefined, detailedVendor);

      return detailedVendor;
    } catch (error) {
      DebugLogger.error('Error getting detailed vendor by ID', error);
      throw error;
    }
  }

  /**
   * Create new vendor with detailed information
   */
  static async createVendor(vendorData: CreateVendorRequest): Promise<DetailedVendor> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Step 1: Create the base user record
      const userQuery = `
        INSERT INTO "user" (first_name, last_name, email, password, user_type, role_id)
        VALUES ($1, $2, $3, $4, $5, (SELECT id FROM role WHERE role_name = 'vendor'))
        RETURNING id, first_name, last_name, display_name, email, user_type, is_locked, created_at
      `;
      
      // Hash the password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(vendorData.password, saltRounds);
      
      const userValues = [
        vendorData.firstName,
        vendorData.lastName,
        vendorData.email,
        hashedPassword,
        'vendor'
      ];

      DebugLogger.database('CREATE_VENDOR_USER', userQuery, userValues);
      const userResult = await client.query(userQuery, userValues);
      const newUser = userResult.rows[0];

      // Step 2: Create vendor company record
      const companyQuery = `
        INSERT INTO vendor_company (
          vendor_id, company_name, business_type, license_number
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const companyValues = [
        newUser.id,
        vendorData.companyName,
        vendorData.businessType,
        vendorData.licenseNumber || null
      ];

      DebugLogger.database('CREATE_VENDOR_COMPANY', companyQuery, companyValues);
      const companyResult = await client.query(companyQuery, companyValues);

      // Step 3: Create vendor contact record
      const contactQuery = `
        INSERT INTO vendor_contact (
          vendor_id, contact_person_name, contact_title, primary_email, primary_phone
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const contactValues = [
        newUser.id,
        vendorData.contactPersonName,
        vendorData.contactTitle || null,
        vendorData.primaryEmail,
        vendorData.primaryPhone
      ];

      DebugLogger.database('CREATE_VENDOR_CONTACT', contactQuery, contactValues);
      const contactResult = await client.query(contactQuery, contactValues);

      // Step 4: Create vendor address record
      const addressQuery = `
        INSERT INTO vendor_address (
          vendor_id, street_address, city, state, zip_code, country
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const addressValues = [
        newUser.id,
        vendorData.streetAddress,
        vendorData.city,
        vendorData.state,
        vendorData.zipCode,
        vendorData.country || 'Sri Lanka'
      ];

      DebugLogger.database('CREATE_VENDOR_ADDRESS', addressQuery, addressValues);
      const addressResult = await client.query(addressQuery, addressValues);

      // Step 5: Handle specializations
      if (vendorData.specializations && vendorData.specializations.length > 0) {
        // Get specialization IDs
        const specializationQuery = `
          SELECT id, name FROM specialization WHERE name = ANY($1)
        `;
        
        DebugLogger.database('GET_SPECIALIZATIONS', specializationQuery, [vendorData.specializations]);
        const specializationResult = await client.query(specializationQuery, [vendorData.specializations]);
        
        // Insert vendor specializations
        for (const spec of specializationResult.rows) {
          const vendorSpecQuery = `
            INSERT INTO vendor_specialization (vendor_id, specialization_id)
            VALUES ($1, $2)
          `;
          await client.query(vendorSpecQuery, [newUser.id, spec.id]);
        }
      }

      await client.query('COMMIT');

      // Return the complete vendor object
      const detailedVendor: DetailedVendor = {
        ...newUser,
        company: companyResult.rows[0],
        contact: contactResult.rows[0],
        address: addressResult.rows[0],
        specializations: vendorData.specializations
      };

      DebugLogger.database('CREATE_VENDOR_SUCCESS', undefined, undefined, detailedVendor);

      return detailedVendor;

    } catch (error) {
      await client.query('ROLLBACK');
      DebugLogger.error('Error creating detailed vendor', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update vendor information
   */
  static async updateVendor(id: number, updateData: VendorUpdateData): Promise<User> {
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic update query
    if (updateData.first_name !== undefined) {
      paramCount++;
      updateFields.push(`first_name = $${paramCount}`);
      values.push(updateData.first_name);
    }

    if (updateData.last_name !== undefined) {
      paramCount++;
      updateFields.push(`last_name = $${paramCount}`);
      values.push(updateData.last_name);
    }

    if (updateData.email !== undefined) {
      paramCount++;
      updateFields.push(`email = $${paramCount}`);
      values.push(updateData.email);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE "user" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1} AND user_type = 'vendor' AND deleted_at IS NULL
      RETURNING 
        id, first_name, last_name, display_name, email, 
        user_type, is_locked, created_at
    `;

    DebugLogger.database('UPDATE_VENDOR', query, values);

    try {
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Vendor not found or update failed');
      }

      const vendor = result.rows[0];

      DebugLogger.database('UPDATE_VENDOR_RESULT', undefined, undefined, vendor);

      return vendor;
    } catch (error) {
      DebugLogger.error('Error updating vendor', error);
      throw error;
    }
  }

  /**
   * Soft delete vendor
   */
  static async deleteVendor(id: number): Promise<void> {
    const query = `
      UPDATE "user" 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_type = 'vendor' AND deleted_at IS NULL
    `;

    DebugLogger.database('DELETE_VENDOR', query, [id]);

    try {
      const result = await pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Vendor not found or already deleted');
      }

      DebugLogger.database('DELETE_VENDOR_RESULT', undefined, undefined, { rowCount: result.rowCount });
    } catch (error) {
      DebugLogger.error('Error deleting vendor', error);
      throw error;
    }
  }

  /**
   * Get vendor statistics
   */
  static async getVendorStats(vendorId: number) {
    const queries = await Promise.all([
      // Equipment stats
      pool.query(`
        SELECT 
          COUNT(*) as total_equipment,
          COUNT(CASE WHEN ei.status = 'assigned' THEN 1 END) as equipment_assigned,
          COUNT(CASE WHEN ei.status = 'maintenance' THEN 1 END) as equipment_maintenance,
          COUNT(CASE WHEN ei.status = 'available' THEN 1 END) as equipment_available
        FROM equipment_instance ei
        JOIN vendor_location vl ON vl.id = ei.vendor_location_id
        WHERE vl.vendor_id = $1 AND ei.deleted_at IS NULL
      `, [vendorId]),

      // Client stats
      pool.query(`
        SELECT COUNT(DISTINCT ea.client_id) as total_clients
        FROM equipment_assignment ea
        WHERE ea.assigned_by = $1
      `, [vendorId]),

      // Location stats
      pool.query(`
        SELECT COUNT(*) as total_locations
        FROM vendor_location
        WHERE vendor_id = $1
      `, [vendorId]),

      // Recent activity
      pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as activities
        FROM audit_log
        WHERE changed_by = $1 
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [vendorId])
    ]);

    const equipmentStats = queries[0].rows[0];
    const clientStats = queries[1].rows[0];
    const locationStats = queries[2].rows[0];
    const activityStats = queries[3].rows;

    const stats = {
      equipment: {
        total: parseInt(equipmentStats.total_equipment) || 0,
        assigned: parseInt(equipmentStats.equipment_assigned) || 0,
        maintenance: parseInt(equipmentStats.equipment_maintenance) || 0,
        available: parseInt(equipmentStats.equipment_available) || 0
      },
      clients: {
        total: parseInt(clientStats.total_clients) || 0
      },
      locations: {
        total: parseInt(locationStats.total_locations) || 0
      },
      recentActivity: activityStats.map(row => ({
        date: row.date,
        activities: parseInt(row.activities)
      }))
    };

    DebugLogger.log('Vendor stats generated', { vendorId, stats }, 'VENDOR_STATS');

    return stats;
  }

  /**
   * Get all available specializations for filter dropdown
   */
  static async getSpecializations(): Promise<{ id: number; name: string; }[]> {
    const query = `
      SELECT id, name 
      FROM specialization 
      ORDER BY name ASC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting specializations:', error);
      throw error;
    }
  }
}