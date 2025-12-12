import express from 'express';
import { PDFReportsController } from '../controllers/PDFReportsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const reportsController = new PDFReportsController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/reports/client
 * @desc Generate and download client equipment report PDF
 * @access Client only
 * @body { startDate: string (YYYY-MM-DD), endDate: string (YYYY-MM-DD) }
 */
router.post('/client', reportsController.generateClientReport);

/**
 * @route GET /api/reports/client/preview
 * @desc Preview report data without generating PDF
 * @access Client only
 * @query startDate, endDate
 */
router.get('/client/preview', reportsController.previewReportData);

/**
 * @route GET /api/reports/client/date-range
 * @desc Get available date range for report generation
 * @access Client only
 */
router.get('/client/date-range', reportsController.getAvailableDateRange);

/**
 * @route POST /api/reports/vendor/client/:clientId
 * @desc Generate and download report for a specific client (vendor access)
 * @access Vendor only
 * @param clientId - Client ID
 * @body { startDate: string (YYYY-MM-DD), endDate: string (YYYY-MM-DD) }
 */
router.post('/vendor/client/:clientId', reportsController.generateVendorClientReport);

/**
 * @route GET /api/reports/vendor/clients
 * @desc Get list of vendor's clients for report filtering
 * @access Vendor only
 */
router.get('/vendor/clients', reportsController.getVendorClientsList);

/**
 * @route GET /api/reports/vendor/date-range
 * @desc Get available date range for vendor reports
 * @access Vendor only
 * @query clientId (optional) - Filter by specific client
 */
router.get('/vendor/date-range', reportsController.getVendorDateRange);

export default router;
