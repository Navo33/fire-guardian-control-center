import { pool } from '../config/database';

export class AdminAnalyticsRepository {
  
  /**
   * 1. System Overview KPIs + User Distribution (Enhanced with User Trends & Vendor Filter)
   */
  static async getSystemOverview(startDate: string, endDate: string, vendorId?: number) {
    let query: string;
    let params: any[];

    if (vendorId) {
      query = `
        WITH stats AS (
            SELECT
                (SELECT COUNT(*) FROM vendors WHERE status = 'active' AND id = $3) AS active_vendors,
                (SELECT COUNT(*) FROM clients WHERE status = 'active' AND created_by_vendor_id = $3) AS active_clients,
                (SELECT COUNT(*) FROM equipment_instance WHERE deleted_at IS NULL AND vendor_id = $3) AS total_equipment_instances,
                (SELECT COUNT(*) FROM equipment_instance WHERE status = 'assigned' AND deleted_at IS NULL AND vendor_id = $3) AS assigned_equipment,
                (SELECT COUNT(*) FROM maintenance_ticket WHERE created_at::date BETWEEN $1::date AND $2::date AND vendor_id = $3) AS tickets_in_period,
                (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_activity::date BETWEEN $1::date AND $2::date AND is_active = true) AS user_logins_in_period
        ),
        user_dist AS (
            SELECT
                jsonb_object_agg(user_type, count) AS user_distribution
            FROM (
                SELECT
                    user_type,
                    COUNT(*) AS count
                FROM public."user"
                WHERE deleted_at IS NULL
                GROUP BY user_type
            ) ud
        )
        SELECT
            COALESCE(s.active_vendors, 0)::text AS active_vendors,
            COALESCE(s.active_clients, 0)::text AS active_clients,
            COALESCE(s.total_equipment_instances, 0)::text AS total_equipment_instances,
            COALESCE(s.assigned_equipment, 0)::text AS assigned_equipment,
            COALESCE(s.tickets_in_period, 0)::text AS tickets_in_period,
            COALESCE(s.user_logins_in_period, 0)::text AS user_logins_in_period,
            COALESCE(ROUND((s.assigned_equipment::numeric / NULLIF(s.total_equipment_instances, 0)) * 100, 1), 0)::text AS assignment_rate_pct,
            COALESCE(ud.user_distribution, '{}'::jsonb) AS user_distribution
        FROM stats s, user_dist ud;
      `;
      params = [startDate, endDate, vendorId];
    } else {
      query = `
        WITH stats AS (
            SELECT
                (SELECT COUNT(*) FROM vendors WHERE status = 'active') AS active_vendors,
                (SELECT COUNT(*) FROM clients WHERE status = 'active') AS active_clients,
                (SELECT COUNT(*) FROM equipment_instance WHERE deleted_at IS NULL) AS total_equipment_instances,
                (SELECT COUNT(*) FROM equipment_instance WHERE status = 'assigned' AND deleted_at IS NULL) AS assigned_equipment,
                (SELECT COUNT(*) FROM maintenance_ticket WHERE created_at::date BETWEEN $1::date AND $2::date) AS tickets_in_period,
                (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_activity::date BETWEEN $1::date AND $2::date AND is_active = true) AS user_logins_in_period
        ),
        user_dist AS (
            SELECT
                jsonb_object_agg(user_type, count) AS user_distribution
            FROM (
                SELECT
                    user_type,
                    COUNT(*) AS count
                FROM public."user"
                WHERE deleted_at IS NULL
                GROUP BY user_type
            ) ud
        )
        SELECT
            COALESCE(s.active_vendors, 0)::text AS active_vendors,
            COALESCE(s.active_clients, 0)::text AS active_clients,
            COALESCE(s.total_equipment_instances, 0)::text AS total_equipment_instances,
            COALESCE(s.assigned_equipment, 0)::text AS assigned_equipment,
            COALESCE(s.tickets_in_period, 0)::text AS tickets_in_period,
            COALESCE(s.user_logins_in_period, 0)::text AS user_logins_in_period,
            COALESCE(ROUND((s.assigned_equipment::numeric / NULLIF(s.total_equipment_instances, 0)) * 100, 1), 0)::text AS assignment_rate_pct,
            COALESCE(ud.user_distribution, '{}'::jsonb) AS user_distribution
        FROM stats s, user_dist ud;
      `;
      params = [startDate, endDate];
    }
    
    const result = await pool.query(query, params);
    return result.rows[0] || {};
  }

  /**
   * 2. Compliance Analytics Summary (Vendor-Filtered)
   */
  static async getComplianceSummary(vendorId?: number) {
    let query: string;
    let params: any[];

    if (vendorId) {
      query = `
        WITH compliance_data AS (
            SELECT
                COUNT(*) AS total_eq,
                COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END) AS compliant_eq,
                COUNT(CASE WHEN compliance_status = 'expired' THEN 1 END) AS expired_eq,
                COUNT(CASE WHEN compliance_status = 'overdue' THEN 1 END) AS overdue_eq,
                COUNT(CASE WHEN compliance_status = 'due_soon' THEN 1 END) AS due_soon_eq
            FROM equipment_instance
            WHERE deleted_at IS NULL
              AND vendor_id = $1
        ),
        vendor_compliance AS (
            SELECT
                v.id,
                v.company_name,
                COUNT(ei.id) AS total_equipment,
                COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END) AS compliant_equipment,
                CASE 
                    WHEN COUNT(ei.id) > 0 
                    THEN ROUND((COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END)::numeric / COUNT(ei.id)) * 100, 1)
                    ELSE 0 
                END AS compliance_rate
            FROM vendors v
            LEFT JOIN equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
            WHERE v.status = 'active' AND v.id = $1
            GROUP BY v.id, v.company_name
        ),
        low_compliance_vendors AS (
            SELECT COUNT(*) AS count
            FROM vendor_compliance
            WHERE total_equipment > 0 AND compliance_rate < 80
        )
        SELECT
            COALESCE(cd.total_eq, 0)::text AS total_eq,
            COALESCE(cd.compliant_eq, 0)::text AS compliant_eq,
            COALESCE(cd.expired_eq, 0)::text AS expired_eq,
            COALESCE(cd.overdue_eq, 0)::text AS overdue_eq,
            COALESCE(cd.due_soon_eq, 0)::text AS due_soon_eq,
            COALESCE(ROUND((cd.compliant_eq::numeric / NULLIF(cd.total_eq, 0)) * 100, 1), 0)::text AS compliance_rate_pct,
            COALESCE(lcv.count, 0)::text AS vendors_below_80_pct,
            COALESCE((SELECT ROUND(AVG(e.default_lifespan_years)::numeric, 1) FROM equipment e WHERE e.deleted_at IS NULL), 0)::text AS avg_lifespan_years
        FROM compliance_data cd
        CROSS JOIN low_compliance_vendors lcv;
      `;
      params = [vendorId];
    } else {
      query = `
        WITH compliance_data AS (
            SELECT
                COUNT(*) AS total_eq,
                COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END) AS compliant_eq,
                COUNT(CASE WHEN compliance_status = 'expired' THEN 1 END) AS expired_eq,
                COUNT(CASE WHEN compliance_status = 'overdue' THEN 1 END) AS overdue_eq,
                COUNT(CASE WHEN compliance_status = 'due_soon' THEN 1 END) AS due_soon_eq
            FROM equipment_instance
            WHERE deleted_at IS NULL
        ),
        vendor_compliance AS (
            SELECT
                v.id,
                v.company_name,
                COUNT(ei.id) AS total_equipment,
                COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END) AS compliant_equipment,
                CASE 
                    WHEN COUNT(ei.id) > 0 
                    THEN ROUND((COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END)::numeric / COUNT(ei.id)) * 100, 1)
                    ELSE 0 
                END AS compliance_rate
            FROM vendors v
            LEFT JOIN equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
            WHERE v.status = 'active'
            GROUP BY v.id, v.company_name
        ),
        low_compliance_vendors AS (
            SELECT COUNT(*) AS count
            FROM vendor_compliance
            WHERE total_equipment > 0 AND compliance_rate < 80
        )
        SELECT
            COALESCE(cd.total_eq, 0)::text AS total_eq,
            COALESCE(cd.compliant_eq, 0)::text AS compliant_eq,
            COALESCE(cd.expired_eq, 0)::text AS expired_eq,
            COALESCE(cd.overdue_eq, 0)::text AS overdue_eq,
            COALESCE(cd.due_soon_eq, 0)::text AS due_soon_eq,
            COALESCE(ROUND((cd.compliant_eq::numeric / NULLIF(cd.total_eq, 0)) * 100, 1), 0)::text AS compliance_rate_pct,
            COALESCE(lcv.count, 0)::text AS vendors_below_80_pct,
            COALESCE((SELECT ROUND(AVG(e.default_lifespan_years)::numeric, 1) FROM equipment e WHERE e.deleted_at IS NULL), 0)::text AS avg_lifespan_years
        FROM compliance_data cd
        CROSS JOIN low_compliance_vendors lcv;
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    return result.rows[0] || {};
  }

  /**
   * 3. Compliance Trend (Monthly Line Chart – Vendor-Filtered)
   */
  static async getComplianceTrend(startDate: string, endDate: string, vendorId?: number) {
    let query: string;
    let params: any[];

    if (vendorId) {
      query = `
        SELECT
            DATE_TRUNC('month', ei.updated_at)::date AS month,
            COUNT(*) AS total,
            COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END) AS compliant,
            ROUND(
                COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100,
                1
            ) AS compliance_rate_pct
        FROM public.equipment_instance ei
        WHERE ei.deleted_at IS NULL
          AND ei.updated_at::date BETWEEN $1::date AND $2::date
          AND ei.vendor_id = $3
        GROUP BY month
        ORDER BY month;
      `;
      params = [startDate, endDate, vendorId];
    } else {
      query = `
        SELECT
            DATE_TRUNC('month', ei.updated_at)::date AS month,
            COUNT(*) AS total,
            COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END) AS compliant,
            ROUND(
                COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100,
                1
            ) AS compliance_rate_pct
        FROM public.equipment_instance ei
        WHERE ei.deleted_at IS NULL
          AND ei.updated_at::date BETWEEN $1::date AND $2::date
        GROUP BY month
        ORDER BY month;
      `;
      params = [startDate, endDate];
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 4. Compliance by Vendor (Stacked Bar Chart)
   */
  static async getComplianceByVendor() {
    const query = `
      SELECT
          v.company_name AS equipment_type,
          COUNT(ei.id) AS total_equipment,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'expired') AS expired,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'overdue') AS overdue,
          COUNT(*) FILTER (WHERE ei.compliance_status = 'due_soon') AS due_soon,
          COALESCE(ROUND((COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant')::numeric / NULLIF(COUNT(ei.id), 0)) * 100, 1), 0) AS compliance_rate_pct
      FROM vendors v
      LEFT JOIN equipment_instance ei ON ei.vendor_id = v.id AND ei.deleted_at IS NULL
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
    let query: string;
    let params: any[];

    if (vendorId) {
      query = `
        SELECT
            DATE_TRUNC('month', mt.created_at)::date AS month,
            COUNT(*) AS created,
            COUNT(CASE WHEN mt.ticket_status = 'resolved' THEN 1 END) AS resolved,
            COUNT(CASE WHEN mt.priority = 'high' THEN 1 END) AS high_priority,
            ROUND(AVG(CASE WHEN mt.ticket_status = 'resolved' THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/3600 ELSE NULL END)::numeric, 1) AS avg_resolution_hours
        FROM public.maintenance_ticket mt
        WHERE mt.created_at::date BETWEEN $1::date AND $2::date
          AND mt.vendor_id = $3
        GROUP BY month
        ORDER BY month;
      `;
      params = [startDate, endDate, vendorId];
    } else {
      query = `
        SELECT
            DATE_TRUNC('month', mt.created_at)::date AS month,
            COUNT(*) AS created,
            COUNT(CASE WHEN mt.ticket_status = 'resolved' THEN 1 END) AS resolved,
            COUNT(CASE WHEN mt.priority = 'high' THEN 1 END) AS high_priority,
            ROUND(AVG(CASE WHEN mt.ticket_status = 'resolved' THEN EXTRACT(EPOCH FROM (mt.resolved_at - mt.created_at))/3600 ELSE NULL END)::numeric, 1) AS avg_resolution_hours
        FROM public.maintenance_ticket mt
        WHERE mt.created_at::date BETWEEN $1::date AND $2::date
        GROUP BY month
        ORDER BY month;
      `;
      params = [startDate, endDate];
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 6. Tickets by Type (Pie/Bar Chart)
   */
  static async getTicketsByType(vendorId?: number) {
    let query: string;
    let params: any[];

    if (vendorId) {
      query = `
        SELECT
            mt.support_type,
            COUNT(*) AS count,
            COUNT(CASE WHEN mt.priority = 'high' THEN 1 END) AS high_priority
        FROM public.maintenance_ticket mt
        WHERE mt.vendor_id = $1
        GROUP BY mt.support_type
        ORDER BY count DESC;
      `;
      params = [vendorId];
    } else {
      query = `
        SELECT
            mt.support_type,
            COUNT(*) AS count,
            COUNT(CASE WHEN mt.priority = 'high' THEN 1 END) AS high_priority
        FROM public.maintenance_ticket mt
        GROUP BY mt.support_type
        ORDER BY count DESC;
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 7. Vendor Performance Rankings (Updated with User Metrics)
   */
  static async getVendorRankings() {
    const query = `
      SELECT
          v.company_name,
          (SELECT COUNT(DISTINCT c.id) FROM clients c WHERE c.created_by_vendor_id = v.id AND c.status = 'active') AS client_count,
          (SELECT COUNT(*) FROM equipment_instance ei WHERE ei.vendor_id = v.id AND ei.deleted_at IS NULL) AS equipment_assigned,
          (SELECT COUNT(*) FROM maintenance_ticket mt WHERE mt.vendor_id = v.id) AS tickets_raised,
          COALESCE(
              (SELECT ROUND((COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1)
               FROM equipment_instance 
               WHERE vendor_id = v.id AND deleted_at IS NULL), 
              0
          ) AS avg_compliance_pct
      FROM public.vendors v
      WHERE v.status = 'active'
      ORDER BY avg_compliance_pct DESC NULLS LAST, client_count DESC, equipment_assigned DESC
      LIMIT 10;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 8. Recent High-Priority Tickets (Vendor-Filtered)
   */
  static async getRecentHighPriorityTickets(vendorId?: number) {
    let query: string;
    let params: any[];

    if (vendorId) {
      query = `
        SELECT
            mt.ticket_number,
            v.company_name AS vendor,
            COALESCE(cu.display_name, 'Unknown Client') AS client,
            COALESCE(e.equipment_name, 'N/A') AS equipment,
            mt.ticket_status AS status,
            TO_CHAR(mt.created_at, 'Mon DD, YYYY HH12:MI AM') AS created
        FROM public.maintenance_ticket mt
        LEFT JOIN public.vendors v ON mt.vendor_id = v.id
        LEFT JOIN public.clients c ON mt.client_id = c.id
        LEFT JOIN public."user" cu ON c.user_id = cu.id
        LEFT JOIN public.equipment_instance ei ON mt.equipment_instance_id = ei.id
        LEFT JOIN public.equipment e ON ei.equipment_id = e.id
        WHERE mt.priority = 'high' AND mt.vendor_id = $1
        ORDER BY mt.created_at DESC
        LIMIT 10;
      `;
      params = [vendorId];
    } else {
      query = `
        SELECT
            mt.ticket_number,
            v.company_name AS vendor,
            COALESCE(cu.display_name, 'Unknown Client') AS client,
            COALESCE(e.equipment_name, 'N/A') AS equipment,
            mt.ticket_status AS status,
            TO_CHAR(mt.created_at, 'Mon DD, YYYY HH12:MI AM') AS created
        FROM public.maintenance_ticket mt
        LEFT JOIN public.vendors v ON mt.vendor_id = v.id
        LEFT JOIN public.clients c ON mt.client_id = c.id
        LEFT JOIN public."user" cu ON c.user_id = cu.id
        LEFT JOIN public.equipment_instance ei ON mt.equipment_instance_id = ei.id
        LEFT JOIN public.equipment e ON ei.equipment_id = e.id
        WHERE mt.priority = 'high'
        ORDER BY mt.created_at DESC
        LIMIT 10;
      `;
      params = [];
    }

    const result = await pool.query(query, params);
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
    let query: string;
    let params: any[];

    if (vendorId) {
      query = `
        SELECT
            e.equipment_type,
            COUNT(ei.id) AS instance_count
        FROM public.equipment e
        JOIN public.equipment_instance ei ON e.id = ei.equipment_id AND ei.deleted_at IS NULL
        WHERE e.deleted_at IS NULL AND ei.vendor_id = $1
        GROUP BY e.equipment_type
        ORDER BY instance_count DESC;
      `;
      params = [vendorId];
    } else {
      query = `
        SELECT
            e.equipment_type,
            COUNT(ei.id) AS instance_count
        FROM public.equipment e
        JOIN public.equipment_instance ei ON e.id = ei.equipment_id AND ei.deleted_at IS NULL
        WHERE e.deleted_at IS NULL
        GROUP BY e.equipment_type
        ORDER BY instance_count DESC;
      `;
      params = [];
    }

    const result = await pool.query(query, params);
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
          COUNT(CASE WHEN u.is_locked = true THEN 1 END)::text AS locked_users,
          COALESCE(SUM(u.failed_login_attempts) FILTER (WHERE u.last_login > NOW() - INTERVAL '7 days'), 0)::text AS failed_logins_last_7d,
          COUNT(DISTINCT al.ip_address) FILTER (
              WHERE al.action_type = 'login_failed'
                AND al.created_at > NOW() - INTERVAL '24 hours'
          )::text AS suspicious_ips_24h
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