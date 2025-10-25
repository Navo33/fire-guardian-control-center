import express from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const dashboardController = new DashboardController();

// All dashboard routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get dashboard overview statistics based on user role
 * @access  Private (All authenticated users)
 */
router.get('/overview', dashboardController.getOverview);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get detailed dashboard statistics
 * @query   period - Time period (7d, 30d, 90d, 1y)
 * @query   category - Specific category filter
 * @access  Private (All authenticated users)
 */
router.get('/stats', dashboardController.getStats);

/**
 * @route   GET /api/dashboard/recent-vendors
 * @desc    Get recent vendors (admin only)
 * @access  Private (Admin only)
 */
router.get('/recent-vendors', dashboardController.getRecentVendors);

/**
 * @route   GET /api/dashboard/insights
 * @desc    Get dashboard insights and analytics
 * @access  Private (All authenticated users)
 */
router.get('/insights', dashboardController.getInsights);

/**
 * @route   GET /api/dashboard/recent-activity
 * @desc    Get recent activity feed with pagination
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 100)
 * @access  Private (All authenticated users)
 */
router.get('/recent-activity', dashboardController.getRecentActivity);

/**
 * @route   GET /api/dashboard/charts/:chartType
 * @desc    Get chart data for dashboard visualizations
 * @param   chartType - Type of chart (equipment-status, service-requests, etc.)
 * @query   period - Time period (default: 30d)
 * @query   groupBy - Group data by (day, week, month)
 * @access  Private (All authenticated users)
 */
router.get('/charts/:chartType', dashboardController.getChartData);

/**
 * @route   GET /api/dashboard/export
 * @desc    Export dashboard data
 * @query   format - Export format (json, csv)
 * @query   type - Data type to export (overview, stats, etc.)
 * @access  Private (All authenticated users)
 */
router.get('/export', dashboardController.exportData);

/**
 * @route   GET /api/dashboard/vendor-kpis
 * @desc    Get vendor dashboard KPIs (vendor only)
 * @access  Private (Vendor only)
 */
router.get('/vendor-kpis', dashboardController.getVendorKPIs);

/**
 * @route   GET /api/dashboard/vendor-activity
 * @desc    Get vendor recent activity with notifications (vendor only)
 * @query   limit - Number of items to return (default: 10)
 * @access  Private (Vendor only)
 */
router.get('/vendor-activity', dashboardController.getVendorActivity);

export default router;