import { pool } from '../config/database';

export class ClientViewsRepository {
  
  /**
   * Get client ID from user ID
   */
  static async getClientIdFromUserId(userId: number): Promise<number | null> {
    try {
      const query = `
        SELECT id FROM clients 
        WHERE user_id = $1 AND deleted_at IS NULL
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error('Error getting client ID:', error);
      throw error;
    }
  }

  /**
   * Get dashboard KPIs for client
   */
  static async getDashboardKPIs(clientId: number) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM equipment_instance WHERE assigned_to = $1 AND deleted_at IS NULL) AS total_equipment,
          (SELECT COUNT(*) FROM equipment_instance WHERE assigned_to = $1 AND compliance_status = 'compliant' AND deleted_at IS NULL) AS compliant_equipment,
          (SELECT COUNT(*) FROM maintenance_ticket WHERE client_id = $1 AND ticket_status = 'open') AS open_tickets
        FROM clients c
        WHERE c.id = $1
      `;
      const result = await pool.query(query, [clientId]);
      return result.rows[0] || {};
    } catch (error) {
      console.error('Error getting dashboard KPIs:', error);
      throw error;
    }
  }

  /**
   * Get recent activity for client
   */
  static async getRecentActivity(clientId: number, userId: number) {
    try {
      const query = `
        SELECT 
          'Ticket' AS event_type, 
          ticket_number AS event, 
          created_at, 
          ticket_status AS status
        FROM maintenance_ticket
        WHERE client_id = $1
        UNION ALL
        SELECT 
          'Notification' AS event_type, 
          title AS event, 
          created_at, 
          CASE WHEN is_read THEN 'Read' ELSE 'Unread' END AS status
        FROM notification
        WHERE user_id = $2
        AND expires_at > CURRENT_TIMESTAMP
        AND is_archived = false
        ORDER BY created_at DESC
        LIMIT 10
      `;
      const result = await pool.query(query, [clientId, userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting recent activity:', error);
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
}
