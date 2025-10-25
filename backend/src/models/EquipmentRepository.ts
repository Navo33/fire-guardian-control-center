import { pool } from '../config/database';
import { PaginationQuery } from '../types/api';
import { DebugLogger } from '../utils/DebugLogger';

export interface EquipmentFilters {
  status?: string;
  compliance_status?: string;
  search?: string;
}

export interface CreateEquipmentInstanceData {
  equipment_id: number;
  serial_number: string;
  vendor_id: number;
  purchase_date: string;
  warranty_expiry?: string;
  maintenance_interval_days: number;
  location?: string;
  notes?: string;
}

export interface UpdateEquipmentInstanceData {
  status?: string;
  next_maintenance_date?: string;
  location?: string;
  notes?: string;
}

export interface AssignEquipmentData {
  client_id: number;
  vendor_id: number;
  assignment_number: string;
  unit_cost: number;
  total_cost: number;
}

/**
 * Equipment Repository
 * Handles all equipment-related database operations
 */
export class EquipmentRepository {

  /**
   * Get paginated list of equipment instances for a vendor
   */
  static async getEquipmentList(
    vendorId: number,
    pagination: PaginationQuery,
    filters: EquipmentFilters = {}
  ) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting equipment list', { vendorId, pagination, filters }, 'EQUIPMENT_REPO');

    try {
      const offset = ((pagination.page || 1) - 1) * (pagination.limit || 25);
      
      let whereClause = `WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL`;
      const queryParams: any[] = [vendorId];
      let paramCount = 1;

      // Add status filter
      if (filters.status) {
        paramCount++;
        whereClause += ` AND ei.status = $${paramCount}`;
        queryParams.push(filters.status);
      }

      // Add compliance status filter
      if (filters.compliance_status) {
        paramCount++;
        whereClause += ` AND ei.compliance_status = $${paramCount}`;
        queryParams.push(filters.compliance_status);
      }

      // Add search filter
      if (filters.search) {
        paramCount++;
        whereClause += ` AND (ei.serial_number ILIKE $${paramCount} OR e.equipment_name ILIKE $${paramCount})`;
        queryParams.push(`%${filters.search}%`);
      }

      const query = `
        SELECT 
          ei.id,
          ei.serial_number,
          e.equipment_name,
          e.equipment_type,
          ei.status,
          ei.compliance_status,
          ei.next_maintenance_date,
          ei.expiry_date,
          COALESCE(c.company_name, 'Unassigned') AS client
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        LEFT JOIN clients c ON ei.assigned_to = c.id
        ${whereClause}
        ORDER BY ei.serial_number
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(pagination.limit || 25, offset);

      DebugLogger.database('Equipment List Query', query);
      const result = await pool.query(query, queryParams);

      DebugLogger.performance('Equipment list fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching equipment list', error, { vendorId, pagination, filters });
      throw error;
    }
  }

  /**
   * Get count of equipment instances for pagination
   */
  static async getEquipmentCount(vendorId: number, filters: EquipmentFilters = {}): Promise<number> {
    try {
      let whereClause = `WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL`;
      const queryParams: any[] = [vendorId];
      let paramCount = 1;

      // Add status filter
      if (filters.status) {
        paramCount++;
        whereClause += ` AND ei.status = $${paramCount}`;
        queryParams.push(filters.status);
      }

      // Add compliance status filter
      if (filters.compliance_status) {
        paramCount++;
        whereClause += ` AND ei.compliance_status = $${paramCount}`;
        queryParams.push(filters.compliance_status);
      }

      // Add search filter
      if (filters.search) {
        paramCount++;
        whereClause += ` AND (ei.serial_number ILIKE $${paramCount} OR e.equipment_name ILIKE $${paramCount})`;
        queryParams.push(`%${filters.search}%`);
      }

      const query = `
        SELECT COUNT(*) as count
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        ${whereClause}
      `;

      const result = await pool.query(query, queryParams);
      return parseInt(result.rows[0].count) || 0;

    } catch (error) {
      DebugLogger.error('Error getting equipment count', error, { vendorId, filters });
      throw error;
    }
  }

  /**
   * Get equipment types for Add Equipment modal
   */
  static async getEquipmentTypes() {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting equipment types', {}, 'EQUIPMENT_REPO');

    try {
      const query = `
        SELECT id, equipment_name
        FROM equipment
        WHERE deleted_at IS NULL
        ORDER BY equipment_name
      `;

      const result = await pool.query(query);

      DebugLogger.performance('Equipment types fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching equipment types', error);
      throw error;
    }
  }

  /**
   * Check if serial number is unique
   */
  static async isSerialNumberUnique(serialNumber: string, excludeId?: number): Promise<boolean> {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM equipment_instance
        WHERE serial_number = $1 AND deleted_at IS NULL
      `;
      const queryParams: any[] = [serialNumber];

      if (excludeId) {
        query += ` AND id != $2`;
        queryParams.push(excludeId);
      }

      const result = await pool.query(query, queryParams);
      return parseInt(result.rows[0].count) === 0;

    } catch (error) {
      DebugLogger.error('Error checking serial number uniqueness', error, { serialNumber, excludeId });
      throw error;
    }
  }

  /**
   * Add new equipment instance
   */
  static async addEquipmentInstance(data: CreateEquipmentInstanceData) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Adding equipment instance', { data }, 'EQUIPMENT_REPO');

    try {
      const query = `
        INSERT INTO equipment_instance (
          equipment_id, serial_number, vendor_id, status, purchase_date, 
          warranty_expiry, expiry_date, next_maintenance_date, 
          maintenance_interval_days, location, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'available', $4, 
          $5, 
          $4::date + (SELECT default_lifespan_years * INTERVAL '1 year' FROM equipment WHERE id = $1),
          $4::date + ($6 * INTERVAL '1 day'), 
          $6, $7, $8, 
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, serial_number
      `;

      const queryParams = [
        data.equipment_id,
        data.serial_number,
        data.vendor_id,
        data.purchase_date,
        data.warranty_expiry || null,
        data.maintenance_interval_days,
        data.location || null,
        data.notes || null
      ];

      DebugLogger.database('Add Equipment Instance Query', query);
      const result = await pool.query(query, queryParams);

      DebugLogger.performance('Equipment instance add', startTime, { id: result.rows[0].id });
      return result.rows[0];

    } catch (error) {
      DebugLogger.error('Error adding equipment instance', error, { data });
      throw error;
    }
  }

  /**
   * Get equipment instance details
   */
  static async getEquipmentInstanceDetails(equipmentInstanceId: number, vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting equipment instance details', { equipmentInstanceId, vendorId }, 'EQUIPMENT_REPO');

    try {
      const query = `
        SELECT 
          ei.id, ei.serial_number, e.equipment_name, e.equipment_type, 
          e.manufacturer, e.model, e.specifications, ei.status, 
          ei.compliance_status, ei.purchase_date, ei.warranty_expiry, 
          ei.expiry_date, ei.next_maintenance_date, ei.location, ei.notes,
          c.id AS client_id, c.company_name AS client_name, 
          c.primary_phone AS client_phone, c.street_address AS client_address
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        LEFT JOIN clients c ON ei.assigned_to = c.id
        WHERE ei.id = $1
        AND ei.vendor_id = $2
        AND ei.deleted_at IS NULL
      `;

      const result = await pool.query(query, [equipmentInstanceId, vendorId]);

      if (result.rows.length === 0) {
        return null;
      }

      DebugLogger.performance('Equipment instance details fetch', startTime);
      return result.rows[0];

    } catch (error) {
      DebugLogger.error('Error fetching equipment instance details', error, { equipmentInstanceId, vendorId });
      throw error;
    }
  }

  /**
   * Get related equipment instances (same equipment type)
   */
  static async getRelatedEquipmentInstances(equipmentInstanceId: number, vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting related equipment instances', { equipmentInstanceId, vendorId }, 'EQUIPMENT_REPO');

    try {
      const query = `
        SELECT 
          ei.id, ei.serial_number, ei.status, ei.compliance_status, 
          ei.next_maintenance_date, COALESCE(c.company_name, 'Unassigned') AS client
        FROM equipment_instance ei
        LEFT JOIN clients c ON ei.assigned_to = c.id
        WHERE ei.equipment_id = (
          SELECT equipment_id FROM equipment_instance 
          WHERE id = $1 AND vendor_id = $2
        )
        AND ei.id != $1
        AND ei.vendor_id = $2
        AND ei.deleted_at IS NULL
        ORDER BY ei.serial_number
      `;

      const result = await pool.query(query, [equipmentInstanceId, vendorId]);

      DebugLogger.performance('Related equipment instances fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching related equipment instances', error, { equipmentInstanceId, vendorId });
      throw error;
    }
  }

  /**
   * Get assignment history for equipment instance
   */
  static async getAssignmentHistory(equipmentInstanceId: number, vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting assignment history', { equipmentInstanceId, vendorId }, 'EQUIPMENT_REPO');

    try {
      const query = `
        SELECT 
          ea.assignment_number, c.company_name AS client, 
          ea.assigned_at, ea.status, ea.total_cost
        FROM equipment_assignment ea
        JOIN assignment_item ai ON ea.id = ai.assignment_id
        JOIN clients c ON ea.client_id = c.id
        WHERE ai.equipment_instance_id = $1
        AND ea.vendor_id = $2
        ORDER BY ea.assigned_at DESC
      `;

      const result = await pool.query(query, [equipmentInstanceId, vendorId]);

      DebugLogger.performance('Assignment history fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching assignment history', error, { equipmentInstanceId, vendorId });
      throw error;
    }
  }

  /**
   * Get maintenance history for equipment instance
   */
  static async getMaintenanceHistory(equipmentInstanceId: number, vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting maintenance history', { equipmentInstanceId, vendorId }, 'EQUIPMENT_REPO');

    try {
      const query = `
        SELECT 
          mt.ticket_number, mt.issue_description, mt.ticket_status, 
          mt.priority, mt.scheduled_date, mt.resolved_at
        FROM maintenance_ticket mt
        WHERE mt.equipment_instance_id = $1
        AND mt.vendor_id = $2
        ORDER BY mt.created_at DESC
      `;

      const result = await pool.query(query, [equipmentInstanceId, vendorId]);

      DebugLogger.performance('Maintenance history fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching maintenance history', error, { equipmentInstanceId, vendorId });
      throw error;
    }
  }

  /**
   * Update equipment instance
   */
  static async updateEquipmentInstance(
    equipmentInstanceId: number,
    vendorId: number,
    data: UpdateEquipmentInstanceData
  ) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Updating equipment instance', { equipmentInstanceId, vendorId, data }, 'EQUIPMENT_REPO');

    try {
      const query = `
        UPDATE equipment_instance
        SET 
          status = COALESCE($3, status),
          next_maintenance_date = COALESCE($4, next_maintenance_date),
          location = COALESCE($5, location),
          notes = COALESCE($6, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND vendor_id = $2
        AND deleted_at IS NULL
        RETURNING id, serial_number
      `;

      const queryParams = [
        equipmentInstanceId,
        vendorId,
        data.status || null,
        data.next_maintenance_date || null,
        data.location || null,
        data.notes || null
      ];

      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        return null;
      }

      DebugLogger.performance('Equipment instance update', startTime);
      return result.rows[0];

    } catch (error) {
      DebugLogger.error('Error updating equipment instance', error, { equipmentInstanceId, vendorId, data });
      throw error;
    }
  }

  /**
   * Soft delete equipment instance
   */
  static async deleteEquipmentInstance(equipmentInstanceId: number, vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Deleting equipment instance', { equipmentInstanceId, vendorId }, 'EQUIPMENT_REPO');

    try {
      // First check if instance is assigned
      const checkQuery = `
        SELECT assigned_to FROM equipment_instance
        WHERE id = $1 AND vendor_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await pool.query(checkQuery, [equipmentInstanceId, vendorId]);

      if (checkResult.rows.length === 0) {
        return null;
      }

      if (checkResult.rows[0].assigned_to) {
        throw new Error('Cannot delete equipment with active assignments');
      }

      const query = `
        UPDATE equipment_instance
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND vendor_id = $2
        AND deleted_at IS NULL
        RETURNING id, serial_number
      `;

      const result = await pool.query(query, [equipmentInstanceId, vendorId]);

      DebugLogger.performance('Equipment instance delete', startTime);
      return result.rows[0];

    } catch (error) {
      DebugLogger.error('Error deleting equipment instance', error, { equipmentInstanceId, vendorId });
      throw error;
    }
  }

  /**
   * Get clients for assignment modal
   */
  static async getClientsForAssignment(vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting clients for assignment', { vendorId }, 'EQUIPMENT_REPO');

    try {
      const query = `
        SELECT id, company_name
        FROM clients
        WHERE created_by_vendor_id = $1
        AND status = 'active'
        ORDER BY company_name
      `;

      const result = await pool.query(query, [vendorId]);

      DebugLogger.performance('Clients for assignment fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching clients for assignment', error, { vendorId });
      throw error;
    }
  }

  /**
   * Generate unique assignment number
   */
  static async generateAssignmentNumber(): Promise<string> {
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `ASG-${today}`;
      
      const query = `
        SELECT COUNT(*) as count
        FROM equipment_assignment
        WHERE assignment_number LIKE $1
      `;

      const result = await pool.query(query, [`${prefix}%`]);
      const count = parseInt(result.rows[0].count) + 1;
      
      return `${prefix}-${count.toString().padStart(3, '0')}`;

    } catch (error) {
      DebugLogger.error('Error generating assignment number', error);
      throw error;
    }
  }

  /**
   * Assign equipment to client
   */
  static async assignEquipment(equipmentInstanceId: number, data: AssignEquipmentData) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Assigning equipment', { equipmentInstanceId, data }, 'EQUIPMENT_REPO');

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create equipment assignment
      const assignmentQuery = `
        INSERT INTO equipment_assignment (
          client_id, vendor_id, assignment_number, status, 
          total_cost, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'active', 
          $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id
      `;

      const assignmentResult = await client.query(assignmentQuery, [
        data.client_id,
        data.vendor_id,
        data.assignment_number,
        data.total_cost
      ]);

      const assignmentId = assignmentResult.rows[0].id;

      // Create assignment item
      const itemQuery = `
        INSERT INTO assignment_item (
          assignment_id, equipment_instance_id, quantity, unit_cost, total_cost
        ) VALUES (
          $1, $2, 1, $3, $4
        )
      `;

      await client.query(itemQuery, [
        assignmentId,
        equipmentInstanceId,
        data.unit_cost,
        data.total_cost
      ]);

      // Update equipment instance status
      const updateQuery = `
        UPDATE equipment_instance
        SET status = 'assigned', assigned_to = $2, assigned_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND vendor_id = $3
        AND deleted_at IS NULL
        RETURNING id, serial_number
      `;

      const updateResult = await client.query(updateQuery, [
        equipmentInstanceId,
        data.client_id,
        data.vendor_id
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Equipment instance not found or not owned by vendor');
      }

      await client.query('COMMIT');

      DebugLogger.performance('Equipment assignment', startTime);
      return {
        assignmentId,
        equipmentInstance: updateResult.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      DebugLogger.error('Error assigning equipment', error, { equipmentInstanceId, data });
      throw error;
    } finally {
      client.release();
    }
  }
}
