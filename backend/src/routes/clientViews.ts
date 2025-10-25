import { Router } from 'express';
import { ClientViewsController } from '../controllers/ClientViewsController';
import { authenticateToken, requireClient } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireClient); // Only allow client users

// Client Dashboard
router.get('/dashboard/kpis', ClientViewsController.getDashboardKPIs.bind(ClientViewsController));
router.get('/dashboard/activity', ClientViewsController.getRecentActivity.bind(ClientViewsController));

// Client Equipment
router.get('/equipment', ClientViewsController.getEquipmentList.bind(ClientViewsController));

// Client Tickets
router.get('/tickets', ClientViewsController.getTicketList.bind(ClientViewsController));

// Client Reports
router.get('/reports/kpis', ClientViewsController.getReportsKPIs.bind(ClientViewsController));
router.get('/reports/compliance-chart', ClientViewsController.getComplianceChartData.bind(ClientViewsController));
router.get('/reports', ClientViewsController.getReportsList.bind(ClientViewsController));
router.get('/reports/:id', ClientViewsController.getReportDetails.bind(ClientViewsController));
router.get('/reports/:id/related', ClientViewsController.getRelatedReports.bind(ClientViewsController));

// Export functionality
router.get('/reports/export-all', ClientViewsController.exportAllReports.bind(ClientViewsController));
router.get('/reports/:id/export', ClientViewsController.exportSingleReport.bind(ClientViewsController));

export default router;
