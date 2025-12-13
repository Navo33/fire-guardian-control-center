import { pool } from '../config/database';
import { PaginationQuery } from '../types/api';
import { DebugLogger } from '../utils/DebugLogger';

export interface EquipmentFilters {
  status?: string;
  compliance_status?: string;
  search?: string;
  equipment_type_id?: number;
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

export interface BulkAssignEquipmentData {
  vendor_id: number;
  client_id: number;
  equipment_instances: number[];
  assignment_date: string;
  notes?: string;
}

export interface CreateEquipmentTypeData {
  vendor_id: number;
  equipment_code?: string;
  equipment_name: string;
  description?: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  specifications?: any;
  weight_kg?: number;
  dimensions?: string;
  warranty_years?: number;
  default_lifespan_years?: number;
}

export interface UpdateEquipmentTypeData {
  equipment_name?: string;
  description?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  specifications?: any | null;
  weight_kg?: number | null;
  dimensions?: string | null;
  warranty_years?: number | null;
  default_lifespan_years?: number | null;
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

      // Add equipment type filter
      if (filters.equipment_type_id) {
        paramCount++;
        whereClause += ` AND ei.equipment_id = $${paramCount}`;
        queryParams.push(filters.equipment_type_id);
      }

      const query = `
        SELECT 
          ei.id,
          ei.serial_number,
          e.equipment_name,
          e.equipment_type AS equipment_category,
          ei.status,
          ei.compliance_status,
          ei.location,
          ei.next_maintenance_date,
          ei.expiry_date AS warranty_expiry,
          ei.created_at,
          COALESCE(c.company_name, 'Unassigned') AS assigned_client
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

      // Add equipment type filter
      if (filters.equipment_type_id) {
        paramCount++;
        whereClause += ` AND ei.equipment_id = $${paramCount}`;
        queryParams.push(filters.equipment_type_id);
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
   * Get equipment catalog for equipment management page
   * Uses direct SQL queries as specified
   */
  static async getEquipmentTypes(vendorId?: number, filters: { search?: string, category?: string } = {}) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting vendor equipment catalog', { vendorId, filters }, 'EQUIPMENT_REPO');

    try {
      if (!vendorId) {
        throw new Error('Vendor ID is required for equipment types');
      }

      const queryParams: any[] = [vendorId];
      let additionalFilters = '';
      let paramCount = 1;

      // Add search filter
      if (filters.search) {
        paramCount++;
        additionalFilters += ` AND (e.equipment_name ILIKE $${paramCount} OR e.equipment_code ILIKE $${paramCount})`;
        queryParams.push(`%${filters.search}%`);
      }

      // Add category filter
      if (filters.category) {
        paramCount++;
        additionalFilters += ` AND e.equipment_type = $${paramCount}`;
        queryParams.push(filters.category);
      }

      // Get the equipment types list - only show equipment types owned by this vendor
      const query = `
        SELECT jsonb_build_object(
          'id', e.id,
          'equipment_name', e.equipment_name,
          'equipment_code', e.equipment_code,
          'equipment_type', e.equipment_type,
          'manufacturer', e.manufacturer,
          'model', e.model,
          'instance_count', COALESCE(inst.cnt, 0),
          'available_count', COALESCE(inst.available, 0),
          'assigned_count', COALESCE(inst.assigned, 0),
          'specifications', e.specifications,
          -- Formatted fields for compatibility
          'equipment_details', e.equipment_name || E'\\n' || e.manufacturer || ' - ' || COALESCE(e.model, ''),
          'category_type', e.equipment_type,
          'code', 'Code: ' || e.equipment_code,
          'total_active_instances', COALESCE(inst.cnt, 0),
          'lifespan', 'Lifespan: ' || e.default_lifespan_years || ' years',
          'description', COALESCE(e.description, 'No description available'),
          'default_lifespan_years', e.default_lifespan_years,
          'created_at', e.created_at
        ) AS equipment_type_data
        FROM equipment e
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) AS cnt,
            COUNT(*) FILTER (WHERE ei.status = 'available') AS available,
            COUNT(*) FILTER (WHERE ei.status = 'assigned') AS assigned
          FROM equipment_instance ei
          WHERE ei.equipment_id = e.id
            AND ei.vendor_id = $1
            AND ei.deleted_at IS NULL
        ) inst ON TRUE
        WHERE e.vendor_id = $1 
          AND e.deleted_at IS NULL ${additionalFilters}
        ORDER BY e.equipment_name
      `;

      DebugLogger.database('Vendor Equipment Catalog Query', query);
      const result = await pool.query(query, queryParams);

      DebugLogger.performance('Vendor equipment catalog fetch', startTime, { count: result.rows.length });
      
      // Extract equipment type data from each row
      const equipmentTypes = result.rows.map(row => row.equipment_type_data);

      return equipmentTypes;

    } catch (error) {
      DebugLogger.error('Error fetching equipment catalog', error, { vendorId, filters });
      throw error;
    }
  }

  /**
   * Get aggregated equipment statistics for management cards
   * Returns: { equipment_types, total_instances, categories, avg_lifespan }
   */
  static async getEquipmentStats(vendorId?: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting vendor equipment stats', { vendorId }, 'EQUIPMENT_REPO');

    try {
      if (!vendorId) {
        throw new Error('Vendor ID is required for equipment stats');
      }

      const query = `
        SELECT
          -- Summary Cards - count all equipment types owned by vendor
          (SELECT COUNT(*) FROM public.equipment WHERE vendor_id = $1 AND deleted_at IS NULL) AS equipment_types,
          (SELECT COUNT(*) FROM public.equipment_instance WHERE vendor_id = $1 AND deleted_at IS NULL) AS total_instances,
          (SELECT COUNT(DISTINCT equipment_type) FROM public.equipment WHERE vendor_id = $1 AND deleted_at IS NULL) AS categories,
          (SELECT ROUND(AVG(default_lifespan_years), 1) FROM public.equipment WHERE vendor_id = $1 AND deleted_at IS NULL) AS avg_lifespan
      `;

      DebugLogger.database('Vendor Equipment Stats Query', query);
      const result = await pool.query(query, [vendorId]);

      const row = result.rows[0] || {};

      DebugLogger.performance('Vendor equipment stats fetch', startTime, { vendorId, stats: row });

      return {
        equipment_types: parseInt(row.equipment_types || 0, 10),
        total_instances: parseInt(row.total_instances || 0, 10),
        categories: parseInt(row.categories || 0, 10),
        avg_lifespan: row.avg_lifespan !== null && row.avg_lifespan !== undefined ? parseFloat(row.avg_lifespan) : 0
      };

    } catch (error) {
      DebugLogger.error('Error fetching vendor equipment stats', error, { vendorId });
      throw error;
    }
  }

  /**
   * Get detailed equipment type information for the details page
   * Uses comprehensive SQL with instance metrics and maintenance data
   */
  static async getEquipmentTypeDetails(equipmentId: number, vendorId?: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting equipment type details', { equipmentId, vendorId }, 'EQUIPMENT_REPO');

    try {
      const query = `
        SELECT
          -- Header
          e.equipment_name,
          e.equipment_code,
          e.equipment_type,
          e.manufacturer,
          e.model,
          e.default_lifespan_years,
          TO_CHAR(e.created_at, 'MM/DD/YYYY') AS created_date,
          COALESCE(e.description, 'No description available') AS description,

          -- Summary
          COALESCE(inst.total, 0)::text AS total_instances,
          COALESCE(inst.available, 0)::text AS available_instances,
          COALESCE(inst.assigned, 0)::text AS assigned_instances,
          COALESCE(inst.maintenance_due, 0)::text AS maintenance_instances,
          COALESCE(inst.avg_interval_months, 12)::text AS standard_interval_months,
          COALESCE(inst.overdue, 0)::text AS instances_requiring_maintenance,

          -- Specs and Maintenance Info
          e.specifications,
          e.warranty_years,
          e.weight_kg,
          e.dimensions,
          COALESCE(inst.avg_interval_months, 12) AS maintenance_interval_months,
          COALESCE(e.warranty_years * 12, 0) AS warranty_period_months,

          -- Instances
          COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', ei.id,
              'status', ei.status,
              'location', ei.location,
              'client_name', c.company_name,
              'expiry_date', ei.expiry_date,
              'purchase_date', ei.purchase_date,
              'serial_number', ei.serial_number,
              'warranty_expiry', ei.warranty_expiry,
              'compliance_status', ei.compliance_status,
              'next_maintenance_date', ei.next_maintenance_date
            ))
            FROM equipment_instance ei
            LEFT JOIN clients c ON ei.assigned_to = c.id
            WHERE ei.equipment_id = e.id AND ei.deleted_at IS NULL
          ), '[]'::jsonb) AS instances,

          -- Assignments – FIXED: SUM outside jsonb_agg
          COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'assignment_id', ea.id,
              'assignment_number', ea.assignment_number,
              'client_name', c.company_name,
              'assigned_at', ea.assigned_at,
              'start_date', ea.start_date,
              'end_date', ea.end_date,
              'status', ea.status,
              'quantity', ea.total_qty,
              'notes', COALESCE(ea.notes, '')
            ))
            FROM (
              SELECT 
                ea.*,
                SUM(ai.quantity) AS total_qty
              FROM equipment_assignment ea
              JOIN assignment_item ai ON ea.id = ai.assignment_id
              JOIN equipment_instance ei ON ai.equipment_instance_id = ei.id
              WHERE ei.equipment_id = e.id AND ei.vendor_id = $2
              GROUP BY ea.id
            ) ea
            JOIN clients c ON ea.client_id = c.id
          ), '[]'::jsonb) AS assignments

        FROM public.equipment e
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE ei.status = 'available') AS available,
            COUNT(*) FILTER (WHERE ei.status = 'assigned') AS assigned,
            COUNT(*) FILTER (WHERE ei.next_maintenance_date <= CURRENT_DATE + 30) AS maintenance_due,
            COUNT(*) FILTER (WHERE ei.next_maintenance_date < CURRENT_DATE) AS overdue,
            ROUND(AVG(ei.maintenance_interval_days) / 30.0, 1) AS avg_interval_months
          FROM equipment_instance ei
          WHERE ei.equipment_id = e.id AND ei.vendor_id = $2 AND ei.deleted_at IS NULL
        ) inst ON TRUE

        WHERE e.id = $1 AND e.vendor_id = $2 AND e.deleted_at IS NULL
      `;

      if (!vendorId) {
        throw new Error('Vendor ID is required for equipment type details');
      }

      DebugLogger.database('Equipment Type Details Query', query);
      const result = await pool.query(query, [equipmentId, vendorId]);

      if (result.rows.length === 0) {
        return null;
      }

      const equipmentDetails = result.rows[0];

      DebugLogger.performance('Equipment type details fetch', startTime, { equipmentId });
      return equipmentDetails;

    } catch (error) {
      DebugLogger.error('Error fetching equipment type details', error, { equipmentId, vendorId });
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
        INSERT INTO public.equipment_instance (
          equipment_id,
          serial_number,
          vendor_id,
          purchase_date,
          warranty_expiry,
          location,
          status,
          maintenance_interval_days
        ) VALUES (
          $1,                              -- equipment.id
          $2,                              -- serial_number
          $3,                              -- vendor.id
          $4::date,                        -- purchase_date
          $5::date,                        -- warranty_expiry
          $6,                              -- location
          'available',                     -- status (default)
          $7                               -- maintenance_interval_days
        )
        RETURNING 
          id,
          serial_number,
          status,
          expiry_date,                     -- auto-calculated by trigger
          next_maintenance_date,           -- auto-set
          compliance_status
      `;

      const queryParams = [
        data.equipment_id,                // $1
        data.serial_number,               // $2
        data.vendor_id,                   // $3
        data.purchase_date,               // $4
        data.warranty_expiry || null,     // $5
        data.location || null,            // $6
        data.maintenance_interval_days || 365  // $7
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

  /**
   * Generate equipment code based on type
   */
  static generateEquipmentCode(equipmentType: string, manufacturer: string): string {
    const typeMap: { [key: string]: string } = {
      'lighting': 'LGT',
      'extinguisher': 'EXT',
      'alarm': 'ALM',
      'sprinkler': 'SPR',
      'detector': 'DET',
      'door': 'DR',
      'hose': 'HSE',
      'panel': 'PNL',
      'other': 'OTH'
    };

    const typePrefix = typeMap[equipmentType.toLowerCase()] || 'EQP';
    const manufacturerPrefix = manufacturer.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
    
    return `${typePrefix}-${manufacturerPrefix}-${timestamp}`;
  }

  /**
   * Create new equipment type
   */
  static async createEquipmentType(data: CreateEquipmentTypeData) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Creating equipment type', { data }, 'EQUIPMENT_REPO');

    try {
      const query = `
        INSERT INTO public.equipment (
          vendor_id,
          equipment_code,
          equipment_name,
          description,
          equipment_type,
          manufacturer,
          model,
          specifications,
          weight_kg,
          dimensions,
          warranty_years,
          default_lifespan_years
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING 
          id,
          equipment_code,
          equipment_name,
          created_at;
      `;

      // Auto-generate equipment code if not provided
      const equipmentCode = data.equipment_code || this.generateEquipmentCode(data.equipment_type, data.manufacturer);

      const values = [
        data.vendor_id,
        equipmentCode,
        data.equipment_name,
        data.description || null,
        data.equipment_type,
        data.manufacturer,
        data.model,
        data.specifications ? JSON.stringify(data.specifications) : '{}',
        data.weight_kg || null,
        data.dimensions || null,
        data.warranty_years || null,
        data.default_lifespan_years || null
      ];

      DebugLogger.database('Create Equipment Type Query', query);
      const result = await pool.query(query, values);

      DebugLogger.performance('Equipment type creation', startTime);
      return result.rows[0];

    } catch (error) {
      DebugLogger.error('Error creating equipment type', error, { data });
      throw error;
    }
  }

  /**
   * Update equipment type details (restricted fields only)
   */
  static async updateEquipmentType(equipmentTypeId: number, vendorId: number, data: UpdateEquipmentTypeData) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Updating equipment type', { equipmentTypeId, vendorId, data }, 'EQUIPMENT_REPO');

    try {
      // Build dynamic update query based on provided fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.equipment_name !== undefined) {
        updateFields.push(`equipment_name = $${paramIndex++}`);
        values.push(data.equipment_name);
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }

      if (data.manufacturer !== undefined) {
        updateFields.push(`manufacturer = $${paramIndex++}`);
        values.push(data.manufacturer);
      }

      if (data.model !== undefined) {
        updateFields.push(`model = $${paramIndex++}`);
        values.push(data.model);
      }

      if (data.specifications !== undefined) {
        updateFields.push(`specifications = $${paramIndex++}`);
        values.push(data.specifications ? JSON.stringify(data.specifications) : '{}');
      }

      if (data.weight_kg !== undefined) {
        updateFields.push(`weight_kg = $${paramIndex++}`);
        values.push(data.weight_kg);
      }

      if (data.dimensions !== undefined) {
        updateFields.push(`dimensions = $${paramIndex++}`);
        values.push(data.dimensions);
      }

      if (data.warranty_years !== undefined) {
        updateFields.push(`warranty_years = $${paramIndex++}`);
        values.push(data.warranty_years);
      }

      if (data.default_lifespan_years !== undefined) {
        updateFields.push(`default_lifespan_years = $${paramIndex++}`);
        values.push(data.default_lifespan_years);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add WHERE clause parameters
      values.push(equipmentTypeId, vendorId);

      const query = `
        UPDATE equipment 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} 
          AND vendor_id = $${paramIndex++}
        RETURNING 
          id,
          equipment_code,
          equipment_name,
          description,
          equipment_type,
          manufacturer,
          model,
          specifications,
          weight_kg,
          dimensions,
          warranty_years,
          default_lifespan_years,
          updated_at;
      `;

      DebugLogger.database('Update Equipment Type Query', query);
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Equipment type not found or access denied');
      }

      DebugLogger.performance('Equipment type update', startTime);
      return result.rows[0];

    } catch (error) {
      DebugLogger.error('Error updating equipment type', error, { equipmentTypeId, vendorId, data });
      throw error;
    }
  }

  /**
   * Bulk assign multiple equipment instances to a client
   */
  static async bulkAssignEquipmentToClient(data: BulkAssignEquipmentData) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Bulk assigning equipment to client', { data }, 'EQUIPMENT_REPO');

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Generate assignment number
      const assignment_number = await this.generateAssignmentNumber();

      // Create equipment assignment
      const assignmentQuery = `
        INSERT INTO equipment_assignment (
          client_id, vendor_id, assignment_number, status, 
          start_date, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'active', 
          $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id
      `;

      const assignmentResult = await client.query(assignmentQuery, [
        data.client_id,
        data.vendor_id,
        assignment_number,
        data.assignment_date,
        data.notes || null
      ]);

      const assignmentId = assignmentResult.rows[0].id;

      // Create assignment items for each equipment instance
      const itemPromises = data.equipment_instances.map(async (instanceId) => {
        const itemQuery = `
          INSERT INTO assignment_item (
            assignment_id, equipment_instance_id, quantity
          ) VALUES ($1, $2, 1)
        `;
        
        return client.query(itemQuery, [assignmentId, instanceId]);
      });

      await Promise.all(itemPromises);

      // Update equipment instance statuses to 'assigned' and set assigned_to
      const updateInstancesQuery = `
        UPDATE equipment_instance 
        SET status = 'assigned', assigned_to = $1, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($2::int[])
      `;
      
      await client.query(updateInstancesQuery, [data.client_id, data.equipment_instances]);

      await client.query('COMMIT');

      DebugLogger.performance('Bulk equipment assignment', startTime);
      
      return {
        assignment_id: assignmentId,
        assignment_number,
        client_id: data.client_id,
        equipment_count: data.equipment_instances.length,
        assignment_date: data.assignment_date,
        status: 'active'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      DebugLogger.error('Error in bulk equipment assignment', error, { data });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove equipment assignment from client
   */
  static async removeEquipmentAssignment(equipmentInstanceId: number, vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Removing equipment assignment', { equipmentInstanceId, vendorId }, 'EQUIPMENT_REPO');

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // First, verify the equipment belongs to this vendor and is assigned
      const checkQuery = `
        SELECT ei.id, ei.assigned_to, ei.status, c.id as client_id
        FROM equipment_instance ei
        LEFT JOIN clients c ON ei.assigned_to = c.id
        WHERE ei.id = $1 AND ei.vendor_id = $2 AND ei.deleted_at IS NULL
      `;
      
      const checkResult = await client.query(checkQuery, [equipmentInstanceId, vendorId]);
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          message: 'Equipment instance not found or does not belong to your vendor account' 
        };
      }

      const equipment = checkResult.rows[0];
      
      if (equipment.status !== 'assigned' || !equipment.assigned_to) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          message: 'Equipment is not currently assigned to any client' 
        };
      }

      const clientId = equipment.client_id;

      // Remove from assignment_item table (if exists in formal assignments)
      const removeAssignmentItemQuery = `
        DELETE FROM assignment_item 
        WHERE equipment_instance_id = $1
      `;
      await client.query(removeAssignmentItemQuery, [equipmentInstanceId]);

      // Update equipment instance to remove assignment
      const updateEquipmentQuery = `
        UPDATE equipment_instance 
        SET 
          status = 'available',
          assigned_to = NULL,
          assigned_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await client.query(updateEquipmentQuery, [equipmentInstanceId]);

      // Check if there are any assignments with no items left and mark them as inactive
      const cleanupAssignmentsQuery = `
        UPDATE equipment_assignment 
        SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT ea.id 
          FROM equipment_assignment ea
          LEFT JOIN assignment_item ai ON ea.id = ai.assignment_id
          WHERE ea.status = 'active' AND ai.assignment_id IS NULL
        )
      `;
      await client.query(cleanupAssignmentsQuery);

      await client.query('COMMIT');

      DebugLogger.performance('Equipment assignment removal', startTime);
      
      return {
        success: true,
        clientId: clientId,
        message: 'Equipment assignment removed successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      DebugLogger.error('Error removing equipment assignment', error, { equipmentInstanceId, vendorId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get equipment instances with enhanced maintenance information including open tickets
   * This is specifically for equipment details page where we need comprehensive maintenance status
   */
  static async getEquipmentInstancesWithMaintenanceInfo(
    vendorId: number, 
    equipmentTypeId: number,
    pagination: PaginationQuery,
    filters: EquipmentFilters = {}
  ): Promise<any[]> {
    const startTime = Date.now();
    try {
      const offset = ((pagination.page || 1) - 1) * (pagination.limit || 25);
      
      let whereClause = `WHERE ei.vendor_id = $1 AND ei.equipment_id = $2 AND ei.deleted_at IS NULL`;
      const queryParams: any[] = [vendorId, equipmentTypeId];
      let paramCount = 2;

      // Add additional filters if needed
      if (filters.status) {
        paramCount++;
        whereClause += ` AND ei.status = $${paramCount}`;
        queryParams.push(filters.status);
      }

      if (filters.compliance_status) {
        paramCount++;
        whereClause += ` AND ei.compliance_status = $${paramCount}`;
        queryParams.push(filters.compliance_status);
      }

      if (filters.search) {
        paramCount++;
        whereClause += ` AND (ei.serial_number ILIKE $${paramCount} OR e.equipment_name ILIKE $${paramCount})`;
        queryParams.push(`%${filters.search}%`);
      }

      const query = `
        SELECT 
          ei.id,
          ei.serial_number,
          ei.status,
          ei.compliance_status,
          ei.location,
          ei.next_maintenance_date,
          ei.last_maintenance_date,
          ei.maintenance_interval_days,
          ei.expiry_date,
          ei.purchase_date,
          ei.warranty_expiry,
          ei.created_at,
          ei.updated_at,
          
          -- Equipment details
          e.equipment_name,
          e.equipment_type,
          e.manufacturer,
          e.model,
          
          -- Client information
          COALESCE(c.company_name, 'Unassigned') AS client_name,
          c.id as client_id,
          
          -- Maintenance status calculation
          CASE 
            WHEN ei.next_maintenance_date IS NULL THEN 'no_schedule'
            WHEN ei.next_maintenance_date < CURRENT_DATE THEN 'overdue'
            WHEN ei.next_maintenance_date - CURRENT_DATE <= 30 THEN 'due_soon'
            ELSE 'scheduled'
          END as maintenance_status,
          
          -- Days to/past maintenance
          CASE 
            WHEN ei.next_maintenance_date IS NULL THEN NULL
            WHEN ei.next_maintenance_date < CURRENT_DATE THEN (CURRENT_DATE - ei.next_maintenance_date)
            ELSE (ei.next_maintenance_date - CURRENT_DATE)
          END as days_to_maintenance,
          
          -- Open maintenance tickets information
          mt.id as open_ticket_id,
          mt.ticket_number as open_ticket_number,
          mt.ticket_status as open_ticket_status,
          mt.priority as open_ticket_priority,
          mt.created_at as open_ticket_created,
          mt.issue_description as open_ticket_description,
          
          -- Enhanced maintenance status considering tickets
          CASE 
            WHEN mt.id IS NOT NULL AND mt.ticket_status = 'open' THEN 'has_open_ticket'
            WHEN mt.id IS NOT NULL AND mt.ticket_status = 'resolved' THEN 'ticket_resolved'
            WHEN ei.next_maintenance_date IS NULL THEN 'no_schedule'
            WHEN ei.next_maintenance_date < CURRENT_DATE THEN 'overdue_no_ticket'
            WHEN ei.next_maintenance_date - CURRENT_DATE <= 30 THEN 'due_soon'
            ELSE 'scheduled'
          END as enhanced_maintenance_status
          
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        LEFT JOIN clients c ON ei.assigned_to = c.id
        LEFT JOIN maintenance_ticket mt ON ei.id = mt.equipment_instance_id 
          AND mt.ticket_status IN ('open', 'resolved') 
          AND mt.support_type = 'maintenance'
        ${whereClause}
        ORDER BY 
          -- Priority order: open tickets first, then overdue, then due soon
          CASE 
            WHEN mt.ticket_status = 'open' THEN 1
            WHEN ei.next_maintenance_date < CURRENT_DATE THEN 2
            WHEN ei.next_maintenance_date - CURRENT_DATE <= 30 THEN 3
            ELSE 4
          END,
          ei.next_maintenance_date ASC NULLS LAST,
          ei.serial_number
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(pagination.limit || 25, offset);

      DebugLogger.database('Equipment Instances with Maintenance Info Query', query);
      const result = await pool.query(query, queryParams);

      DebugLogger.performance('Equipment instances with maintenance info fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching equipment instances with maintenance info', error, { vendorId, equipmentTypeId, pagination, filters });
      throw error;
    }
  }
}
