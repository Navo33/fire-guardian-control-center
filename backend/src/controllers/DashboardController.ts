import { Response } from 'express';
import { BaseController } from './BaseController';
import { DashboardRepository } from '../models/DashboardRepository';
import { UserRepository } from '../models/UserRepository';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { DebugLogger } from '../utils/DebugLogger';
import { AuthenticatedRequest } from '../types/api';

/**
 * Dashboard Controller
 * Handles dashboard analytics, insights, and statistics
 */
export class DashboardController extends BaseController {

  /**
   * GET /api/dashboard/overview
   * Get dashboard overview statistics based on user role
   */
  getOverview = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    try {
      let overview;
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      switch (userType) {
        case 'admin':
          overview = await DashboardRepository.getAdminOverview();
          break;
        case 'vendor':
          overview = await DashboardRepository.getVendorOverview(userId);
          break;
        case 'client':
          overview = await DashboardRepository.getClientOverview(userId);
          break;
        default:
          return ApiResponseUtil.forbidden(res, 'Invalid user type');
      }

      this.logAction('DASHBOARD_OVERVIEW_ACCESSED', userId, { userType });

      ApiResponseUtil.success(res, overview, 'Dashboard overview retrieved successfully');

    } catch (error) {
      this.logAction('DASHBOARD_OVERVIEW_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error getting dashboard overview:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/dashboard/stats
   * Get detailed dashboard statistics
   */
  getStats = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', '/api/dashboard/stats', req.query);

    try {
      const { period = '30d', category } = req.query;
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      DebugLogger.log('Fetching dashboard stats', { userId, userType, period, category }, 'DASHBOARD');

      let stats;

      switch (userType) {
        case 'admin':
          stats = await DashboardRepository.getAdminStats(period as string, category as string);
          break;
        case 'vendor':
          stats = await DashboardRepository.getVendorStats(userId, period as string);
          break;
        case 'client':
          stats = await DashboardRepository.getClientStats(userId, period as string);
          break;
        default:
          DebugLogger.error('Invalid user type for dashboard stats', { userType, userId });
          return ApiResponseUtil.forbidden(res, 'Invalid user type');
      }

      DebugLogger.log('Dashboard stats retrieved successfully', { statsKeys: Object.keys(stats) }, 'DASHBOARD');
      this.logAction('DASHBOARD_STATS_ACCESSED', userId, { userType, period, category });

      DebugLogger.performance('Dashboard stats fetch', startTime, { userId, userType });
      ApiResponseUtil.success(res, stats, 'Dashboard statistics retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting dashboard stats', error, { userId: req.user?.userId });
      this.logAction('DASHBOARD_STATS_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/dashboard/recent-vendors
   * Get recent vendors (admin only)
   */
  getRecentVendors = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    const startTime = DebugLogger.startTimer();
    DebugLogger.api('GET', '/api/dashboard/recent-vendors', req.query);

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      // Only allow admin access
      if (userType !== 'admin') {
        DebugLogger.log('Non-admin user attempted to access recent vendors', { userId, userType }, 'DASHBOARD');
        return ApiResponseUtil.forbidden(res, 'Admin access required');
      }

      DebugLogger.log('Fetching recent vendors for admin', { userId }, 'DASHBOARD');

      const recentVendors = await UserRepository.getRecentVendors();

      DebugLogger.log('Recent vendors retrieved successfully', { count: recentVendors.length }, 'DASHBOARD');
      this.logAction('DASHBOARD_RECENT_VENDORS_ACCESSED', userId, { userType });

      DebugLogger.performance('Recent vendors fetch', startTime, { count: recentVendors.length });
      ApiResponseUtil.success(res, recentVendors, 'Recent vendors retrieved successfully');

    } catch (error) {
      DebugLogger.error('Error getting recent vendors', error, { userId: req.user?.userId });
      this.logAction('DASHBOARD_RECENT_VENDORS_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return ApiResponseUtil.internalError(res);
    }
  });
  getInsights = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    try {
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      let insights;

      switch (userType) {
        case 'admin':
          insights = await DashboardRepository.getAdminInsights();
          break;
        case 'vendor':
          insights = await DashboardRepository.getVendorInsights(userId);
          break;
        case 'client':
          insights = await DashboardRepository.getClientInsights(userId);
          break;
        default:
          return ApiResponseUtil.forbidden(res, 'Invalid user type');
      }

      this.logAction('DASHBOARD_INSIGHTS_ACCESSED', userId, { userType });

      ApiResponseUtil.success(res, insights, 'Dashboard insights retrieved successfully');

    } catch (error) {
      this.logAction('DASHBOARD_INSIGHTS_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error getting dashboard insights:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/dashboard/recent-activity
   * Get recent activity feed
   */
  getRecentActivity = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    try {
      const pagination = this.getPagination(req);
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      let activities;
      let total;

      switch (userType) {
        case 'admin':
          [activities, total] = await Promise.all([
            DashboardRepository.getAdminRecentActivity(pagination),
            DashboardRepository.getAdminActivityCount()
          ]);
          break;
        case 'vendor':
          [activities, total] = await Promise.all([
            DashboardRepository.getVendorRecentActivity(userId, pagination),
            DashboardRepository.getVendorActivityCount(userId)
          ]);
          break;
        case 'client':
          [activities, total] = await Promise.all([
            DashboardRepository.getClientRecentActivity(userId, pagination),
            DashboardRepository.getClientActivityCount(userId)
          ]);
          break;
        default:
          return ApiResponseUtil.forbidden(res, 'Invalid user type');
      }

      this.logAction('DASHBOARD_ACTIVITY_ACCESSED', userId, { userType, pagination });

      ApiResponseUtil.paginated(
        res,
        activities,
        pagination.page!,
        pagination.limit!,
        total,
        'Recent activity retrieved successfully'
      );

    } catch (error) {
      this.logAction('DASHBOARD_ACTIVITY_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error getting recent activity:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/dashboard/charts/:chartType
   * Get chart data for dashboard visualizations
   */
  getChartData = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    try {
      const { chartType } = req.params;
      const { period = '30d', groupBy = 'day' } = req.query;
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      // Validate chart type
      const allowedChartTypes = [
        'equipment-status',
        'service-requests',
        'maintenance-schedule',
        'user-activity',
        'performance-metrics'
      ];

      if (!allowedChartTypes.includes(chartType)) {
        return ApiResponseUtil.error(res, 'Invalid chart type', 400, 'INVALID_CHART_TYPE');
      }

      let chartData;

      switch (userType) {
        case 'admin':
          chartData = await DashboardRepository.getAdminChartData(
            chartType,
            period as string,
            groupBy as string
          );
          break;
        case 'vendor':
          chartData = await DashboardRepository.getVendorChartData(
            userId,
            chartType,
            period as string,
            groupBy as string
          );
          break;
        case 'client':
          chartData = await DashboardRepository.getClientChartData(
            userId,
            chartType,
            period as string,
            groupBy as string
          );
          break;
        default:
          return ApiResponseUtil.forbidden(res, 'Invalid user type');
      }

      this.logAction('DASHBOARD_CHART_ACCESSED', userId, { 
        userType, 
        chartType, 
        period, 
        groupBy 
      });

      ApiResponseUtil.success(res, chartData, `Chart data for ${chartType} retrieved successfully`);

    } catch (error) {
      this.logAction('DASHBOARD_CHART_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error getting chart data:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/dashboard/export
   * Export dashboard data
   */
  exportData = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!this.requireAuth(req, res)) return;

    try {
      const { format = 'json', type = 'overview' } = req.query;
      const userId = req.user!.userId;
      const userType = req.user!.user_type;

      // Validate format
      if (!['json', 'csv'].includes(format as string)) {
        return ApiResponseUtil.error(res, 'Invalid export format', 400, 'INVALID_FORMAT');
      }

      let exportData;

      switch (userType) {
        case 'admin':
          exportData = await DashboardRepository.getAdminExportData(type as string);
          break;
        case 'vendor':
          exportData = await DashboardRepository.getVendorExportData(userId, type as string);
          break;
        case 'client':
          exportData = await DashboardRepository.getClientExportData(userId, type as string);
          break;
        default:
          return ApiResponseUtil.forbidden(res, 'Invalid user type');
      }

      this.logAction('DASHBOARD_EXPORT_ACCESSED', userId, { userType, format, type });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="dashboard-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(exportData);
      } else {
        ApiResponseUtil.success(res, exportData, 'Dashboard data exported successfully');
      }

    } catch (error) {
      this.logAction('DASHBOARD_EXPORT_ERROR', req.user?.userId, { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('Error exporting dashboard data:', error);
      return ApiResponseUtil.internalError(res);
    }
  });
}