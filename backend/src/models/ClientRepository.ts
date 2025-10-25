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
  address: string;
  email: string;
  created_at: string;
}

export interface ClientDetail {
  id: number;
  company_name: string;
  business_type: string;
  status: 'active' | 'inactive' | 'pending';
  primary_phone: string;
  email: string;
  street_address: string;
  city: string;
  zip_code: string;
  country: string;
  created_at: string;
  created_by_vendor: string;
  total_equipment: number;
  compliant_equipment: number;
  expired_equipment: number;
  overdue_equipment: number;
  due_soon_equipment: number;
  compliance_percentage: number;
}

export interface ClientEquipment {
  id: number;
  serial_number: string;
  equipment_name: string;
  equipment_type: string;
  compliance_status: string;
  next_maintenance_date: string | null;
}

export interface ClientMaintenanceHistory {
  id: number;
  ticket_number: string;
  equipment_serial: string;
  issue_description: string;
  ticket_status: string;
  priority: string;
  scheduled_date: string | null;
  created_at: string;
}

export interface CreateClientData {
  // User fields
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  
  // Client fields
  company_name: string;
  business_type: string;
  primary_phone: string;
  street_address: string;
  city: string;
  zip_code: string;
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
  zip_code?: string;
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

    if (status) {
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
    const countResult = await this.pool.query(countQuery, params.slice(0, paramIndex - 1));
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT 
        c.id,
        c.company_name,
        c.business_type,
        c.status,
        c.primary_phone,
        CONCAT(c.street_address, ', ', c.city, ', ', c.zip_code) AS address,
        u.email,
        c.created_at
      FROM clients c
      JOIN "user" u ON c.user_id = u.id
      WHERE ${whereClause}
      ORDER BY c.company_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const dataResult = await this.pool.query(dataQuery, params);

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
        u.email, c.street_address, c.city, c.zip_code, c.country, 
        c.created_at, v.company_name AS created_by_vendor,
        (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.assigned_to = c.id AND ei.deleted_at IS NULL) AS total_equipment,
        (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.assigned_to = c.id AND ei.compliance_status = 'compliant' AND ei.deleted_at IS NULL) AS compliant_equipment,
        (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.assigned_to = c.id AND ei.compliance_status = 'expired' AND ei.deleted_at IS NULL) AS expired_equipment,
        (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.assigned_to = c.id AND ei.compliance_status = 'overdue' AND ei.deleted_at IS NULL) AS overdue_equipment,
        (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.assigned_to = c.id AND ei.compliance_status = 'due_soon' AND ei.deleted_at IS NULL) AS due_soon_equipment,
        (SELECT 
          COALESCE(
            ROUND(
              (SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END)::float / 
               NULLIF(COUNT(ei.id), 0) * 100)::numeric, 
              2
            ), 
            0
          )
         FROM equipment_instance ei WHERE ei.assigned_to = c.id AND ei.deleted_at IS NULL
        ) AS compliance_percentage
      FROM clients c
      JOIN "user" u ON c.user_id = u.id
      JOIN vendors v ON c.created_by_vendor_id = v.id
      WHERE c.id = $1
      AND c.created_by_vendor_id = $2
      AND u.deleted_at IS NULL
    `;

    const result = await this.pool.query(query, [clientId, vendorId]);
    return result.rows[0] || null;
  }

  /**
   * Get equipment assigned to a client
   */
  async getClientEquipment(clientId: number, vendorId: number): Promise<ClientEquipment[]> {
    const query = `
      SELECT 
        ei.id,
        ei.serial_number, 
        e.equipment_name, 
        e.equipment_type, 
        ei.compliance_status, 
        ei.next_maintenance_date
      FROM equipment_instance ei
      JOIN equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
      AND ei.vendor_id = $2
      AND ei.deleted_at IS NULL
      ORDER BY ei.serial_number
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
        COALESCE(ei.serial_number, 'N/A') AS equipment_serial,
        mt.issue_description, 
        mt.ticket_status, 
        mt.priority, 
        mt.scheduled_date,
        mt.created_at
      FROM maintenance_ticket mt
      LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
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
          role_id, phone, created_at, updated_at, last_password_change
        ) VALUES (
          $1, $2, $3, $4, $5, 'client', 3, $6, 
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
        clientData.phone
      ]);

      const userId = userResult.rows[0].id;

      // Create client record
      const clientQuery = `
        INSERT INTO clients (
          user_id, created_by_vendor_id, company_name, business_type, 
          primary_phone, street_address, city, zip_code, country, status, 
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'Sri Lanka', 
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
        clientData.zip_code
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
          const firstName = updateData.first_name || '(SELECT first_name FROM "user" WHERE id = (SELECT user_id FROM clients WHERE id = $' + (userParams.length + 2) + '))';
          const lastName = updateData.last_name || '(SELECT last_name FROM "user" WHERE id = (SELECT user_id FROM clients WHERE id = $' + (userParams.length + 2) + '))';
          userQuery += `, display_name = CONCAT(${firstName}, ' ', ${lastName})`;
        }
        
        userQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT user_id FROM clients WHERE id = $${userParams.length + 1} AND created_by_vendor_id = $${userParams.length + 2}) AND deleted_at IS NULL`;
        
        userParams.push(clientId, vendorId);
        await client.query(userQuery, userParams);
      }

      // Update client record if client fields are provided
      const clientFields = ['company_name', 'business_type', 'status', 'primary_phone', 'street_address', 'city', 'zip_code'];
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