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
      WITH params AS (
          SELECT 
              $1::int AS client_id,
              $2::date AS start_date,
              $3::date AS end_date,
              $4::text AS equipment_type
      ),
      stats AS (
          SELECT
              COUNT(DISTINCT ei.id) AS total_assigned,
              COUNT(DISTINCT CASE WHEN ei.compliance_status = 'compliant' THEN ei.id END) AS compliant,
              COUNT(DISTINCT CASE WHEN mt.ticket_status = 'open' THEN mt.id END) AS open_requests,
              COUNT(DISTINCT CASE WHEN ei.next_maintenance_date <= CURRENT_DATE + 30 THEN ei.id END) AS due_soon,
              COUNT(DISTINCT CASE WHEN ei.expiry_date <= CURRENT_DATE + 30 THEN ei.id END) AS expiring_soon,
              COUNT(DISTINCT CASE WHEN n.is_read = false THEN n.id END) AS unread_notifications
          FROM params p
          LEFT JOIN public.equipment_instance ei ON ei.assigned_to = p.client_id
            AND ei.status = 'assigned'
            AND ei.deleted_at IS NULL
          LEFT JOIN public.maintenance_ticket mt ON mt.equipment_instance_id = ei.id 
              AND mt.client_id = p.client_id
          LEFT JOIN public.notification n ON n.user_id = (
              SELECT user_id FROM public.clients WHERE id = p.client_id
          ) AND n.is_read = false
          WHERE (p.equipment_type IS NULL OR EXISTS (
                SELECT 1 FROM public.equipment e 
                WHERE e.id = ei.equipment_id 
                  AND e.equipment_type = p.equipment_type
            ))
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
}