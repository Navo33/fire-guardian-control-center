import { pool } from '../config/database';

export class ClientViewsRepository {
  
  /**
   * Get client ID from user ID
   */
  static async getClientIdFromUserId(userId: number): Promise<number | null> {
    try {
      const query = `
        SELECT c.id
        FROM public.clients c
        JOIN public.user u ON c.user_id = u.id
        WHERE u.id = $1
          AND c.status = 'active'
          AND u.deleted_at IS NULL
      `;
      const result = await pool.query(query, [userId]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      console.error('Error getting client ID:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard data for client
   */
  static async getDashboardKPIs(userId: number) {
    try {
      const query = `
        WITH client_data AS (
          SELECT 
            c.id as client_id,
            u.display_name,
            u.email,
            c.company_name,
            c.street_address as address,
            c.city,
            c.state,
            c.primary_phone as phone,
            v.id as vendor_id,
            v.company_name as vendor_company_name
          FROM public.user u
          JOIN public.clients c ON u.id = c.user_id
          LEFT JOIN public.vendors v ON c.created_by_vendor_id = v.id
          WHERE u.id = $1
            AND c.status = 'active'
            AND u.deleted_at IS NULL
        ),
        equipment_stats AS (
          SELECT 
            COUNT(*) as total_equipment,
            COUNT(CASE WHEN ei.compliance_status = 'compliant' THEN 1 END) as compliant_equipment,
            COUNT(CASE WHEN ei.compliance_status = 'expired' THEN 1 END) as expired_equipment,
            COUNT(CASE WHEN ei.compliance_status = 'overdue' THEN 1 END) as overdue_equipment,
            COUNT(CASE WHEN ei.compliance_status = 'due_soon' THEN 1 END) as due_soon_equipment,
            COUNT(CASE WHEN ei.next_maintenance_date < CURRENT_DATE THEN 1 END) as maintenance_overdue,
            COUNT(CASE WHEN ei.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as maintenance_due_soon
          FROM public.equipment_instance ei
          JOIN client_data cd ON ei.assigned_to = cd.client_id
          WHERE ei.status = 'assigned'
            AND ei.deleted_at IS NULL
        ),
        ticket_stats AS (
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN mt.ticket_status = 'open' THEN 1 END) as open_tickets,
            COUNT(CASE WHEN mt.ticket_status = 'closed' THEN 1 END) as closed_tickets,
            COUNT(CASE WHEN mt.priority = 'critical' AND mt.ticket_status = 'open' THEN 1 END) as critical_tickets,
            COUNT(CASE WHEN mt.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_tickets,
            AVG(CASE 
              WHEN mt.ticket_status = 'closed' AND mt.closed_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (mt.closed_at - mt.created_at))/86400.0 
            END) as avg_resolution_days
          FROM public.maintenance_ticket mt
          JOIN client_data cd ON mt.client_id = cd.client_id
        ),
        upcoming_events AS (
          SELECT 
            'maintenance' as event_type,
            ei.serial_number,
            e.equipment_name,
            ei.next_maintenance_date as event_date,
            'Scheduled maintenance due' as description,
            CASE 
              WHEN ei.next_maintenance_date < CURRENT_DATE THEN 'overdue'
              WHEN ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
              WHEN ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
              ELSE 'scheduled'
            END as urgency
          FROM public.equipment_instance ei
          JOIN public.equipment e ON ei.equipment_id = e.id
          JOIN client_data cd ON ei.assigned_to = cd.client_id
          WHERE ei.status = 'assigned'
            AND ei.deleted_at IS NULL
            AND ei.next_maintenance_date IS NOT NULL
            AND ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '60 days'
          ORDER BY ei.next_maintenance_date
          LIMIT 10
        )
        SELECT 
          json_build_object(
            'client_id', cd.client_id,
            'display_name', cd.display_name,
            'email', cd.email,
            'company_name', cd.company_name,
            'address', cd.address,
            'city', cd.city,
            'state', cd.state,
            'phone', cd.phone,
            'vendor_id', cd.vendor_id,
            'vendor_company_name', cd.vendor_company_name
          ) as client_info,
          json_build_object(
            'total_equipment', COALESCE(es.total_equipment, 0),
            'compliant_equipment', COALESCE(es.compliant_equipment, 0),
            'expired_equipment', COALESCE(es.expired_equipment, 0),
            'overdue_equipment', COALESCE(es.overdue_equipment, 0),
            'due_soon_equipment', COALESCE(es.due_soon_equipment, 0),
            'maintenance_overdue', COALESCE(es.maintenance_overdue, 0),
            'maintenance_due_soon', COALESCE(es.maintenance_due_soon, 0),
            'compliance_rate', CASE 
              WHEN COALESCE(es.total_equipment, 0) > 0 
              THEN ROUND((COALESCE(es.compliant_equipment, 0)::decimal / es.total_equipment) * 100, 1)
              ELSE 0 
            END
          ) as equipment_stats,
          json_build_object(
            'total_tickets', COALESCE(ts.total_tickets, 0),
            'open_tickets', COALESCE(ts.open_tickets, 0),
            'closed_tickets', COALESCE(ts.closed_tickets, 0),
            'critical_tickets', COALESCE(ts.critical_tickets, 0),
            'recent_tickets', COALESCE(ts.recent_tickets, 0),
            'avg_resolution_days', COALESCE(ROUND(ts.avg_resolution_days, 1), 0)
          ) as ticket_stats,
          COALESCE(
            json_agg(
              json_build_object(
                'event_type', ue.event_type,
                'serial_number', ue.serial_number,
                'equipment_name', ue.equipment_name,
                'event_date', ue.event_date,
                'description', ue.description,
                'urgency', ue.urgency
              ) ORDER BY ue.event_date
            ) FILTER (WHERE ue.event_type IS NOT NULL),
            '[]'::json
          ) as upcoming_events
        FROM client_data cd
        CROSS JOIN equipment_stats es
        CROSS JOIN ticket_stats ts
        LEFT JOIN upcoming_events ue ON true
        GROUP BY cd.client_id, cd.display_name, cd.email, cd.company_name, 
                 cd.address, cd.city, cd.state, cd.phone, cd.vendor_id, cd.vendor_company_name,
                 es.total_equipment, es.compliant_equipment, es.expired_equipment, 
                 es.overdue_equipment, es.due_soon_equipment, es.maintenance_overdue, es.maintenance_due_soon,
                 ts.total_tickets, ts.open_tickets, ts.closed_tickets, ts.critical_tickets, 
                 ts.recent_tickets, ts.avg_resolution_days
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0] || {
        client_info: {},
        equipment_stats: {
          total_equipment: 0,
          compliant_equipment: 0,
          expired_equipment: 0,
          overdue_equipment: 0,
          due_soon_equipment: 0,
          maintenance_overdue: 0,
          maintenance_due_soon: 0,
          compliance_rate: 0
        },
        ticket_stats: {
          total_tickets: 0,
          open_tickets: 0,
          closed_tickets: 0,
          critical_tickets: 0,
          recent_tickets: 0,
          avg_resolution_days: 0
        },
        upcoming_events: []
      };
    } catch (error) {
      console.error('Error getting client dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get recent activity for client
   */
  static async getRecentActivity(userId: number) {
    try {
      const query = `
        WITH client_data AS (
          SELECT c.id AS client_id
          FROM public.clients c
          JOIN public.user u ON c.user_id = u.id
          WHERE u.id = $1
            AND c.status = 'active'
            AND u.deleted_at IS NULL
        ),
        events AS (
          -- Upcoming Maintenance
          SELECT 
            'maintenance' AS event_type,
            'Maintenance Due for ' || e.equipment_name AS title,
            ei.next_maintenance_date::date AS event_date
          FROM public.equipment_instance ei
          JOIN public.equipment e ON ei.equipment_id = e.id
          JOIN client_data cd ON ei.assigned_to = cd.client_id
          WHERE ei.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
            AND ei.deleted_at IS NULL
            AND ei.next_maintenance_date IS NOT NULL

          UNION ALL

          -- Open Tickets with scheduled dates
          SELECT 
            'ticket' AS event_type,
            'Open Ticket: ' || COALESCE(mt.issue_description, 'Maintenance Request') AS title,
            COALESCE(mt.scheduled_date::date, mt.created_at::date) AS event_date
          FROM public.maintenance_ticket mt
          JOIN client_data cd ON mt.client_id = cd.client_id
          WHERE mt.ticket_status = 'open'
            AND (
              mt.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 
              OR (mt.scheduled_date IS NULL AND mt.created_at >= CURRENT_DATE - INTERVAL '7 days')
            )

          UNION ALL

          -- Expiring Equipment
          SELECT 
            'expiry' AS event_type,
            'Expiry for ' || e.equipment_name AS title,
            ei.expiry_date::date AS event_date
          FROM public.equipment_instance ei
          JOIN public.equipment e ON ei.equipment_id = e.id
          JOIN client_data cd ON ei.assigned_to = cd.client_id
          WHERE ei.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 90
            AND ei.deleted_at IS NULL
        )
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'event_type', event_type,
              'event', title,
              'created_at', event_date,
              'status', CASE 
                WHEN event_date < CURRENT_DATE THEN 'overdue'
                WHEN event_date = CURRENT_DATE THEN 'today'
                ELSE 'upcoming'
              END
            ) ORDER BY event_date
          ),
          '[]'::jsonb
        ) AS recent_activity
        FROM events
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0]?.recent_activity || [];
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw error;
    }
  }

  /**
   * Get equipment types overview for client (similar to vendor equipment types page)
   */
  static async getEquipmentTypesOverview(userId: number) {
    try {
      const query = `
        WITH client_data AS (
            SELECT c.id AS client_id
            FROM public.clients c
            JOIN public.user u ON c.user_id = u.id
            WHERE u.id = $1  -- logged-in client user_id
              AND c.status = 'active'
              AND u.deleted_at IS NULL
        )
        SELECT
            COUNT(DISTINCT e.id)::text AS total_equipment_types,
            COUNT(ei.id)::text AS total_assigned,
            COUNT(DISTINCT e.equipment_type)::text AS categories_count,

            -- Equipment Types List (Only Useful Info)
            COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'equipment_id', e.id,
                    'equipment_name', e.equipment_name,
                    'equipment_code', e.equipment_code,
                    'equipment_type', e.equipment_type,
                    'manufacturer', e.manufacturer,
                    'model', e.model,
                    'total_assigned', COALESCE(inst.total, 0),
                    'compliant_count', COALESCE(inst.compliant, 0),
                    'next_maintenance', inst.next_maintenance,
                    'compliance_rate', COALESCE(
                        ROUND((inst.compliant::numeric / NULLIF(inst.total, 0)) * 100, 1),
                        0
                    ),
                    'status_badge', CASE 
                        WHEN inst.expired > 0 THEN 'expired'
                        WHEN inst.overdue > 0 THEN 'overdue'
                        WHEN inst.due_soon > 0 THEN 'due_soon'
                        ELSE 'compliant'
                    END
                ) ORDER BY e.equipment_name)
                FROM equipment e
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
                        COUNT(*) FILTER (WHERE ei.compliance_status = 'expired') AS expired,
                        COUNT(*) FILTER (WHERE ei.compliance_status = 'overdue') AS overdue,
                        COUNT(*) FILTER (WHERE ei.next_maintenance_date <= CURRENT_DATE + 30) AS due_soon,
                        MIN(ei.next_maintenance_date) AS next_maintenance
                    FROM equipment_instance ei
                    JOIN client_data cd ON ei.assigned_to = cd.client_id
                    WHERE ei.equipment_id = e.id
                      AND ei.status = 'assigned'
                      AND ei.deleted_at IS NULL
                ) inst ON TRUE
                WHERE inst.total > 0
                  AND e.deleted_at IS NULL
            ), '[]'::jsonb) AS equipment_types

        FROM public.equipment_instance ei
        JOIN public.equipment e ON ei.equipment_id = e.id
        JOIN client_data cd ON ei.assigned_to = cd.client_id
        WHERE ei.status = 'assigned'
          AND ei.deleted_at IS NULL;
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0] || {
        total_equipment_types: '0',
        total_assigned: '0',
        categories_count: '0',
        equipment_types: []
      };
    } catch (error) {
      console.error('Error getting equipment types overview:', error);
      throw error;
    }
  }

  /**
   * Get equipment list for client
   */
  static async getEquipmentList(
    clientId: number,
    filters: {
      status?: string;
      equipment_type?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const { status, equipment_type, search, page = 1, limit = 25 } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = ['ei.assigned_to = $1', 'ei.deleted_at IS NULL'];
      const params: any[] = [clientId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`ei.compliance_status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (equipment_type) {
        whereConditions.push(`e.equipment_type = $${paramIndex}`);
        params.push(equipment_type);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(ei.serial_number ILIKE $${paramIndex} OR e.equipment_name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const query = `
        SELECT 
          ei.serial_number,
          e.equipment_name,
          e.equipment_type,
          ei.compliance_status,
          ei.next_maintenance_date,
          COALESCE(ei.location, 'N/A') AS location,
          COUNT(*) OVER() AS total_count
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ei.serial_number
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return {
        items: result.rows,
        total: result.rows[0]?.total_count || 0,
        page,
        limit
      };
    } catch (error) {
      console.error('Error getting equipment list:', error);
      throw error;
    }
  }

  /**
   * Get ticket list for client
   */
  static async getTicketList(
    clientId: number,
    filters: {
      status?: string;
      support_type?: string;
      priority?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const { status, support_type, priority, search, page = 1, limit = 25 } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = ['mt.client_id = $1'];
      const params: any[] = [clientId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`mt.ticket_status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (support_type) {
        whereConditions.push(`mt.support_type = $${paramIndex}`);
        params.push(support_type);
        paramIndex++;
      }

      if (priority) {
        whereConditions.push(`mt.priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(mt.ticket_number ILIKE $${paramIndex} OR mt.issue_description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const query = `
        SELECT 
          mt.ticket_number,
          COALESCE(ei.serial_number, 'N/A') AS equipment_serial,
          mt.ticket_status,
          mt.support_type,
          mt.priority,
          LEFT(mt.issue_description, 50) AS issue_description,
          mt.scheduled_date,
          mt.created_at,
          COUNT(*) OVER() AS total_count
        FROM maintenance_ticket mt
        LEFT JOIN equipment_instance ei ON mt.equipment_instance_id = ei.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY mt.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return {
        items: result.rows,
        total: result.rows[0]?.total_count || 0,
        page,
        limit
      };
    } catch (error) {
      console.error('Error getting ticket list:', error);
      throw error;
    }
  }

  /**
   * Get reports KPIs for client
   */
  static async getReportsKPIs(clientId: number) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM compliance_report WHERE filters->>'client_id' = $1::text) AS total_reports,
          (SELECT 
            COALESCE(
              ROUND(
                (SUM(CASE WHEN ei.compliance_status = 'compliant' THEN 1 ELSE 0 END)::float / 
                 NULLIF(COUNT(ei.id), 0) * 100)::numeric, 
                2
              ), 
              0
            )
           FROM equipment_instance ei WHERE ei.assigned_to = $2 AND ei.deleted_at IS NULL
          ) AS compliance_rate,
          (SELECT COUNT(*) FROM maintenance_ticket WHERE client_id = $2 AND ticket_status = 'resolved') AS tickets_resolved
        FROM clients c
        WHERE c.id = $2
      `;
      const result = await pool.query(query, [clientId.toString(), clientId]);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error getting reports KPIs:', error);
      throw error;
    }
  }

  /**
   * Get compliance chart data for client
   */
  static async getComplianceChartData(clientId: number) {
    try {
      const query = `
        SELECT 
          SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) AS compliant,
          SUM(CASE WHEN compliance_status = 'expired' THEN 1 ELSE 0 END) AS expired,
          SUM(CASE WHEN compliance_status = 'overdue' THEN 1 ELSE 0 END) AS overdue,
          SUM(CASE WHEN compliance_status = 'due_soon' THEN 1 ELSE 0 END) AS due_soon
        FROM equipment_instance
        WHERE assigned_to = $1
        AND deleted_at IS NULL
      `;
      const result = await pool.query(query, [clientId]);
      
      // Transform to chart format
      const data = result.rows[0];
      return [
        { label: 'Compliant', value: parseInt(data.compliant) || 0, color: '#28a745' },
        { label: 'Expired', value: parseInt(data.expired) || 0, color: '#dc3545' },
        { label: 'Overdue', value: parseInt(data.overdue) || 0, color: '#fd7e14' },
        { label: 'Due Soon', value: parseInt(data.due_soon) || 0, color: '#ffc107' }
      ];
    } catch (error) {
      console.error('Error getting compliance chart data:', error);
      throw error;
    }
  }

  /**
   * Get reports list for client
   */
  static async getReportsList(
    clientId: number,
    filters: {
      report_type?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const { report_type, search, page = 1, limit = 25 } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [
        'cr.filters->>\'client_id\' = $1::text',
        'cr.vendor_id = (SELECT created_by_vendor_id FROM clients WHERE id = $2)'
      ];
      const params: any[] = [clientId.toString(), clientId];
      let paramIndex = 3;

      if (report_type) {
        whereConditions.push(`cr.report_type = $${paramIndex}`);
        params.push(report_type);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(cr.report_id ILIKE $${paramIndex} OR cr.report_type ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const query = `
        SELECT 
          cr.report_id,
          cr.report_type,
          cr.generated_at,
          cr.start_date,
          cr.end_date,
          COUNT(*) OVER() AS total_count
        FROM compliance_report cr
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY cr.generated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return {
        items: result.rows,
        total: result.rows[0]?.total_count || 0,
        page,
        limit
      };
    } catch (error) {
      console.error('Error getting reports list:', error);
      throw error;
    }
  }

  /**
   * Get report details
   */
  static async getReportDetails(clientId: number, reportId: string) {
    try {
      const query = `
        SELECT 
          cr.report_id, 
          cr.report_type, 
          cr.generated_at, 
          cr.start_date, 
          cr.end_date, 
          cr.data
        FROM compliance_report cr
        WHERE cr.report_id = $1
        AND cr.filters->>'client_id' = $2::text
        AND cr.vendor_id = (SELECT created_by_vendor_id FROM clients WHERE id = $3)
      `;
      const result = await pool.query(query, [reportId, clientId.toString(), clientId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting report details:', error);
      throw error;
    }
  }

  /**
   * Get related reports
   */
  static async getRelatedReports(clientId: number, reportId: string) {
    try {
      const query = `
        SELECT 
          cr.report_id, 
          cr.report_type, 
          cr.generated_at, 
          cr.start_date, 
          cr.end_date
        FROM compliance_report cr
        WHERE cr.filters->>'client_id' = $1::text
        AND cr.vendor_id = (SELECT created_by_vendor_id FROM clients WHERE id = $2)
        AND cr.report_type = (SELECT report_type FROM compliance_report WHERE report_id = $3)
        AND cr.report_id != $3
        ORDER BY cr.generated_at DESC
        LIMIT 10
      `;
      const result = await pool.query(query, [clientId.toString(), clientId, reportId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting related reports:', error);
      throw error;
    }
  }

  /**
   * Get equipment detail by ID for client
   */
  static async getEquipmentDetail(userId: number, equipmentId: number) {
    try {
      const query = `
        WITH client_data AS (
            SELECT 
                c.id AS client_id,
                u.display_name AS client_name,
                c.company_name
            FROM public.clients c
            JOIN public.user u ON c.user_id = u.id
            WHERE u.id = $1  -- logged-in client user_id
              AND c.status = 'active'
              AND u.deleted_at IS NULL
        ),
        equipment_base AS (
            SELECT 
                e.id,
                e.equipment_name,
                e.equipment_code,
                e.equipment_type,
                e.manufacturer,
                e.model,
                e.description,
                e.specifications,
                e.default_lifespan_years,
                e.warranty_years,
                TO_CHAR(e.created_at, 'Mon DD, YYYY') AS created_date
            FROM public.equipment e
            WHERE e.id = $2  -- equipment_id
              AND e.deleted_at IS NULL
        ),
        instance_stats AS (
            SELECT
                COUNT(*) AS total_instances,
                COUNT(*) FILTER (WHERE ei.compliance_status = 'compliant') AS compliant,
                COUNT(*) FILTER (WHERE ei.compliance_status = 'expired') AS expired,
                COUNT(*) FILTER (WHERE ei.compliance_status = 'overdue') AS overdue,
                COUNT(*) FILTER (WHERE ei.next_maintenance_date <= CURRENT_DATE + 30) AS due_soon,
                MIN(ei.next_maintenance_date) AS earliest_maintenance,
                MAX(ei.expiry_date) AS latest_expiry
            FROM public.equipment_instance ei
            JOIN client_data cd ON ei.assigned_to = cd.client_id
            WHERE ei.equipment_id = $2
              AND ei.status = 'assigned'
              AND ei.deleted_at IS NULL
        ),
        instances_with_assignment AS (
            SELECT 
                ei.id AS instance_id,
                ei.serial_number,
                ei.asset_tag,
                ei.location,
                ei.next_maintenance_date,
                ei.last_maintenance_date,
                ei.expiry_date,
                ei.warranty_expiry,
                ei.purchase_date,
                ei.condition_rating,
                ei.notes,
                ei.maintenance_interval_days,
                TO_CHAR(ei.assigned_at, 'Mon DD, YYYY') AS assigned_date,

                -- Compliance Status (Real-time)
                CASE 
                    WHEN ei.expiry_date < CURRENT_DATE THEN 'expired'
                    WHEN ei.next_maintenance_date < CURRENT_DATE THEN 'overdue'
                    WHEN ei.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
                    WHEN EXISTS (
                        SELECT 1 FROM public.maintenance_ticket mt 
                        WHERE mt.equipment_instance_id = ei.id 
                          AND mt.ticket_status IN ('open', 'in_progress')
                          AND mt.scheduled_date < CURRENT_DATE
                    ) THEN 'overdue'
                    ELSE 'compliant'
                END AS compliance_status,

                -- Assignment Info (Multiple Batches)
                COALESCE(ea.assignment_number, 'Direct Assignment') AS assignment_number,
                TO_CHAR(ea.start_date, 'Mon DD, YYYY') AS assignment_start_date,
                TO_CHAR(ea.end_date, 'Mon DD, YYYY') AS assignment_end_date,
                ea.notes AS assignment_notes,
                COALESCE(v.company_name, 'Internal') AS vendor_name,
                ea.status AS assignment_status

            FROM public.equipment_instance ei
            JOIN client_data cd ON ei.assigned_to = cd.client_id
            LEFT JOIN public.assignment_item ai ON ei.id = ai.equipment_instance_id
            LEFT JOIN public.equipment_assignment ea ON ai.assignment_id = ea.id
            LEFT JOIN public.vendors v ON ea.vendor_id = v.id
            WHERE ei.equipment_id = $2
              AND ei.status = 'assigned'
              AND ei.deleted_at IS NULL
            ORDER BY ea.start_date DESC NULLS LAST, ei.assigned_at DESC
        ),
        maintenance_history AS (
            SELECT 
                mt.ticket_number,
                mt.ticket_status AS status,
                mt.priority,
                TO_CHAR(mt.created_at, 'Mon DD, YYYY HH12:MI AM') AS created_date,
                TO_CHAR(mt.scheduled_date, 'Mon DD, YYYY') AS scheduled_date,
                TO_CHAR(mt.resolved_at, 'Mon DD, YYYY HH12:MI AM') AS resolved_date,
                mt.issue_description,
                mt.resolution_description,
                ei.serial_number,
                u.display_name AS technician_name
            FROM public.maintenance_ticket mt
            JOIN public.equipment_instance ei ON mt.equipment_instance_id = ei.id
            LEFT JOIN public.user u ON mt.assigned_technician = u.id
            JOIN client_data cd ON mt.client_id = cd.client_id
            WHERE ei.equipment_id = $2
              AND ei.assigned_to = cd.client_id
            ORDER BY mt.created_at DESC
            LIMIT 10
        )
        SELECT
            -- Equipment Type Info
            eb.equipment_name,
            eb.equipment_code,
            eb.equipment_type,
            eb.manufacturer,
            eb.model,
            eb.description,
            eb.specifications,
            eb.default_lifespan_years,
            eb.warranty_years,
            eb.created_date,

            -- Summary Stats
            COALESCE(st.total_instances, 0)::text AS total_instances,
            COALESCE(st.compliant, 0)::text AS compliant_count,
            COALESCE(st.expired, 0)::text AS expired_count,
            COALESCE(st.overdue, 0)::text AS overdue_count,
            COALESCE(st.due_soon, 0)::text AS due_soon_count,
            COALESCE(
                ROUND((st.compliant::numeric / NULLIF(st.total_instances, 0)) * 100, 1),
                0
            )::text AS compliance_rate_pct,
            TO_CHAR(st.earliest_maintenance, 'Mon DD, YYYY') AS next_maintenance_date,
            (st.earliest_maintenance - CURRENT_DATE)::text AS days_until_maintenance,

            -- Status Badge
            CASE 
                WHEN st.expired > 0 THEN 'expired'
                WHEN st.overdue > 0 THEN 'overdue'
                WHEN st.due_soon > 0 THEN 'due_soon'
                ELSE 'compliant'
            END AS overall_status,

            -- Instances with Assignment Info
            COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'instance_id', iwa.instance_id,
                    'serial_number', iwa.serial_number,
                    'asset_tag', iwa.asset_tag,
                    'location', COALESCE(iwa.location, 'Not specified'),
                    'compliance_status', iwa.compliance_status,
                    'next_maintenance_date', TO_CHAR(iwa.next_maintenance_date, 'Mon DD, YYYY'),
                    'days_until_maintenance', (iwa.next_maintenance_date - CURRENT_DATE),
                    'expiry_date', TO_CHAR(iwa.expiry_date, 'Mon DD, YYYY'),
                    'assigned_date', iwa.assigned_date,
                    'assignment_number', iwa.assignment_number,
                    'assignment_start_date', iwa.assignment_start_date,
                    'assignment_end_date', iwa.assignment_end_date,
                    'assignment_notes', COALESCE(iwa.assignment_notes, ''),
                    'vendor_name', iwa.vendor_name,
                    'assignment_status', iwa.assignment_status
                ))
                FROM instances_with_assignment iwa
            ), '[]'::jsonb) AS instances,

            -- Maintenance History
            COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'ticket_number', mh.ticket_number,
                    'status', mh.status,
                    'priority', mh.priority,
                    'created_date', mh.created_date,
                    'scheduled_date', mh.scheduled_date,
                    'resolved_date', mh.resolved_date,
                    'issue', mh.issue_description,
                    'resolution', mh.resolution_description,
                    'serial_number', mh.serial_number,
                    'technician', COALESCE(mh.technician_name, 'Unassigned')
                ))
                FROM maintenance_history mh
            ), '[]'::jsonb) AS maintenance_history

        FROM equipment_base eb
        LEFT JOIN instance_stats st ON TRUE;
      `;
      
      const result = await pool.query(query, [userId, equipmentId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting equipment detail:', error);
      throw error;
    }
  }

  /**
   * Get equipment stats for client
   */
  static async getEquipmentStats(userId: number) {
    try {
      // First get client ID
      const clientId = await this.getClientIdFromUserId(userId);
      if (!clientId) {
        throw new Error('Client not found');
      }

      const query = `
        WITH equipment_data AS (
          SELECT 
            ei.id,
            CASE 
              WHEN ei.expiry_date < CURRENT_DATE THEN 'expired'
              WHEN ei.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
              WHEN EXISTS (
                SELECT 1 FROM public.maintenance_ticket mt 
                WHERE mt.equipment_instance_id = ei.id 
                  AND mt.ticket_status IN ('open', 'in_progress')
                  AND mt.scheduled_date < CURRENT_DATE
              ) THEN 'overdue'
              ELSE 'compliant'
            END as compliance_status
          FROM public.equipment_instance ei
          WHERE ei.client_id = $1 
            AND ei.deleted_at IS NULL
        )
        SELECT 
          COUNT(*) as total_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'compliant') as compliant_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'expired') as expired_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'overdue') as overdue_equipment,
          COUNT(*) FILTER (WHERE compliance_status = 'due_soon') as due_soon_equipment,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE compliance_status = 'compliant') * 100.0 / COUNT(*)), 1)
            ELSE 0 
          END as compliance_rate
        FROM equipment_data
      `;
      
      const result = await pool.query(query, [clientId]);
      return result.rows[0] || {
        total_equipment: 0,
        compliant_equipment: 0,
        expired_equipment: 0,
        overdue_equipment: 0,
        due_soon_equipment: 0,
        compliance_rate: 0
      };
    } catch (error) {
      console.error('Error getting equipment stats:', error);
      throw error;
    }
  }

  /**
   * Get client service requests/tickets with KPIs
   */
  static async getServiceRequests(userId: number) {
    try {
      const query = `
        WITH client_data AS (
          SELECT 
            c.id AS client_id,
            u.display_name AS client_name
          FROM public.clients c
          JOIN public.user u ON c.user_id = u.id
          WHERE u.id = $1  -- logged-in client user_id
            AND c.status = 'active'
        ),
        ticket_stats AS (
          SELECT
            COUNT(*)::text AS total_tickets,
            COUNT(*) FILTER (WHERE mt.ticket_status = 'open')::text AS open_tickets,
            COUNT(*) FILTER (WHERE mt.priority = 'high')::text AS high_priority_tickets,
            COUNT(*) FILTER (WHERE mt.ticket_status = 'resolved')::text AS resolved_tickets
          FROM public.maintenance_ticket mt
          JOIN client_data cd ON mt.client_id = cd.client_id
        ),
        tickets_list AS (
          SELECT
            mt.id,
            mt.ticket_number,
            mt.support_type AS type,
            mt.issue_description,
            mt.resolution_description,
            mt.priority,
            mt.ticket_status AS status,
            TO_CHAR(mt.scheduled_date, 'Mon DD, YYYY') AS scheduled_date,
            TO_CHAR(mt.resolved_at, 'Mon DD, YYYY HH12:MI AM') AS resolved_date,
            TO_CHAR(mt.created_at, 'Mon DD, YYYY HH12:MI AM') AS created_date,
            mt.actual_hours,
            COALESCE(e.equipment_name, 'N/A') AS equipment_name,
            COALESCE(ei.serial_number, 'N/A') AS serial_number,
            COALESCE(v.company_name, 'N/A') AS vendor_name,
            COALESCE(u.display_name, 'Not Assigned') AS technician_name
          FROM public.maintenance_ticket mt
          LEFT JOIN public.equipment_instance ei ON mt.equipment_instance_id = ei.id
          LEFT JOIN public.equipment e ON ei.equipment_id = e.id
          LEFT JOIN public.vendors v ON mt.vendor_id = v.id
          LEFT JOIN public.user u ON mt.assigned_technician = u.id
          JOIN client_data cd ON mt.client_id = cd.client_id
          ORDER BY mt.created_at DESC
        )
        SELECT
          cd.client_name,
          ts.total_tickets,
          ts.open_tickets,
          ts.high_priority_tickets,
          ts.resolved_tickets,
          COALESCE((
            SELECT jsonb_agg(tl ORDER BY tl.created_date DESC)
            FROM tickets_list tl
          ), '[]'::jsonb) AS tickets
        FROM client_data cd
        CROSS JOIN ticket_stats ts;
      `;

      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return {
          client_name: null,
          total_tickets: '0',
          open_tickets: '0',
          high_priority_tickets: '0',
          resolved_tickets: '0',
          tickets: []
        };
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting service requests:', error);
      throw error;
    }
  }
}
