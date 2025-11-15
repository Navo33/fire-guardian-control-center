import { Pool } from 'pg';
import { DebugLogger } from '../utils/DebugLogger';

// Type definitions for client analytics data
export interface ClientOverview {
  total_assigned: string;
  compliant: string;
  compliance_rate_pct: string;
  open_requests: string;
  upcoming_events: string;
  unread_notifications: string;
}

export interface EquipmentStatus {
  status: string;
  count: number;
}

export interface ComplianceTrend {
  month: string;
  total: number;
  compliant: number;
  compliance_rate_pct: number;
}

export interface ComplianceByType {
  equipment_type: string;
  total: number;
  compliant: number;
  due_soon: number;
  overdue: number;
  expired: number;
  compliance_rate_pct: number;
}

export interface RequestTrend {
  month: string;
  submitted: number;
  resolved: number;
  high_priority: number;
  avg_resolution_days: number;
}

export interface RequestByType {
  support_type: string;
  count: number;
}

export interface NonCompliantEquipment {
  equipment_name: string;
  serial_number: string;
  location: string;
  compliance_status: string;
  next_maintenance: string;
  days_until_maintenance: string;
  expiry_date: string;
  days_until_expiry: string;
}

export interface UpcomingEvent {
  type: string;
  title: string;
  date: string;
  days_until: string;
  location: string;
}

export interface RecentNotification {
  title: string;
  message: string;
  priority: string;
  created_at: string;
  is_read: boolean;
}

export interface LoginHistory {
  week: string;
  sessions: number;
  external_logins: number;
}

export interface AccountSecurity {
  total_resets: string;
  resets_last_year: string;
  last_reset: string;
}

export interface ActiveSession {
  ip_address: string;
  user_agent: string;
  last_active: string;
  minutes_ago: number;
}

export class ClientAnalyticsRepository {
  constructor(private pool: Pool) {}

  /**
   * Generic query method
   */
  async query(sql: string, params: any[] = []) {
    return await this.pool.query(sql, params);
  }

  /**
   * Get client overview KPIs
   */
  async getClientOverview(
    clientId: number,
    startDate: string,
    endDate: string,
    equipmentType?: string
  ): Promise<ClientOverview> {
    DebugLogger.log('Fetching client overview', { clientId, startDate, endDate, equipmentType }, 'CLIENT_ANALYTICS');

    const query = `
      WITH client_data AS (
          SELECT 
              c.id AS client_id,
              u.display_name AS client_name
          FROM public.clients c
          JOIN public."user" u ON c.user_id = u.id
          WHERE c.id = $1
            AND c.status = 'active'
            AND u.deleted_at IS NULL
      ),
      stats AS (
          SELECT
              COUNT(DISTINCT ei.id) AS total_assigned,
              COUNT(DISTINCT CASE WHEN ei.compliance_status = 'compliant' THEN ei.id END) AS compliant,
              COUNT(DISTINCT CASE WHEN mt.ticket_status = 'open' THEN mt.id END) AS open_requests,
              COUNT(DISTINCT CASE WHEN ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days' THEN ei.id END) AS due_soon,
              COUNT(DISTINCT CASE WHEN ei.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN ei.id END) AS expiring_soon,
              COUNT(DISTINCT CASE WHEN n.is_read = false THEN n.id END) AS unread_notifications
          FROM client_data cd
          LEFT JOIN public.equipment_instance ei ON ei.assigned_to = cd.client_id
            AND ei.status = 'assigned'
            AND ei.deleted_at IS NULL
          LEFT JOIN public.equipment e ON e.id = ei.equipment_id
            AND e.deleted_at IS NULL
            AND ($4 IS NULL OR e.equipment_type = $4)
          LEFT JOIN public.maintenance_ticket mt ON mt.equipment_instance_id = ei.id 
            AND mt.client_id = cd.client_id
            AND mt.deleted_at IS NULL
          LEFT JOIN public."user" u ON u.id = (
              SELECT user_id FROM public.clients WHERE id = cd.client_id
          )
          LEFT JOIN public.notification n ON n.user_id = u.id
            AND n.is_read = false
      )
      SELECT
          s.total_assigned::text,
          s.compliant::text,
          COALESCE(ROUND((s.compliant::numeric / NULLIF(s.total_assigned, 0) * 100)::numeric, 1), 0)::text AS compliance_rate_pct,
          s.open_requests::text,
          (s.due_soon + s.expiring_soon)::text AS upcoming_events,
          s.unread_notifications::text
      FROM stats s;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate, equipmentType]);
    return result.rows[0];
  }

  /**
   * Get equipment status distribution for pie chart
   */
  async getEquipmentStatus(clientId: number): Promise<EquipmentStatus[]> {
    DebugLogger.log('Fetching equipment status', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          ei.compliance_status AS status,
          COUNT(*)::int AS count
      FROM public.equipment_instance ei
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
      GROUP BY ei.compliance_status
      ORDER BY 
          CASE ei.compliance_status 
              WHEN 'expired' THEN 1 
              WHEN 'overdue' THEN 2 
              WHEN 'due_soon' THEN 3 
              ELSE 4 
          END;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get compliance trend over time for line chart
   */
  async getComplianceTrend(
    clientId: number,
    startDate: string,
    endDate: string
  ): Promise<ComplianceTrend[]> {
    DebugLogger.log('Fetching compliance trend', { clientId, startDate, endDate }, 'CLIENT_ANALYTICS');

    const query = `
      WITH params AS (
          SELECT $1::int AS client_id, $2::date AS start_date, $3::date AS end_date
      )
      SELECT
          DATE_TRUNC('month', ei.updated_at)::date AS month,
          COUNT(ei.id)::int AS total,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::int AS compliant,
          COALESCE(ROUND(
              (COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::numeric 
              / NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
          ), 0)::float AS compliance_rate_pct
      FROM public.equipment_instance ei
      CROSS JOIN params p
      WHERE ei.assigned_to = p.client_id
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.updated_at::date BETWEEN p.start_date AND p.end_date
      GROUP BY month
      ORDER BY month;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get compliance status by equipment type for stacked bar chart
   */
  async getComplianceByType(clientId: number): Promise<ComplianceByType[]> {
    DebugLogger.log('Fetching compliance by type', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          e.equipment_type,
          COUNT(ei.id)::int AS total,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::int AS compliant,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'due_soon')::int AS due_soon,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'overdue')::int AS overdue,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'expired')::int AS expired,
          COALESCE(ROUND(
              (COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::numeric 
              / NULLIF(COUNT(ei.id), 0) * 100)::numeric, 1
          ), 0)::float AS compliance_rate_pct
      FROM public.equipment_instance ei
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
      GROUP BY e.equipment_type
      ORDER BY compliance_rate_pct ASC, e.equipment_type;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get service request trends for line chart
   */
  async getRequestTrends(
    clientId: number,
    startDate: string,
    endDate: string
  ): Promise<RequestTrend[]> {
    DebugLogger.log('Fetching request trends', { clientId, startDate, endDate }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          DATE_TRUNC('month', mt.created_at)::date AS month,
          COUNT(*)::int AS submitted,
          COUNT(*) FILTER (WHERE mt.ticket_status = 'resolved')::int AS resolved,
          COUNT(*) FILTER (WHERE mt.priority = 'high')::int AS high_priority,
          ROUND(AVG(CASE WHEN mt.ticket_status = 'resolved'
               THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/86400 
               ELSE NULL END), 1)::float AS avg_resolution_days
      FROM public.maintenance_ticket mt
      WHERE mt.client_id = $1
        AND mt.created_at::date BETWEEN $2 AND $3
      GROUP BY month
      ORDER BY month;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get requests by type for pie chart
   */
  async getRequestsByType(clientId: number): Promise<RequestByType[]> {
    DebugLogger.log('Fetching requests by type', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          mt.support_type,
          COUNT(*)::int AS count
      FROM public.maintenance_ticket mt
      WHERE mt.client_id = $1
      GROUP BY mt.support_type
      ORDER BY count DESC;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get non-compliant equipment for alerts table
   */
  async getNonCompliantEquipment(clientId: number): Promise<NonCompliantEquipment[]> {
    DebugLogger.log('Fetching non-compliant equipment', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          e.equipment_name,
          ei.serial_number,
          ei.location,
          ei.compliance_status,
          TO_CHAR(ei.next_maintenance_date, 'Mon DD, YYYY') AS next_maintenance,
          (ei.next_maintenance_date - CURRENT_DATE)::text AS days_until_maintenance,
          TO_CHAR(ei.expiry_date, 'Mon DD, YYYY') AS expiry_date,
          (ei.expiry_date - CURRENT_DATE)::text AS days_until_expiry
      FROM public.equipment_instance ei
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.compliance_status IN ('overdue', 'expired', 'due_soon')
      ORDER BY 
          CASE ei.compliance_status 
              WHEN 'expired' THEN 1 
              WHEN 'overdue' THEN 2 
              WHEN 'due_soon' THEN 3 
          END,
          COALESCE(ei.next_maintenance_date, ei.expiry_date) ASC;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get upcoming events (maintenance, expiry, warranty)
   */
  async getUpcomingEvents(clientId: number): Promise<UpcomingEvent[]> {
    DebugLogger.log('Fetching upcoming events', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT 
          sub.type,
          sub.title,
          sub.date,
          sub.days_until::text AS days_until,
          sub.location
      FROM (
          SELECT
              'maintenance' AS type,
              e.equipment_name || ' (' || ei.serial_number || ')' AS title,
              TO_CHAR(ei.next_maintenance_date, 'Mon DD, YYYY') AS date,
              (ei.next_maintenance_date - CURRENT_DATE) AS days_until,
              ei.location,
              ei.next_maintenance_date AS sort_date
      FROM public.equipment_instance ei
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.next_maintenance_date <= CURRENT_DATE + 30
        AND ei.next_maintenance_date >= CURRENT_DATE

      UNION ALL

      SELECT
          'expiry' AS type,
          e.equipment_name || ' (' || ei.serial_number || ')' AS title,
          TO_CHAR(ei.expiry_date, 'Mon DD, YYYY') AS date,
          (ei.expiry_date - CURRENT_DATE) AS days_until,
          ei.location,
          ei.expiry_date AS sort_date
      FROM public.equipment_instance ei
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.expiry_date <= CURRENT_DATE + 30
        AND ei.expiry_date >= CURRENT_DATE

      UNION ALL

      SELECT
          'warranty' AS type,
          e.equipment_name || ' (' || ei.serial_number || ')' AS title,
          TO_CHAR(ei.warranty_expiry, 'Mon DD, YYYY') AS date,
          (ei.warranty_expiry - CURRENT_DATE) AS days_until,
          ei.location,
          ei.warranty_expiry AS sort_date
      FROM public.equipment_instance ei
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.warranty_expiry <= CURRENT_DATE + 60
        AND ei.warranty_expiry >= CURRENT_DATE
    ) sub
    ORDER BY sub.days_until ASC, sub.type, sub.sort_date;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get recent notifications
   */
  async getRecentNotifications(clientId: number): Promise<RecentNotification[]> {
    DebugLogger.log('Fetching recent notifications', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          n.title,
          n.message,
          n.priority,
          TO_CHAR(n.created_at, 'Mon DD, YYYY HH12:MI AM') AS created_at,
          n.is_read
      FROM public.notification n
      WHERE n.user_id = (SELECT user_id FROM public.clients WHERE id = $1)
      ORDER BY n.created_at DESC
      LIMIT 10;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get login history for line chart
   */
  async getLoginHistory(
    clientId: number,
    startDate: string,
    endDate: string
  ): Promise<LoginHistory[]> {
    DebugLogger.log('Fetching login history', { clientId, startDate, endDate }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          DATE_TRUNC('week', us.last_activity)::date AS week,
          COUNT(*)::int AS sessions,
          COUNT(*) FILTER (WHERE us.ip_address::text NOT LIKE '192.168.%' AND us.ip_address::text NOT LIKE '10.%')::int AS external_logins
      FROM public.user_sessions us
      WHERE us.user_id = (SELECT user_id FROM public.clients WHERE id = $1)
        AND us.is_active = true
        AND us.last_activity::date BETWEEN $2 AND $3
      GROUP BY week
      ORDER BY week;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get account security summary
   */
  async getAccountSecurity(clientId: number): Promise<AccountSecurity> {
    DebugLogger.log('Fetching account security', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          COUNT(*)::text AS total_resets,
          COUNT(*) FILTER (WHERE pr.created_at > NOW() - INTERVAL '1 year')::text AS resets_last_year,
          MAX(pr.created_at)::text AS last_reset
      FROM public.password_reset pr
      WHERE pr.user_id = (SELECT user_id FROM public.clients WHERE id = $1)
        AND pr.used = true;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows[0];
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(clientId: number): Promise<ActiveSession[]> {
    DebugLogger.log('Fetching active sessions', { clientId }, 'CLIENT_ANALYTICS');

    const query = `
      SELECT
          us.ip_address,
          us.user_agent,
          TO_CHAR(us.last_activity, 'Mon DD, YYYY HH12:MI AM') AS last_active,
          EXTRACT(EPOCH FROM (NOW() - us.last_activity))/60::float AS minutes_ago
      FROM public.user_sessions us
      WHERE us.user_id = (SELECT user_id FROM public.clients WHERE id = $1)
        AND us.is_active = true
      ORDER BY us.last_activity DESC;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get detailed equipment list for PDF export
   */
  async getEquipmentListForPDF(clientId: number) {
    const query = `
      SELECT 
          e.id,
          e.equipment_tag,
          e.equipment_name,
          et.name AS equipment_type,
          e.location,
          v.name AS vendor_name,
          v.contact_email AS vendor_email,
          v.contact_phone AS vendor_phone,
          e.installation_date,
          e.last_inspection_date,
          e.next_inspection_due,
          e.status,
          CASE 
              WHEN e.status = 'compliant' THEN 'Compliant'
              WHEN e.status = 'due_soon' THEN 'Due Soon'
              WHEN e.status = 'overdue' THEN 'Overdue'
              WHEN e.status = 'out_of_service' THEN 'Out of Service'
              ELSE 'Unknown'
          END AS compliance_status,
          CASE 
              WHEN e.next_inspection_due < NOW() AND e.status != 'out_of_service' THEN 'Critical'
              WHEN e.next_inspection_due <= NOW() + INTERVAL '30 days' AND e.status != 'out_of_service' THEN 'Warning'
              ELSE 'Normal'
          END AS priority_level
      FROM public.equipment e
      JOIN public.equipment_types et ON e.equipment_type_id = et.id
      JOIN public.vendors v ON e.vendor_id = v.id
      WHERE e.client_id = $1
      ORDER BY 
          CASE 
              WHEN e.status = 'overdue' THEN 1
              WHEN e.status = 'due_soon' THEN 2
              WHEN e.status = 'compliant' THEN 3
              WHEN e.status = 'out_of_service' THEN 4
              ELSE 5
          END,
          e.next_inspection_due ASC;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get compliance summary for PDF overview
   */
  async getComplianceSummaryForPDF(clientId: number) {
    const query = `
      SELECT 
          COUNT(*) as total_equipment,
          SUM(CASE WHEN e.status = 'compliant' THEN 1 ELSE 0 END) as compliant_count,
          SUM(CASE WHEN e.status = 'due_soon' THEN 1 ELSE 0 END) as due_soon_count,
          SUM(CASE WHEN e.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
          SUM(CASE WHEN e.status = 'out_of_service' THEN 1 ELSE 0 END) as out_of_service_count,
          ROUND(
              (SUM(CASE WHEN e.status = 'compliant' THEN 1 ELSE 0 END)::float / 
               NULLIF(COUNT(*), 0)) * 100, 1
          ) as compliance_percentage
      FROM public.equipment e
      WHERE e.client_id = $1;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows[0];
  }

  /**
   * Get upcoming inspection events for PDF
   */
  async getUpcomingEventsForPDF(clientId: number, daysAhead: number = 90) {
    const query = `
      SELECT 
          e.equipment_tag,
          e.equipment_name,
          et.name AS equipment_type,
          e.location,
          e.next_inspection_due,
          CASE 
              WHEN e.next_inspection_due < NOW() THEN 'Overdue'
              WHEN e.next_inspection_due <= NOW() + INTERVAL '7 days' THEN 'This Week'
              WHEN e.next_inspection_due <= NOW() + INTERVAL '30 days' THEN 'This Month'
              ELSE 'Future'
          END AS urgency,
          DATE_PART('days', e.next_inspection_due - NOW())::int AS days_until_due
      FROM public.equipment e
      JOIN public.equipment_types et ON e.equipment_type_id = et.id
      WHERE e.client_id = $1
        AND e.status != 'out_of_service'
        AND e.next_inspection_due <= NOW() + INTERVAL '$2 days'
      ORDER BY e.next_inspection_due ASC
      LIMIT 20;
    `;

    const result = await this.pool.query(query, [clientId, daysAhead]);
    return result.rows;
  }

  /**
   * Get unresolved maintenance tickets for PDF
   */
  async getUnresolvedTicketsForPDF(clientId: number) {
    const query = `
      SELECT 
          mt.id,
          mt.title,
          mt.description,
          mt.priority,
          mt.status,
          e.equipment_tag,
          e.equipment_name,
          et.name AS equipment_type,
          mt.created_at,
          mt.updated_at,
          CASE 
              WHEN mt.priority = 'critical' THEN 'Critical'
              WHEN mt.priority = 'high' THEN 'High'
              WHEN mt.priority = 'medium' THEN 'Medium'
              WHEN mt.priority = 'low' THEN 'Low'
              ELSE 'Normal'
          END AS priority_display,
          DATE_PART('days', NOW() - mt.created_at)::int AS days_open
      FROM public.maintenance_tickets mt
      JOIN public.equipment e ON mt.equipment_id = e.id
      JOIN public.equipment_types et ON e.equipment_type_id = et.id
      WHERE e.client_id = $1
        AND mt.status NOT IN ('resolved', 'closed')
      ORDER BY 
          CASE 
              WHEN mt.priority = 'critical' THEN 1
              WHEN mt.priority = 'high' THEN 2
              WHEN mt.priority = 'medium' THEN 3
              WHEN mt.priority = 'low' THEN 4
              ELSE 5
          END,
          mt.created_at DESC
      LIMIT 15;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get comprehensive PDF report data in one call
   */
  async getPDFReportData(clientId: number) {
    try {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const [
        overview,
        equipmentList,
        complianceSummary,
        upcomingEvents,
        unresolvedTickets
      ] = await Promise.all([
        this.getClientOverview(clientId, startDate, endDate),
        this.getEquipmentListForPDF(clientId),
        this.getComplianceSummaryForPDF(clientId),
        this.getUpcomingEventsForPDF(clientId),
        this.getUnresolvedTicketsForPDF(clientId)
      ]);

      return {
        overview,
        equipmentList,
        complianceSummary,
        upcomingEvents,
        unresolvedTickets,
        generatedAt: new Date().toISOString(),
        reportPeriod: {
          startDate,
          endDate
        }
      };
    } catch (error) {
      console.error('Error generating PDF report data:', error);
      throw error;
    }
  }

  /**
   * NEW CORRECTED METHODS BASED ON SCHEMA ANALYSIS
   */

  /**
   * Get client ticket statistics for a specific user ID
   */
  async getClientTicketStats(userId: number, startDate: string, endDate: string) {
    const query = `
      WITH client_data AS (
          SELECT 
              c.id AS client_id,
              u.display_name AS client_name
          FROM public.clients c
          JOIN public."user" u ON c.user_id = u.id
          WHERE u.id = $1  -- logged-in client user_id
            AND c.status = 'active'
            AND u.deleted_at IS NULL
      ),
      ticket_stats AS (
          SELECT
              COUNT(*)::text AS total_tickets,
              COUNT(*) FILTER (WHERE mt.ticket_status = 'open')::text AS open_tickets,
              COUNT(*) FILTER (WHERE mt.priority = 'high')::text AS high_priority_tickets,
              COUNT(*) FILTER (WHERE mt.ticket_status = 'resolved')::text AS resolved_tickets
          FROM public.maintenance_ticket mt
          JOIN client_data cd ON mt.client_id = cd.client_id
          WHERE mt.created_at::date BETWEEN $2 AND $3
            AND mt.deleted_at IS NULL
      )
      SELECT
          cd.client_name,
          ts.total_tickets,
          ts.open_tickets,
          ts.high_priority_tickets,
          ts.resolved_tickets
      FROM client_data cd
      CROSS JOIN ticket_stats ts;
    `;

    const result = await this.pool.query(query, [userId, startDate, endDate]);
    return result.rows[0] || {};
  }

  /**
   * Get client equipment summary for a specific user ID
   */
  async getClientEquipmentSummary(userId: number) {
    const query = `
      WITH client_data AS (
          SELECT 
              c.id AS client_id
          FROM public.clients c
          JOIN public."user" u ON c.user_id = u.id
          WHERE u.id = $1
            AND c.status = 'active'
            AND u.deleted_at IS NULL
      ),
      instances AS (
          SELECT 
              ei.id,
              ei.serial_number,
              ei.location,
              ei.compliance_status,
              ei.next_maintenance_date,
              ei.expiry_date
          FROM public.equipment_instance ei
          WHERE ei.assigned_to = (SELECT client_id FROM client_data)
            AND ei.status = 'assigned'
            AND ei.deleted_at IS NULL
      )
      SELECT
          COUNT(*)::text AS total_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'compliant')::text AS compliant,
          COUNT(*) FILTER (WHERE compliance_status = 'expired')::text AS expired,
          COUNT(*) FILTER (WHERE compliance_status = 'overdue')::text AS overdue,
          COUNT(*) FILTER (WHERE next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days')::text AS due_soon
      FROM instances;
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows[0] || {};
  }

  /**
   * Get client upcoming events for a specific user ID
   */
  async getClientUpcomingEvents(userId: number) {
    const query = `
      WITH client_data AS (
          SELECT 
              c.id AS client_id
          FROM public.clients c
          JOIN public."user" u ON c.user_id = u.id
          WHERE u.id = $1
            AND c.status = 'active'
            AND u.deleted_at IS NULL
      ),
      events AS (
          SELECT
              'maintenance' AS type,
              e.equipment_name AS equipment,
              ei.serial_number,
              ei.next_maintenance_date AS event_date,
              (ei.next_maintenance_date - CURRENT_DATE)::text AS days_until
          FROM public.equipment_instance ei
          JOIN public.equipment e ON ei.equipment_id = e.id
          WHERE ei.assigned_to = (SELECT client_id FROM client_data)
            AND ei.status = 'assigned'
            AND ei.deleted_at IS NULL
            AND ei.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          
          UNION ALL
          
          SELECT
              'expiry' AS type,
              e.equipment_name AS equipment,
              ei.serial_number,
              ei.expiry_date AS event_date,
              (ei.expiry_date - CURRENT_DATE)::text AS days_until
          FROM public.equipment_instance ei
          JOIN public.equipment e ON ei.equipment_id = e.id
          WHERE ei.assigned_to = (SELECT client_id FROM client_data)
            AND ei.status = 'assigned'
            AND ei.deleted_at IS NULL
            AND ei.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          
          UNION ALL
          
          SELECT
              'warranty' AS type,
              e.equipment_name AS equipment,
              ei.serial_number,
              ei.warranty_expiry AS event_date,
              (ei.warranty_expiry - CURRENT_DATE)::text AS days_until
          FROM public.equipment_instance ei
          JOIN public.equipment e ON ei.equipment_id = e.id
          WHERE ei.assigned_to = (SELECT client_id FROM client_data)
            AND ei.status = 'assigned'
            AND ei.deleted_at IS NULL
            AND ei.warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      )
      SELECT
          COUNT(*) FILTER (WHERE days_until::int <= 7)::text AS critical_next_7d,
          COALESCE(jsonb_agg(jsonb_build_object(
              'type', type,
              'equipment', equipment,
              'serial_number', serial_number,
              'event_date', TO_CHAR(event_date, 'Mon DD, YYYY'),
              'days_until', days_until
          ) ORDER BY days_until::int ASC) FILTER (WHERE event_date IS NOT NULL), '[]'::jsonb) AS upcoming_events
      FROM events;
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows[0] || {};
  }

  /**
   * Get client compliance trends
   */
  async getClientComplianceTrends(clientId: number, startDate: string, endDate: string) {
    const query = `
      SELECT
          DATE_TRUNC('month', ei.updated_at)::date AS month,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
          COALESCE(ROUND(
              COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::float / NULLIF(COUNT(*), 0) * 100, 1
          ), 0) AS compliance_rate_pct
      FROM public.equipment_instance ei
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.updated_at::date BETWEEN $2 AND $3
      GROUP BY month
      ORDER BY month;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get client maintenance ticket trends
   */
  async getClientMaintenanceTrends(clientId: number, startDate: string, endDate: string) {
    const query = `
      SELECT
          DATE_TRUNC('month', mt.created_at)::date AS month,
          COUNT(*) AS submitted,
          COUNT(*) FILTER (WHERE mt.ticket_status = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE mt.priority = 'high') AS high_priority,
          ROUND(AVG(CASE WHEN mt.ticket_status = 'resolved'
               THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/86400 
               ELSE NULL END), 1) AS avg_resolution_days
      FROM public.maintenance_ticket mt
      WHERE mt.client_id = $1
        AND mt.deleted_at IS NULL
        AND mt.created_at::date BETWEEN $2 AND $3
      GROUP BY month
      ORDER BY month;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get equipment compliance distribution
   */
  async getClientEquipmentCompliance(clientId: number) {
    const query = `
      SELECT
          ei.compliance_status AS status,
          COUNT(*) AS count
      FROM public.equipment_instance ei
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
      GROUP BY ei.compliance_status
      ORDER BY count DESC;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get maintenance ticket types distribution
   */
  async getClientTicketTypes(clientId: number, startDate: string, endDate: string) {
    const query = `
      SELECT
          mt.support_type AS type,
          COUNT(*) AS count
      FROM public.maintenance_ticket mt
      WHERE mt.client_id = $1
        AND mt.deleted_at IS NULL
        AND mt.created_at::date BETWEEN $2 AND $3
      GROUP BY mt.support_type
      ORDER BY count DESC;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get equipment type distribution
   */
  async getClientEquipmentTypes(clientId: number) {
    const query = `
      SELECT
          e.equipment_type,
          COUNT(ei.id) AS instance_count
      FROM public.equipment_instance ei
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
      GROUP BY e.equipment_type
      ORDER BY instance_count DESC;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get equipment age distribution
   */
  async getClientEquipmentAges(clientId: number) {
    const query = `
      SELECT
          DATE_TRUNC('year', ei.purchase_date)::date AS year,
          COUNT(*) AS count
      FROM public.equipment_instance ei
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.purchase_date IS NOT NULL
      GROUP BY year
      ORDER BY year ASC;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get non-compliant equipment details
   */
  async getClientNonCompliantEquipment(clientId: number) {
    const query = `
      SELECT
          e.equipment_name,
          ei.serial_number,
          ei.compliance_status,
          TO_CHAR(ei.next_maintenance_date, 'Mon DD, YYYY') AS next_maintenance,
          (ei.next_maintenance_date - CURRENT_DATE)::text AS days_until_maintenance,
          ei.location
      FROM public.equipment_instance ei
      JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE ei.assigned_to = $1
        AND ei.status = 'assigned'
        AND ei.deleted_at IS NULL
        AND ei.compliance_status IN ('expired', 'overdue', 'due_soon')
      ORDER BY 
        CASE ei.compliance_status 
          WHEN 'expired' THEN 1 
          WHEN 'overdue' THEN 2 
          WHEN 'due_soon' THEN 3 
          ELSE 4 
        END,
        days_until_maintenance::int ASC NULLS LAST;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get recent maintenance tickets
   */
  async getClientRecentTickets(clientId: number) {
    const query = `
      SELECT
          mt.ticket_number,
          COALESCE(e.equipment_name, 'System') AS equipment,
          mt.issue_description,
          mt.ticket_status AS status,
          TO_CHAR(mt.scheduled_date, 'Mon DD, YYYY') AS scheduled_date,
          TO_CHAR(mt.resolved_at, 'Mon DD, YYYY HH12:MI AM') AS resolved_date
      FROM public.maintenance_ticket mt
      LEFT JOIN public.equipment_instance ei ON mt.equipment_instance_id = ei.id
      LEFT JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE mt.client_id = $1
        AND mt.deleted_at IS NULL
      ORDER BY mt.created_at DESC
      LIMIT 10;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }

  /**
   * Get client user activity (sessions)
   */
  async getClientUserActivity(clientId: number, startDate: string, endDate: string) {
    const query = `
      SELECT
          DATE_TRUNC('week', us.last_activity)::date AS week,
          COUNT(*) AS sessions
      FROM public.user_sessions us
      JOIN public."user" u ON us.user_id = u.id
      JOIN public.clients c ON u.id = c.user_id
      WHERE c.id = $1
        AND us.is_active = true
        AND us.last_activity::date BETWEEN $2 AND $3
      GROUP BY week
      ORDER BY week;
    `;

    const result = await this.pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get client notifications
   */
  async getClientNotifications(clientId: number) {
    const query = `
      SELECT
          n.title,
          n.message,
          n.priority,
          TO_CHAR(n.created_at, 'Mon DD, YYYY HH12:MI AM') AS created_at
      FROM public.notification n
      JOIN public."user" u ON n.user_id = u.id
      JOIN public.clients c ON u.id = c.user_id
      WHERE c.id = $1
      ORDER BY n.created_at DESC
      LIMIT 10;
    `;

    const result = await this.pool.query(query, [clientId]);
    return result.rows;
  }
}