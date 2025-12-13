import { Pool } from 'pg';
import { DebugLogger } from '../utils/DebugLogger';

export interface VendorOverviewKPIs {
  active_clients: string;
  total_assigned: string;
  open_tickets: string;
  resolved_in_period: string;
  avg_resolution_hours: string;
  compliance_rate_pct: string;
}

export interface ClientCompliance {
  client: string;
  total_equipment: number;
  compliant: number;
  due_soon: number;
  overdue: number;
  expired: number;
  compliance_rate_pct: number;
}

export interface ComplianceTrend {
  month: string;
  total: number;
  compliant: number;
  compliance_rate_pct: number;
}

export interface TicketTrend {
  month: string;
  created: number;
  resolved: number;
  high_priority: number;
  avg_resolution_hours: number;
}

export interface TicketsByType {
  support_type: string;
  count: number;
  high_priority: number;
}

export interface ClientRanking {
  company_name: string;
  equipment_count: number;
  tickets_raised: number;
  compliance_pct: number;
  last_ticket_date: string | null;
}

export interface EquipmentCategory {
  equipment_type: string;
  instance_count: number;
}

export interface HighRiskEquipment {
  serial_number: string;
  client: string;
  equipment_name: string;
  compliance_status: string;
  next_maintenance: string;
  days_until_maintenance: string;
}

export interface TechnicianPerformance {
  technician: string;
  tickets_handled: number;
  resolved: number;
  avg_resolution_hours: number;
}

export interface UserLoginTrend {
  week: string;
  logins: number;
  failed_attempts: number;
}

export interface PasswordReset {
  reason: string;
  count: number;
}

export interface VendorAudit {
  table_name: string;
  action_type: string;
  changed_by: string;
  ip_address: string;
  timestamp: string;
}

export class VendorAnalyticsRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get vendor overview KPIs
   * Includes: active clients, total equipment, open tickets, resolution metrics, compliance rate
   */
  async getVendorOverview(
    vendorId: number, 
    startDate: string, 
    endDate: string, 
    clientId?: number, 
    equipmentType?: string
  ): Promise<VendorOverviewKPIs[]> {
    DebugLogger.log('Fetching vendor overview KPIs', { vendorId, startDate, endDate, clientId, equipmentType }, 'VENDOR_ANALYTICS');

    const query = `
      WITH params AS (
          SELECT 
              $1::int AS vendor_id,
              $2::date AS start_date,
              $3::date AS end_date,
              $4::int AS client_id,
              $5::text AS equipment_type
      ),
      stats AS (
          SELECT
              COUNT(DISTINCT c.id) AS active_clients,
              COUNT(ei.id) AS total_assigned,
              COUNT(mt.id) FILTER (WHERE mt.ticket_status = 'open') AS open_tickets,
              COUNT(mt.id) FILTER (WHERE mt.resolved_at::date BETWEEN p.start_date AND p.end_date) AS resolved_in_period,
              AVG(
                  CASE WHEN mt.ticket_status = 'resolved'
                       THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at)) / 3600
                       ELSE NULL END
              )::numeric AS avg_resolution_hours
          FROM public.vendors v
          CROSS JOIN params p
          JOIN public.clients c ON c.created_by_vendor_id = v.id AND c.status = 'active'
          LEFT JOIN public.equipment_instance ei ON ei.assigned_to = c.id 
              AND ei.vendor_id = v.id 
              AND ei.status = 'assigned' 
              AND ei.deleted_at IS NULL
              AND (p.client_id IS NULL OR ei.assigned_to = p.client_id)
              AND (p.equipment_type IS NULL OR EXISTS (
                  SELECT 1 FROM public.equipment e 
                  WHERE e.id = ei.equipment_id 
                    AND e.equipment_type = p.equipment_type
              ))
          LEFT JOIN public.maintenance_ticket mt ON mt.client_id = c.id 
              AND mt.vendor_id = v.id 
              AND mt.created_at::date BETWEEN p.start_date AND p.end_date
          WHERE v.id = p.vendor_id
      ),
      compliance AS (
          SELECT
              COALESCE(ROUND(
                  (SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END)::float 
                  / NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
              ), 0) AS compliance_rate_pct
          FROM public.equipment_instance ei
          JOIN public.clients c ON ei.assigned_to = c.id
          JOIN public.vendors v ON ei.vendor_id = v.id
          CROSS JOIN params p
          WHERE v.id = p.vendor_id
            AND ei.status = 'assigned'
            AND ei.deleted_at IS NULL
            AND (p.client_id IS NULL OR ei.assigned_to = p.client_id)
            AND (p.equipment_type IS NULL OR EXISTS (
                SELECT 1 FROM public.equipment e 
                WHERE e.id = ei.equipment_id AND e.equipment_type = p.equipment_type
            ))
      )
      SELECT
          s.active_clients::text,
          s.total_assigned::text,
          s.open_tickets::text,
          s.resolved_in_period::text,
          COALESCE(ROUND(s.avg_resolution_hours::numeric, 1), 0)::text AS avg_resolution_hours,
          c.compliance_rate_pct::text
      FROM stats s, compliance c
    `;

    const result = await this.pool.query(query, [vendorId, startDate, endDate, clientId, equipmentType]);
    return result.rows;
  }

  /**
   * Get compliance data broken down by client (for stacked bar chart)
   */
  async getComplianceByClient(vendorId: number): Promise<ClientCompliance[]> {
    DebugLogger.log('Fetching compliance by client', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          c.company_name AS client,
          COUNT(ei.id) AS total_equipment,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'due_soon') AS due_soon,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'overdue') AS overdue,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'expired') AS expired,
          COALESCE(ROUND(
              (COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::float 
              / NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
          ), 0) AS compliance_rate_pct
      FROM public.equipment_instance ei
      JOIN public.clients c ON ei.assigned_to = c.id AND c.status = 'active'
      WHERE ei.vendor_id = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
      GROUP BY c.id, c.company_name
      ORDER BY compliance_rate_pct ASC, c.company_name
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get compliance trend over time (monthly line chart)
   */
  async getComplianceTrend(
    vendorId: number, 
    startDate: string, 
    endDate: string, 
    clientId?: number
  ): Promise<ComplianceTrend[]> {
    DebugLogger.log('Fetching compliance trend', { vendorId, startDate, endDate, clientId }, 'VENDOR_ANALYTICS');

    const query = `
      WITH params AS (
          SELECT $1::int AS vendor_id, $2::date AS start_date, $3::date AS end_date, $4::int AS client_id
      )
      SELECT
          DATE_TRUNC('month', ei.updated_at)::date AS month,
          COUNT(ei.id) AS total,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
          COALESCE(ROUND(
              (COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::float 
              / NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
          ), 0) AS compliance_rate_pct
      FROM public.equipment_instance ei
      JOIN public.clients c ON ei.assigned_to = c.id
      CROSS JOIN params p
      WHERE ei.vendor_id = p.vendor_id
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.updated_at::date BETWEEN p.start_date AND p.end_date
        AND (p.client_id IS NULL OR ei.assigned_to = p.client_id)
      GROUP BY month
      ORDER BY month
    `;

    const result = await this.pool.query(query, [vendorId, startDate, endDate, clientId]);
    return result.rows;
  }

  /**
   * Get ticket trends over time (monthly line chart)
   */
  async getTicketTrends(
    vendorId: number, 
    startDate: string, 
    endDate: string, 
    clientId?: number
  ): Promise<TicketTrend[]> {
    DebugLogger.log('Fetching ticket trends', { vendorId, startDate, endDate, clientId }, 'VENDOR_ANALYTICS');

    let query = `
      SELECT
          DATE_TRUNC('month', mt.created_at)::date AS month,
          COUNT(*) AS created,
          COUNT(*) FILTER (WHERE mt.ticket_status = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE mt.priority = 'high') AS high_priority,
          ROUND(AVG(CASE WHEN mt.ticket_status = 'resolved'
               THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/3600 
               ELSE NULL END)::numeric, 1) AS avg_resolution_hours
      FROM public.maintenance_ticket mt
      JOIN public.clients c ON mt.client_id = c.id
      WHERE mt.vendor_id = $1
        AND mt.created_at::date BETWEEN $2 AND $3
    `;

    const params: any[] = [vendorId, startDate, endDate];

    if (clientId !== undefined && clientId !== null) {
      query += ` AND mt.client_id = $4`;
      params.push(clientId);
    }

    query += `
      GROUP BY month
      ORDER BY month
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get tickets broken down by support type (pie chart)
   */
  async getTicketsByType(vendorId: number): Promise<TicketsByType[]> {
    DebugLogger.log('Fetching tickets by type', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          mt.support_type,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE mt.priority = 'high') AS high_priority
      FROM public.maintenance_ticket mt
      WHERE mt.vendor_id = $1
      GROUP BY mt.support_type
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get client performance rankings (top 10 clients)
   */
  async getClientRankings(vendorId: number): Promise<ClientRanking[]> {
    DebugLogger.log('Fetching client rankings', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          c.company_name,
          COUNT(ei.id) AS equipment_count,
          COUNT(mt.id) AS tickets_raised,
          COALESCE(ROUND(
              (COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::float 
              / NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
          ), 0) AS compliance_pct,
          MAX(mt.created_at)::text AS last_ticket_date
      FROM public.clients c
      LEFT JOIN public.equipment_instance ei ON ei.assigned_to = c.id 
          AND ei.vendor_id = $1 
          AND ei.status = 'assigned' 
          AND ei.deleted_at IS NULL
      LEFT JOIN public.maintenance_ticket mt ON mt.client_id = c.id 
          AND mt.vendor_id = $1
      WHERE c.created_by_vendor_id = $1
        AND c.status = 'active'
      GROUP BY c.id, c.company_name
      ORDER BY compliance_pct DESC NULLS LAST, equipment_count DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get equipment breakdown by categories (pie chart)
   */
  async getEquipmentCategories(vendorId: number): Promise<EquipmentCategory[]> {
    DebugLogger.log('Fetching equipment categories', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          e.equipment_type,
          COUNT(ei.id) AS instance_count
      FROM public.equipment e
      JOIN public.equipment_instance ei ON e.id = ei.equipment_id
      WHERE ei.vendor_id = $1
        AND ei.deleted_at IS NULL
      GROUP BY e.equipment_type
      ORDER BY instance_count DESC
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get high-risk equipment that needs attention (table)
   */
  async getHighRiskEquipment(vendorId: number): Promise<HighRiskEquipment[]> {
    DebugLogger.log('Fetching high-risk equipment', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          ei.serial_number,
          c.company_name AS client,
          e.equipment_name,
          ei.compliance_status,
          TO_CHAR(ei.next_maintenance_date, 'DD/MM/YYYY') AS next_maintenance,
          (ei.next_maintenance_date - CURRENT_DATE)::text AS days_until_maintenance
      FROM public.equipment_instance ei
      JOIN public.clients c ON ei.assigned_to = c.id
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.vendor_id = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.compliance_status IN ('overdue', 'expired', 'due_soon')
      ORDER BY 
          CASE ei.compliance_status 
              WHEN 'expired' THEN 1 
              WHEN 'overdue' THEN 2 
              WHEN 'due_soon' THEN 3 
          END,
          ei.next_maintenance_date ASC
      LIMIT 15
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get technician performance metrics (bar chart)
   */
  async getTechnicianPerformance(vendorId: number): Promise<TechnicianPerformance[]> {
    DebugLogger.log('Fetching technician performance', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          u.display_name AS technician,
          COUNT(mt.id) AS tickets_handled,
          COUNT(mt.id) FILTER (WHERE mt.ticket_status = 'resolved') AS resolved,
          ROUND(AVG(CASE WHEN mt.ticket_status = 'resolved'
               THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/3600 
               ELSE NULL END)::numeric, 1) AS avg_resolution_hours
      FROM public.maintenance_ticket mt
      JOIN public.user u ON mt.assigned_technician = u.id
      WHERE mt.vendor_id = $1
      GROUP BY u.id, u.display_name
      HAVING COUNT(mt.id) > 0
      ORDER BY tickets_handled DESC
      LIMIT 8
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get user login trends for vendor staff (line chart)
   */
  async getUserLoginTrends(
    vendorId: number, 
    startDate: string, 
    endDate: string
  ): Promise<UserLoginTrend[]> {
    DebugLogger.log('Fetching user login trends', { vendorId, startDate, endDate }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          DATE_TRUNC('week', u.last_login)::date AS week,
          COUNT(*) AS logins,
          SUM(u.failed_login_attempts) AS failed_attempts
      FROM public.user u
      JOIN public.vendors v ON u.id = v.user_id OR u.user_type = 'vendor'
      WHERE v.id = $1
        AND u.deleted_at IS NULL
        AND u.last_login::date BETWEEN $2 AND $3
      GROUP BY week
      ORDER BY week
    `;

    const result = await this.pool.query(query, [vendorId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get password reset reasons (pie chart)
   */
  async getPasswordResets(vendorId: number): Promise<PasswordReset[]> {
    DebugLogger.log('Fetching password resets', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          'Password Reset Request' AS reason,
          COUNT(*) AS count
      FROM public.password_reset pr
      JOIN public.user u ON pr.user_id = u.id
      JOIN public.vendors v ON u.id = v.user_id
      WHERE v.id = $1
        AND pr.used = true
      GROUP BY reason
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }

  /**
   * Get recent vendor audit events (table)
   */
  async getRecentVendorAudits(vendorId: number): Promise<VendorAudit[]> {
    DebugLogger.log('Fetching recent vendor audits', { vendorId }, 'VENDOR_ANALYTICS');

    const query = `
      SELECT
          al.table_name,
          al.action_type,
          u.display_name AS changed_by,
          al.ip_address,
          TO_CHAR(al.created_at, 'Mon DD, YYYY HH12:MI AM') AS timestamp
      FROM public.audit_log al
      JOIN public.user u ON al.changed_by = u.id
      JOIN public.vendors v ON u.id = v.user_id
      WHERE v.id = $1
      ORDER BY al.created_at DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [vendorId]);
    return result.rows;
  }
}