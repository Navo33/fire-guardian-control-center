import { Router } from 'express';
import ReportsController from '../controllers/ReportsController';
import { authenticateToken, requireVendorOrAdmin } from '../middleware/auth';

const router = Router();

// Apply authentication and vendor role check to all routes
router.use(authenticateToken);
router.use(requireVendorOrAdmin);

// KPI and Dashboard Data
router.get('/kpis', ReportsController.getKPIData.bind(ReportsController));
router.get('/enhanced-kpis', ReportsController.getEnhancedKPIData.bind(ReportsController));
router.get('/dashboard', ReportsController.getDashboardData.bind(ReportsController));

// Chart Data Endpoints
router.get('/compliance-chart', ReportsController.getComplianceChartData.bind(ReportsController));
router.get('/tickets-chart', ReportsController.getTicketChartData.bind(ReportsController));

// Enhanced Chart Endpoints (NEW) - These match the frontend API endpoints
router.get('/equipment-status', ReportsController.getEquipmentTypeChart.bind(ReportsController));
router.get('/maintenance-trends', ReportsController.getMaintenanceTrendsChart.bind(ReportsController));
router.get('/compliance-overview', ReportsController.getComplianceTrendsChart.bind(ReportsController));
router.get('/revenue-trends', ReportsController.getEquipmentValueChart.bind(ReportsController));
router.get('/client-satisfaction-chart', ReportsController.getClientSatisfactionChart.bind(ReportsController));

// Table Data Endpoints for Business Insights
router.get('/top-clients', ReportsController.getTopClients.bind(ReportsController));
router.get('/equipment-performance', ReportsController.getEquipmentPerformance.bind(ReportsController));
router.get('/maintenance-backlog', ReportsController.getMaintenanceBacklog.bind(ReportsController));
router.get('/revenue-by-client', ReportsController.getRevenueByClient.bind(ReportsController));
router.get('/compliance-issues', ReportsController.getComplianceIssues.bind(ReportsController));

// Analytics Endpoints
router.get('/client-performance', ReportsController.getClientPerformance.bind(ReportsController));
router.get('/equipment-analytics', ReportsController.getEquipmentAnalytics.bind(ReportsController));
router.get('/maintenance-analytics', ReportsController.getMaintenanceAnalytics.bind(ReportsController));
router.get('/revenue-analytics', ReportsController.getRevenueAnalytics.bind(ReportsController));

// Upcoming Tasks
router.get('/upcoming-maintenance', ReportsController.getUpcomingMaintenance.bind(ReportsController));

// Dropdown Data
router.get('/clients-dropdown', ReportsController.getClientsForDropdown.bind(ReportsController));
router.get('/equipment-types-dropdown', ReportsController.getEquipmentTypesForDropdown.bind(ReportsController));

// Report Generation
router.get('/equipment-compliance-report', ReportsController.generateEquipmentComplianceReport.bind(ReportsController));
router.get('/maintenance-report', ReportsController.generateMaintenanceReport.bind(ReportsController));

export default router;