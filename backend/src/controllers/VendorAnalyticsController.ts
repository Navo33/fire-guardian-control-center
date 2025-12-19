import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { VendorAnalyticsRepository } from '../models/VendorAnalyticsRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/api';
import { DashboardRepository } from '../models/DashboardRepository';

export class VendorAnalyticsController extends BaseController {
  private vendorAnalyticsRepo: VendorAnalyticsRepository;

  constructor(vendorAnalyticsRepo: VendorAnalyticsRepository) {
    super();
    this.vendorAnalyticsRepo = vendorAnalyticsRepo;
  }

  /**
   * Get vendor ID from authenticated user
   */
  private async getVendorId(req: AuthenticatedRequest): Promise<number | null> {
    if (!req.user?.userId) {
      return null;
    }
    const vendorId = await DashboardRepository.getVendorIdFromUserId(req.user.userId);
    return vendorId;
  }

  /**
   * GET /api/vendor/overview
   * Get vendor overview KPIs including active clients, total equipment, tickets, and compliance
   */
  async getVendorOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const { start, end, client_id, equipment_type } = req.query;

      // Set default date range if not provided (last 90 days)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const overview = await this.vendorAnalyticsRepo.getVendorOverview(
        vendorId,
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
  async getComplianceByClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const compliance = await this.vendorAnalyticsRepo.getComplianceByClient(vendorId);
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
  async getComplianceTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const { start, end, client_id } = req.query;

      // Set default date range if not provided (last 12 months)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trend = await this.vendorAnalyticsRepo.getComplianceTrend(
        vendorId,
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
  async getTicketTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const { start, end, client_id } = req.query;

      // Set default date range if not provided (last 12 months)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trends = await this.vendorAnalyticsRepo.getTicketTrends(
        vendorId,
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
  async getTicketsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const ticketsByType = await this.vendorAnalyticsRepo.getTicketsByType(vendorId);
      ApiResponseUtil.success(res, ticketsByType);
    } catch (error) {
      console.error('Error fetching tickets by type:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch tickets by type');
    }
  }

  /**
   * GET /api/vendor/clients/ranking
   * Get client performance rankings (top 10 clients)
   */
  async getClientRankings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const rankings = await this.vendorAnalyticsRepo.getClientRankings(vendorId);
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
  async getEquipmentCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const categories = await this.vendorAnalyticsRepo.getEquipmentCategories(vendorId);
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
  async getHighRiskEquipment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const equipment = await this.vendorAnalyticsRepo.getHighRiskEquipment(vendorId);
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
  async getTechnicianPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const performance = await this.vendorAnalyticsRepo.getTechnicianPerformance(vendorId);
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
  async getUserLoginTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const { start, end } = req.query;

      // Set default date range if not provided (last 12 weeks)
      const endDate = end ? String(end) : new Date().toISOString().split('T')[0];
      const startDate = start ? String(start) : new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const trends = await this.vendorAnalyticsRepo.getUserLoginTrends(
        vendorId,
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
  async getPasswordResets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const resets = await this.vendorAnalyticsRepo.getPasswordResets(vendorId);
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
  async getRecentVendorAudits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const audits = await this.vendorAnalyticsRepo.getRecentVendorAudits(vendorId);
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
  async getClientsForDropdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const clients = await this.vendorAnalyticsRepo.getClientsForDropdown(vendorId);
      ApiResponseUtil.success(res, clients);
    } catch (error) {
      console.error('Error fetching clients for dropdown:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch clients for dropdown');
    }
  }

  /**
   * GET /api/vendor/equipment/types
   * Get list of equipment types for dropdown filter
   */
  async getEquipmentTypesForDropdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const vendorId = await this.getVendorId(req);
      if (!vendorId) {
        return ApiResponseUtil.unauthorized(res, 'Vendor access required');
      }

      const equipmentTypes = await this.vendorAnalyticsRepo.getEquipmentTypesForDropdown(vendorId);
      ApiResponseUtil.success(res, equipmentTypes);
    } catch (error) {
      console.error('Error fetching equipment types for dropdown:', error);
      return ApiResponseUtil.internalError(res, 'Failed to fetch equipment types for dropdown');
    }
  }
}