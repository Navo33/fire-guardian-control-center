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
        (SELECT COUNT(*) FROM equipment_instance WHERE deleted_at IS NULL) as total_equipment,
        (SELECT COUNT(*) FROM equipment_instance WHERE assigned_to IS NOT NULL AND deleted_at IS NULL) as equipment_assigned,
        (SELECT COUNT(*) FROM equipment_instance WHERE status = 'maintenance' AND deleted_at IS NULL) as equipment_maintenance,
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
          (SELECT COUNT(*) FROM equipment_instance WHERE deleted_at IS NULL) as total_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE assigned_to IS NOT NULL AND deleted_at IS NULL) as equipment_assigned,
          (SELECT COUNT(*) FROM equipment_instance WHERE status = 'maintenance' AND deleted_at IS NULL) as equipment_maintenance,
          (SELECT COUNT(*) FROM notification 
           WHERE is_read = false 
             AND type = 'alert' 
             AND priority = 'high' 
             AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)) as critical_alerts,
          (SELECT COUNT(*) FROM equipment_instance WHERE next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' AND next_maintenance_date IS NOT NULL AND deleted_at IS NULL) as pending_inspections,
          (SELECT COUNT(*) FROM equipment_instance WHERE next_maintenance_date < CURRENT_DATE AND next_maintenance_date IS NOT NULL AND deleted_at IS NULL) as overdue_maintenances
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
   * Get critical alerts for admin dashboard
   */
  static async getCriticalAlerts(limit: number = 10) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting critical alerts', { limit }, 'DASHBOARD_REPO');

    try {
      const query = `
        SELECT 
          n.id, n.title, n.message, n.type, n.priority, n.category,
          n.created_at, n.action_url, n.metadata,
          u.display_name as user_name, u.email as user_email,
          -- Additional context based on category
          CASE 
            WHEN n.category = 'equipment' THEN (
              SELECT ei.serial_number 
              FROM equipment_instance ei 
              WHERE ei.id = (n.metadata->>'equipment_instance_id')::int
            )
            ELSE NULL
          END as equipment_serial
        FROM notification n
        LEFT JOIN "user" u ON n.user_id = u.id
        WHERE n.is_read = false 
          AND n.type = 'alert' 
          AND n.priority = 'high'
          AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        ORDER BY n.created_at DESC
        LIMIT $1
      `;

      DebugLogger.database('Critical Alerts Query', query, [limit]);
      const result = await pool.query(query, [limit]);

      DebugLogger.performance('Critical alerts fetch', startTime, { count: result.rows.length });
      return result.rows;

    } catch (error) {
      DebugLogger.error('Error fetching critical alerts', error, { limit });
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
        -- Active clients count (clients that have equipment assignments from this vendor)
        (SELECT COUNT(DISTINCT ea.client_id) FROM equipment_assignment ea 
         WHERE ea.vendor_id = $1 AND ea.status = 'active') as active_clients,
        
        -- Total equipment instances managed by this vendor
        (SELECT COUNT(*) FROM equipment_instance ei 
         WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL) as total_equipment_instances,
        
        -- Count of distinct equipment types managed by this vendor
        (SELECT COUNT(DISTINCT e.equipment_type) FROM equipment e
         JOIN equipment_instance ei ON ei.equipment_id = e.id
         WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL AND e.deleted_at IS NULL) as equipment_types,
        
        -- Open maintenance requests/tickets for this vendor
        (SELECT COUNT(*) FROM maintenance_ticket mt
         WHERE mt.vendor_id = $1 AND mt.ticket_status IN ('open', 'assigned', 'in_progress', 'pending_parts')) as open_requests,
        
        -- Urgent maintenance requests
        (SELECT COUNT(*) FROM maintenance_ticket mt
         WHERE mt.vendor_id = $1 AND mt.priority IN ('urgent', 'critical') 
         AND mt.ticket_status IN ('open', 'assigned', 'in_progress', 'pending_parts')) as urgent_requests,
        
        -- Equipment due for maintenance soon (within 7 days)
        (SELECT COUNT(*) FROM equipment_instance ei
         WHERE ei.vendor_id = $1 AND ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days'
         AND ei.next_maintenance_date IS NOT NULL AND ei.deleted_at IS NULL) as maintenance_due_soon,
        
        -- Overdue equipment (past maintenance date)
        (SELECT COUNT(*) FROM equipment_instance ei
         WHERE ei.vendor_id = $1 AND ei.next_maintenance_date < CURRENT_DATE
         AND ei.next_maintenance_date IS NOT NULL AND ei.deleted_at IS NULL) as overdue_maintenance,
         
        -- Unread notifications for the vendor user
        (SELECT COUNT(*) FROM notification n
         JOIN vendors v ON v.id = $1
         WHERE n.user_id = v.user_id AND n.is_read = false) as unread_notifications
    `;
    
    const result = await pool.query(query, [vendorId]);
    const stats = result.rows[0];

    return {
      activeClients: parseInt(stats.active_clients) || 0,
      totalEquipmentInstances: parseInt(stats.total_equipment_instances) || 0,
      equipmentTypes: parseInt(stats.equipment_types) || 0,
      openRequests: parseInt(stats.open_requests) || 0,
      urgentRequests: parseInt(stats.urgent_requests) || 0,
      maintenanceDueSoon: parseInt(stats.maintenance_due_soon) || 0,
      overdueMaintenance: parseInt(stats.overdue_maintenance) || 0,
      unreadNotifications: parseInt(stats.unread_notifications) || 0
    };
  }

  /**
   * Get vendor statistics
   */
  static async getVendorStats(vendorId: number, period: string = '30d') {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting vendor stats', { vendorId, period }, 'DASHBOARD_REPO');

    const days = this.parsePeriod(period);
    const dateFilter = `created_at >= CURRENT_DATE - INTERVAL '${days} days'`;

    try {
      // Get comprehensive vendor stats
      const statsQuery = `
        SELECT 
          -- Active clients
          (SELECT COUNT(DISTINCT ea.client_id) FROM equipment_assignment ea 
           WHERE ea.vendor_id = $1 AND ea.status = 'active') as active_clients,
          
          -- Total equipment instances
          (SELECT COUNT(*) FROM equipment_instance ei 
           WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL) as total_equipment_instances,
          
          -- Equipment assigned to clients
          (SELECT COUNT(*) FROM equipment_instance ei 
           WHERE ei.vendor_id = $1 AND ei.status = 'assigned' AND ei.deleted_at IS NULL) as equipment_assigned,
          
          -- Equipment in maintenance
          (SELECT COUNT(*) FROM equipment_instance ei 
           WHERE ei.vendor_id = $1 AND ei.status = 'maintenance' AND ei.deleted_at IS NULL) as equipment_maintenance,
          
          -- Open maintenance tickets
          (SELECT COUNT(*) FROM maintenance_ticket mt
           WHERE mt.vendor_id = $1 AND mt.ticket_status IN ('open', 'assigned', 'in_progress', 'pending_parts')) as open_tickets,
          
          -- Urgent tickets
          (SELECT COUNT(*) FROM maintenance_ticket mt
           WHERE mt.vendor_id = $1 AND mt.priority IN ('urgent', 'critical') 
           AND mt.ticket_status IN ('open', 'assigned', 'in_progress', 'pending_parts')) as urgent_tickets,
          
          -- Completed tickets in period
          (SELECT COUNT(*) FROM maintenance_ticket mt
           WHERE mt.vendor_id = $1 AND mt.ticket_status = 'completed' 
           AND mt.resolved_at >= CURRENT_DATE - INTERVAL '${days} days') as completed_tickets,
          
          -- Equipment due for maintenance
          (SELECT COUNT(*) FROM equipment_instance ei
           WHERE ei.vendor_id = $1 AND ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days'
           AND ei.next_maintenance_date IS NOT NULL AND ei.deleted_at IS NULL) as maintenance_due_soon,
           
          -- Revenue in period (if cost tracking is implemented)
          (SELECT COALESCE(SUM(ea.total_cost), 0) FROM equipment_assignment ea
           WHERE ea.vendor_id = $1 AND ea.assigned_at >= CURRENT_DATE - INTERVAL '${days} days') as period_revenue
      `;

      DebugLogger.database('Vendor Stats Query', statsQuery);
      const result = await pool.query(statsQuery, [vendorId]);
      const stats = result.rows[0];

      // Get assignment trend data
      const trendQuery = `
        SELECT 
          DATE(ea.assigned_at) as date,
          COUNT(*) as assignments,
          COALESCE(SUM(ea.total_cost), 0) as daily_revenue
        FROM equipment_assignment ea
        WHERE ea.vendor_id = $1 AND ea.assigned_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(ea.assigned_at)
        ORDER BY date DESC
      `;
      
      const trendResult = await pool.query(trendQuery, [vendorId]);

      const formattedStats = {
        activeClients: parseInt(stats.active_clients) || 0,
        totalEquipmentInstances: parseInt(stats.total_equipment_instances) || 0,
        equipmentAssigned: parseInt(stats.equipment_assigned) || 0,
        equipmentMaintenance: parseInt(stats.equipment_maintenance) || 0,
        openTickets: parseInt(stats.open_tickets) || 0,
        urgentTickets: parseInt(stats.urgent_tickets) || 0,
        completedTickets: parseInt(stats.completed_tickets) || 0,
        maintenanceDueSoon: parseInt(stats.maintenance_due_soon) || 0,
        periodRevenue: parseFloat(stats.period_revenue) || 0,
        assignmentTrend: trendResult.rows,
        period: { days, start: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
      };

      DebugLogger.performance('Vendor stats fetch', startTime, formattedStats);
      return formattedStats;

    } catch (error) {
      DebugLogger.error('Error fetching vendor stats', error, { vendorId, period });
      throw error;
    }
  }

  /**
   * Get vendor insights
   */
  static async getVendorInsights(vendorId: number) {
    const [clientActivity, equipmentStatus, maintenanceInsights, revenueInsights, equipmentTypes] = await Promise.all([
      // Most active clients (based on equipment assignments)
      pool.query(`
        SELECT 
          u.id, u.display_name, u.email,
          c.company_name,
          COUNT(ea.id) as assignment_count,
          MAX(ea.assigned_at) as last_assignment,
          COALESCE(SUM(ea.total_cost), 0) as total_revenue
        FROM "user" u
        JOIN clients c ON c.user_id = u.id
        JOIN equipment_assignment ea ON ea.client_id = c.id
        WHERE ea.vendor_id = $1 
          AND ea.assigned_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.display_name, u.email, c.company_name
        ORDER BY assignment_count DESC, total_revenue DESC
        LIMIT 5
      `, [vendorId]),

      // Equipment status distribution
      pool.query(`
        SELECT 
          ei.status,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = $1 AND deleted_at IS NULL)), 2) as percentage
        FROM equipment_instance ei
        WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL
        GROUP BY ei.status
        ORDER BY count DESC
      `, [vendorId]),

      // Maintenance insights
      pool.query(`
        SELECT 
          mt.priority,
          COUNT(*) as ticket_count,
          AVG(EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/3600) as avg_resolution_hours
        FROM maintenance_ticket mt
        WHERE mt.vendor_id = $1 
          AND mt.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY mt.priority
        ORDER BY 
          CASE mt.priority 
            WHEN 'critical' THEN 1 
            WHEN 'urgent' THEN 2 
            WHEN 'high' THEN 3 
            WHEN 'normal' THEN 4 
            WHEN 'low' THEN 5 
          END
      `, [vendorId]),

      // Revenue trends
      pool.query(`
        SELECT 
          DATE_TRUNC('week', ea.assigned_at) as week_start,
          COUNT(*) as assignments,
          COALESCE(SUM(ea.total_cost), 0) as weekly_revenue
        FROM equipment_assignment ea
        WHERE ea.vendor_id = $1 
          AND ea.assigned_at >= CURRENT_DATE - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', ea.assigned_at)
        ORDER BY week_start DESC
        LIMIT 8
      `, [vendorId]),

      // Equipment type performance
      pool.query(`
        SELECT 
          e.equipment_type,
          e.equipment_name,
          COUNT(ei.id) as total_instances,
          COUNT(CASE WHEN ei.status = 'assigned' THEN 1 END) as assigned_instances,
          ROUND((COUNT(CASE WHEN ei.status = 'assigned' THEN 1 END) * 100.0 / NULLIF(COUNT(ei.id), 0)), 2) as utilization_rate,
          AVG(CASE WHEN mt.resolved_at IS NOT NULL THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/3600 END) as avg_maintenance_hours
        FROM equipment e
        JOIN equipment_instance ei ON ei.equipment_id = e.id
        LEFT JOIN maintenance_ticket mt ON mt.equipment_instance_id = ei.id 
        WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL AND e.deleted_at IS NULL
        GROUP BY e.equipment_type, e.equipment_name, e.id
        ORDER BY utilization_rate DESC, total_instances DESC
        LIMIT 10
      `, [vendorId])
    ]);

    return {
      mostActiveClients: clientActivity.rows.map(row => ({
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        companyName: row.company_name,
        assignmentCount: parseInt(row.assignment_count),
        lastAssignment: row.last_assignment,
        totalRevenue: parseFloat(row.total_revenue)
      })),
      equipmentStatusDistribution: equipmentStatus.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage)
      })),
      maintenancePerformance: maintenanceInsights.rows.map(row => ({
        priority: row.priority,
        ticketCount: parseInt(row.ticket_count),
        avgResolutionHours: row.avg_resolution_hours ? parseFloat(row.avg_resolution_hours).toFixed(1) : null
      })),
      revenuetrends: revenueInsights.rows.map(row => ({
        weekStart: row.week_start,
        assignments: parseInt(row.assignments),
        weeklyRevenue: parseFloat(row.weekly_revenue)
      })),
      equipmentPerformance: equipmentTypes.rows.map(row => ({
        equipmentType: row.equipment_type,
        equipmentName: row.equipment_name,
        totalInstances: parseInt(row.total_instances),
        assignedInstances: parseInt(row.assigned_instances),
        utilizationRate: parseFloat(row.utilization_rate),
        avgMaintenanceHours: row.avg_maintenance_hours ? parseFloat(row.avg_maintenance_hours).toFixed(1) : null
      }))
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
   * Get vendor ID from user ID
   */
  static async getVendorIdFromUserId(userId: number): Promise<number | null> {
    try {
      const result = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [userId]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      DebugLogger.error('Error getting vendor ID from user ID', error, { userId });
      return null;
    }
  }

  /**
   * Get vendor dashboard KPIs according to specification
   */
  static async getVendorDashboardKPIs(vendorId: number) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting vendor dashboard KPIs', { vendorId }, 'DASHBOARD_REPO');

    try {
      // Main KPI query based on user specification
      const kpiQuery = `
        SELECT 
          v.company_name,
          u.display_name,
          u.avatar_url,
          (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = $1 AND deleted_at IS NULL) AS total_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = $1 AND compliance_status = 'compliant' AND deleted_at IS NULL) AS compliant_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = $1 AND compliance_status = 'expired' AND deleted_at IS NULL) AS expired_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = $1 AND compliance_status = 'overdue' AND deleted_at IS NULL) AS overdue_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = $1 AND compliance_status = 'due_soon' AND deleted_at IS NULL) AS due_soon_equipment,
          (SELECT COUNT(*) FROM clients WHERE created_by_vendor_id = $1 AND status = 'active') AS active_clients,
          (SELECT COUNT(*) FROM maintenance_ticket WHERE vendor_id = $1 AND ticket_status = 'open') AS open_tickets
        FROM vendors v
        JOIN "user" u ON v.user_id = u.id
        WHERE v.id = $1
      `;

      const result = await pool.query(kpiQuery, [vendorId]);
      
      if (result.rows.length === 0) {
        throw new Error('Vendor not found');
      }

      const data = result.rows[0];
      const formattedData = {
        vendorInfo: {
          companyName: data.company_name,
          displayName: data.display_name,
          avatarUrl: data.avatar_url
        },
        kpis: {
          totalEquipment: parseInt(data.total_equipment) || 0,
          compliantEquipment: parseInt(data.compliant_equipment) || 0,
          expiredEquipment: parseInt(data.expired_equipment) || 0,
          overdueEquipment: parseInt(data.overdue_equipment) || 0,
          dueSoonEquipment: parseInt(data.due_soon_equipment) || 0,
          activeClients: parseInt(data.active_clients) || 0,
          openTickets: parseInt(data.open_tickets) || 0
        }
      };

      DebugLogger.performance('Vendor dashboard KPIs fetch', startTime, formattedData);
      return formattedData;

    } catch (error) {
      DebugLogger.error('Error fetching vendor dashboard KPIs', error, { vendorId });
      throw error;
    }
  }

  /**
   * Get vendor recent activity with notifications according to specification
   */
  static async getVendorRecentActivityWithNotifications(vendorId: number, limit: number = 10) {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Getting vendor recent activity with notifications', { vendorId, limit }, 'DASHBOARD_REPO');

    try {
      // Activity query based on user specification
      const activityQuery = `
        SELECT 'Audit' AS type, al.action_type AS description, al.created_at AS timestamp
        FROM audit_log al
        WHERE al.vendor_id = $1
        UNION
        SELECT 'Notification' AS type, n.title AS description, n.created_at AS timestamp
        FROM notification n
        JOIN vendors v ON n.user_id = v.user_id
        WHERE v.id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await pool.query(activityQuery, [vendorId, limit]);
      
      const formattedActivities = result.rows.map(row => ({
        type: row.type,
        description: row.description,
        timestamp: row.timestamp,
        formattedTimestamp: new Date(row.timestamp).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).replace(',', ',')
      }));

      DebugLogger.performance('Vendor recent activity fetch', startTime, { count: formattedActivities.length });
      return formattedActivities;

    } catch (error) {
      DebugLogger.error('Error fetching vendor recent activity', error, { vendorId, limit });
      throw error;
    }
  }

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

  /**
   * Verify database data integrity for admin dashboard
   * This method helps ensure we're getting real data, not mock data
   */
  static async verifyDataIntegrity() {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Verifying database data integrity', {}, 'DASHBOARD_REPO');

    try {
      const verificationQuery = `
        SELECT 
          -- User counts by type
          (SELECT COUNT(*) FROM "user" WHERE user_type = 'admin' AND deleted_at IS NULL) as admin_count,
          (SELECT COUNT(*) FROM "user" WHERE user_type = 'vendor' AND deleted_at IS NULL) as vendor_count,
          (SELECT COUNT(*) FROM "user" WHERE user_type = 'client' AND deleted_at IS NULL) as client_count,
          
          -- Equipment verification
          (SELECT COUNT(*) FROM equipment_instance WHERE deleted_at IS NULL) as total_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE compliance_status = 'expired') as expired_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE compliance_status = 'overdue') as overdue_equipment,
          
          -- Notifications verification
          (SELECT COUNT(*) FROM notification WHERE type = 'alert') as total_alerts,
          (SELECT COUNT(*) FROM notification WHERE type = 'alert' AND priority = 'high') as critical_alerts,
          
          -- Company data verification
          (SELECT COUNT(DISTINCT v.company_name) FROM vendors v JOIN "user" u ON v.user_id = u.id WHERE u.deleted_at IS NULL) as unique_vendor_companies,
          (SELECT COUNT(DISTINCT c.company_name) FROM clients c JOIN "user" u ON c.user_id = u.id WHERE u.deleted_at IS NULL) as unique_client_companies,
          
          -- Sample company names to verify real data
          (SELECT STRING_AGG(v.company_name, ', ') FROM vendors v JOIN "user" u ON v.user_id = u.id WHERE u.deleted_at IS NULL LIMIT 3) as sample_vendor_names,
          (SELECT STRING_AGG(c.company_name, ', ') FROM clients c JOIN "user" u ON c.user_id = u.id WHERE u.deleted_at IS NULL LIMIT 3) as sample_client_names
      `;

      const result = await pool.query(verificationQuery);
      const verification = result.rows[0];

      const report = {
        users: {
          admins: parseInt(verification.admin_count) || 0,
          vendors: parseInt(verification.vendor_count) || 0,
          clients: parseInt(verification.client_count) || 0
        },
        equipment: {
          total: parseInt(verification.total_equipment) || 0,
          expired: parseInt(verification.expired_equipment) || 0,
          overdue: parseInt(verification.overdue_equipment) || 0
        },
        notifications: {
          totalAlerts: parseInt(verification.total_alerts) || 0,
          criticalAlerts: parseInt(verification.critical_alerts) || 0
        },
        companies: {
          vendorCount: parseInt(verification.unique_vendor_companies) || 0,
          clientCount: parseInt(verification.unique_client_companies) || 0,
          sampleVendors: verification.sample_vendor_names || 'None',
          sampleClients: verification.sample_client_names || 'None'
        },
        isRealData: (
          parseInt(verification.vendor_count) > 0 &&
          parseInt(verification.client_count) > 0 &&
          parseInt(verification.total_equipment) > 0 &&
          verification.sample_vendor_names && verification.sample_vendor_names.length > 0
        )
      };

      DebugLogger.log('Data integrity verification completed', report, 'DASHBOARD_REPO');
      DebugLogger.performance('Data integrity verification', startTime, report);
      
      return report;

    } catch (error) {
      DebugLogger.error('Error verifying data integrity', error, {});
      throw error;
    }
  }
}