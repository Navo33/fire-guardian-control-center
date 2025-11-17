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
              (SELECT COUNT(*) FROM public.vendors WHERE status = 'active' AND ($3 IS NULL OR id = $3)) AS active_vendors,
              (SELECT COUNT(*) FROM public.clients WHERE status = 'active' AND ($3 IS NULL OR created_by_vendor_id = $3)) AS active_clients,
              (SELECT COUNT(*) FROM public.equipment_instance WHERE deleted_at IS NULL AND ($3 IS NULL OR vendor_id = $3)) AS total_equipment_instances,
              (SELECT COUNT(*) FROM public.equipment_instance WHERE status = 'assigned' AND deleted_at IS NULL AND ($3 IS NULL OR vendor_id = $3)) AS assigned_equipment,
              (SELECT COUNT(*) FROM public.maintenance_ticket WHERE created_at::date BETWEEN $1::date AND $2::date AND ($3 IS NULL OR vendor_id = $3)) AS tickets_in_period,
              (SELECT COUNT(*) FROM public."user" WHERE last_login::date BETWEEN $1::date AND $2::date AND deleted_at IS NULL 
                AND ($3 IS NULL OR user_type = 'admin' OR EXISTS (SELECT 1 FROM public.vendors WHERE user_id = "user".id AND id = $3))) AS user_logins_in_period
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
      FROM stats s
      CROSS JOIN user_dist ud
      GROUP BY s.active_vendors, s.active_clients, s.total_equipment_instances, s.assigned_equipment, s.tickets_in_period, s.user_logins_in_period;
    `;
    
    const result = await pool.query(query, [startDate, endDate, vendorId ? vendorId : null]);
    return result.rows[0] || {};
  }

  /**
   * 2. Compliance Analytics Summary (Vendor-Filtered)
   */
  static async getComplianceSummary(vendorId?: number) {
    const query = `
      WITH compliance_data AS (
          SELECT
              COUNT(ei.id) AS total_eq,
              COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant_eq,
              COUNT(*) FILTER (WHERE ei.compliance_status = 'expired') AS expired_eq,
              COUNT(*) FILTER (WHERE ei.compliance_status = 'overdue') AS overdue_eq
          FROM public.equipment_instance ei
          WHERE ei.deleted_at IS NULL
            AND ($1::int IS NULL OR ei.vendor_id = $1::int)
      ),
      vendor_compliance AS (
          SELECT
              v.id,
              COUNT(ei.id) AS total_equipment,
              COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant
          FROM public.vendors v
          LEFT JOIN public.equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
          WHERE v.status = 'active'
            AND ($1::int IS NULL OR v.id = $1::int)
          GROUP BY v.id
      ),
      low_compliance_vendors AS (
          SELECT COUNT(*) AS count
          FROM vendor_compliance vc
          WHERE vc.total_equipment > 0
            AND (vc.compliant::float / vc.total_equipment) < 0.8
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
      LEFT JOIN public.equipment_instance ei ON ei.deleted_at IS NULL AND ($1::int IS NULL OR ei.vendor_id = $1::int)
      LEFT JOIN public.equipment e ON e.id = ei.equipment_id AND e.deleted_at IS NULL
      GROUP BY cd.total_eq, cd.compliant_eq, cd.expired_eq, cd.overdue_eq, lcv.count;
    `;

    const result = await pool.query(query, [vendorId ? vendorId : null]);
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
        AND ($3::int IS NULL OR ei.vendor_id = $3::int)
      GROUP BY month
      ORDER BY month;
    `;

    const result = await pool.query(query, [startDate, endDate, vendorId ? vendorId : null]);
    return result.rows;
  }

  /**
   * 4. Compliance by Vendor (Stacked Bar Chart)
   */
  static async getComplianceByVendor() {
    const query = `
      SELECT
          v.company_name,
          COUNT(ei.id) AS total_equipment,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'expired') AS expired,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'overdue') AS overdue,
          COALESCE(ROUND((COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::numeric / NULLIF(COUNT(ei.id), 0)) * 100, 1), 0) AS compliance_rate_pct
      FROM public.vendors v
      LEFT JOIN public.equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
      WHERE v.status = 'active'
      GROUP BY v.id, v.company_name
      HAVING COUNT(ei.id) > 0
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
        AND ($3::int IS NULL OR mt.vendor_id = $3::int)
      GROUP BY month
      ORDER BY month;
    `;

    const result = await pool.query(query, [startDate, endDate, vendorId ? vendorId : null]);
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
      WHERE ($1::int IS NULL OR mt.vendor_id = $1::int)
      GROUP BY mt.support_type
      ORDER BY count DESC;
    `;

    const result = await pool.query(query, [vendorId ? vendorId : null]);
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
          COUNT(DISTINCT ei.id) AS equipment_assigned,
          COUNT(DISTINCT mt.id) AS tickets_raised,
          COALESCE(ROUND((COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::numeric / NULLIF(COUNT(ei.id), 0)) * 100, 1), 0) AS avg_compliance_pct,
          COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN u.id END) AS active_vendor_users,
          COALESCE(SUM(u.failed_login_attempts), 0) AS vendor_failed_logins
      FROM public.vendors v
      LEFT JOIN public.clients c ON c.created_by_vendor_id = v.id AND c.status = 'active'
      LEFT JOIN public.equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
      LEFT JOIN public.maintenance_ticket mt ON mt.vendor_id = v.id
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
        AND ($1::int IS NULL OR mt.vendor_id = $1::int)
      ORDER BY mt.created_at DESC
      LIMIT 10;
    `;

    const result = await pool.query(query, [vendorId ? vendorId : null]);
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
        AND ($1::int IS NULL OR e.vendor_id = $1::int)
        AND ($1::int IS NULL OR ei.vendor_id = $1::int OR ei.vendor_id IS NULL)
      GROUP BY e.equipment_type
      ORDER BY instance_count DESC;
    `;

    const result = await pool.query(query, [vendorId ? vendorId : null]);
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
          COUNT(*) FILTER (WHERE u.is_locked = true)::text AS locked_users,
          COALESCE(SUM(u.failed_login_attempts) FILTER (WHERE u.last_login > NOW() - INTERVAL '7 days'), 0)::text AS failed_logins_last_7d,
          COUNT(DISTINCT pr.id) FILTER (WHERE pr.created_at > NOW() - INTERVAL '24 hours')::text AS password_resets_24h,
          COUNT(DISTINCT us.id) FILTER (WHERE us.last_activity > NOW() - INTERVAL '1 hour')::text AS active_sessions
      FROM public."user" u
      LEFT JOIN public.password_reset pr ON pr.user_id = u.id
      LEFT JOIN public.user_sessions us ON us.user_id = u.id AND us.is_active = true
      WHERE u.deleted_at IS NULL;
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
          COUNT(*)::text AS total_tickets,
          COUNT(*) FILTER (WHERE ticket_status = 'open')::text AS open_tickets,
          COUNT(*) FILTER (WHERE priority = 'high')::text AS high_priority_tickets,
          COALESCE(ROUND(AVG(CASE WHEN ticket_status = 'resolved' AND resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
            ELSE NULL END)::numeric, 1), 0)::text AS avg_resolution_hours
      FROM public.maintenance_ticket
      WHERE created_at > NOW() - INTERVAL '30 days';
    `;

    const result = await pool.query(query);
    return result.rows[0] || {};
  }

  /**
   * NEW: Comprehensive PDF Report Data
   */
  static async getComprehensiveReportData(startDate: string, endDate: string, vendorId?: number) {
    const query = `
      WITH date_range AS (
        SELECT $1::date AS start_date, $2::date AS end_date
      ),
      system_metrics AS (
        SELECT
          (SELECT COUNT(*) FROM public.vendors WHERE status = 'active') AS total_vendors,
          (SELECT COUNT(*) FROM public.clients WHERE status = 'active') AS total_clients,
          (SELECT COUNT(*) FROM public.equipment_instance WHERE deleted_at IS NULL) AS total_equipment,
          (SELECT COUNT(*) FROM public.maintenance_ticket WHERE created_at >= $1::date AND created_at <= $2::date) AS period_tickets,
          (SELECT COUNT(*) FROM public."user" WHERE deleted_at IS NULL) AS total_users,
          (SELECT COUNT(*) FROM public."user" WHERE last_login >= $1::date AND deleted_at IS NULL) AS active_users,
          (SELECT COUNT(*) FROM public.maintenance_ticket WHERE ticket_status = 'open') AS open_tickets,
          (SELECT COUNT(*) FROM public.maintenance_ticket WHERE priority = 'high' AND ticket_status = 'open') AS critical_tickets
      ),
      compliance_breakdown AS (
        SELECT
          COUNT(*) AS total_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'compliant') AS compliant,
          COUNT(*) FILTER (WHERE compliance_status = 'expired') AS expired,
          COUNT(*) FILTER (WHERE compliance_status = 'overdue') AS overdue,
          COUNT(*) FILTER (WHERE compliance_status = 'due_soon') AS due_soon
        FROM public.equipment_instance 
        WHERE deleted_at IS NULL AND ($3::int IS NULL OR vendor_id = $3::int)
      ),
      vendor_performance AS (
        SELECT
          v.company_name,
          COUNT(DISTINCT c.id) AS client_count,
          COUNT(DISTINCT ei.id) AS equipment_count,
          ROUND(AVG(CASE WHEN ei.compliance_status = 'compliant' THEN 100.0 ELSE 0.0 END)::numeric, 1) AS compliance_rate,
          COUNT(DISTINCT mt.id) AS ticket_count,
          v.status
        FROM public.vendors v
        LEFT JOIN public.clients c ON c.created_by_vendor_id = v.id
        LEFT JOIN public.equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
        LEFT JOIN public.maintenance_ticket mt ON mt.vendor_id = v.id AND mt.created_at >= $1::date
        WHERE v.status = 'active' AND ($3::int IS NULL OR v.id = $3::int)
        GROUP BY v.id, v.company_name, v.status
        ORDER BY compliance_rate DESC, equipment_count DESC
      ),
      equipment_categories AS (
        SELECT
          e.equipment_type,
          COUNT(ei.id) AS count,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant_count,
          ROUND(COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::numeric / COUNT(ei.id) * 100, 1) AS compliance_rate
        FROM public.equipment e
        LEFT JOIN public.equipment_instance ei ON e.id = ei.equipment_id AND ei.deleted_at IS NULL
        WHERE e.deleted_at IS NULL 
          AND ($3::int IS NULL OR e.vendor_id = $3::int)
          AND ($3::int IS NULL OR ei.vendor_id = $3::int OR ei.vendor_id IS NULL)
        GROUP BY e.equipment_type
        ORDER BY count DESC
      ),
      ticket_analysis AS (
        SELECT
          support_type,
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE priority = 'high') AS high_priority,
          ROUND(AVG(CASE WHEN ticket_status = 'resolved' AND resolved_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 END)::numeric, 1) AS avg_resolution_hours
        FROM public.maintenance_ticket
        WHERE created_at >= $1::date AND created_at <= $2::date
          AND ($3::int IS NULL OR vendor_id = $3::int)
        GROUP BY support_type
        ORDER BY count DESC
      )
      SELECT
        json_build_object(
          'system_metrics', (SELECT row_to_json(system_metrics) FROM system_metrics),
          'compliance_breakdown', (SELECT row_to_json(compliance_breakdown) FROM compliance_breakdown),
          'vendor_performance', (SELECT json_agg(row_to_json(vendor_performance)) FROM vendor_performance),
          'equipment_categories', (SELECT json_agg(row_to_json(equipment_categories)) FROM equipment_categories),
          'ticket_analysis', (SELECT json_agg(row_to_json(ticket_analysis)) FROM ticket_analysis),
          'report_metadata', json_build_object(
            'generated_at', NOW(),
            'date_range', json_build_object('start', $1::date, 'end', $2::date),
            'vendor_filter', $3::int,
            'period_days', ($2::date - $1::date)
          )
        ) AS report_data;
    `;

    const result = await pool.query(query, [startDate, endDate, vendorId ? vendorId : null]);
    return result.rows[0]?.report_data || {};
  }

  /**
   * NEW: Security and User Analytics for PDF
   */
  static async getSecurityAnalytics(startDate: string, endDate: string) {
    const query = `
      WITH security_metrics AS (
        SELECT
          COUNT(*) FILTER (WHERE is_locked = true) AS locked_users,
          COUNT(*) FILTER (WHERE failed_login_attempts > 0) AS users_with_failed_attempts,
          SUM(failed_login_attempts) AS total_failed_attempts,
          COUNT(*) FILTER (WHERE last_login >= $1::date) AS active_users_period,
          COUNT(*) FILTER (WHERE created_at >= $1::date) AS new_users_period
        FROM public."user"
        WHERE deleted_at IS NULL
      ),
      session_metrics AS (
        SELECT
          COUNT(*) AS total_sessions,
          COUNT(*) FILTER (WHERE is_active = true) AS active_sessions,
          COUNT(DISTINCT user_id) AS unique_users_with_sessions
        FROM public.user_sessions
        WHERE created_at >= $1::date AND expires_at >= NOW()
      ),
      audit_summary AS (
        SELECT
          COUNT(*) AS total_events,
          COUNT(*) FILTER (WHERE action_type = 'login') AS login_events,
          COUNT(*) FILTER (WHERE action_type = 'insert') AS create_events,
          COUNT(*) FILTER (WHERE action_type = 'update') AS update_events,
          COUNT(*) FILTER (WHERE action_type = 'delete') AS delete_events,
          COUNT(DISTINCT ip_address) AS unique_ips
        FROM public.audit_log
        WHERE created_at >= $1::date AND created_at <= $2::date
      )
      SELECT
        json_build_object(
          'security_metrics', (SELECT row_to_json(security_metrics) FROM security_metrics),
          'session_metrics', (SELECT row_to_json(session_metrics) FROM session_metrics),
          'audit_summary', (SELECT row_to_json(audit_summary) FROM audit_summary)
        ) AS security_data;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows[0]?.security_data || {};
  }
}