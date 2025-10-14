import { pool } from '../config/database';
import { PaginationQuery } from '../types/api';
import { DebugLogger } from '../utils/DebugLogger';

/**
 * Dashboard Repository
 * Handles all dashboard-related database operations
 */
export class DashboardRepository {

  // ========== ADMIN DASHBOARD METHODS ==========

  /**
   * Get admin dashboard overview
   */
  static async getAdminOverview() {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM "user" WHERE user_type = 'vendor' AND deleted_at IS NULL) as total_vendors,
        (SELECT COUNT(*) FROM "user" WHERE user_type = 'client' AND deleted_at IS NULL) as total_clients,
        (SELECT COUNT(*) FROM equipment WHERE deleted_at IS NULL) as total_equipment,
        (SELECT COUNT(*) FROM equipment_instance WHERE status = 'assigned') as equipment_assigned,
        (SELECT COUNT(*) FROM equipment_instance WHERE status = 'maintenance') as equipment_maintenance,
        (SELECT COUNT(*) FROM notification WHERE is_read = false) as unread_notifications,
        (SELECT COUNT(*) FROM audit_log WHERE created_at >= CURRENT_DATE) as todays_activities
    `;
    
    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      totalVendors: parseInt(stats.total_vendors) || 0,
      totalClients: parseInt(stats.total_clients) || 0,
      totalEquipment: parseInt(stats.total_equipment) || 0,
      equipmentAssigned: parseInt(stats.equipment_assigned) || 0,
      equipmentMaintenance: parseInt(stats.equipment_maintenance) || 0,
      unreadNotifications: parseInt(stats.unread_notifications) || 0,
      todaysActivities: parseInt(stats.todays_activities) || 0
    };
  }

  /**
   * Get admin detailed statistics
   */
  static async getAdminStats(period: string = '30d', category?: string) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting admin stats', { period, category }, 'DASHBOARD_REPO');

    const days = this.parsePeriod(period);
    const dateFilter = `created_at >= CURRENT_DATE - INTERVAL '${days} days'`;

    try {
      // Get current stats that match frontend expectations
      const currentStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM "user" WHERE user_type = 'vendor' AND deleted_at IS NULL) as active_vendors,
          (SELECT COUNT(*) FROM "user" WHERE user_type = 'client' AND deleted_at IS NULL) as total_clients,
          (SELECT COUNT(*) FROM equipment WHERE deleted_at IS NULL) as total_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE status = 'assigned') as equipment_assigned,
          (SELECT COUNT(*) FROM equipment_instance WHERE status = 'maintenance') as equipment_maintenance,
          (SELECT COUNT(*) FROM notification WHERE is_read = false AND created_at >= CURRENT_DATE - INTERVAL '7 days') as critical_alerts,
          (SELECT COUNT(*) FROM equipment_instance WHERE due_date <= CURRENT_DATE + INTERVAL '7 days' AND due_date IS NOT NULL) as pending_inspections,
          (SELECT COUNT(*) FROM equipment_instance WHERE due_date < CURRENT_DATE AND due_date IS NOT NULL) as overdue_maintenances
      `;

      DebugLogger.database('Admin Stats Query', currentStatsQuery);
      const result = await pool.query(currentStatsQuery);
      const stats = result.rows[0];

      const formattedStats = {
        activeVendors: parseInt(stats.active_vendors) || 0,
        totalClients: parseInt(stats.total_clients) || 0,
        criticalAlerts: parseInt(stats.critical_alerts) || 0,
        totalEquipment: parseInt(stats.total_equipment) || 0,
        pendingInspections: parseInt(stats.pending_inspections) || 0,
        overdueMaintenances: parseInt(stats.overdue_maintenances) || 0,
        equipmentAssigned: parseInt(stats.equipment_assigned) || 0,
        equipmentMaintenance: parseInt(stats.equipment_maintenance) || 0
      };

      DebugLogger.performance('Admin stats fetch', startTime, formattedStats);
      return formattedStats;

    } catch (error) {
      DebugLogger.error('Error fetching admin stats', error, { period, category });
      throw error;
    }
  }

  /**
   * Get admin insights
   */
  static async getAdminInsights() {
    const queries = await Promise.all([
      // Most active vendors
      pool.query(`
        SELECT 
          u.id, u.display_name, u.email,
          COUNT(al.id) as activity_count
        FROM "user" u
        LEFT JOIN audit_log al ON al.changed_by = u.id
        WHERE u.user_type = 'vendor' AND u.deleted_at IS NULL
          AND al.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.display_name, u.email
        ORDER BY activity_count DESC
        LIMIT 5
      `),
      
      // Equipment utilization
      pool.query(`
        SELECT 
          e.equipment_name,
          COUNT(ei.id) as total_instances,
          COUNT(CASE WHEN ei.status = 'assigned' THEN 1 END) as assigned_count,
          ROUND(
            (COUNT(CASE WHEN ei.status = 'assigned' THEN 1 END) * 100.0 / NULLIF(COUNT(ei.id), 0)), 2
          ) as utilization_rate
        FROM equipment e
        LEFT JOIN equipment_instance ei ON ei.equipment_id = e.id
        WHERE e.deleted_at IS NULL AND (ei.deleted_at IS NULL OR ei.deleted_at IS NOT NULL)
        GROUP BY e.id, e.equipment_name
        ORDER BY utilization_rate DESC
        LIMIT 10
      `),

      // Recent trends
      pool.query(`
        SELECT 
          'users' as category,
          COUNT(*) as current_month,
          (SELECT COUNT(*) FROM "user" 
           WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' 
           AND created_at < CURRENT_DATE - INTERVAL '30 days'
           AND deleted_at IS NULL) as previous_month
        FROM "user" 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND deleted_at IS NULL
        
        UNION ALL
        
        SELECT 
          'equipment' as category,
          COUNT(*) as current_month,
          (SELECT COUNT(*) FROM equipment 
           WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' 
           AND created_at < CURRENT_DATE - INTERVAL '30 days'
           AND deleted_at IS NULL) as previous_month
        FROM equipment 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND deleted_at IS NULL
      `)
    ]);

    return {
      mostActiveVendors: queries[0].rows,
      equipmentUtilization: queries[1].rows,
      trends: queries[2].rows.map(row => ({
        category: row.category,
        currentMonth: parseInt(row.current_month),
        previousMonth: parseInt(row.previous_month),
        growth: row.previous_month > 0 
          ? ((row.current_month - row.previous_month) / row.previous_month * 100).toFixed(2)
          : 'N/A'
      }))
    };
  }

  // ========== VENDOR DASHBOARD METHODS ==========

  /**
   * Get vendor dashboard overview
   */
  static async getVendorOverview(vendorId: number) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM "user" u 
         JOIN equipment_assignment ea ON ea.client_id = u.id
         JOIN equipment_instance ei ON ei.assigned_to = u.id
         JOIN vendor_location vl ON vl.vendor_id = $1
         WHERE u.user_type = 'client' AND u.deleted_at IS NULL) as total_clients,
        
        (SELECT COUNT(*) FROM equipment_instance ei
         JOIN vendor_location vl ON vl.id = ei.vendor_location_id
         WHERE vl.vendor_id = $1 AND ei.deleted_at IS NULL) as total_equipment,
         
        (SELECT COUNT(*) FROM equipment_instance ei
         JOIN vendor_location vl ON vl.id = ei.vendor_location_id
         WHERE vl.vendor_id = $1 AND ei.status = 'assigned' AND ei.deleted_at IS NULL) as equipment_assigned,
         
        (SELECT COUNT(*) FROM notification n
         WHERE n.user_id = $1 AND n.is_read = false) as unread_notifications
    `;
    
    const result = await pool.query(query, [vendorId]);
    const stats = result.rows[0];

    return {
      totalClients: parseInt(stats.total_clients) || 0,
      totalEquipment: parseInt(stats.total_equipment) || 0,
      equipmentAssigned: parseInt(stats.equipment_assigned) || 0,
      unreadNotifications: parseInt(stats.unread_notifications) || 0
    };
  }

  /**
   * Get vendor statistics
   */
  static async getVendorStats(vendorId: number, period: string = '30d') {
    const days = this.parsePeriod(period);
    const dateFilter = `created_at >= CURRENT_DATE - INTERVAL '${days} days'`;

    // Equipment assignments over time
    const equipmentStats = await pool.query(`
      SELECT 
        DATE(ea.assigned_at) as date,
        COUNT(*) as assignments
      FROM equipment_assignment ea
      WHERE ea.assigned_by = $1 AND ${dateFilter.replace('created_at', 'ea.assigned_at')}
      GROUP BY DATE(ea.assigned_at)
      ORDER BY date DESC
    `, [vendorId]);

    return {
      equipmentAssignments: equipmentStats.rows,
      period: { days, start: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    };
  }

  /**
   * Get vendor insights
   */
  static async getVendorInsights(vendorId: number) {
    const [clientActivity, equipmentStatus] = await Promise.all([
      // Most active clients
      pool.query(`
        SELECT 
          u.id, u.display_name, u.email,
          COUNT(ea.id) as assignment_count,
          MAX(ea.assigned_at) as last_assignment
        FROM "user" u
        JOIN equipment_assignment ea ON ea.client_id = u.id
        WHERE ea.assigned_by = $1 
          AND ea.assigned_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.display_name, u.email
        ORDER BY assignment_count DESC
        LIMIT 5
      `, [vendorId]),

      // Equipment status distribution
      pool.query(`
        SELECT 
          ei.status,
          COUNT(*) as count
        FROM equipment_instance ei
        JOIN vendor_location vl ON vl.id = ei.vendor_location_id
        WHERE vl.vendor_id = $1 AND ei.deleted_at IS NULL
        GROUP BY ei.status
        ORDER BY count DESC
      `, [vendorId])
    ]);

    return {
      mostActiveClients: clientActivity.rows,
      equipmentStatusDistribution: equipmentStatus.rows
    };
  }

  // ========== CLIENT DASHBOARD METHODS ==========

  /**
   * Get client dashboard overview
   */
  static async getClientOverview(clientId: number) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM equipment_instance ei
         WHERE ei.assigned_to = $1 AND ei.deleted_at IS NULL) as assigned_equipment,
         
        (SELECT COUNT(*) FROM equipment_instance ei
         WHERE ei.assigned_to = $1 AND ei.status = 'maintenance' AND ei.deleted_at IS NULL) as equipment_maintenance,
         
        (SELECT COUNT(*) FROM notification n
         WHERE n.user_id = $1 AND n.is_read = false) as unread_notifications,
         
        (SELECT MAX(ei.due_date) FROM equipment_instance ei
         WHERE ei.assigned_to = $1 AND ei.due_date IS NOT NULL) as next_maintenance
    `;
    
    const result = await pool.query(query, [clientId]);
    const stats = result.rows[0];

    return {
      assignedEquipment: parseInt(stats.assigned_equipment) || 0,
      equipmentMaintenance: parseInt(stats.equipment_maintenance) || 0,
      unreadNotifications: parseInt(stats.unread_notifications) || 0,
      nextMaintenance: stats.next_maintenance
    };
  }

  /**
   * Get client statistics
   */
  static async getClientStats(clientId: number, period: string = '30d') {
    const days = this.parsePeriod(period);
    
    // Equipment history
    const equipmentHistory = await pool.query(`
      SELECT 
        DATE(assigned_at) as date,
        COUNT(*) as assignments
      FROM equipment_assignment ea
      WHERE ea.client_id = $1 
        AND ea.assigned_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(assigned_at)
      ORDER BY date DESC
    `, [clientId]);

    return {
      equipmentHistory: equipmentHistory.rows,
      period: { days, start: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    };
  }

  /**
   * Get client insights
   */
  static async getClientInsights(clientId: number) {
    const [equipmentStatus, maintenanceSchedule] = await Promise.all([
      // Equipment status
      pool.query(`
        SELECT 
          e.equipment_name,
          ei.serial_number,
          ei.status,
          ei.assigned_at,
          ei.due_date
        FROM equipment_instance ei
        JOIN equipment e ON e.id = ei.equipment_id
        WHERE ei.assigned_to = $1 AND ei.deleted_at IS NULL
        ORDER BY ei.assigned_at DESC
      `, [clientId]),

      // Upcoming maintenance
      pool.query(`
        SELECT 
          e.equipment_name,
          ei.serial_number,
          ei.due_date,
          CASE 
            WHEN ei.due_date <= CURRENT_DATE THEN 'overdue'
            WHEN ei.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
            ELSE 'scheduled'
          END as urgency
        FROM equipment_instance ei
        JOIN equipment e ON e.id = ei.equipment_id
        WHERE ei.assigned_to = $1 
          AND ei.due_date IS NOT NULL 
          AND ei.deleted_at IS NULL
        ORDER BY ei.due_date ASC
        LIMIT 10
      `, [clientId])
    ]);

    return {
      equipmentStatus: equipmentStatus.rows,
      upcomingMaintenance: maintenanceSchedule.rows
    };
  }

  // ========== SHARED METHODS ==========

  /**
   * Get recent vendors (admin only)
   */
  static async getRecentVendors(limit: number = 5) {
    const query = `
      SELECT 
        id, 
        first_name, 
        last_name, 
        display_name, 
        email, 
        created_at,
        last_login
      FROM "user" 
      WHERE user_type = 'vendor' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get recent activity for admin
   */
  static async getAdminRecentActivity(pagination: PaginationQuery) {
    const offset = ((pagination.page || 1) - 1) * (pagination.limit || 10);
    
    const query = `
      SELECT 
        al.id,
        al.table_name,
        al.action_type,
        al.created_at,
        u.display_name as user_name,
        al.metadata
      FROM audit_log al
      LEFT JOIN "user" u ON u.id = al.changed_by
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [pagination.limit, offset]);
    return result.rows;
  }

  static async getAdminActivityCount(): Promise<number> {
    const result = await pool.query('SELECT COUNT(*) FROM audit_log');
    return parseInt(result.rows[0].count);
  }

  /**
   * Get recent activity for vendor
   */
  static async getVendorRecentActivity(vendorId: number, pagination: PaginationQuery) {
    const offset = ((pagination.page || 1) - 1) * (pagination.limit || 10);
    
    const query = `
      SELECT 
        al.id,
        al.table_name,
        al.action_type,
        al.created_at,
        al.metadata
      FROM audit_log al
      WHERE al.changed_by = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [vendorId, pagination.limit, offset]);
    return result.rows;
  }

  static async getVendorActivityCount(vendorId: number): Promise<number> {
    const result = await pool.query('SELECT COUNT(*) FROM audit_log WHERE changed_by = $1', [vendorId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get recent activity for client
   */
  static async getClientRecentActivity(clientId: number, pagination: PaginationQuery) {
    const offset = ((pagination.page || 1) - 1) * (pagination.limit || 10);
    
    const query = `
      SELECT 
        ea.id,
        'equipment_assignment' as table_name,
        'ASSIGNED' as action_type,
        ea.assigned_at as created_at,
        e.equipment_name,
        ei.serial_number
      FROM equipment_assignment ea
      JOIN assignment_item ai ON ai.assignment_id = ea.id
      JOIN equipment_instance ei ON ei.id = ai.equipment_instance_id
      JOIN equipment e ON e.id = ei.equipment_id
      WHERE ea.client_id = $1
      ORDER BY ea.assigned_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [clientId, pagination.limit, offset]);
    return result.rows;
  }

  static async getClientActivityCount(clientId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM equipment_assignment WHERE client_id = $1', 
      [clientId]
    );
    return parseInt(result.rows[0].count);
  }

  // ========== CHART DATA METHODS ==========

  static async getAdminChartData(chartType: string, period: string, groupBy: string) {
    // Implementation for admin chart data
    return { chartType, period, groupBy, data: [] };
  }

  static async getVendorChartData(vendorId: number, chartType: string, period: string, groupBy: string) {
    // Implementation for vendor chart data
    return { chartType, period, groupBy, data: [] };
  }

  static async getClientChartData(clientId: number, chartType: string, period: string, groupBy: string) {
    // Implementation for client chart data
    return { chartType, period, groupBy, data: [] };
  }

  // ========== EXPORT METHODS ==========

  static async getAdminExportData(type: string) {
    // Implementation for admin export data
    return { type, data: [], exportedAt: new Date().toISOString() };
  }

  static async getVendorExportData(vendorId: number, type: string) {
    // Implementation for vendor export data
    return { type, data: [], exportedAt: new Date().toISOString() };
  }

  static async getClientExportData(clientId: number, type: string) {
    // Implementation for client export data
    return { type, data: [], exportedAt: new Date().toISOString() };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Parse period string to days
   */
  private static parsePeriod(period: string): number {
    const periodMap: { [key: string]: number } = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    return periodMap[period] || 30;
  }
}