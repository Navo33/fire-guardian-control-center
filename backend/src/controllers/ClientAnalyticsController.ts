import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ClientAnalyticsRepository } from '../models/ClientAnalyticsRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types';

export class ClientAnalyticsController extends BaseController {
  private clientAnalyticsRepo: ClientAnalyticsRepository;

  constructor(clientAnalyticsRepo: ClientAnalyticsRepository) {
    super();
    this.clientAnalyticsRepo = clientAnalyticsRepo;
  }

  /**
   * Helper method to validate client access and get client_id
   */
  private async validateClientAccess(req: AuthenticatedRequest): Promise<number | null> {
    if (!req.user || req.user.user_type !== 'client') {
      return null;
    }
    
    // Get the client_id from the clients table using the user_id
    const clientQuery = `SELECT id FROM clients WHERE user_id = $1 AND status = 'active'`;
    const result = await this.clientAnalyticsRepo.query(clientQuery, [req.user.userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].id;
  }

  /**
   * Get client overview KPIs
   * GET /api/client/analytics/overview?start=2025-01-01&end=2025-12-31&equipment_type=extinguisher
   */
  async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end, equipment_type } = req.query;

      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientOverview(
        client_id,
        start as string,
        end as string,
        equipment_type as string
      );

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching client overview:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch client overview');
    }
  }

  /**
   * Get equipment status distribution
   * GET /api/client/analytics/equipment/status
   */
  async getEquipmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getEquipmentStatus(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching equipment status:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch equipment status');
    }
  }

  /**
   * Get compliance trend
   * GET /api/client/analytics/compliance/trend?start=2025-01-01&end=2025-12-31
   */
  async getComplianceTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getComplianceTrend(
        client_id,
        start as string,
        end as string
      );

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching compliance trend:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch compliance trend');
    }
  }

  /**
   * Get compliance by equipment type
   * GET /api/client/analytics/compliance/by-type
   */
  async getComplianceByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getComplianceByType(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching compliance by type:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch compliance by type');
    }
  }

  /**
   * Get request trends
   * GET /api/client/analytics/requests/trend?start=2025-01-01&end=2025-12-31
   */
  async getRequestTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getRequestTrends(
        client_id,
        start as string,
        end as string
      );

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching request trends:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch request trends');
    }
  }

  /**
   * Get requests by type
   * GET /api/client/analytics/requests/by-type
   */
  async getRequestsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getRequestsByType(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching requests by type:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch requests by type');
    }
  }





  /**
   * Get recent notifications
   * GET /api/client/analytics/notifications/recent
   */
  async getRecentNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getRecentNotifications(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch recent notifications');
    }
  }

  /**
   * Get login history
   * GET /api/client/analytics/account/logins?start=2025-01-01&end=2025-12-31
   */
  async getLoginHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getLoginHistory(
        client_id,
        start as string,
        end as string
      );

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching login history:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch login history');
    }
  }

  /**
   * Get account security summary
   * GET /api/client/analytics/account/security
   */
  async getAccountSecurity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getAccountSecurity(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching account security:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch account security');
    }
  }

  /**
   * Get active sessions
   * GET /api/client/analytics/account/sessions
   */
  async getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getActiveSessions(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch active sessions');
    }
  }

  /**
   * Generate PDF report with comprehensive analytics
   * GET /api/client/analytics/pdf-export
   */
  async exportPDF(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      // Get comprehensive data for PDF
      const reportData = await this.clientAnalyticsRepo.getPDFReportData(client_id);

      // Get client name for the report
      const clientQuery = `SELECT name FROM clients WHERE id = $1`;
      const clientResult = await this.clientAnalyticsRepo.query(clientQuery, [client_id]);
      const clientName = clientResult.rows[0]?.name || 'Client';

      // Add client name to report data
      const pdfData = {
        ...reportData,
        clientName,
        clientId: client_id
      };

      ApiResponseUtil.success(res, pdfData, 'PDF report data generated successfully');
    } catch (error) {
      console.error('Error generating PDF report data:', error);
      return ApiResponseUtil.internalError(res, 'Failed to generate PDF report data');
    }
  }

  /**
   * NEW CORRECTED METHODS BASED ON SCHEMA
   */

  /**
   * Get client ticket statistics using user_id
   */
  async getTicketStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      if (!req.user || req.user.user_type !== 'client') {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientTicketStats(
        req.user.userId,
        start as string, 
        end as string
      );
      
      ApiResponseUtil.success(res, data, 'Client ticket stats retrieved successfully');
    } catch (error) {
      console.error('Error fetching client ticket stats:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch ticket stats');
    }
  }

  /**
   * Get client equipment summary using user_id
   */
  async getEquipmentSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.user_type !== 'client') {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientEquipmentSummary(req.user.userId);
      
      ApiResponseUtil.success(res, data, 'Client equipment summary retrieved successfully');
    } catch (error) {
      console.error('Error fetching client equipment summary:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch equipment summary');
    }
  }

  /**
   * Get client upcoming events using user_id
   */
  async getUpcomingEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.user_type !== 'client') {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientUpcomingEvents(req.user.userId);
      
      ApiResponseUtil.success(res, data, 'Client upcoming events retrieved successfully');
    } catch (error) {
      console.error('Error fetching client upcoming events:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch upcoming events');
    }
  }

  /**
   * Get compliance trends for client
   */
  async getComplianceTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientComplianceTrends(
        client_id,
        start as string, 
        end as string
      );
      
      ApiResponseUtil.success(res, data, 'Client compliance trends retrieved successfully');
    } catch (error) {
      console.error('Error fetching client compliance trends:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch compliance trends');
    }
  }

  /**
   * Get maintenance trends for client
   */
  async getMaintenanceTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientMaintenanceTrends(
        client_id,
        start as string, 
        end as string
      );
      
      ApiResponseUtil.success(res, data, 'Client maintenance trends retrieved successfully');
    } catch (error) {
      console.error('Error fetching client maintenance trends:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch maintenance trends');
    }
  }

  /**
   * Get equipment compliance distribution
   */
  async getEquipmentCompliance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientEquipmentCompliance(client_id);
      
      ApiResponseUtil.success(res, data, 'Client equipment compliance retrieved successfully');
    } catch (error) {
      console.error('Error fetching client equipment compliance:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch equipment compliance');
    }
  }

  /**
   * Get ticket types distribution
   */
  async getTicketTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientTicketTypes(
        client_id,
        start as string, 
        end as string
      );
      
      ApiResponseUtil.success(res, data, 'Client ticket types retrieved successfully');
    } catch (error) {
      console.error('Error fetching client ticket types:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch ticket types');
    }
  }

  /**
   * Get equipment types distribution
   */
  async getEquipmentTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientEquipmentTypes(client_id);
      
      ApiResponseUtil.success(res, data, 'Client equipment types retrieved successfully');
    } catch (error) {
      console.error('Error fetching client equipment types:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch equipment types');
    }
  }

  /**
   * Get non-compliant equipment details
   */
  async getNonCompliantEquipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientNonCompliantEquipment(client_id);
      
      ApiResponseUtil.success(res, data, 'Client non-compliant equipment retrieved successfully');
    } catch (error) {
      console.error('Error fetching client non-compliant equipment:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch non-compliant equipment');
    }
  }

  /**
   * Get recent maintenance tickets
   */
  async getRecentTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientRecentTickets(client_id);
      
      ApiResponseUtil.success(res, data, 'Client recent tickets retrieved successfully');
    } catch (error) {
      console.error('Error fetching client recent tickets:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch recent tickets');
    }
  }

  /**
   * Get user activity (sessions)
   */
  async getUserActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return ApiResponseUtil.badRequest(res, 'Missing required parameters: start, end');
      }

      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientUserActivity(
        client_id,
        start as string, 
        end as string
      );
      
      ApiResponseUtil.success(res, data, 'Client user activity retrieved successfully');
    } catch (error) {
      console.error('Error fetching client user activity:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch user activity');
    }
  }

  /**
   * Get client notifications
   */
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getClientNotifications(client_id);
      
      ApiResponseUtil.success(res, data, 'Client notifications retrieved successfully');
    } catch (error) {
      console.error('Error fetching client notifications:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch notifications');
    }
  }
}
