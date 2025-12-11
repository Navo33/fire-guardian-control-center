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

export default router;
