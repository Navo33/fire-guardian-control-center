import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ApiResponseUtil } from '../utils/ApiResponse';
import AnalyticsRepository, { AnalyticsFilters, AlertMetrics, AlertTrend } from '../models/AnalyticsRepository';
import { DashboardRepository } from '../models/DashboardRepository';
import { AuthenticatedRequest } from '../types';

class AnalyticsController extends BaseController {
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    super();
    this.analyticsRepository = new AnalyticsRepository();
  }

  /**
   * Helper method to get vendor ID from authenticated user
   */
  private async getVendorId(req: AuthenticatedRequest): Promise<number | null> {
    if (!req.user?.userId) {
      return null;
    }
    return await DashboardRepository.getVendorIdFromUserId(req.user.userId);
  }

  /**
   * Get comprehensive system analytics
   * @route GET /api/analytics/system
   * @access Private (Super Admin)
   */
  public getSystemAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      
      const [
        systemMetrics,
        vendorMetrics,
        equipmentMetrics,
        clientMetrics,
        timeSeriesData,
        companies,
        alertMetrics,
        alertTrends
      ] = await Promise.all([
        this.analyticsRepository.getSystemMetrics(filters),
        this.analyticsRepository.getVendorMetrics(filters),
        this.analyticsRepository.getEquipmentMetrics(filters),
        this.analyticsRepository.getClientMetrics(filters),
        this.analyticsRepository.getTimeSeriesData(filters),
        this.analyticsRepository.getCompanies(),
        this.analyticsRepository.getAlertMetrics(filters),
        this.analyticsRepository.getAlertTrends(filters)
      ]);

      ApiResponseUtil.success(res, {
        systemMetrics,
        vendorMetrics,
        equipmentMetrics,
        clientMetrics,
        timeSeriesData,
        companies,
        alertMetrics,
        alertTrends
      }, 'Analytics data retrieved successfully');
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch analytics data');
    }
  };

  /**
   * Get system metrics only
   * @route GET /api/analytics/metrics
   * @access Private (Super Admin)
   */
  public getSystemMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const systemMetrics = await this.analyticsRepository.getSystemMetrics(filters);

      ApiResponseUtil.success(res, systemMetrics, 'System metrics retrieved successfully');
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch system metrics');
    }
  };

  /**
   * Get vendor performance metrics
   * @route GET /api/analytics/vendors
   * @access Private (Super Admin)
   */
  public getVendorMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const vendorMetrics = await this.analyticsRepository.getVendorMetrics(filters);

      ApiResponseUtil.success(res, vendorMetrics, 'Vendor metrics retrieved successfully');
    } catch (error) {
      console.error('Error fetching vendor metrics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch vendor metrics');
    }
  };

  /**
   * Get equipment utilization metrics
   * @route GET /api/analytics/equipment
   * @access Private (Super Admin)
   */
  public getEquipmentMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const equipmentMetrics = await this.analyticsRepository.getEquipmentMetrics(filters);

      ApiResponseUtil.success(res, equipmentMetrics, 'Equipment metrics retrieved successfully');
    } catch (error) {
      console.error('Error fetching equipment metrics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch equipment metrics');
    }
  };

  /**
   * Get client activity metrics
   * @route GET /api/analytics/clients
   * @access Private (Super Admin)
   */
  public getClientMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const clientMetrics = await this.analyticsRepository.getClientMetrics(filters);

      ApiResponseUtil.success(res, clientMetrics, 'Client metrics retrieved successfully');
    } catch (error) {
      console.error('Error fetching client metrics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch client metrics');
    }
  };

  /**
   * Get time series data for charts
   * @route GET /api/analytics/timeseries
   * @access Private (Super Admin)
   */
  public getTimeSeriesData = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const timeSeriesData = await this.analyticsRepository.getTimeSeriesData(filters);

      ApiResponseUtil.success(res, timeSeriesData, 'Time series data retrieved successfully');
    } catch (error) {
      console.error('Error fetching time series data:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch time series data');
    }
  };

  /**
   * Get companies for filtering
   * @route GET /api/analytics/companies
   * @access Private (Super Admin)
   */
  public getCompanies = async (req: Request, res: Response): Promise<void> => {
    try {
      const companies = await this.analyticsRepository.getCompanies();

      ApiResponseUtil.success(res, companies, 'Companies retrieved successfully');
    } catch (error) {
      console.error('Error fetching companies:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch companies');
    }
  };

  /**
   * Get alert metrics
   * @route GET /api/analytics/alerts
   * @access Private (Super Admin)
   */
  public getAlertMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const alertMetrics = await this.analyticsRepository.getAlertMetrics(filters);

      ApiResponseUtil.success(res, alertMetrics, 'Alert metrics retrieved successfully');
    } catch (error) {
      console.error('Error fetching alert metrics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch alert metrics');
    }
  };

  /**
   * Get alert trends
   * @route GET /api/analytics/alerts/trends
   * @access Private (Super Admin)
   */
  public getAlertTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = this.parseFilters(req.query);
      const alertTrends = await this.analyticsRepository.getAlertTrends(filters);

      ApiResponseUtil.success(res, alertTrends, 'Alert trends retrieved successfully');
    } catch (error) {
      console.error('Error fetching alert trends:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch alert trends');
    }
  };

  /**
   * Get vendor-specific analytics data
   * @route GET /api/vendor/analytics
   * @access Private (Vendor)
   */
  public getVendorAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res, 'Vendor ID not found');
        return;
      }

      const { clientId, startDate, endDate } = req.query;

      const [
        systemMetrics,
        ticketTrends,
        complianceTrends,
        clientPerformance,
        equipmentHealth
      ] = await Promise.all([
        this.analyticsRepository.getSystemMetrics({ startDate: startDate as string, endDate: endDate as string }),
        this.analyticsRepository.getTicketTrends(vendorId, clientId ? parseInt(clientId as string) : undefined, startDate as string, endDate as string),
        this.analyticsRepository.getComplianceTrends(vendorId, clientId ? parseInt(clientId as string) : undefined, startDate as string, endDate as string),
        this.analyticsRepository.getClientPerformance(vendorId, startDate as string, endDate as string),
        this.analyticsRepository.getEquipmentHealth(vendorId)
      ]);

      ApiResponseUtil.success(res, {
        systemMetrics,
        ticketTrends,
        complianceTrends,
        clientPerformance,
        equipmentHealth
      }, 'Vendor analytics data retrieved successfully');
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch vendor analytics data');
    }
  };

  /**
   * Get ticket trends for vendor
   * @route GET /api/vendor/analytics/ticket-trends
   * @access Private (Vendor)
   */
  public getTicketTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res, 'Vendor ID not found');
        return;
      }

      const { clientId, startDate, endDate } = req.query;
      const ticketTrends = await this.analyticsRepository.getTicketTrends(
        vendorId, 
        clientId ? parseInt(clientId as string) : undefined, 
        startDate as string, 
        endDate as string
      );

      ApiResponseUtil.success(res, ticketTrends, 'Ticket trends retrieved successfully');
    } catch (error) {
      console.error('Error fetching ticket trends:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch ticket trends');
    }
  };

  /**
   * Get compliance trends for vendor
   * @route GET /api/vendor/analytics/compliance-trends
   * @access Private (Vendor)
   */
  public getComplianceTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = await this.getVendorId(req as AuthenticatedRequest);
      if (!vendorId) {
        ApiResponseUtil.unauthorized(res, 'Vendor ID not found');
        return;
      }

      const { clientId, startDate, endDate } = req.query;
      const complianceTrends = await this.analyticsRepository.getComplianceTrends(
        vendorId, 
        clientId ? parseInt(clientId as string) : undefined, 
        startDate as string, 
        endDate as string
      );

      ApiResponseUtil.success(res, complianceTrends, 'Compliance trends retrieved successfully');
    } catch (error) {
      console.error('Error fetching compliance trends:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch compliance trends');
    }
  };

  /**
   * Parse query parameters into filters object
   */
  private parseFilters(query: any): AnalyticsFilters {
    const filters: AnalyticsFilters = {};

    if (query.startDate) {
      filters.startDate = query.startDate;
    }

    if (query.endDate) {
      filters.endDate = query.endDate;
    }

    if (query.vendorIds) {
      filters.vendorIds = Array.isArray(query.vendorIds) 
        ? query.vendorIds.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
        : [parseInt(query.vendorIds)].filter((id: number) => !isNaN(id));
    }

    if (query.clientIds) {
      filters.clientIds = Array.isArray(query.clientIds) 
        ? query.clientIds.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
        : [parseInt(query.clientIds)].filter((id: number) => !isNaN(id));
    }

    if (query.equipmentTypes) {
      filters.equipmentTypes = Array.isArray(query.equipmentTypes) 
        ? query.equipmentTypes 
        : [query.equipmentTypes];
    }

    if (query.specializations) {
      filters.specializations = Array.isArray(query.specializations) 
        ? query.specializations 
        : [query.specializations];
    }

    if (query.status) {
      filters.status = Array.isArray(query.status) 
        ? query.status 
        : [query.status];
    }

    return filters;
  }
}

export default AnalyticsController;