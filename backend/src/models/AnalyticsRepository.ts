import { Pool } from 'pg';
import { pool } from '../config/database';

export interface SystemMetrics {
  totalVendors: number;
  totalClients: number;
  totalEquipment: number;
  totalAssignments: number;
  activeAssignments: number;
  pendingReturns: number;
  totalRevenue?: number;
  avgAssignmentDuration?: number;
  criticalAlerts?: number;
  warningAlerts?: number;
  infoAlerts?: number;
}

export interface VendorMetrics {
  vendorId: number;
  vendorName: string;
  companyName: string;
  totalEquipment: number;
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  totalClients: number;
  specializations: string[];
  revenue?: number;
  avgRating?: number;
}

export interface EquipmentMetrics {
  equipmentId: number;
  equipmentName: string;
  totalInstances: number;
  availableInstances: number;
  assignedInstances: number;
  maintenanceInstances: number;
  utilizationRate: number;
  totalAssignments: number;
}

export interface ClientMetrics {
  clientId: number;
  clientName: string;
  totalAssignments: number;
  activeAssignments: number;
  totalEquipment: number;
  lastAssignmentDate: Date | null;
  totalSpent?: number;
}

export interface TimeSeriesData {
  date: string;
  newVendors: number;
  newClients: number;
  newAssignments: number;
  completedAssignments: number;
  revenue?: number;
}

export interface AlertMetrics {
  alertId: number;
  alertType: string;
  alertLevel: 'critical' | 'warning' | 'info';
  message: string;
  count: number;
  lastOccurrence: Date;
  affectedEntities: number;
}

export interface AlertTrend {
  date: string;
  critical: number;
  warning: number;
  info: number;
  resolved: number;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  vendorIds?: number[];
  clientIds?: number[];
  equipmentTypes?: string[];
  specializations?: string[];
  status?: string[];
}

class AnalyticsRepository {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(filters?: AnalyticsFilters): Promise<SystemMetrics> {
    try {
      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramCount = 0;

      // Build date filters
      if (filters?.startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        params.push(filters.endDate);
      }

      const dateFilter = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';
      const assignmentDateFilter = whereConditions.length > 0 ? 
        `AND ${whereConditions.join(' AND ').replace(/created_at/g, 'assigned_at')}` : '';

      const query = `
        SELECT 
          (SELECT COUNT(*) FROM "user" WHERE user_type = 'vendor' AND deleted_at IS NULL) as total_vendors,
          (SELECT COUNT(*) FROM "user" WHERE user_type = 'client' AND deleted_at IS NULL) as total_clients,
          (SELECT COUNT(*) FROM equipment_instance WHERE deleted_at IS NULL) as total_equipment,
          (SELECT COUNT(*) FROM equipment_assignment WHERE 1=1 ${assignmentDateFilter}) as total_assignments,
          (SELECT COUNT(*) FROM equipment_assignment WHERE status = 'active' ${assignmentDateFilter}) as active_assignments,
          (SELECT COUNT(*) FROM maintenance_ticket WHERE ticket_status = 'open' ${dateFilter}) as pending_returns,
          (SELECT COUNT(*) FROM notification WHERE type = 'error' ${dateFilter}) as critical_alerts,
          (SELECT COUNT(*) FROM notification WHERE type = 'warning' ${dateFilter}) as warning_alerts,
          (SELECT COUNT(*) FROM notification WHERE type = 'info' ${dateFilter}) as info_alerts
      `;

      const result = await this.pool.query(query, params);
      const row = result.rows[0];

      return {
        totalVendors: parseInt(row.total_vendors) || 0,
        totalClients: parseInt(row.total_clients) || 0,
        totalEquipment: parseInt(row.total_equipment) || 0,
        totalAssignments: parseInt(row.total_assignments) || 0,
        activeAssignments: parseInt(row.active_assignments) || 0,
        pendingReturns: parseInt(row.pending_returns) || 0,
        criticalAlerts: parseInt(row.critical_alerts) || 0,
        warningAlerts: parseInt(row.warning_alerts) || 0,
        infoAlerts: parseInt(row.info_alerts) || 0,
      };
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      throw error;
    }
  }

  /**
   * Get alert metrics and trends
   */
  async getAlertMetrics(filters?: AnalyticsFilters): Promise<AlertMetrics[]> {
    try {
      let whereConditions: string[] = ['1=1'];
      let params: any[] = [];
      let paramCount = 0;

      if (filters?.startDate) {
        paramCount++;
        whereConditions.push(`created_at >= $${paramCount}`);
        params.push(filters.startDate);
      }
      if (filters?.endDate) {
        paramCount++;
        whereConditions.push(`created_at <= $${paramCount}`);
        params.push(filters.endDate);
      }

      const query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as alert_id,
          type as alert_type,
          CASE 
            WHEN type = 'error' THEN 'critical'
            WHEN type = 'warning' THEN 'warning'
            ELSE 'info'
          END as alert_level,
          title as message,
          COUNT(*) as count,
          MAX(created_at) as last_occurrence,
          COUNT(DISTINCT user_id) as affected_entities
        FROM notification 
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY type, title
        ORDER BY count DESC, last_occurrence DESC
        LIMIT 10
      `;

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        alertId: row.alert_id,
        alertType: row.alert_type,
        alertLevel: row.alert_level,
        message: row.message,
        count: parseInt(row.count),
        lastOccurrence: row.last_occurrence,
        affectedEntities: parseInt(row.affected_entities),
      }));
    } catch (error) {
      console.error('Error fetching alert metrics:', error);
      throw error;
    }
  }

  /**
   * Get alert trends over time
   */
  async getAlertTrends(filters?: AnalyticsFilters): Promise<AlertTrend[]> {
    try {
      const params: any[] = [];
      let dateRange = "DATE_TRUNC('day', CURRENT_DATE - INTERVAL '30 days') + (generate_series(0, 29) * INTERVAL '1 day')";
      
      if (filters?.startDate && filters?.endDate) {
        dateRange = `generate_series('${filters.startDate}'::date, '${filters.endDate}'::date, '1 day'::interval)`;
      }

      const query = `
        WITH date_range AS (
          SELECT ${dateRange} as date
        ),
        alert_stats AS (
          SELECT 
            DATE(created_at) as date,
            type,
            COUNT(*) as count
          FROM notification 
          GROUP BY DATE(created_at), type
        )
        SELECT 
          dr.date::date as date,
          COALESCE(SUM(CASE WHEN as_alert.type = 'error' THEN as_alert.count END), 0) as critical,
          COALESCE(SUM(CASE WHEN as_alert.type = 'warning' THEN as_alert.count END), 0) as warning,
          COALESCE(SUM(CASE WHEN as_alert.type = 'info' THEN as_alert.count END), 0) as info,
          COALESCE(SUM(CASE WHEN as_alert.type = 'success' THEN as_alert.count END), 0) as resolved
        FROM date_range dr
        LEFT JOIN alert_stats as_alert ON DATE(dr.date) = as_alert.date
        GROUP BY dr.date
        ORDER BY dr.date
      `;

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        critical: parseInt(row.critical) || 0,
        warning: parseInt(row.warning) || 0,
        info: parseInt(row.info) || 0,
        resolved: parseInt(row.resolved) || 0,
      }));
    } catch (error) {
      console.error('Error fetching alert trends:', error);
      throw error;
    }
  }

  /**
   * Get vendor performance metrics
   */
  async getVendorMetrics(filters?: AnalyticsFilters): Promise<VendorMetrics[]> {
    try {
      const whereClause = this.buildWhereClause(filters);
      let whereConditions = ['u.user_type = \'vendor\'', 'u.deleted_at IS NULL'];
      const params: any[] = [];

      if (filters?.vendorIds?.length) {
        whereConditions.push(`u.id = ANY($${params.length + 1})`);
        params.push(filters.vendorIds);
      }

      if (filters?.startDate) {
        whereConditions.push(`ea.assigned_at >= $${params.length + 1}`);
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        whereConditions.push(`ea.assigned_at <= $${params.length + 1}`);
        params.push(filters.endDate);
      }

      const query = `
        SELECT 
          u.id as vendor_id,
          u.first_name || ' ' || u.last_name as vendor_name,
          COALESCE(v.company_name, 'Unknown Company') as company_name,
          COUNT(DISTINCT ei.id) as total_equipment,
          COUNT(DISTINCT ea.id) as total_assignments,
          COUNT(DISTINCT CASE WHEN ea.status = 'active' THEN ea.id END) as active_assignments,
          COUNT(DISTINCT CASE WHEN ea.status = 'completed' THEN ea.id END) as completed_assignments,
          COUNT(DISTINCT ea.client_id) as total_clients,
          ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as specializations
        FROM "user" u
        INNER JOIN vendors v ON v.user_id = u.id
        LEFT JOIN vendor_specialization vs ON v.id = vs.vendor_id
        LEFT JOIN specialization s ON vs.specialization_id = s.id
        LEFT JOIN equipment_instance ei ON ei.vendor_id = v.id
        LEFT JOIN assignment_item ai ON ei.id = ai.equipment_instance_id
        LEFT JOIN equipment_assignment ea ON ai.assignment_id = ea.id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY u.id, u.first_name, u.last_name, v.company_name
        ORDER BY total_assignments DESC, total_equipment DESC
      `;

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        companyName: row.company_name,
        totalEquipment: parseInt(row.total_equipment) || 0,
        totalAssignments: parseInt(row.total_assignments) || 0,
        activeAssignments: parseInt(row.active_assignments) || 0,
        completedAssignments: parseInt(row.completed_assignments) || 0,
        totalClients: parseInt(row.total_clients) || 0,
        specializations: row.specializations || [],
      }));
    } catch (error) {
      console.error('Error fetching vendor metrics:', error);
      throw error;
    }
  }

  /**
   * Get equipment utilization metrics
   */
  async getEquipmentMetrics(filters?: AnalyticsFilters): Promise<EquipmentMetrics[]> {
    try {
      let whereConditions = ['e.deleted_at IS NULL'];
      const params: any[] = [];

      if (filters?.equipmentTypes?.length) {
        whereConditions.push(`e.equipment_name = ANY($${params.length + 1})`);
        params.push(filters.equipmentTypes);
      }

      const query = `
        SELECT 
          e.id as equipment_id,
          e.equipment_name,
          COUNT(DISTINCT ei.id) as total_instances,
          COUNT(DISTINCT CASE WHEN ei.status = 'available' THEN ei.id END) as available_instances,
          COUNT(DISTINCT CASE WHEN ei.status = 'assigned' THEN ei.id END) as assigned_instances,
          COUNT(DISTINCT CASE WHEN ei.status = 'maintenance' THEN ei.id END) as maintenance_instances,
          COUNT(DISTINCT ai.assignment_id) as total_assignments,
          CASE 
            WHEN COUNT(DISTINCT ei.id) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN ei.status = 'assigned' THEN ei.id END)::numeric / COUNT(DISTINCT ei.id)::numeric) * 100, 2)
            ELSE 0 
          END as utilization_rate
        FROM equipment e
        LEFT JOIN equipment_instance ei ON e.id = ei.equipment_id
        LEFT JOIN assignment_item ai ON ei.id = ai.equipment_instance_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY e.id, e.equipment_name
        ORDER BY utilization_rate DESC, total_assignments DESC
      `;

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        equipmentId: row.equipment_id,
        equipmentName: row.equipment_name,
        totalInstances: parseInt(row.total_instances) || 0,
        availableInstances: parseInt(row.available_instances) || 0,
        assignedInstances: parseInt(row.assigned_instances) || 0,
        maintenanceInstances: parseInt(row.maintenance_instances) || 0,
        utilizationRate: parseFloat(row.utilization_rate) || 0,
        totalAssignments: parseInt(row.total_assignments) || 0,
      }));
    } catch (error) {
      console.error('Error fetching equipment metrics:', error);
      throw error;
    }
  }

  /**
   * Get client activity metrics
   */
  async getClientMetrics(filters?: AnalyticsFilters): Promise<ClientMetrics[]> {
    try {
      let whereConditions = ['u.user_type = \'client\'', 'u.deleted_at IS NULL'];
      const params: any[] = [];

      if (filters?.clientIds?.length) {
        whereConditions.push(`u.id = ANY($${params.length + 1})`);
        params.push(filters.clientIds);
      }

      const query = `
        SELECT 
          u.id as client_id,
          u.first_name || ' ' || u.last_name as client_name,
          COUNT(DISTINCT ea.id) as total_assignments,
          COUNT(DISTINCT CASE WHEN ea.status = 'active' THEN ea.id END) as active_assignments,
          COUNT(DISTINCT ai.equipment_instance_id) as total_equipment,
          MAX(ea.assigned_at) as last_assignment_date
        FROM "user" u
        LEFT JOIN equipment_assignment ea ON u.id = ea.client_id
        LEFT JOIN assignment_item ai ON ea.id = ai.assignment_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY total_assignments DESC, last_assignment_date DESC
      `;

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        clientId: row.client_id,
        clientName: row.client_name,
        totalAssignments: parseInt(row.total_assignments) || 0,
        activeAssignments: parseInt(row.active_assignments) || 0,
        totalEquipment: parseInt(row.total_equipment) || 0,
        lastAssignmentDate: row.last_assignment_date,
      }));
    } catch (error) {
      console.error('Error fetching client metrics:', error);
      throw error;
    }
  }

  /**
   * Get time series data for trends
   */
  async getTimeSeriesData(filters?: AnalyticsFilters): Promise<TimeSeriesData[]> {
    try {
      const params: any[] = [];
      let dateRange = "DATE_TRUNC('day', CURRENT_DATE - INTERVAL '30 days') + (generate_series(0, 29) * INTERVAL '1 day')";
      
      if (filters?.startDate && filters?.endDate) {
        dateRange = `generate_series('${filters.startDate}'::date, '${filters.endDate}'::date, '1 day'::interval)`;
      }

      const query = `
        WITH date_range AS (
          SELECT ${dateRange} as date
        ),
        vendor_stats AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_vendors
          FROM "user" 
          WHERE user_type = 'vendor' AND deleted_at IS NULL
          GROUP BY DATE(created_at)
        ),
        client_stats AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_clients
          FROM "user" 
          WHERE user_type = 'client' AND deleted_at IS NULL
          GROUP BY DATE(created_at)
        ),
        assignment_stats AS (
          SELECT 
            DATE(assigned_at) as date,
            COUNT(*) as new_assignments
          FROM equipment_assignment
          GROUP BY DATE(assigned_at)
        ),
        completion_stats AS (
          SELECT 
            DATE(assigned_at) as date,
            COUNT(*) as completed_assignments
          FROM equipment_assignment
          WHERE status = 'completed'
          GROUP BY DATE(assigned_at)
        )
        SELECT 
          dr.date::date as date,
          COALESCE(vs.new_vendors, 0) as new_vendors,
          COALESCE(cs.new_clients, 0) as new_clients,
          COALESCE(asa.new_assignments, 0) as new_assignments,
          COALESCE(csa.completed_assignments, 0) as completed_assignments
        FROM date_range dr
        LEFT JOIN vendor_stats vs ON DATE(dr.date) = vs.date
        LEFT JOIN client_stats cs ON DATE(dr.date) = cs.date
        LEFT JOIN assignment_stats asa ON DATE(dr.date) = asa.date
        LEFT JOIN completion_stats csa ON DATE(dr.date) = csa.date
        ORDER BY dr.date
      `;

      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        newVendors: parseInt(row.new_vendors) || 0,
        newClients: parseInt(row.new_clients) || 0,
        newAssignments: parseInt(row.new_assignments) || 0,
        completedAssignments: parseInt(row.completed_assignments) || 0,
      }));
    } catch (error) {
      console.error('Error fetching time series data:', error);
      throw error;
    }
  }

  /**
   * Get company list for filtering
   */
  async getCompanies(): Promise<Array<{id: number, name: string, vendorCount: number}>> {
    try {
      const query = `
        SELECT 
          v.id,
          v.company_name as name,
          COUNT(DISTINCT v.user_id) as vendor_count
        FROM vendors v
        INNER JOIN "user" u ON v.user_id = u.id
        WHERE u.deleted_at IS NULL
        GROUP BY v.id, v.company_name
        ORDER BY v.company_name
      `;

      const result = await this.pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        vendorCount: parseInt(row.vendor_count) || 0,
      }));
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  }

  /**
   * Helper method to build WHERE clauses based on filters
   */
  private buildWhereClause(filters?: AnalyticsFilters) {
    const clauses: any = {};

    if (filters?.startDate || filters?.endDate) {
      let dateClauses = [];
      if (filters.startDate) dateClauses.push('created_at >= $1');
      if (filters.endDate) dateClauses.push('created_at <= $2');
      
      clauses.vendor = dateClauses.join(' AND ');
      clauses.client = dateClauses.join(' AND ');
      clauses.assignment = dateClauses.join(' AND ').replace(/created_at/g, 'assigned_at');
      clauses.equipment = dateClauses.join(' AND ');
      clauses.maintenance = dateClauses.join(' AND ').replace(/created_at/g, 'created_at');
    }

    return clauses;
  }
}

export default AnalyticsRepository;