import { Pool } from 'pg';
import { pool } from '../config/database';

export interface MaintenanceTicket {
  id: number;
  ticket_number: string;
  equipment_instance_id?: number;
  client_id?: number;
  vendor_id: number;
  ticket_status: 'open' | 'resolved' | 'closed';
  support_type: 'maintenance' | 'system' | 'user';
  issue_description: string;
  priority: 'low' | 'normal' | 'high';
  scheduled_date?: string;
  assigned_technician?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_description?: string;
  actual_hours?: number;
  cost?: number;
}

export interface TicketKPIs {
  total_tickets: number;
  open_tickets: number;
  high_priority_tickets: number;
}

export interface TicketListItem {
  ticket_number: string;
  equipment_serial: string;
  client: string;
  ticket_status: string;
  support_type: string;
  priority: string;
  issue_description: string;
  scheduled_date?: string;
}

export interface TicketDetails {
  id: number;
  ticket_number: string;
  ticket_status: string;
  support_type: string;
  priority: string;
  issue_description: string;
  scheduled_date?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_description?: string;
  actual_hours?: number;
  cost?: number;
  assigned_technician: string;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  client_address?: string;
  equipment_id?: number;
  serial_number?: string;
  equipment_name?: string;
  equipment_type?: string;
  compliance_status?: string;
}

export interface CreateTicketData {
  equipment_instance_id?: number;
  client_id?: number;
  support_type: 'maintenance' | 'system' | 'user';
  issue_description: string;
  priority: 'low' | 'normal' | 'high';
  scheduled_date?: string;
  assigned_technician?: number;
}

export interface UpdateTicketData {
  ticket_status?: 'open' | 'resolved' | 'closed';
  priority?: 'low' | 'normal' | 'high';
  issue_description?: string;
  scheduled_date?: string;
  assigned_technician?: number;
}

export interface ResolveTicketData {
  resolution_description: string;
  actual_hours?: number;
  cost?: number;
}

export interface TicketFilters {
  status?: string;
  support_type?: string;
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class MaintenanceTicketRepository {
  
  /**
   * Fetch KPI data for maintenance tickets dashboard
   */
  async getTicketKPIs(vendorId: number): Promise<TicketKPIs> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM maintenance_ticket WHERE vendor_id = $1) AS total_tickets,
        (SELECT COUNT(*) FROM maintenance_ticket WHERE vendor_id = $1 AND ticket_status = 'open') AS open_tickets,
        (SELECT COUNT(*) FROM maintenance_ticket WHERE vendor_id = $1 AND priority = 'high') AS high_priority_tickets
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows[0];
  }

  /**
   * Fetch paginated ticket list with filters
   */
  async getTicketList(vendorId: number, filters: TicketFilters = {}): Promise<TicketListItem[]> {
    let query = `
      SELECT 
        mt.ticket_number,
        COALESCE(ei.serial_number, 'N/A') AS equipment_serial,
        COALESCE(c.company_name, 'N/A') AS client,
        mt.ticket_status,
        mt.support_type,
        mt.priority,
        LEFT(mt.issue_description, 50) AS issue_description,
        mt.scheduled_date
      FROM maintenance_ticket mt
      LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
      LEFT JOIN clients c ON mt.client_id = c.id
      WHERE mt.vendor_id = $1
    `;
    
    const params: any[] = [vendorId];
    let paramCount = 1;

    // Add filters
    if (filters.status) {
      paramCount++;
      query += ` AND mt.ticket_status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.support_type) {
      paramCount++;
      query += ` AND mt.support_type = $${paramCount}`;
      params.push(filters.support_type);
    }

    if (filters.priority) {
      paramCount++;
      query += ` AND mt.priority = $${paramCount}`;
      params.push(filters.priority);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (mt.ticket_number ILIKE $${paramCount} OR mt.issue_description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query += ` ORDER BY mt.created_at DESC`;

    // Add pagination
    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get total count of tickets for pagination
   */
  async getTicketCount(vendorId: number, filters: TicketFilters = {}): Promise<number> {
    let query = `
      SELECT COUNT(*) as total
      FROM maintenance_ticket mt
      WHERE mt.vendor_id = $1
    `;
    
    const params: any[] = [vendorId];
    let paramCount = 1;

    // Add same filters as getTicketList
    if (filters.status) {
      paramCount++;
      query += ` AND mt.ticket_status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.support_type) {
      paramCount++;
      query += ` AND mt.support_type = $${paramCount}`;
      params.push(filters.support_type);
    }

    if (filters.priority) {
      paramCount++;
      query += ` AND mt.priority = $${paramCount}`;
      params.push(filters.priority);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (mt.ticket_number ILIKE $${paramCount} OR mt.issue_description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total);
  }

  /**
   * Fetch clients for Create Ticket modal
   */
  async getClientsForDropdown(vendorId: number): Promise<{id: number, company_name: string}[]> {
    const query = `
      SELECT id, company_name
      FROM clients
      WHERE created_by_vendor_id = $1
      AND is_active = true
      ORDER BY company_name
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Fetch equipment for Create Ticket modal
   */
  async getEquipmentForDropdown(vendorId: number): Promise<{id: number, serial_number: string, equipment_name: string}[]> {
    const query = `
      SELECT ei.id, ei.serial_number, et.type_name as equipment_name
      FROM equipment_instance ei
      JOIN equipment_type et ON ei.equipment_type_id = et.id
      WHERE ei.vendor_id = $1
      AND ei.deleted_at IS NULL
      ORDER BY ei.serial_number
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Fetch technicians for Create Ticket modal
   */
  async getTechniciansForDropdown(vendorId: number): Promise<{id: number, display_name: string}[]> {
    const query = `
      SELECT u.id, u.display_name
      FROM users u
      JOIN vendors v ON u.id = v.user_id
      WHERE v.id = $1
      AND u.user_type = 'vendor'
      ORDER BY u.display_name
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    // Find the highest ticket number for today
    const query = `
      SELECT ticket_number 
      FROM maintenance_ticket 
      WHERE ticket_number LIKE 'TKT-${dateStr}-%'
      ORDER BY ticket_number DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastTicket = result.rows[0].ticket_number;
      const lastNumber = parseInt(lastTicket.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    return `TKT-${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Validate ticket number uniqueness
   */
  private async isTicketNumberUnique(ticketNumber: string): Promise<boolean> {
    const query = `SELECT COUNT(*) FROM maintenance_ticket WHERE ticket_number = $1`;
    const result = await pool.query(query, [ticketNumber]);
    return parseInt(result.rows[0].count) === 0;
  }

  /**
   * Validate client belongs to vendor
   */
  private async validateClientAccess(clientId: number, vendorId: number): Promise<boolean> {
    const query = `SELECT COUNT(*) FROM clients WHERE id = $1 AND created_by_vendor_id = $2`;
    const result = await pool.query(query, [clientId, vendorId]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Validate equipment belongs to vendor
   */
  private async validateEquipmentAccess(equipmentId: number, vendorId: number): Promise<boolean> {
    const query = `SELECT COUNT(*) FROM equipment_instance WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL`;
    const result = await pool.query(query, [equipmentId, vendorId]);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Create new maintenance ticket
   */
  async createTicket(vendorId: number, ticketData: CreateTicketData): Promise<{id: number, ticket_number: string}> {
    // Validate client access if provided
    if (ticketData.client_id) {
      const hasClientAccess = await this.validateClientAccess(ticketData.client_id, vendorId);
      if (!hasClientAccess) {
        throw new Error('Invalid client selected');
      }
    }

    // Validate equipment access if provided
    if (ticketData.equipment_instance_id) {
      const hasEquipmentAccess = await this.validateEquipmentAccess(ticketData.equipment_instance_id, vendorId);
      if (!hasEquipmentAccess) {
        throw new Error('Invalid equipment selected');
      }
    }

    // Generate unique ticket number
    const ticketNumber = await this.generateTicketNumber();
    
    const query = `
      INSERT INTO maintenance_ticket (
        ticket_number, equipment_instance_id, client_id, vendor_id, 
        ticket_status, support_type, issue_description, priority, 
        scheduled_date, assigned_technician, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, ticket_number
    `;
    
    const params = [
      ticketNumber,
      ticketData.equipment_instance_id || null,
      ticketData.client_id || null,
      vendorId,
      ticketData.support_type,
      ticketData.issue_description,
      ticketData.priority,
      ticketData.scheduled_date || null,
      ticketData.assigned_technician || null
    ];
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Fetch detailed ticket information
   */
  async getTicketDetails(ticketId: number, vendorId: number): Promise<TicketDetails | null> {
    const query = `
      SELECT 
        mt.id, mt.ticket_number, mt.ticket_status, mt.support_type, 
        mt.priority, mt.issue_description, mt.scheduled_date, 
        mt.created_at, mt.updated_at, mt.resolved_at, 
        mt.resolution_description, mt.actual_hours, mt.cost,
        COALESCE(u.display_name, 'Unassigned') AS assigned_technician,
        c.id AS client_id, c.company_name AS client_name, 
        c.primary_phone AS client_phone, u2.email AS client_email, 
        c.street_address AS client_address,
        ei.id AS equipment_id, ei.serial_number, et.type_name AS equipment_name, 
        et.type_name AS equipment_type, ei.compliance_status
      FROM maintenance_ticket mt
      LEFT JOIN users u ON mt.assigned_technician = u.id
      LEFT JOIN clients c ON mt.client_id = c.id
      LEFT JOIN users u2 ON c.user_id = u2.id
      LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
      LEFT JOIN equipment_type et ON ei.equipment_type_id = et.id
      WHERE mt.id = $1
      AND mt.vendor_id = $2
    `;
    
    const result = await pool.query(query, [ticketId, vendorId]);
    return result.rows[0] || null;
  }

  /**
   * Fetch related tickets for the same client or equipment
   */
  async getRelatedTickets(ticketId: number, vendorId: number): Promise<TicketListItem[]> {
    const query = `
      SELECT 
        mt.ticket_number, COALESCE(ei.serial_number, 'N/A') AS equipment_serial,
        mt.issue_description, mt.ticket_status, mt.priority, mt.scheduled_date
      FROM maintenance_ticket mt
      LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
      WHERE (mt.client_id = (
        SELECT client_id FROM maintenance_ticket WHERE id = $1
      ) OR mt.equipment_instance_id = (
        SELECT equipment_instance_id FROM maintenance_ticket WHERE id = $1
      ))
      AND mt.id != $1
      AND mt.vendor_id = $2
      ORDER BY mt.created_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query, [ticketId, vendorId]);
    return result.rows;
  }

  /**
   * Update ticket details
   */
  async updateTicket(ticketId: number, vendorId: number, updateData: UpdateTicketData): Promise<{id: number, ticket_number: string}> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    // Build dynamic SET clause
    if (updateData.ticket_status !== undefined) {
      paramCount++;
      setClauses.push(`ticket_status = $${paramCount}`);
      params.push(updateData.ticket_status);
    }

    if (updateData.priority !== undefined) {
      paramCount++;
      setClauses.push(`priority = $${paramCount}`);
      params.push(updateData.priority);
    }

    if (updateData.issue_description !== undefined) {
      paramCount++;
      setClauses.push(`issue_description = $${paramCount}`);
      params.push(updateData.issue_description);
    }

    if (updateData.scheduled_date !== undefined) {
      paramCount++;
      setClauses.push(`scheduled_date = $${paramCount}`);
      params.push(updateData.scheduled_date);
    }

    if (updateData.assigned_technician !== undefined) {
      paramCount++;
      setClauses.push(`assigned_technician = $${paramCount}`);
      params.push(updateData.assigned_technician);
    }

    if (setClauses.length === 0) {
      throw new Error('No update data provided');
    }

    // Always update the updated_at timestamp
    paramCount++;
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause parameters
    paramCount++;
    const ticketIdParam = paramCount;
    paramCount++;
    const vendorIdParam = paramCount;

    params.push(ticketId, vendorId);

    const query = `
      UPDATE maintenance_ticket
      SET ${setClauses.join(', ')}
      WHERE id = $${ticketIdParam}
      AND vendor_id = $${vendorIdParam}
      RETURNING id, ticket_number
    `;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      throw new Error('Ticket not found or access denied');
    }
    
    return result.rows[0];
  }

  /**
   * Resolve ticket with resolution details
   */
  async resolveTicket(ticketId: number, vendorId: number, resolveData: ResolveTicketData): Promise<{id: number, ticket_number: string}> {
    const query = `
      UPDATE maintenance_ticket
      SET 
        ticket_status = 'resolved',
        resolution_description = $1,
        actual_hours = $2,
        cost = $3,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      AND vendor_id = $5
      RETURNING id, ticket_number
    `;
    
    const params = [
      resolveData.resolution_description,
      resolveData.actual_hours || null,
      resolveData.cost || null,
      ticketId,
      vendorId
    ];
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      throw new Error('Ticket not found or access denied');
    }
    
    return result.rows[0];
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: number, vendorId: number): Promise<{id: number, ticket_number: string}> {
    const query = `
      UPDATE maintenance_ticket
      SET 
        ticket_status = 'closed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      AND vendor_id = $2
      RETURNING id, ticket_number
    `;
    
    const result = await pool.query(query, [ticketId, vendorId]);
    
    if (result.rows.length === 0) {
      throw new Error('Ticket not found or access denied');
    }
    
    return result.rows[0];
  }

  /**
   * Get ticket by ID for validation
   */
  async getTicketById(ticketId: number, vendorId: number): Promise<MaintenanceTicket | null> {
    const query = `
      SELECT * FROM maintenance_ticket 
      WHERE id = $1 AND vendor_id = $2
    `;
    
    const result = await pool.query(query, [ticketId, vendorId]);
    return result.rows[0] || null;
  }
}

export default new MaintenanceTicketRepository();