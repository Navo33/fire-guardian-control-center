import { Pool } from 'pg';

export interface ClientKPIs {
  total_clients: number;
  active_clients: number;
  avg_compliance_percentage: number;
}

export interface ClientListItem {
  id: number;
  company_name: string;
  business_type: string;
  status: 'active' | 'inactive' | 'pending';
  primary_phone: string;
  contact_name: string;
  address: string;
  email: string;
  phone: string;
  created_at: string;
  equipment_count: number;
  last_service_date: string | null;
}

export interface ClientDetail {
  id: number;
  // User fields
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone: string;
  last_login: string | null;
  is_active: boolean;
  // Client fields
  company_name: string;
  business_type: string;
  status: 'active' | 'inactive' | 'pending';
  primary_phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  created_at: string;
  created_by_vendor: string;
  // Equipment metrics
  equipment_count: number;
  total_equipment: number;
  compliant_equipment: number;
  expired_equipment: number;
  overdue_equipment: number;
  due_soon_equipment: number;
  compliance_score: number;
  compliance_percentage: number;
  // Maintenance metrics
  last_service_date: string | null;
  total_maintenance_requests: number;
  pending_requests: number;
  vendor?: {
    id: number;
    display_name: string;
    company_name: string;
    email: string;
  };
}

export interface ClientEquipment {
  id: number;
  equipment_name: string;
  equipment_type: string;
  serial_number: string;
  model: string;
  status: 'active' | 'maintenance' | 'retired';
  condition_rating: number;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  assigned_date: string;
  assignment_type?: 'direct' | 'formal' | 'unknown';
}

export interface ClientMaintenanceHistory {
  id: number;
  ticket_number: string;
  service_type: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number | null;
}

export interface CreateClientData {
  // User fields
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  is_temporary_password?: boolean;
  
  // Client fields
  company_name: string;
  business_type: string;
  primary_phone: string;
  street_address: string;
  city: string;
  zip_code: string;
  country: string;
}

export interface UpdateClientData {
  // User fields
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  
  // Client fields
  company_name?: string;
  business_type?: string;
  status?: 'active' | 'inactive' | 'pending';
  primary_phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export interface ClientFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ClientRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get vendor ID by user ID
   */
  async getVendorIdByUserId(userId: number): Promise<number | null> {
    const query = 'SELECT id FROM vendors WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);
    return result.rows[0]?.id || null;
  }

  /**
   * Get KPI data for vendor's clients
   */
  async getClientKPIs(vendorId: number): Promise<ClientKPIs> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM clients WHERE created_by_vendor_id = $1) AS total_clients,
        (SELECT COUNT(*) FROM clients WHERE created_by_vendor_id = $1 AND status = 'active') AS active_clients,
        (SELECT 
          COALESCE(
            ROUND(
              (SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END)::float / 
               NULLIF(COUNT(ei.id), 0) * 100)::numeric, 
              2
            ), 
            0
          )
         FROM equipment_instance ei
         WHERE ei.assigned_to IN (
           SELECT id FROM clients WHERE created_by_vendor_id = $1
         )
         AND ei.deleted_at IS NULL
        ) AS avg_compliance_percentage
      FROM vendors v
      WHERE v.id = $1
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows[0];
  }

  /**
   * Get paginated list of clients for a vendor
   */
  async getClientList(
    vendorId: number, 
    filters: ClientFilters = {}
  ): Promise<{ clients: ClientListItem[]; pagination: PaginationInfo }> {
    const { status, search, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = ['c.created_by_vendor_id = $1', 'u.deleted_at IS NULL'];
    const params: any[] = [vendorId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(c.company_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clients c
      JOIN "user" u ON c.user_id = u.id
      WHERE ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT 
        c.id,
        c.company_name,
        c.business_type,
        c.status,
        c.primary_phone,
        CONCAT(u.first_name, ' ', u.last_name) AS contact_name,
        CONCAT(c.street_address, ', ', c.city, ', ', c.zip_code) AS address,
        u.email,
        u.phone,
        c.created_at,
        -- Equipment count
        (SELECT COUNT(*) 
         FROM equipment_instance ei 
         WHERE ei.assigned_to = c.id AND ei.deleted_at IS NULL) AS equipment_count,
        -- Last service date
        (SELECT MAX(mt.resolved_at) 
         FROM maintenance_ticket mt 
         WHERE mt.client_id = c.id AND mt.ticket_status = 'resolved') AS last_service_date
      FROM clients c
      JOIN "user" u ON c.user_id = u.id
      WHERE ${whereClause}
      ORDER BY c.company_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Add limit and offset to params
    const dataParams = [...params, limit, offset];
    const dataResult = await this.pool.query(dataQuery, dataParams);

    const totalPages = Math.ceil(totalCount / limit);
    const pagination: PaginationInfo = {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };

    return {
      clients: dataResult.rows,
      pagination
    };
  }

  /**
   * Get detailed information for a specific client
   */
  async getClientDetails(clientId: number, vendorId: number): Promise<ClientDetail | null> {
    const query = `
      SELECT 
        c.id, c.company_name, c.business_type, c.status, c.primary_phone,
        -- User details
        u.first_name, u.last_name, u.display_name, u.email, u.phone, u.last_login,
        -- Client address
        c.street_address, c.city, c.state, c.zip_code, c.country, 
        c.created_at, v.company_name AS created_by_vendor,
        -- User active status (using opposite of deleted_at)
        CASE WHEN u.deleted_at IS NULL THEN true ELSE false END AS is_active,
        -- Vendor details
        v.id AS vendor_id,
        vu.email AS vendor_email,
        CONCAT(vu.first_name, ' ', vu.last_name) AS vendor_display_name,
        v.company_name AS vendor_company_name,
        -- Equipment counts (including both direct and formal assignments)
        (SELECT COUNT(*) FROM (
          -- Direct assignments
          SELECT ei.id 
          FROM equipment_instance ei
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.assigned_to = $1
          UNION
          -- Formal assignments
          SELECT ei.id
          FROM equipment_instance ei
          JOIN assignment_item ai ON ai.equipment_instance_id = ei.id
          JOIN equipment_assignment ea ON ea.id = ai.assignment_id
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL 
          AND ea.client_id = $1 AND ea.vendor_id = $2
        ) AS combined_equipment) AS total_equipment,
        (SELECT COUNT(*) FROM (
          SELECT ei.id 
          FROM equipment_instance ei
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'compliant' AND ei.assigned_to = $1
          UNION
          SELECT ei.id
          FROM equipment_instance ei
          JOIN assignment_item ai ON ai.equipment_instance_id = ei.id
          JOIN equipment_assignment ea ON ea.id = ai.assignment_id
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'compliant'
          AND ea.client_id = $1 AND ea.vendor_id = $2
        ) AS compliant_equipment_combined) AS compliant_equipment,
        (SELECT COUNT(*) FROM (
          SELECT ei.id 
          FROM equipment_instance ei
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'expired' AND ei.assigned_to = $1
          UNION
          SELECT ei.id
          FROM equipment_instance ei
          JOIN assignment_item ai ON ai.equipment_instance_id = ei.id
          JOIN equipment_assignment ea ON ea.id = ai.assignment_id
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'expired'
          AND ea.client_id = $1 AND ea.vendor_id = $2
        ) AS expired_equipment_combined) AS expired_equipment,
        (SELECT COUNT(*) FROM (
          SELECT ei.id 
          FROM equipment_instance ei
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'overdue' AND ei.assigned_to = $1
          UNION
          SELECT ei.id
          FROM equipment_instance ei
          JOIN assignment_item ai ON ai.equipment_instance_id = ei.id
          JOIN equipment_assignment ea ON ea.id = ai.assignment_id
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'overdue'
          AND ea.client_id = $1 AND ea.vendor_id = $2
        ) AS overdue_equipment_combined) AS overdue_equipment,
        (SELECT COUNT(*) FROM (
          SELECT ei.id 
          FROM equipment_instance ei
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'due_soon' AND ei.assigned_to = $1
          UNION
          SELECT ei.id
          FROM equipment_instance ei
          JOIN assignment_item ai ON ai.equipment_instance_id = ei.id
          JOIN equipment_assignment ea ON ea.id = ai.assignment_id
          WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.compliance_status = 'due_soon'
          AND ea.client_id = $1 AND ea.vendor_id = $2
        ) AS due_soon_equipment_combined) AS due_soon_equipment,
        -- Compliance percentage (including both assignment types)
        (SELECT 
          COALESCE(
            ROUND(
              (SUM(CASE WHEN compliance_equipment.compliance_status = 'compliant' THEN 1 ELSE 0 END)::float / 
               NULLIF(COUNT(DISTINCT compliance_equipment.id), 0) * 100)::numeric, 
              2
            ), 
            0
          )
         FROM (
           SELECT ei.id, ei.compliance_status 
           FROM equipment_instance ei
           WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL AND ei.assigned_to = $1
           UNION
           SELECT ei.id, ei.compliance_status
           FROM equipment_instance ei
           JOIN assignment_item ai ON ai.equipment_instance_id = ei.id
           JOIN equipment_assignment ea ON ea.id = ai.assignment_id
           WHERE ei.vendor_id = $2 AND ei.deleted_at IS NULL 
           AND ea.client_id = $1 AND ea.vendor_id = $2
         ) AS compliance_equipment
        ) AS compliance_percentage,
        -- Maintenance statistics
        (SELECT MAX(mt.resolved_at) 
         FROM maintenance_ticket mt 
         WHERE mt.client_id = c.id AND mt.ticket_status = 'resolved') AS last_service_date,
        (SELECT COUNT(*) 
         FROM maintenance_ticket mt 
         WHERE mt.client_id = c.id) AS total_maintenance_requests,
        (SELECT COUNT(*) 
         FROM maintenance_ticket mt 
         WHERE mt.client_id = c.id AND mt.ticket_status IN ('open', 'in_progress')) AS pending_requests
      FROM clients c
      JOIN "user" u ON c.user_id = u.id
      JOIN vendors v ON c.created_by_vendor_id = v.id
      JOIN "user" vu ON v.user_id = vu.id
      WHERE c.id = $1
      AND c.created_by_vendor_id = $2
      AND u.deleted_at IS NULL
      AND vu.deleted_at IS NULL
    `;

    const result = await this.pool.query(query, [clientId, vendorId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Transform the result to include all required fields
    const clientDetail: ClientDetail = {
      id: row.id,
      // User fields
      first_name: row.first_name,
      last_name: row.last_name,
      display_name: row.display_name,
      email: row.email,
      phone: row.phone,
      last_login: row.last_login,
      is_active: row.is_active,
      // Client fields
      company_name: row.company_name,
      business_type: row.business_type,
      status: row.status,
      primary_phone: row.primary_phone,
      street_address: row.street_address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      country: row.country,
      created_at: row.created_at,
      created_by_vendor: row.created_by_vendor,
      // Equipment metrics
      equipment_count: parseInt(row.total_equipment) || 0,
      total_equipment: parseInt(row.total_equipment) || 0,
      compliant_equipment: parseInt(row.compliant_equipment) || 0,
      expired_equipment: parseInt(row.expired_equipment) || 0,
      overdue_equipment: parseInt(row.overdue_equipment) || 0,
      due_soon_equipment: parseInt(row.due_soon_equipment) || 0,
      compliance_score: parseFloat(row.compliance_percentage) || 0,
      compliance_percentage: parseFloat(row.compliance_percentage) || 0,
      // Maintenance metrics
      last_service_date: row.last_service_date,
      total_maintenance_requests: parseInt(row.total_maintenance_requests) || 0,
      pending_requests: parseInt(row.pending_requests) || 0,
      vendor: {
        id: row.vendor_id,
        display_name: row.vendor_display_name,
        company_name: row.vendor_company_name,
        email: row.vendor_email
      }
    };

    return clientDetail;
  }

  /**
   * Get equipment assigned to a client (handles both direct and formal assignments)
   */
  async getClientEquipment(clientId: number, vendorId: number): Promise<ClientEquipment[]> {
    const query = `
      -- Get unique equipment assigned to client (prioritize direct assignment over formal)
      SELECT DISTINCT ON (ei.id)
        ei.id,
        e.equipment_name,
        e.equipment_type,
        ei.serial_number,
        e.model,
        ei.status,
        ei.condition_rating,
        ei.last_maintenance_date AS last_inspection_date,
        ei.next_maintenance_date AS next_inspection_date,
        COALESCE(ei.assigned_at, ea.assigned_at, ei.created_at) AS assigned_date,
        CASE 
          WHEN ei.assigned_to = $1 THEN 'direct'
          ELSE 'formal'
        END AS assignment_type
      FROM equipment_instance ei
      JOIN equipment e ON ei.equipment_id = e.id
      LEFT JOIN assignment_item ai ON ai.equipment_instance_id = ei.id
      LEFT JOIN equipment_assignment ea ON ea.id = ai.assignment_id
      WHERE ei.vendor_id = $2 
      AND ei.deleted_at IS NULL
      AND (
        ei.assigned_to = $1  -- Direct assignment
        OR (ea.client_id = $1 AND ea.vendor_id = $2)  -- Formal assignment
      )
      ORDER BY ei.id, ei.assigned_to DESC NULLS LAST  -- Prioritize direct assignments
    `;

    const result = await this.pool.query(query, [clientId, vendorId]);
    return result.rows;
  }

  /**
   * Get maintenance history for a client
   */
  async getClientMaintenanceHistory(clientId: number, vendorId: number): Promise<ClientMaintenanceHistory[]> {
    const query = `
      SELECT 
        mt.id,
        mt.ticket_number,
        mt.support_type AS service_type,
        mt.issue_description AS description,
        mt.ticket_status AS status,
        mt.priority,
        mt.scheduled_date,
        mt.resolved_at AS completed_date,
        mt.actual_hours AS cost
      FROM maintenance_ticket mt
      WHERE mt.client_id = $1
      AND mt.vendor_id = $2
      ORDER BY mt.created_at DESC
    `;

    const result = await this.pool.query(query, [clientId, vendorId]);
    return result.rows;
  }

  /**
   * Check if email is unique
   */
  async isEmailUnique(email: string, excludeUserId?: number): Promise<boolean> {
    let query = 'SELECT COUNT(*) FROM "user" WHERE email = $1 AND deleted_at IS NULL';
    const params: any[] = [email];

    if (excludeUserId) {
      query += ' AND id != $2';
      params.push(excludeUserId.toString());
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Create a new client (user + client records)
   */
  async createClient(vendorId: number, clientData: CreateClientData): Promise<{ id: number; company_name: string }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create user record
      const userQuery = `
        INSERT INTO "user" (
          first_name, last_name, display_name, email, password, user_type, 
          role_id, phone, is_temporary_password, created_at, updated_at, last_password_change
        ) VALUES (
          $1, $2, $3, $4, $5, 'client', 3, $6, $7, 
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id
      `;

      const displayName = `${clientData.first_name} ${clientData.last_name}`;
      const userResult = await client.query(userQuery, [
        clientData.first_name,
        clientData.last_name,
        displayName,
        clientData.email,
        clientData.password,
        clientData.phone,
        clientData.is_temporary_password || false
      ]);

      const userId = userResult.rows[0].id;

      // Create client record
      const clientQuery = `
        INSERT INTO clients (
          user_id, created_by_vendor_id, company_name, business_type, 
          primary_phone, street_address, city, zip_code, country, status, 
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 
          'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id, company_name
      `;

      const clientResult = await client.query(clientQuery, [
        userId,
        vendorId,
        clientData.company_name,
        clientData.business_type,
        clientData.primary_phone,
        clientData.street_address,
        clientData.city,
        clientData.zip_code,
        clientData.country
      ]);

      await client.query('COMMIT');
      return clientResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update client information
   */
  async updateClient(
    clientId: number, 
    vendorId: number, 
    updateData: UpdateClientData
  ): Promise<{ id: number; company_name: string }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update user record if user fields are provided
      const userFields = ['first_name', 'last_name', 'email', 'phone'];
      const userUpdates = userFields.filter(field => updateData[field as keyof UpdateClientData] !== undefined);
      
      if (userUpdates.length > 0) {
        const userSetClause = userUpdates.map((field, index) => {
          if (field === 'first_name' || field === 'last_name') {
            return `${field} = $${index + 1}`;
          }
          return `${field} = $${index + 1}`;
        }).join(', ');

        // Add display_name update if first_name or last_name is being updated
        const userParams: any[] = userUpdates.map(field => updateData[field as keyof UpdateClientData]);
        let userQuery = `UPDATE "user" SET ${userSetClause}`;
        
        if (updateData.first_name || updateData.last_name) {
          // Build display_name from first_name and last_name values in the update
          const displayName = `${updateData.first_name || ''}${updateData.last_name || ''}`.trim();
          if (displayName) {
            userQuery += `, display_name = $${userParams.length + 1}`;
            userParams.push(`${updateData.first_name || ''} ${updateData.last_name || ''}`.trim());
          }
        }
        
        userQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT user_id FROM clients WHERE id = $${userParams.length + 1} AND created_by_vendor_id = $${userParams.length + 2}) AND deleted_at IS NULL`;
        
        userParams.push(clientId, vendorId);
        await client.query(userQuery, userParams);
      }

      // Update client record if client fields are provided
      const clientFields = ['company_name', 'business_type', 'status', 'primary_phone', 'street_address', 'city', 'state', 'zip_code', 'country'];
      const clientUpdates = clientFields.filter(field => updateData[field as keyof UpdateClientData] !== undefined);
      
      if (clientUpdates.length > 0) {
        const clientSetClause = clientUpdates.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const clientParams = clientUpdates.map(field => updateData[field as keyof UpdateClientData]);
        
        const clientQuery = `
          UPDATE clients 
          SET ${clientSetClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${clientParams.length + 1}
          AND created_by_vendor_id = $${clientParams.length + 2}
          RETURNING id, company_name
        `;
        
        clientParams.push(clientId.toString(), vendorId.toString());
        const result = await client.query(clientQuery, clientParams);
        
        await client.query('COMMIT');
        return result.rows[0];
      }

      await client.query('COMMIT');
      
      // If no client fields updated, return current client info
      const currentQuery = 'SELECT id, company_name FROM clients WHERE id = $1 AND created_by_vendor_id = $2';
      const currentResult = await this.pool.query(currentQuery, [clientId, vendorId]);
      return currentResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if client has assigned equipment
   */
  async hasAssignedEquipment(clientId: number): Promise<boolean> {
    const query = 'SELECT COUNT(*) FROM equipment_instance WHERE assigned_to = $1 AND deleted_at IS NULL';
    const result = await this.pool.query(query, [clientId]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Soft delete a client (deletes user, cascades to client)
   */
  async deleteClient(clientId: number, vendorId: number): Promise<{ id: number; display_name: string }> {
    const query = `
      UPDATE "user"
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT user_id FROM clients WHERE id = $1 AND created_by_vendor_id = $2)
      AND deleted_at IS NULL
      RETURNING id, display_name
    `;

    const result = await this.pool.query(query, [clientId, vendorId]);
    if (result.rows.length === 0) {
      throw new Error('Client not found or unauthorized');
    }
    
    return result.rows[0];
  }
}