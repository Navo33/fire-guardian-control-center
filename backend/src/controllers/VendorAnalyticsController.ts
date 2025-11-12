import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { VendorAnalyticsRepository } from '../models/VendorAnalyticsRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';

export class VendorAnalyticsController extends BaseController {
  private vendorAnalyticsRepo: VendorAnalyticsRepository;

  constructor(vendorAnalyticsRepo: VendorAnalyticsRepository) {
    super();
    this.vendorAnalyticsRepo = vendorAnalyticsRepo;
  }

  /**
   * GET /api/vendor/overview
   * Get vendor overview KPIs including active clients, total equipment, tickets, and compliance
   */
  async getVendorOverview(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id, start, end, client_id, equipment_type } = req.query;

      // Validate required parameters
      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      // Set default date range if not provided (last 90 days)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const overview = await this.vendorAnalyticsRepo.getVendorOverview(
        Number(vendor_id),
        startDate,
        endDate,
        client_id ? Number(client_id) : undefined,
        equipment_type ? String(equipment_type) : undefined
      );

      ApiResponseUtil.success(res, overview[0] || {});
    } catch (error) {
      console.error('Error fetching vendor overview:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch vendor overview');
    }
  }

  /**
   * GET /api/vendor/compliance/by-client
   * Get compliance data broken down by client for stacked bar chart
   */
  async getComplianceByClient(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const compliance = await this.vendorAnalyticsRepo.getComplianceByClient(Number(vendor_id));
      ApiResponseUtil.success(res, compliance);
    } catch (error) {
      console.error('Error fetching compliance by client:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch compliance by client');
    }
  }

  /**
   * GET /api/vendor/compliance/trend
   * Get compliance trend over time for line chart
   */
  async getComplianceTrend(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id, start, end, client_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      // Set default date range if not provided (last 12 months)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trend = await this.vendorAnalyticsRepo.getComplianceTrend(
        Number(vendor_id),
        startDate,
        endDate,
        client_id ? Number(client_id) : undefined
      );

      ApiResponseUtil.success(res, trend);
    } catch (error) {
      console.error('Error fetching compliance trend:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch compliance trend');
    }
  }

  /**
   * GET /api/vendor/tickets/trend
   * Get ticket trends over time for line chart
   */
  async getTicketTrends(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id, start, end, client_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      // Set default date range if not provided (last 12 months)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trends = await this.vendorAnalyticsRepo.getTicketTrends(
        Number(vendor_id),
        startDate,
        endDate,
        client_id ? Number(client_id) : undefined
      );

      ApiResponseUtil.success(res, trends);
    } catch (error) {
      console.error('Error fetching ticket trends:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch ticket trends');
    }
  }

  /**
   * GET /api/vendor/tickets/by-type
   * Get tickets broken down by support type for pie chart
   */
  async getTicketsByType(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const ticketTypes = await this.vendorAnalyticsRepo.getTicketsByType(Number(vendor_id));
      ApiResponseUtil.success(res, ticketTypes);
    } catch (error) {
      console.error('Error fetching tickets by type:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch tickets by type');
    }
  }

  /**
   * GET /api/vendor/clients/ranking
   * Get client performance rankings (top 10 clients)
   */
  async getClientRankings(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const rankings = await this.vendorAnalyticsRepo.getClientRankings(Number(vendor_id));
      ApiResponseUtil.success(res, rankings);
    } catch (error) {
      console.error('Error fetching client rankings:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch client rankings');
    }
  }

  /**
   * GET /api/vendor/equipment/categories
   * Get equipment breakdown by categories for pie chart
   */
  async getEquipmentCategories(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const categories = await this.vendorAnalyticsRepo.getEquipmentCategories(Number(vendor_id));
      ApiResponseUtil.success(res, categories);
    } catch (error) {
      console.error('Error fetching equipment categories:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch equipment categories');
    }
  }

  /**
   * GET /api/vendor/equipment/high-risk
   * Get high-risk equipment that needs attention
   */
  async getHighRiskEquipment(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const equipment = await this.vendorAnalyticsRepo.getHighRiskEquipment(Number(vendor_id));
      ApiResponseUtil.success(res, equipment);
    } catch (error) {
      console.error('Error fetching high-risk equipment:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch high-risk equipment');
    }
  }

  /**
   * GET /api/vendor/users/technicians
   * Get technician performance metrics
   */
  async getTechnicianPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const performance = await this.vendorAnalyticsRepo.getTechnicianPerformance(Number(vendor_id));
      ApiResponseUtil.success(res, performance);
    } catch (error) {
      console.error('Error fetching technician performance:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch technician performance');
    }
  }

  /**
   * GET /api/vendor/users/logins
   * Get user login trends for vendor staff
   */
  async getUserLoginTrends(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id, start, end } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      // Set default date range if not provided (last 12 weeks)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trends = await this.vendorAnalyticsRepo.getUserLoginTrends(
        Number(vendor_id),
        startDate,
        endDate
      );

      ApiResponseUtil.success(res, trends);
    } catch (error) {
      console.error('Error fetching user login trends:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch user login trends');
    }
  }

  /**
   * GET /api/vendor/users/resets
   * Get password reset reasons for pie chart
   */
  async getPasswordResets(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const resets = await this.vendorAnalyticsRepo.getPasswordResets(Number(vendor_id));
      ApiResponseUtil.success(res, resets);
    } catch (error) {
      console.error('Error fetching password resets:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch password resets');
    }
  }

  /**
   * GET /api/vendor/audit/recent
   * Get recent vendor audit events
   */
  async getRecentVendorAudits(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      const audits = await this.vendorAnalyticsRepo.getRecentVendorAudits(Number(vendor_id));
      ApiResponseUtil.success(res, audits);
    } catch (error) {
      console.error('Error fetching recent vendor audits:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch recent vendor audits');
    }
  }

  /**
   * GET /api/vendor/clients/dropdown
   * Get list of clients for dropdown filter
   */
  async getClientsForDropdown(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      // Simple query to get client list for dropdown
      const query = `
        SELECT id, company_name 
        FROM public.clients 
        WHERE created_by_vendor_id = $1 
          AND status = 'active'
        ORDER BY company_name
      `;
      
      const result = await this.vendorAnalyticsRepo['pool'].query(query, [Number(vendor_id)]);
      ApiResponseUtil.success(res, result.rows);
    } catch (error) {
      console.error('Error fetching clients for dropdown:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch clients for dropdown');
    }
  }

  /**
   * GET /api/vendor/equipment/types
   * Get list of equipment types for dropdown filter
   */
  async getEquipmentTypesForDropdown(req: Request, res: Response): Promise<void> {
    try {
      const { vendor_id } = req.query;

      if (!vendor_id) {
        return ApiResponseUtil.badRequest(res, 'vendor_id is required');
      }

      // Simple query to get equipment types for dropdown
      const query = `
        SELECT DISTINCT e.equipment_type 
        FROM public.equipment e
        JOIN public.equipment_instance ei ON e.id = ei.equipment_id
        WHERE ei.vendor_id = $1 
          AND ei.deleted_at IS NULL
        ORDER BY e.equipment_type
      `;
      
      const result = await this.vendorAnalyticsRepo['pool'].query(query, [Number(vendor_id)]);
      ApiResponseUtil.success(res, result.rows);
    } catch (error) {
      console.error('Error fetching equipment types for dropdown:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch equipment types for dropdown');
    }
  }
}