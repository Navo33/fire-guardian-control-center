import { Router } from 'express';
import { AdminAnalyticsController } from '../controllers/AdminAnalyticsController';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireSuperAdmin); // Only allow admin users

/**
 * @route   GET /api/admin/analytics/overview
 * @desc    Get system overview statistics
 * @access  Admin only
 * @query   startDate, endDate, vendorId (optional)
 */
router.get('/overview', AdminAnalyticsController.getSystemOverview);

/**
 * @route   GET /api/admin/analytics/compliance/summary
 * @desc    Get compliance analytics summary
 * @access  Admin only
 * @query   vendorId (optional)
 */
router.get('/compliance/summary', AdminAnalyticsController.getComplianceSummary);

/**
 * @route   GET /api/admin/analytics/compliance/trend
 * @desc    Get compliance trend over time
 * @access  Admin only
 * @query   startDate, endDate, vendorId (optional)
 */
router.get('/compliance/trend', AdminAnalyticsController.getComplianceTrend);

/**
 * @route   GET /api/admin/analytics/compliance/by-vendor
 * @desc    Get compliance by vendor
 * @access  Admin only
 */
router.get('/compliance/by-vendor', AdminAnalyticsController.getComplianceByVendor);

/**
 * @route   GET /api/admin/analytics/tickets/overview
 * @desc    Get tickets overview statistics
 * @access  Admin only
 */
router.get('/tickets/overview', AdminAnalyticsController.getTicketsOverview);

/**
 * @route   GET /api/admin/analytics/tickets/trends
 * @desc    Get ticket trends over time
 * @access  Admin only
 * @query   startDate, endDate, vendorId (optional)
 */
router.get('/tickets/trends', AdminAnalyticsController.getTicketTrends);

/**
 * @route   GET /api/admin/analytics/tickets/by-type
 * @desc    Get tickets by type
 * @access  Admin only
 * @query   vendorId (optional)
 */
router.get('/tickets/by-type', AdminAnalyticsController.getTicketsByType);

/**
 * @route   GET /api/admin/analytics/tickets/recent-high-priority
 * @desc    Get recent high-priority tickets
 * @access  Admin only
 * @query   vendorId (optional)
 */
router.get('/tickets/recent-high-priority', AdminAnalyticsController.getRecentHighPriorityTickets);

/**
 * @route   GET /api/admin/analytics/vendors/rankings
 * @desc    Get vendor performance rankings
 * @access  Admin only
 */
router.get('/vendors/rankings', AdminAnalyticsController.getVendorRankings);

/**
 * @route   GET /api/admin/analytics/equipment/categories
 * @desc    Get equipment categories breakdown
 * @access  Admin only
 * @query   vendorId (optional)
 */
router.get('/equipment/categories', AdminAnalyticsController.getEquipmentCategories);

/**
 * @route   GET /api/admin/analytics/audit/trends
 * @desc    Get audit log trends
 * @access  Admin only
 * @query   startDate, endDate (optional)
 */
router.get('/audit/trends', AdminAnalyticsController.getAuditTrends);

/**
 * @route   GET /api/admin/analytics/audit/recent
 * @desc    Get recent audit events
 * @access  Admin only
 */
router.get('/audit/recent', AdminAnalyticsController.getRecentAuditEvents);

/**
 * @route   GET /api/admin/analytics/security/summary
 * @desc    Get security summary
 * @access  Admin only
 */
router.get('/security/summary', AdminAnalyticsController.getSecuritySummary);

/**
 * @route   GET /api/admin/analytics/users/trends
 * @desc    Get user engagement trends (login patterns, failed attempts, password resets)
 * @access  Admin only
 * @query   startDate, endDate (optional)
 */
router.get('/users/trends', AdminAnalyticsController.getUserTrends);

/**
 * @route   GET /api/admin/analytics/users/password-resets
 * @desc    Get password reset breakdown by reason
 * @access  Admin only
 */
router.get('/users/password-resets', AdminAnalyticsController.getPasswordResets);

export default router;