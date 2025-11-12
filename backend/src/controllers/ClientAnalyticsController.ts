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
   * Get non-compliant equipment
   * GET /api/client/analytics/equipment/non-compliant
   */
  async getNonCompliantEquipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getNonCompliantEquipment(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching non-compliant equipment:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch non-compliant equipment');
    }
  }

  /**
   * Get upcoming events
   * GET /api/client/analytics/events/upcoming
   */
  async getUpcomingEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const client_id = await this.validateClientAccess(req);
      if (!client_id) {
        return ApiResponseUtil.unauthorized(res, 'Client access required');
      }

      const data = await this.clientAnalyticsRepo.getUpcomingEvents(client_id);

      ApiResponseUtil.success(res, data);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch upcoming events');
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
}
