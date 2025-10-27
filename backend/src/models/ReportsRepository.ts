import { Pool } from 'pg';
import { pool } from '../config/database';

// Types for Reports
export interface ReportKPIs {
  total_equipment: number;
  compliance_rate: number;
  tickets_resolved: number;
  total_clients: number;
  maintenance_overdue: number;
  revenue_this_month: number;
}

export interface ComplianceChartData {
  compliant: number;
  expired: number;
  overdue: number;
  due_soon: number;
}

export interface TicketChartData {
  open: number;
  resolved: number;
  closed: number;
}

export interface ClientPerformanceData {
  client_id: number;
  client_name: string;
  total_equipment: number;
  compliant_equipment: number;
  compliance_percentage: number;
  last_service_date: string | null;
  pending_tickets: number;
}

export interface EquipmentAnalytics {
  equipment_type: string;
  total_count: number;
  compliant_count: number;
  expired_count: number;
  overdue_count: number;
  due_soon_count: number;
  avg_age_years: number;
}

export interface MaintenanceAnalytics {
  month: string;
  tickets_created: number;
  tickets_resolved: number;
  avg_resolution_time_hours: number;
  total_cost: number;
}

export interface RevenueAnalytics {
  month: string;
  equipment_revenue: number;
  maintenance_revenue: number;
  total_revenue: number;
}

export interface DropdownOption {
  id: number;
  name: string;
}

export class ReportsRepository {

  /**
   * Get KPI data for vendor dashboard
   */
  async getKPIData(vendorId: number): Promise<ReportKPIs> {
    const query = `
      SELECT 
        -- Total Equipment
        (SELECT COUNT(*) 
         FROM equipment_instance ei 
         WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL) AS total_equipment,
        
        -- Compliance Rate
        COALESCE(
          ROUND(
            ((SELECT COUNT(*)::float 
             FROM equipment_instance ei 
             WHERE ei.vendor_id = $1 AND ei.compliance_status = 'compliant' AND ei.deleted_at IS NULL) / 
            NULLIF(
              (SELECT COUNT(*) 
               FROM equipment_instance ei 
               WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL), 0
            ) * 100)::numeric, 2
          ), 0
        ) AS compliance_rate,
        
        -- Tickets Resolved (Last 30 days)
        (SELECT COUNT(*) 
         FROM maintenance_ticket mt 
         WHERE mt.vendor_id = $1 
         AND mt.ticket_status = 'resolved' 
         AND mt.resolved_at >= CURRENT_DATE - INTERVAL '30 days') AS tickets_resolved,
        
        -- Total Clients
        (SELECT COUNT(*) 
         FROM clients c 
         WHERE c.created_by_vendor_id = $1 
         AND c.status = 'active') AS total_clients,
        
        -- Maintenance Overdue
        (SELECT COUNT(*) 
         FROM equipment_instance ei 
         WHERE ei.vendor_id = $1 
         AND ei.compliance_status IN ('overdue', 'expired') 
         AND ei.deleted_at IS NULL) AS maintenance_overdue,
        
        -- Revenue This Month (from assignment costs)
        COALESCE(
          (SELECT SUM(ea.total_cost) 
           FROM equipment_assignment ea 
           WHERE ea.vendor_id = $1 
           AND EXTRACT(MONTH FROM ea.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM ea.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)), 0
        ) AS revenue_this_month
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows[0];
  }

  /**
   * Get compliance chart data
   */
  async getComplianceChartData(vendorId: number): Promise<ComplianceChartData> {
    const query = `
      SELECT 
        SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) AS compliant,
        SUM(CASE WHEN compliance_status = 'expired' THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN compliance_status = 'overdue' THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN compliance_status = 'due_soon' THEN 1 ELSE 0 END) AS due_soon
      FROM equipment_instance
      WHERE vendor_id = $1 AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows[0];
  }

  /**
   * Get ticket resolution chart data
   */
  async getTicketChartData(vendorId: number): Promise<TicketChartData> {
    const query = `
      SELECT 
        SUM(CASE WHEN ticket_status = 'open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN ticket_status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN ticket_status = 'closed' THEN 1 ELSE 0 END) AS closed
      FROM maintenance_ticket
      WHERE vendor_id = $1
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows[0];
  }

  /**
   * Get client performance analytics
   */
  async getClientPerformance(vendorId: number): Promise<ClientPerformanceData[]> {
    const query = `
      SELECT 
        c.id AS client_id,
        c.company_name AS client_name,
        COUNT(ei.id) AS total_equipment,
        SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END) AS compliant_equipment,
        CASE 
          WHEN COUNT(ei.id) > 0 THEN 
            ROUND((SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END)::float / COUNT(ei.id) * 100)::numeric, 2)
          ELSE 0 
        END AS compliance_percentage,
        MAX(mt.resolved_at)::date AS last_service_date,
        SUM(CASE WHEN mt.ticket_status = 'open' THEN 1 ELSE 0 END) AS pending_tickets
      FROM clients c
      LEFT JOIN equipment_instance ei ON c.id = ei.assigned_to AND ei.deleted_at IS NULL
      LEFT JOIN maintenance_ticket mt ON c.id = mt.client_id
      WHERE c.created_by_vendor_id = $1 AND c.status = 'active'
      GROUP BY c.id, c.company_name
      ORDER BY compliance_percentage ASC, total_equipment DESC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get equipment analytics by type
   */
  async getEquipmentAnalytics(vendorId: number): Promise<EquipmentAnalytics[]> {
    const query = `
      SELECT 
        e.equipment_type,
        COUNT(ei.id) AS total_count,
        SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END) AS compliant_count,
        SUM(CASE WHEN ei.compliance_status = 'expired' THEN 1 ELSE 0 END) AS expired_count,
        SUM(CASE WHEN ei.compliance_status = 'overdue' THEN 1 ELSE 0 END) AS overdue_count,
        SUM(CASE WHEN ei.compliance_status = 'due_soon' THEN 1 ELSE 0 END) AS due_soon_count,
        COALESCE(
          ROUND(
            AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, ei.purchase_date)))::numeric, 1
          ), 0
        ) AS avg_age_years
      FROM equipment_instance ei
      JOIN equipment e ON ei.equipment_id = e.id
      WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL
      GROUP BY e.equipment_type
      ORDER BY total_count DESC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get maintenance analytics over time (last 12 months)
   */
  async getMaintenanceAnalytics(vendorId: number): Promise<MaintenanceAnalytics[]> {
    const query = `
      WITH months AS (
        SELECT 
          TO_CHAR(generate_series(
            CURRENT_DATE - INTERVAL '11 months',
            CURRENT_DATE,
            INTERVAL '1 month'
          ), 'YYYY-MM') AS month
      )
      SELECT 
        m.month,
        COALESCE(t.tickets_created, 0) AS tickets_created,
        COALESCE(t.tickets_resolved, 0) AS tickets_resolved,
        COALESCE(t.avg_resolution_time_hours, 0) AS avg_resolution_time_hours,
        COALESCE(t.total_cost, 0) AS total_cost
      FROM months m
      LEFT JOIN (
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') AS month,
          COUNT(*) AS tickets_created,
          SUM(CASE WHEN ticket_status = 'resolved' THEN 1 ELSE 0 END) AS tickets_resolved,
          COALESCE(
            AVG(
              CASE 
                WHEN resolved_at IS NOT NULL THEN 
                  EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0
                ELSE NULL 
              END
            )::numeric, 0
          ) AS avg_resolution_time_hours,
          COALESCE(SUM(cost), 0) AS total_cost
        FROM maintenance_ticket
        WHERE vendor_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '11 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ) t ON m.month = t.month
      ORDER BY m.month
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get revenue analytics over time (last 12 months)
   */
  async getRevenueAnalytics(vendorId: number): Promise<RevenueAnalytics[]> {
    const query = `
      WITH months AS (
        SELECT 
          TO_CHAR(generate_series(
            CURRENT_DATE - INTERVAL '11 months',
            CURRENT_DATE,
            INTERVAL '1 month'
          ), 'YYYY-MM') AS month
      )
      SELECT 
        m.month,
        COALESCE(r.equipment_revenue, 0) AS equipment_revenue,
        COALESCE(r.maintenance_revenue, 0) AS maintenance_revenue,
        COALESCE(r.equipment_revenue, 0) + COALESCE(r.maintenance_revenue, 0) AS total_revenue
      FROM months m
      LEFT JOIN (
        SELECT 
          month,
          SUM(equipment_revenue) AS equipment_revenue,
          SUM(maintenance_revenue) AS maintenance_revenue
        FROM (
          -- Equipment assignment revenue
          SELECT 
            TO_CHAR(created_at, 'YYYY-MM') AS month,
            SUM(total_cost) AS equipment_revenue,
            0 AS maintenance_revenue
          FROM equipment_assignment
          WHERE vendor_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '11 months'
          GROUP BY TO_CHAR(created_at, 'YYYY-MM')
          
          UNION ALL
          
          -- Maintenance ticket revenue
          SELECT 
            TO_CHAR(resolved_at, 'YYYY-MM') AS month,
            0 AS equipment_revenue,
            SUM(cost) AS maintenance_revenue
          FROM maintenance_ticket
          WHERE vendor_id = $1
          AND resolved_at IS NOT NULL
          AND resolved_at >= CURRENT_DATE - INTERVAL '11 months'
          GROUP BY TO_CHAR(resolved_at, 'YYYY-MM')
        ) combined
        GROUP BY month
      ) r ON m.month = r.month
      ORDER BY m.month
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get upcoming maintenance tasks
   */
  async getUpcomingMaintenance(vendorId: number, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        ei.id,
        ei.serial_number,
        e.equipment_name,
        ei.next_maintenance_date,
        c.company_name AS client_name,
        ei.compliance_status,
        EXTRACT(DAYS FROM (ei.next_maintenance_date - CURRENT_DATE)) AS days_until_due
      FROM equipment_instance ei
      JOIN equipment e ON ei.equipment_id = e.id
      LEFT JOIN clients c ON ei.assigned_to = c.id
      WHERE ei.vendor_id = $1
      AND ei.deleted_at IS NULL
      AND ei.next_maintenance_date >= CURRENT_DATE
      ORDER BY ei.next_maintenance_date ASC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [vendorId, limit]);
    return result.rows;
  }

  /**
   * Get clients for dropdown
   */
  async getClientsForDropdown(vendorId: number): Promise<DropdownOption[]> {
    const query = `
      SELECT id, company_name AS name
      FROM clients
      WHERE created_by_vendor_id = $1 AND status = 'active'
      ORDER BY company_name
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get equipment types for dropdown
   */
  async getEquipmentTypesForDropdown(vendorId: number): Promise<DropdownOption[]> {
    const query = `
      SELECT DISTINCT e.equipment_type AS name, ROW_NUMBER() OVER (ORDER BY e.equipment_type) AS id
      FROM equipment e
      JOIN equipment_instance ei ON e.id = ei.equipment_id
      WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL
      ORDER BY e.equipment_type
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Generate comprehensive equipment compliance report
   */
  async generateEquipmentComplianceReport(
    vendorId: number, 
    startDate: string, 
    endDate: string,
    clientId?: number,
    equipmentType?: string
  ): Promise<any> {
    let clientFilter = '';
    let equipmentTypeFilter = '';
    const params = [vendorId, startDate, endDate];
    let paramCount = 3;

    if (clientId) {
      paramCount++;
      clientFilter = `AND ei.assigned_to = $${paramCount}`;
      params.push(clientId);
    }

    if (equipmentType) {
      paramCount++;
      equipmentTypeFilter = `AND e.equipment_type = $${paramCount}`;
      params.push(equipmentType);
    }

    const query = `
      SELECT 
        jsonb_build_object(
          'summary', jsonb_build_object(
            'total_equipment', COUNT(*),
            'compliant', SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END),
            'expired', SUM(CASE WHEN ei.compliance_status = 'expired' THEN 1 ELSE 0 END),
            'overdue', SUM(CASE WHEN ei.compliance_status = 'overdue' THEN 1 ELSE 0 END),
            'due_soon', SUM(CASE WHEN ei.compliance_status = 'due_soon' THEN 1 ELSE 0 END),
            'compliance_rate', CASE 
              WHEN COUNT(*) > 0 THEN 
                ROUND((SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric, 2)
              ELSE 0 
            END
          ),
          'details', jsonb_agg(
            jsonb_build_object(
              'id', ei.id,
              'serial_number', ei.serial_number,
              'equipment_name', e.equipment_name,
              'equipment_type', e.equipment_type,
              'client_name', COALESCE(c.company_name, 'Unassigned'),
              'compliance_status', ei.compliance_status,
              'next_maintenance_date', ei.next_maintenance_date,
              'expiry_date', ei.expiry_date,
              'purchase_date', ei.purchase_date,
              'condition_rating', ei.condition_rating,
              'location', ei.location
            )
          )
        ) AS report_data
      FROM equipment_instance ei
      JOIN equipment e ON ei.equipment_id = e.id
      LEFT JOIN clients c ON ei.assigned_to = c.id
      WHERE ei.vendor_id = $1
      AND ei.deleted_at IS NULL
      AND ei.created_at BETWEEN $2 AND $3
      ${clientFilter}
      ${equipmentTypeFilter}
    `;
    
    const result = await pool.query(query, params);
    return result.rows[0]?.report_data || { summary: {}, details: [] };
  }

  /**
   * Generate maintenance performance report
   */
  async generateMaintenanceReport(
    vendorId: number, 
    startDate: string, 
    endDate: string,
    clientId?: number
  ): Promise<any> {
    let clientFilter = '';
    const params = [vendorId, startDate, endDate];
    let paramCount = 3;

    if (clientId) {
      paramCount++;
      clientFilter = `AND mt.client_id = $${paramCount}`;
      params.push(clientId);
    }

    const query = `
      SELECT 
        jsonb_build_object(
          'summary', jsonb_build_object(
            'total_tickets', COUNT(*),
            'open', SUM(CASE WHEN mt.ticket_status = 'open' THEN 1 ELSE 0 END),
            'resolved', SUM(CASE WHEN mt.ticket_status = 'resolved' THEN 1 ELSE 0 END),
            'closed', SUM(CASE WHEN mt.ticket_status = 'closed' THEN 1 ELSE 0 END),
            'avg_resolution_time_hours', COALESCE(
              AVG(
                CASE 
                  WHEN mt.resolved_at IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0
                  ELSE NULL 
                END
              )::numeric, 0
            ),
            'total_cost', COALESCE(SUM(mt.cost), 0),
            'high_priority_tickets', SUM(CASE WHEN mt.priority = 'high' THEN 1 ELSE 0 END)
          ),
          'details', jsonb_agg(
            jsonb_build_object(
              'id', mt.id,
              'ticket_number', mt.ticket_number,
              'client_name', COALESCE(c.company_name, 'System/User'),
              'support_type', mt.support_type,
              'priority', mt.priority,
              'ticket_status', mt.ticket_status,
              'issue_description', mt.issue_description,
              'created_at', mt.created_at,
              'resolved_at', mt.resolved_at,
              'resolution_time_hours', CASE 
                WHEN mt.resolved_at IS NOT NULL THEN 
                  EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0
                ELSE NULL 
              END,
              'cost', mt.cost,
              'actual_hours', mt.actual_hours
            )
          )
        ) AS report_data
      FROM maintenance_ticket mt
      LEFT JOIN clients c ON mt.client_id = c.id
      WHERE mt.vendor_id = $1
      AND mt.created_at BETWEEN $2 AND $3
      ${clientFilter}
    `;
    
    const result = await pool.query(query, params);
    return result.rows[0]?.report_data || { summary: {}, details: [] };
  }

  /**
   * Get equipment type distribution chart data
   */
  async getEquipmentTypeChartData(vendorId: number, dateRange?: { startDate: string; endDate: string }): Promise<any[]> {
    let dateFilter = '';
    const params: any[] = [vendorId];
    
    if (dateRange) {
      dateFilter = 'AND ei.created_at BETWEEN $2 AND $3';
      params.push(dateRange.startDate, dateRange.endDate);
    }

    const query = `
      SELECT 
        e.equipment_type AS label,
        COUNT(ei.id) AS value,
        COUNT(ei.id)::float / (SELECT COUNT(*) FROM equipment_instance WHERE vendor_id = $1 AND deleted_at IS NULL)::float * 100 AS percentage
      FROM equipment e
      JOIN equipment_instance ei ON e.id = ei.equipment_id
      WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL
      ${dateFilter}
      GROUP BY e.equipment_type
      ORDER BY COUNT(ei.id) DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get monthly maintenance trends chart data
   */
  async getMaintenanceTrendsChartData(vendorId: number, months: number = 12): Promise<any[]> {
    const query = `
      SELECT 
        TO_CHAR(date_trunc('month', mt.created_at), 'YYYY-MM') AS month,
        TO_CHAR(date_trunc('month', mt.created_at), 'Mon YYYY') AS month_label,
        COUNT(*) AS tickets_created,
        SUM(CASE WHEN mt.ticket_status = 'resolved' THEN 1 ELSE 0 END) AS tickets_resolved,
        AVG(
          CASE 
            WHEN mt.resolved_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0
            ELSE NULL 
          END
        )::numeric(10,2) AS avg_resolution_hours
      FROM maintenance_ticket mt
      WHERE mt.vendor_id = $1 
      AND mt.created_at >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY date_trunc('month', mt.created_at)
      ORDER BY month ASC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get equipment value distribution (based on equipment price)
   */
  async getEquipmentValueChartData(vendorId: number): Promise<any[]> {
    const query = `
      SELECT 
        e.equipment_type AS label,
        SUM(COALESCE(e.price, 0)) AS total_value,
        COUNT(ei.id) AS equipment_count,
        AVG(COALESCE(e.price, 0))::numeric(10,2) AS avg_price
      FROM equipment e
      JOIN equipment_instance ei ON e.id = ei.equipment_id
      WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL
      GROUP BY e.equipment_type
      HAVING SUM(COALESCE(e.price, 0)) > 0
      ORDER BY total_value DESC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get client satisfaction metrics (based on ticket resolution time)
   */
  async getClientSatisfactionChartData(vendorId: number): Promise<any[]> {
    const query = `
      SELECT 
        c.company_name AS client_name,
        COUNT(mt.id) AS total_tickets,
        AVG(
          CASE 
            WHEN mt.resolved_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0
            ELSE NULL 
          END
        )::numeric(10,2) AS avg_resolution_hours,
        CASE 
          WHEN AVG(
            CASE 
              WHEN mt.resolved_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0
              ELSE NULL 
            END
          ) <= 24 THEN 'Excellent'
          WHEN AVG(
            CASE 
              WHEN mt.resolved_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0
              ELSE NULL 
            END
          ) <= 72 THEN 'Good'
          WHEN AVG(
            CASE 
              WHEN mt.resolved_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0
              ELSE NULL 
            END
          ) <= 168 THEN 'Fair'
          ELSE 'Poor'
        END AS satisfaction_rating,
        SUM(CASE WHEN mt.ticket_status = 'resolved' THEN 1 ELSE 0 END)::float / COUNT(mt.id)::float * 100 AS resolution_rate
      FROM clients c
      LEFT JOIN maintenance_ticket mt ON c.id = mt.client_id
      WHERE c.created_by_vendor_id = $1 
      AND c.status = 'active'
      AND mt.created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY c.id, c.company_name
      HAVING COUNT(mt.id) > 0
      ORDER BY avg_resolution_hours ASC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get compliance trends over time
   */
  async getComplianceTrendsChartData(vendorId: number, months: number = 6): Promise<any[]> {
    const query = `
      WITH monthly_compliance AS (
        SELECT 
          date_trunc('month', CURRENT_DATE - INTERVAL '${months - 1} months' + (s.month_offset || ' months')::interval) AS month,
          COALESCE(
            (SELECT COUNT(*)::float 
             FROM equipment_instance ei 
             WHERE ei.vendor_id = $1 
             AND ei.compliance_status = 'compliant' 
             AND ei.deleted_at IS NULL
             AND ei.created_at <= (date_trunc('month', CURRENT_DATE - INTERVAL '${months - 1} months' + (s.month_offset || ' months')::interval) + INTERVAL '1 month - 1 day')
            ) / NULLIF(
              (SELECT COUNT(*) 
               FROM equipment_instance ei 
               WHERE ei.vendor_id = $1 
               AND ei.deleted_at IS NULL
               AND ei.created_at <= (date_trunc('month', CURRENT_DATE - INTERVAL '${months - 1} months' + (s.month_offset || ' months')::interval) + INTERVAL '1 month - 1 day')
              ), 0
            ) * 100, 0
          ) AS compliance_rate
        FROM generate_series(0, ${months - 1}) AS s(month_offset)
      )
      SELECT 
        TO_CHAR(month, 'Mon YYYY') AS month_label,
        TO_CHAR(month, 'YYYY-MM') AS month,
        ROUND(compliance_rate::numeric, 2) AS compliance_rate
      FROM monthly_compliance
      ORDER BY month ASC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get enhanced KPI data with trends and insights
   */
  async getEnhancedKPIData(vendorId: number): Promise<any> {
    const query = `
      SELECT 
        -- Current metrics
        (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL) AS total_equipment,
        
        COALESCE(
          ROUND(
            ((SELECT COUNT(*)::float FROM equipment_instance ei WHERE ei.vendor_id = $1 AND ei.compliance_status = 'compliant' AND ei.deleted_at IS NULL) / 
            NULLIF((SELECT COUNT(*) FROM equipment_instance ei WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL), 0) * 100)::numeric, 2
          ), 0
        ) AS compliance_rate,
        
        (SELECT COUNT(*) FROM maintenance_ticket mt WHERE mt.vendor_id = $1 AND mt.ticket_status = 'resolved' AND mt.resolved_at >= CURRENT_DATE - INTERVAL '30 days') AS tickets_resolved,
        
        (SELECT COUNT(*) FROM clients c WHERE c.created_by_vendor_id = $1 AND c.status = 'active') AS total_clients,
        
        (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.vendor_id = $1 AND ei.compliance_status IN ('overdue', 'expired') AND ei.deleted_at IS NULL) AS maintenance_overdue,
        
        -- Equipment value metrics
        COALESCE((SELECT SUM(e.price) FROM equipment e JOIN equipment_instance ei ON e.id = ei.equipment_id WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL), 0) AS total_equipment_value,
        
        -- Performance trends (vs last month)
        COALESCE(
          (SELECT COUNT(*) FROM maintenance_ticket mt WHERE mt.vendor_id = $1 AND mt.ticket_status = 'resolved' AND mt.resolved_at >= CURRENT_DATE - INTERVAL '30 days') -
          (SELECT COUNT(*) FROM maintenance_ticket mt WHERE mt.vendor_id = $1 AND mt.ticket_status = 'resolved' AND mt.resolved_at >= CURRENT_DATE - INTERVAL '60 days' AND mt.resolved_at < CURRENT_DATE - INTERVAL '30 days'), 
          0
        ) AS tickets_trend,
        
        -- Average resolution time this month
        COALESCE(
          (SELECT AVG(EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0)::numeric(10,1)
           FROM maintenance_ticket mt 
           WHERE mt.vendor_id = $1 
           AND mt.resolved_at >= CURRENT_DATE - INTERVAL '30 days'
           AND mt.resolved_at IS NOT NULL), 
          0
        ) AS avg_resolution_hours,
        
        -- Client satisfaction score (based on quick resolution)
        COALESCE(
          (SELECT 
            SUM(CASE 
              WHEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0 <= 24 THEN 100
              WHEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0 <= 72 THEN 80
              WHEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0 <= 168 THEN 60
              ELSE 40
            END)::float / COUNT(*)::float
           FROM maintenance_ticket mt 
           WHERE mt.vendor_id = $1 
           AND mt.resolved_at >= CURRENT_DATE - INTERVAL '30 days'
           AND mt.resolved_at IS NOT NULL), 
          0
        ) AS satisfaction_score
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows[0];
  }

  // Table Data Methods for Business Insights

  /**
   * Get top performing clients by equipment compliance and ticket resolution
   */
  async getTopClients(vendorId: number, limit: number = 10) {
    const query = `
      SELECT 
        c.id,
        c.company_name,
        COUNT(ei.id) as total_equipment,
        COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END) as compliant_equipment,
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END)::float / 
             NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
          ), 0
        ) as compliance_percentage,
        COUNT(CASE WHEN mt.ticket_status = 'resolved' THEN 1 END) as resolved_tickets,
        COALESCE(SUM(e.price), 0) as total_equipment_value,
        MAX(mt.resolved_at) as last_service_date
      FROM clients c
      LEFT JOIN equipment_instance ei ON ei.assigned_to = c.id AND ei.deleted_at IS NULL
      LEFT JOIN equipment e ON e.id = ei.equipment_id
      LEFT JOIN maintenance_ticket mt ON mt.client_id = c.id
      WHERE c.created_by_vendor_id = $1 AND c.status = 'active'
      GROUP BY c.id, c.company_name
      ORDER BY compliance_percentage DESC, total_equipment_value DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [vendorId, limit]);
    return result.rows;
  }

  /**
   * Get equipment performance metrics by type
   */
  async getEquipmentPerformance(vendorId: number) {
    const query = `
      SELECT 
        e.equipment_type,
        e.manufacturer,
        COUNT(ei.id) as total_instances,
        COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END) as compliant_count,
        COUNT(CASE WHEN ei.compliance_status = 'expired' THEN 1 END) as expired_count,
        COUNT(CASE WHEN ei.compliance_status = 'overdue' THEN 1 END) as overdue_count,
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END)::float / 
             NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
          ), 0
        ) as compliance_percentage,
        COALESCE(AVG(e.price), 0) as avg_price,
        COALESCE(SUM(e.price), 0) as total_value,
        COUNT(CASE WHEN mt.ticket_status IN ('open', 'in_progress') THEN 1 END) as active_tickets
      FROM equipment e
      JOIN equipment_instance ei ON e.id = ei.equipment_id
      LEFT JOIN maintenance_ticket mt ON mt.equipment_instance_id = ei.id AND mt.ticket_status IN ('open', 'in_progress')
      WHERE ei.vendor_id = $1 AND ei.deleted_at IS NULL
      GROUP BY e.equipment_type, e.manufacturer
      ORDER BY total_instances DESC, compliance_percentage DESC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get maintenance backlog and priority items
   */
  async getMaintenanceBacklog(vendorId: number) {
    const query = `
      SELECT 
        mt.id,
        mt.title,
        mt.priority,
        mt.ticket_status,
        c.company_name as client_name,
        e.equipment_name,
        e.equipment_type,
        ei.serial_number,
        mt.created_at,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - mt.created_at)) / 86400.0 as days_open,
        mt.description,
        CASE 
          WHEN mt.priority = 'high' AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - mt.created_at)) / 86400.0 > 1 THEN 'urgent'
          WHEN mt.priority = 'medium' AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - mt.created_at)) / 86400.0 > 3 THEN 'urgent'
          WHEN mt.priority = 'low' AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - mt.created_at)) / 86400.0 > 7 THEN 'overdue'
          ELSE 'normal'
        END as urgency_status
      FROM maintenance_ticket mt
      JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
      JOIN equipment e ON ei.equipment_id = e.id
      JOIN clients c ON mt.client_id = c.id
      WHERE mt.vendor_id = $1 
        AND mt.ticket_status IN ('open', 'in_progress')
        AND ei.deleted_at IS NULL
      ORDER BY 
        CASE mt.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        mt.created_at ASC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get revenue breakdown by client
   */
  async getRevenueByClient(vendorId: number, startDate: string, endDate: string) {
    const query = `
      SELECT 
        c.id,
        c.company_name,
        COUNT(DISTINCT ei.id) as equipment_count,
        COALESCE(SUM(e.price), 0) as equipment_value,
        COUNT(CASE WHEN mt.resolved_at BETWEEN $2 AND $3 THEN 1 END) as services_completed,
        -- Estimated service revenue (using equipment price as proxy)
        COALESCE(
          SUM(CASE WHEN mt.resolved_at BETWEEN $2 AND $3 THEN e.price * 0.1 ELSE 0 END), 0
        ) as estimated_service_revenue,
        AVG(
          CASE WHEN mt.resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600.0 
          END
        ) as avg_resolution_hours
      FROM clients c
      LEFT JOIN equipment_instance ei ON ei.assigned_to = c.id AND ei.deleted_at IS NULL
      LEFT JOIN equipment e ON e.id = ei.equipment_id
      LEFT JOIN maintenance_ticket mt ON mt.client_id = c.id
      WHERE c.created_by_vendor_id = $1 AND c.status = 'active'
      GROUP BY c.id, c.company_name
      HAVING COUNT(DISTINCT ei.id) > 0
      ORDER BY estimated_service_revenue DESC, equipment_value DESC
    `;
    
    const result = await pool.query(query, [vendorId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get compliance issues requiring immediate attention
   */
  async getComplianceIssues(vendorId: number) {
    const query = `
      SELECT 
        ei.id,
        ei.serial_number,
        e.equipment_name,
        e.equipment_type,
        c.company_name as client_name,
        ei.compliance_status,
        ei.expiry_date,
        ei.next_maintenance_date,
        CASE 
          WHEN ei.compliance_status = 'expired' THEN EXTRACT(EPOCH FROM (CURRENT_DATE - ei.expiry_date)) / 86400.0
          WHEN ei.compliance_status = 'overdue' THEN EXTRACT(EPOCH FROM (CURRENT_DATE - ei.next_maintenance_date)) / 86400.0
          ELSE 0
        END as days_overdue,
        e.price as equipment_value,
        CASE 
          WHEN ei.compliance_status = 'expired' AND EXTRACT(EPOCH FROM (CURRENT_DATE - ei.expiry_date)) / 86400.0 > 30 THEN 'critical'
          WHEN ei.compliance_status = 'overdue' AND EXTRACT(EPOCH FROM (CURRENT_DATE - ei.next_maintenance_date)) / 86400.0 > 14 THEN 'critical'
          WHEN ei.compliance_status IN ('expired', 'overdue') THEN 'high'
          WHEN ei.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM equipment_instance ei
      JOIN equipment e ON ei.equipment_id = e.id
      LEFT JOIN clients c ON ei.assigned_to = c.id
      WHERE ei.vendor_id = $1 
        AND ei.deleted_at IS NULL
        AND (
          ei.compliance_status IN ('expired', 'overdue') 
          OR ei.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          OR ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '14 days'
        )
      ORDER BY 
        CASE 
          WHEN ei.compliance_status = 'expired' THEN 1
          WHEN ei.compliance_status = 'overdue' THEN 2
          ELSE 3
        END,
        COALESCE(ei.expiry_date, ei.next_maintenance_date) ASC
    `;
    
    const result = await pool.query(query, [vendorId]);
    return result.rows;
  }
}

export default new ReportsRepository();