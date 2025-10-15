import { Router } from 'express';
import AnalyticsController from '../controllers/AnalyticsController';
import { authenticateToken } from '../middleware/auth';
import { body, query } from 'express-validator';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * Analytics Routes
 * All routes require Super Admin authentication
 */

// Middleware to ensure only super admins can access analytics
const requireSuperAdmin = [
  authenticateToken,
  (req: any, res: any, next: any) => {
    if (req.user?.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin privileges required.',
        errorCode: 'FORBIDDEN'
      });
    }
    next();
  }
];

/**
 * @route   GET /api/analytics/system
 * @desc    Get comprehensive system analytics with all metrics
 * @access  Private (Super Admin)
 * @params  ?startDate, endDate, vendorIds, clientIds, equipmentTypes, specializations
 */
router.get('/system', requireSuperAdmin, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('vendorIds').optional().isArray().withMessage('Vendor IDs must be an array'),
  query('clientIds').optional().isArray().withMessage('Client IDs must be an array'),
  query('equipmentTypes').optional().isArray().withMessage('Equipment types must be an array'),
  query('specializations').optional().isArray().withMessage('Specializations must be an array')
], analyticsController.getSystemAnalytics);

/**
 * @route   GET /api/analytics/metrics
 * @desc    Get high-level system metrics only
 * @access  Private (Super Admin)
 * @params  ?startDate, endDate, vendorIds, clientIds
 */
router.get('/metrics', requireSuperAdmin, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('vendorIds').optional().isArray().withMessage('Vendor IDs must be an array'),
  query('clientIds').optional().isArray().withMessage('Client IDs must be an array')
], analyticsController.getSystemMetrics);

/**
 * @route   GET /api/analytics/vendors
 * @desc    Get vendor performance metrics
 * @access  Private (Super Admin)
 * @params  ?startDate, endDate, vendorIds, specializations
 */
router.get('/vendors', requireSuperAdmin, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('vendorIds').optional().isArray().withMessage('Vendor IDs must be an array'),
  query('specializations').optional().isArray().withMessage('Specializations must be an array')
], analyticsController.getVendorMetrics);

/**
 * @route   GET /api/analytics/equipment
 * @desc    Get equipment utilization metrics
 * @access  Private (Super Admin)
 * @params  ?equipmentTypes
 */
router.get('/equipment', requireSuperAdmin, [
  query('equipmentTypes').optional().isArray().withMessage('Equipment types must be an array')
], analyticsController.getEquipmentMetrics);

/**
 * @route   GET /api/analytics/clients
 * @desc    Get client activity metrics
 * @access  Private (Super Admin)
 * @params  ?clientIds
 */
router.get('/clients', requireSuperAdmin, [
  query('clientIds').optional().isArray().withMessage('Client IDs must be an array')
], analyticsController.getClientMetrics);

/**
 * @route   GET /api/analytics/timeseries
 * @desc    Get time series data for charts and trends
 * @access  Private (Super Admin)
 * @params  ?startDate, endDate, vendorIds, clientIds
 */
router.get('/timeseries', requireSuperAdmin, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  query('vendorIds').optional().isArray().withMessage('Vendor IDs must be an array'),
  query('clientIds').optional().isArray().withMessage('Client IDs must be an array')
], analyticsController.getTimeSeriesData);

/**
 * @route   GET /api/analytics/companies
 * @desc    Get companies for filtering options
 * @access  Private (Super Admin)
 */
router.get('/companies', requireSuperAdmin, analyticsController.getCompanies);

/**
 * @route   GET /api/analytics/alerts
 * @desc    Get alert metrics and statistics
 * @access  Private (Super Admin)
 * @params  ?startDate, endDate
 */
router.get('/alerts', requireSuperAdmin, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
], analyticsController.getAlertMetrics);

/**
 * @route   GET /api/analytics/alerts/trends
 * @desc    Get alert trends over time
 * @access  Private (Super Admin)
 * @params  ?startDate, endDate
 */
router.get('/alerts/trends', requireSuperAdmin, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
], analyticsController.getAlertTrends);

export default router;