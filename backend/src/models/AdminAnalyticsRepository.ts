import { pool } from '../config/database';

export class AdminAnalyticsRepository {
  
  /**
   * 1. System Overview KPIs + User Distribution (Enhanced with User Trends & Vendor Filter)
   */
  static async getSystemOverview(startDate: string, endDate: string, vendorId?: number) {
    const query = `
      WITH params AS (
          SELECT $1::date AS start_date, $2::date AS end_date, $3::int AS vendor_id
      ),
      stats AS (
          SELECT
              COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active' AND (p.vendor_id IS NULL OR v.id = p.vendor_id)) AS active_vendors,
              COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active' AND (p.vendor_id IS NULL OR c.created_by_vendor_id = p.vendor_id)) AS active_clients,
              COUNT(ei.id) FILTER (WHERE ei.deleted_at IS NULL AND (p.vendor_id IS NULL OR ei.vendor_id = p.vendor_id)) AS total_equipment_instances,
              COUNT(ei.id) FILTER (WHERE ei.status = 'assigned' AND ei.deleted_at IS NULL AND (p.vendor_id IS NULL OR ei.vendor_id = p.vendor_id)) AS assigned_equipment,
              COUNT(mt.id) FILTER (WHERE mt.created_at::date BETWEEN p.start_date AND p.end_date AND (p.vendor_id IS NULL OR mt.vendor_id = p.vendor_id)) AS tickets_in_period,
              COUNT(u.id) FILTER (WHERE u.last_login::date BETWEEN p.start_date AND p.end_date AND u.deleted_at IS NULL AND (p.vendor_id IS NULL OR EXISTS (SELECT 1 FROM vendors WHERE user_id = u.id AND id = p.vendor_id))) AS user_logins_in_period
          FROM params p
          LEFT JOIN public.vendors v ON true
          LEFT JOIN public.clients c ON true
          LEFT JOIN public.equipment_instance ei ON true
          LEFT JOIN public.maintenance_ticket mt ON true
          LEFT JOIN public."user" u ON true
      ),
      user_dist AS (
          SELECT
              user_type,
              COUNT(*) AS count
          FROM public."user"
          WHERE deleted_at IS NULL
          GROUP BY user_type
      )
      SELECT
          s.active_vendors::text,
          s.active_clients::text,
          s.total_equipment_instances::text,
          s.assigned_equipment::text,
          s.tickets_in_period::text,
          s.user_logins_in_period::text,
          COALESCE(ROUND((s.assigned_equipment::numeric / NULLIF(s.total_equipment_instances, 0)) * 100, 1), 0)::text AS assignment_rate_pct,
          COALESCE(jsonb_object_agg(ud.user_type, ud.count), '{}'::jsonb) AS user_distribution
      FROM stats s, user_dist ud
      GROUP BY s.active_vendors, s.active_clients, s.total_equipment_instances, s.assigned_equipment, s.tickets_in_period, s.user_logins_in_period;
    `;
    
    const result = await pool.query(query, [startDate, endDate, vendorId || null]);
    return result.rows[0] || {};
  }

  /**
   * 2. Compliance Analytics Summary (Vendor-Filtered)
   */
  static async getComplianceSummary(vendorId?: number) {
    const query = `
      WITH params AS (
          SELECT $1::int AS vendor_id
      ),
      compliance_data AS (
          SELECT
              SUM(total_equipment) AS total_eq,
              SUM(compliant) AS compliant_eq,
              SUM(expired) AS expired_eq,
              SUM(overdue) AS overdue_eq
          FROM public.compliance_report cr, params p
          WHERE p.vendor_id IS NULL OR cr.vendor_id = p.vendor_id
      ),
      low_compliance_vendors AS (
          SELECT COUNT(*) AS count
          FROM public.compliance_report cr, params p
          WHERE cr.total_equipment > 0
            AND (cr.compliant::float / cr.total_equipment) < 0.8
            AND (p.vendor_id IS NULL OR cr.vendor_id = p.vendor_id)
      )
      SELECT
          cd.total_eq::text,
          cd.compliant_eq::text,
          cd.expired_eq::text,
          cd.overdue_eq::text,
          COALESCE(ROUND((cd.compliant_eq::numeric / NULLIF(cd.total_eq, 0)) * 100, 1), 0)::text AS compliance_rate_pct,
          lcv.count::text AS vendors_below_80_pct,
          COALESCE(ROUND(AVG(e.default_lifespan_years)::numeric, 1), 0)::text AS avg_lifespan_years
      FROM compliance_data cd
      CROSS JOIN low_compliance_vendors lcv
      LEFT JOIN public.equipment e ON e.deleted_at IS NULL
      GROUP BY cd.total_eq, cd.compliant_eq, cd.expired_eq, cd.overdue_eq, lcv.count;
    `;

    const result = await pool.query(query, [vendorId || null]);
    return result.rows[0] || {};
  }

  /**
   * 3. Compliance Trend (Monthly Line Chart – Vendor-Filtered)
   */
  static async getComplianceTrend(startDate: string, endDate: string, vendorId?: number) {
    const query = `
      SELECT
          DATE_TRUNC('month', ei.updated_at)::date AS month,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
          ROUND(
              COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::numeric / NULLIF(COUNT(*), 0) * 100,
              1
          ) AS compliance_rate_pct
      FROM public.equipment_instance ei
      WHERE ei.deleted_at IS NULL
        AND ei.updated_at::date BETWEEN $1::date AND $2::date
        AND ( $3::integer IS NULL OR ei.vendor_id = $3::integer )
      GROUP BY month
      ORDER BY month;
    `;

    const result = await pool.query(query, [startDate, endDate, vendorId || null]);
    return result.rows;
  }

  /**
   * 4. Compliance by Vendor (Stacked Bar Chart)
   */
  static async getComplianceByVendor() {
    const query = `
      SELECT
          v.company_name,
          cr.total_equipment,
          cr.compliant,
          cr.expired,
          cr.overdue,
          COALESCE(ROUND((cr.compliant::numeric / NULLIF(cr.total_equipment, 0)) * 100, 1), 0) AS compliance_rate_pct
      FROM public.compliance_report cr
      JOIN public.vendors v ON cr.vendor_id = v.id
      WHERE v.status = 'active'
      ORDER BY compliance_rate_pct ASC, v.company_name;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 5. Ticket Trends (Line Chart)
   */
  static async getTicketTrends(startDate: string, endDate: string, vendorId?: number) {
    const query = `
      SELECT
          DATE_TRUNC('month', mt.created_at)::date AS month,
          COUNT(*) AS created,
          COUNT(*) FILTER (WHERE mt.ticket_status = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE mt.priority = 'high') AS high_priority,
          ROUND(AVG(CASE WHEN mt.ticket_status = 'resolved' THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/3600 ELSE NULL END)::numeric, 1) AS avg_resolution_hours
      FROM public.maintenance_ticket mt
      WHERE mt.created_at::date BETWEEN $1::date AND $2::date
        AND ( $3::integer IS NULL OR mt.vendor_id = $3::integer )
      GROUP BY month
      ORDER BY month;
    `;

    const result = await pool.query(query, [startDate, endDate, vendorId || null]);
    return result.rows;
  }

  /**
   * 6. Tickets by Type (Pie/Bar Chart)
   */
  static async getTicketsByType(vendorId?: number) {
    const query = `
      SELECT
          mt.support_type,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE mt.priority = 'high') AS high_priority
      FROM public.maintenance_ticket mt
      WHERE ( $1::integer IS NULL OR mt.vendor_id = $1::integer )
      GROUP BY mt.support_type
      ORDER BY count DESC;
    `;

    const result = await pool.query(query, [vendorId || null]);
    return result.rows;
  }

  /**
   * 7. Vendor Performance Rankings (Updated with User Metrics)
   */
  static async getVendorRankings() {
    const query = `
      SELECT
          v.company_name,
          COUNT(DISTINCT c.id) AS client_count,
          COUNT(ei.id) AS equipment_assigned,
          COUNT(mt.id) AS tickets_raised,
          COALESCE(ROUND(AVG(cr.compliant::numeric / NULLIF(cr.total_equipment, 0)) * 100, 1), 0) AS avg_compliance_pct,
          COUNT(DISTINCT u.id) FILTER (WHERE u.last_login > NOW() - INTERVAL '30 days' AND u.user_type = 'vendor') AS active_vendor_users,
          SUM(u.failed_login_attempts) FILTER (WHERE u.user_type = 'vendor') AS vendor_failed_logins
      FROM public.vendors v
      LEFT JOIN public.clients c ON c.created_by_vendor_id = v.id
      LEFT JOIN public.equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
      LEFT JOIN public.maintenance_ticket mt ON mt.vendor_id = v.id
      LEFT JOIN public.compliance_report cr ON cr.vendor_id = v.id
      LEFT JOIN public."user" u ON v.user_id = u.id AND u.deleted_at IS NULL
      WHERE v.status = 'active'
      GROUP BY v.id, v.company_name
      ORDER BY avg_compliance_pct DESC NULLS LAST, client_count DESC
      LIMIT 10;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 8. Recent High-Priority Tickets (Vendor-Filtered)
   */
  static async getRecentHighPriorityTickets(vendorId?: number) {
    const query = `
      SELECT
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
        AND ( $1::integer IS NULL OR mt.vendor_id = $1::integer )
      ORDER BY mt.created_at DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, [vendorId || null]);
    return result.rows;
  }

  /**
   * 9. User & Security Trends (New Line Chart for Logins)
   */
  static async getUserTrends(startDate: string, endDate: string) {
    const query = `
      SELECT
          DATE_TRUNC('week', u.last_login)::date AS week,
          COUNT(*) AS logins,
          COUNT(*) FILTER (WHERE u.user_type = 'vendor') AS vendor_logins,
          COUNT(*) FILTER (WHERE u.user_type = 'client') AS client_logins,
          SUM(u.failed_login_attempts) AS failed_attempts,
          COUNT(pr.id) AS password_resets
      FROM public."user" u
      LEFT JOIN public.password_reset pr ON pr.user_id = u.id AND pr.used = true
      WHERE u.deleted_at IS NULL
        AND u.last_login::date BETWEEN $1::date AND $2::date
      GROUP BY week
      ORDER BY week;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * 10. Password Resets (Pie Chart by Reason – From Notes/Metadata)
   */
  static async getPasswordResets() {
    const query = `
      SELECT
          CASE 
            WHEN pr.expires_at < NOW() AND pr.used = false THEN 'Expired Token'
            WHEN pr.used = true THEN 'Successfully Reset'
            WHEN pr.created_at > NOW() - INTERVAL '1 hour' THEN 'Recent Request'
            ELSE 'Pending Reset'
          END AS reason,
          COUNT(*) AS count
      FROM public.password_reset pr
      WHERE pr.created_at > NOW() - INTERVAL '30 days'
      GROUP BY reason
      ORDER BY count DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 11. Equipment Categories Breakdown (Pie Chart – Vendor-Filtered)
   */
  static async getEquipmentCategories(vendorId?: number) {
    const query = `
      SELECT
          e.equipment_type,
          COUNT(ei.id) AS instance_count
      FROM public.equipment e
      LEFT JOIN public.equipment_instance ei ON e.id = ei.equipment_id AND ei.deleted_at IS NULL
      WHERE e.deleted_at IS NULL
        AND ( $1::integer IS NULL OR ei.vendor_id = $1::integer )
      GROUP BY e.equipment_type
      ORDER BY instance_count DESC;
    `;

    const result = await pool.query(query, [vendorId || null]);
    return result.rows;
  }

  /**
   * 12. Audit Log Trends (Line Chart)
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
      WHERE al.created_at::date BETWEEN $1::date AND $2::date
      GROUP BY day
      ORDER BY day;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * 13. Recent Audit Events (Table)
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
      LEFT JOIN public."user" u ON al.changed_by = u.id
      ORDER BY al.created_at DESC
      LIMIT 15;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Legacy: Get security summary (Enhanced with better logic)
   */
  static async getSecuritySummary() {
    const query = `
      SELECT
          COUNT(*) FILTER (WHERE u.is_locked = true) AS locked_users,
          COALESCE(SUM(u.failed_login_attempts) FILTER (WHERE u.last_login > NOW() - INTERVAL '7 days'), 0) AS failed_logins_last_7d,
          COUNT(DISTINCT al.ip_address) FILTER (
              WHERE al.action_type = 'login_failed'
                AND al.created_at > NOW() - INTERVAL '24 hours'
          ) AS suspicious_ips_24h
      FROM public."user" u
      LEFT JOIN public.audit_log al ON al.changed_by = u.id;
    `;

    const result = await pool.query(query);
    return result.rows[0] || {};
  }

  /**
   * Legacy: Get maintenance tickets overview (Enhanced)
   */
  static async getTicketsOverview() {
    const query = `
      SELECT
          COUNT(*) AS total_tickets,
          COUNT(*) FILTER (WHERE ticket_status = 'open') AS open_tickets,
          COUNT(*) FILTER (WHERE priority = 'high') AS high_priority_tickets,
          COALESCE(ROUND(AVG(actual_hours)::numeric, 1), 0) AS avg_resolution_hours
      FROM public.maintenance_ticket
      WHERE created_at > NOW() - INTERVAL '30 days';
    `;

    const result = await pool.query(query);
    return result.rows[0] || {};
  }
}