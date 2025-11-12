import { pool } from '../config/database';

export class AdminAnalyticsRepository {
  
  /**
   * Get system overview statistics
   */
  static async getSystemOverview(startDate: string, endDate: string) {
    const query = `
      WITH params AS (
          SELECT $1::date AS start_date, $2::date AS end_date
      ),
      stats AS (
          SELECT
              (SELECT COUNT(*) FROM public.vendors WHERE status = 'active') AS active_vendors,
              (SELECT COUNT(*) FROM public.clients WHERE status = 'active') AS active_clients,
              (SELECT COUNT(*) FROM public.equipment_instance WHERE deleted_at IS NULL) AS total_equipment_instances,
              (SELECT COUNT(*) FROM public.equipment_instance WHERE status = 'assigned' AND deleted_at IS NULL) AS assigned_equipment,
              (SELECT COUNT(*) FROM public.maintenance_ticket mt, params p 
               WHERE mt.created_at::date BETWEEN p.start_date AND p.end_date) AS tickets_in_period
      ),
      user_dist AS (
          SELECT
              user_type,
              COUNT(*) AS count
          FROM public.user
          WHERE deleted_at IS NULL
          GROUP BY user_type
      )
      SELECT
          s.active_vendors::text,
          s.active_clients::text,
          s.total_equipment_instances::text,
          s.assigned_equipment::text,
          s.tickets_in_period::text,
          COALESCE(ROUND((s.assigned_equipment::float / NULLIF(s.total_equipment_instances, 0) * 100)::numeric, 1), 0)::text AS assignment_rate_pct,
          COALESCE(jsonb_object_agg(ud.user_type, ud.count), '{}'::jsonb) AS user_distribution
      FROM stats s
      LEFT JOIN user_dist ud ON TRUE
      GROUP BY s.active_vendors, s.active_clients, s.total_equipment_instances, s.assigned_equipment, s.tickets_in_period
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows[0];
  }

  /**
   * Get compliance analytics summary
   */
  static async getComplianceSummary() {
    const query = `
      WITH compliance_data AS (
          SELECT
              SUM(total_equipment) AS total_eq,
              SUM(compliant) AS compliant_eq,
              SUM(expired) AS expired_eq,
              SUM(overdue) AS overdue_eq
          FROM public.compliance_report
      ),
      low_compliance_vendors AS (
          SELECT COUNT(*) AS count
          FROM public.compliance_report cr
          WHERE cr.total_equipment > 0
            AND (cr.compliant::float / cr.total_equipment) < 0.8
      )
      SELECT
          cd.total_eq::text,
          cd.compliant_eq::text,
          cd.expired_eq::text,
          cd.overdue_eq::text,
          COALESCE(ROUND((cd.compliant_eq::float / NULLIF(cd.total_eq, 0) * 100)::numeric, 1), 0)::text AS compliance_rate_pct,
          lcv.count::text AS vendors_below_80_pct,
          COALESCE(ROUND(AVG(e.default_lifespan_years)::numeric, 1), 0)::text AS avg_lifespan_years
      FROM compliance_data cd
      CROSS JOIN low_compliance_vendors lcv
      LEFT JOIN public.equipment e ON e.deleted_at IS NULL
      GROUP BY cd.total_eq, cd.compliant_eq, cd.expired_eq, cd.overdue_eq, lcv.count
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Get compliance trend over time
   */
  static async getComplianceTrend(startDate: string, endDate: string) {
    const query = `
      SELECT
          DATE_TRUNC('month', ei.updated_at)::date AS month,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
          ROUND(
              (COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::float / NULLIF(COUNT(*), 0) * 100)::numeric,
              1
          ) AS compliance_rate_pct
      FROM public.equipment_instance ei
      WHERE ei.deleted_at IS NULL
        AND ei.updated_at::date BETWEEN $1 AND $2
      GROUP BY month
      ORDER BY month
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get compliance by vendor
   */
  static async getComplianceByVendor() {
    const query = `
      SELECT
          v.company_name,
          cr.total_equipment,
          cr.compliant,
          cr.expired,
          cr.overdue,
          COALESCE(ROUND((cr.compliant::float / NULLIF(cr.total_equipment, 0)) * 100, 1), 0) AS compliance_rate_pct
      FROM public.compliance_report cr
      JOIN public.vendors v ON cr.vendor_id = v.id
      WHERE v.status = 'active'
      ORDER BY compliance_rate_pct ASC, v.company_name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get ticket trends over time
   */
  static async getTicketTrends(startDate: string, endDate: string) {
    const query = `
      SELECT
          DATE_TRUNC('month', mt.created_at)::date AS month,
          COUNT(*) AS created,
          COUNT(*) FILTER (WHERE mt.ticket_status = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE mt.priority = 'high') AS high_priority
      FROM public.maintenance_ticket mt
      WHERE mt.created_at::date BETWEEN $1 AND $2
      GROUP BY month
      ORDER BY month
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get tickets by type
   */
  static async getTicketsByType() {
    const query = `
      SELECT
          mt.support_type,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE mt.priority = 'high') AS high_priority
      FROM public.maintenance_ticket mt
      GROUP BY mt.support_type
      ORDER BY count DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get vendor performance rankings
   */
  static async getVendorRankings() {
    const query = `
      SELECT
          v.company_name,
          COUNT(DISTINCT c.id) AS client_count,
          COUNT(ei.id) AS equipment_assigned,
          COUNT(mt.id) AS tickets_raised,
          COALESCE(ROUND((AVG(cr.compliant::float / NULLIF(cr.total_equipment, 0)) * 100)::numeric, 1), 0) AS avg_compliance_pct
      FROM public.vendors v
      LEFT JOIN public.clients c ON c.created_by_vendor_id = v.id AND c.status = 'active'
      LEFT JOIN public.equipment_instance ei ON ei.vendor_id = v.id AND ei.status = 'assigned' AND ei.deleted_at IS NULL
      LEFT JOIN public.maintenance_ticket mt ON mt.vendor_id = v.id
      LEFT JOIN public.compliance_report cr ON cr.vendor_id = v.id
      WHERE v.status = 'active'
      GROUP BY v.id, v.company_name
      ORDER BY avg_compliance_pct DESC NULLS LAST, client_count DESC
      LIMIT 10
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get recent high-priority tickets
   */
  static async getRecentHighPriorityTickets() {
    const query = `
      SELECT
          mt.id,
          mt.ticket_number,
          v.company_name AS vendor,
          c.company_name AS client,
          e.equipment_name,
          ei.serial_number,
          mt.issue_description,
          mt.ticket_status,
          TO_CHAR(mt.created_at, 'Mon DD, YYYY HH12:MI AM') AS created
      FROM public.maintenance_ticket mt
      LEFT JOIN public.vendors v ON mt.vendor_id = v.id
      LEFT JOIN public.clients c ON mt.client_id = c.id
      LEFT JOIN public.equipment_instance ei ON mt.equipment_instance_id = ei.id
      LEFT JOIN public.equipment e ON ei.equipment_id = e.id
      WHERE mt.priority = 'high'
      ORDER BY mt.created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get audit log trends
   */
  static async getAuditTrends(startDate: string, endDate: string) {
    const query = `
      SELECT
          DATE_TRUNC('day', al.created_at)::date AS day,
          COUNT(*) AS total_events,
          COUNT(*) FILTER (WHERE al.action_type = 'insert') AS inserts,
          COUNT(*) FILTER (WHERE al.action_type = 'update') AS updates,
          COUNT(*) FILTER (WHERE al.action_type = 'delete') AS deletes
      FROM public.audit_log al
      WHERE al.created_at::date BETWEEN $1 AND $2
      GROUP BY day
      ORDER BY day
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Get recent audit events
   */
  static async getRecentAuditEvents() {
    const query = `
      SELECT
          al.table_name,
          al.action_type,
          u.display_name AS changed_by,
          al.ip_address,
          TO_CHAR(al.created_at, 'Mon DD, YYYY HH12:MI AM') AS timestamp,
          al.record_id
      FROM public.audit_log al
      LEFT JOIN public.user u ON al.changed_by = u.id
      ORDER BY al.created_at DESC
      LIMIT 15
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get equipment categories breakdown
   */
  static async getEquipmentCategories() {
    const query = `
      SELECT
          e.equipment_type,
          COUNT(ei.id) AS instance_count
      FROM public.equipment e
      LEFT JOIN public.equipment_instance ei ON e.id = ei.equipment_id AND ei.deleted_at IS NULL
      WHERE e.deleted_at IS NULL
      GROUP BY e.equipment_type
      ORDER BY instance_count DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get security summary
   */
  static async getSecuritySummary() {
    const query = `
      SELECT
          COUNT(*) FILTER (WHERE u.is_locked = true)::text AS locked_users,
          COALESCE(SUM(u.failed_login_attempts) FILTER (WHERE u.last_login > NOW() - INTERVAL '7 days'), 0)::text AS failed_logins_last_7d,
          COUNT(DISTINCT al.ip_address) FILTER (
              WHERE al.action_type = 'login_failed'
                AND al.created_at > NOW() - INTERVAL '24 hours'
          )::text AS suspicious_ips_24h
      FROM public.user u
      LEFT JOIN public.audit_log al ON al.changed_by = u.id

    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Get maintenance tickets overview
   */
  static async getTicketsOverview() {
    const query = `
      SELECT
          COUNT(*) AS total_tickets,
          COUNT(*) FILTER (WHERE ticket_status = 'open') AS open_tickets,
          COUNT(*) FILTER (WHERE priority = 'high') AS high_priority_tickets,
          COALESCE(ROUND(AVG(actual_hours)::numeric, 1), 0) AS avg_resolution_hours
      FROM public.maintenance_ticket
      WHERE created_at > NOW() - INTERVAL '30 days'
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}