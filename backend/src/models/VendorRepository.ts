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
        v.company_name ILIKE $${paramCount} OR
        v.city ILIKE $${paramCount} OR
        v.state ILIKE $${paramCount}
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
      whereClause += ` AND v.id IN (
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
        
        -- Company details from vendors table
        v.company_name, v.business_type, v.license_number,
        v.primary_phone, v.street_address, v.city, v.state, v.zip_code, v.country,
        v.status as vendor_status,
        
        -- Equipment count (using vendor ID from vendors table)
        (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = v.id AND deleted_at IS NULL) as equipment_count,
        
        -- Client assignments count (using vendor ID from vendors table)
        (SELECT COUNT(DISTINCT client_id) FROM equipment_assignment WHERE vendor_id = v.id) as client_count,
        
        -- Specializations (comma-separated)
        (SELECT STRING_AGG(s.name, ', ') 
         FROM vendor_specialization vs 
         JOIN specialization s ON s.id = vs.specialization_id 
         WHERE vs.vendor_id = v.id) as specializations
         
      FROM "user" u
      INNER JOIN vendors v ON v.user_id = u.id
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
        v.company_name ILIKE $${paramCount} OR
        v.city ILIKE $${paramCount} OR
        v.state ILIKE $${paramCount}
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
      whereClause += ` AND v.id IN (
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
      INNER JOIN vendors v ON v.user_id = u.id
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
        
        -- Company details from vendors table
        v.company_name, v.business_type, v.license_number,
        v.primary_phone, v.street_address, v.city, v.state, v.zip_code, v.country,
        v.status as vendor_status,
        
        -- Aggregated counts (using vendor ID from vendors table)
        (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = v.id AND deleted_at IS NULL) as equipment_count,
        (SELECT COUNT(*) FROM equipment_assignment ea WHERE ea.vendor_id = v.id) as assignments_count
         
      FROM "user" u
      INNER JOIN vendors v ON v.user_id = u.id
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

      // Get specializations (using vendor ID from vendors table)
      const specializationQuery = `
        SELECT s.name 
        FROM vendor_specialization vs
        JOIN specialization s ON s.id = vs.specialization_id
        JOIN vendors v ON v.id = vs.vendor_id
        WHERE v.user_id = $1
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
        
        // Maintain compatibility with existing interface
        company: {
          vendor_id: row.id,
          company_name: row.company_name,
          business_type: row.business_type,
          license_number: row.license_number
        },
        
        contact: {
          vendor_id: row.id,
          contact_person_name: row.display_name || `${row.first_name} ${row.last_name}`,
          contact_title: '',
          primary_email: row.email,
          primary_phone: row.primary_phone
        },
        
        address: {
          vendor_id: row.id,
          street_address: row.street_address,
          city: row.city,
          state: row.state,
          zip_code: row.zip_code,
          country: row.country
        },
        
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

      // Step 2: Create vendor record in vendors table
      const vendorQuery = `
        INSERT INTO vendors (
          user_id, company_name, business_type, license_number,
          primary_phone, street_address, city, state, zip_code, country
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const vendorValues = [
        newUser.id,
        vendorData.companyName,
        vendorData.businessType,
        vendorData.licenseNumber || null,
        vendorData.primaryPhone || null,
        vendorData.streetAddress || null,
        vendorData.city || null,
        vendorData.state || null,
        vendorData.zipCode || null,
        vendorData.country || 'Sri Lanka'
      ];

      DebugLogger.database('CREATE_VENDOR_RECORD', vendorQuery, vendorValues);
      const vendorResult = await client.query(vendorQuery, vendorValues);

      // Step 3: Handle specializations
      if (vendorData.specializations && vendorData.specializations.length > 0) {
        // Get specialization IDs
        const specializationQuery = `
          SELECT id, name FROM specialization WHERE name = ANY($1)
        `;
        
        DebugLogger.database('GET_SPECIALIZATIONS', specializationQuery, [vendorData.specializations]);
        const specializationResult = await client.query(specializationQuery, [vendorData.specializations]);
        
        // Insert vendor specializations (using vendor.id from vendors table)
        const vendorRecord = vendorResult.rows[0];
        for (const spec of specializationResult.rows) {
          const vendorSpecQuery = `
            INSERT INTO vendor_specialization (vendor_id, specialization_id)
            VALUES ($1, $2)
          `;
          await client.query(vendorSpecQuery, [vendorRecord.id, spec.id]);
        }
      }

      await client.query('COMMIT');

      // Return the complete vendor object
      const vendorRecord = vendorResult.rows[0];
      const detailedVendor: DetailedVendor = {
        ...newUser,
        company: {
          vendor_id: newUser.id,
          company_name: vendorRecord.company_name,
          business_type: vendorRecord.business_type,
          license_number: vendorRecord.license_number
        },
        contact: {
          vendor_id: newUser.id,
          contact_person_name: newUser.display_name || `${newUser.first_name} ${newUser.last_name}`,
          contact_title: '',
          primary_email: newUser.email,
          primary_phone: vendorRecord.primary_phone
        },
        address: {
          vendor_id: newUser.id,
          street_address: vendorRecord.street_address,
          city: vendorRecord.city,
          state: vendorRecord.state,
          zip_code: vendorRecord.zip_code,
          country: vendorRecord.country
        },
        specializations: vendorData.specializations || []
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

  /**
   * Get equipment for a specific vendor
   */
  static async getVendorEquipment(vendorId: number): Promise<any[]> {
    const query = `
      SELECT 
        ei.id,
        ei.serial_number,
        ei.asset_tag,
        ei.status,
        ei.condition_rating,
        ei.assigned_at,
        ei.last_maintenance_date,
        ei.next_maintenance_date,
        ei.location,
        
        -- Equipment details
        e.equipment_name,
        e.equipment_type,
        e.equipment_code,
        e.model,
        e.manufacturer,
        
        -- Client details (if assigned)
        client.id as client_id,
        client.display_name as client_name,
        client.email as client_email,
        
        -- Assignment details (if assigned)
        ea.id as assignment_id,
        ea.assigned_at as assignment_date,
        ea.start_date,
        ea.end_date,
        ea.status as assignment_status
        
      FROM equipment_instance ei
      INNER JOIN equipment e ON ei.equipment_id = e.id
      LEFT JOIN "user" client ON ei.assigned_to = client.id
      LEFT JOIN equipment_assignment ea ON ea.vendor_id = ei.vendor_id 
        AND ea.client_id = ei.assigned_to 
        AND ea.status = 'active'
      
      WHERE ei.vendor_id = $1 
        AND ei.deleted_at IS NULL
        AND e.deleted_at IS NULL
      
      ORDER BY ei.created_at DESC
    `;

    try {
      const result = await pool.query(query, [vendorId]);
      
      DebugLogger.log('Vendor equipment fetched', { 
        vendorId, 
        count: result.rows.length 
      }, 'VENDOR_EQUIPMENT');
      
      return result.rows.map(row => ({
        id: row.id,
        serialNumber: row.serial_number,
        assetTag: row.asset_tag,
        status: row.status,
        conditionRating: row.condition_rating,
        assignedAt: row.assigned_at,
        lastMaintenanceDate: row.last_maintenance_date,
        nextMaintenanceDate: row.next_maintenance_date,
        location: row.location,
        
        // Equipment info
        equipmentName: row.equipment_name,
        equipmentType: row.equipment_type,
        equipmentCode: row.equipment_code,
        model: row.model,
        manufacturer: row.manufacturer,
        
        // Client info
        clientId: row.client_id,
        clientName: row.client_name || 'Unassigned',
        clientEmail: row.client_email,
        
        // Assignment info
        assignmentId: row.assignment_id,
        assignmentDate: row.assignment_date,
        startDate: row.start_date,
        endDate: row.end_date,
        assignmentStatus: row.assignment_status,
        
        // Calculated fields for frontend
        compliance: row.next_maintenance_date ? 
          (new Date(row.next_maintenance_date) > new Date() ? 100 : 50) : 75
      }));
    } catch (error) {
      console.error('Error getting vendor equipment:', error);
      throw error;
    }
  }
}