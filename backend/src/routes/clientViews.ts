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
router.get('/equipment/overview', ClientViewsController.getEquipmentTypesOverview.bind(ClientViewsController));
router.get('/equipment/stats', ClientViewsController.getEquipmentStats.bind(ClientViewsController));
router.get('/equipment/:id', ClientViewsController.getEquipmentDetail.bind(ClientViewsController));

// Client Service Requests (Tickets)
router.get('/service-requests', ClientViewsController.getServiceRequests.bind(ClientViewsController));
router.post('/service-requests', ClientViewsController.createServiceRequest.bind(ClientViewsController));
router.get('/service-requests/:id', ClientViewsController.getServiceRequestDetails.bind(ClientViewsController));

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
