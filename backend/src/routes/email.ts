import { Router } from 'express';
import EmailTestController from '../controllers/EmailTestController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/email/test
 * @desc    Send a test email
 * @access  Private (Admin/Vendor)
 */
router.post('/test', EmailTestController.sendTestEmail);

/**
 * @route   GET /api/email/logs
 * @desc    Get email logs
 * @access  Private (Admin/Vendor)
 */
router.get('/logs', EmailTestController.getEmailLogs);

/**
 * @route   GET /api/email/stats
 * @desc    Get email statistics
 * @access  Private (Admin/Vendor)
 */
router.get('/stats', EmailTestController.getEmailStats);

/**
 * @route   POST /api/email/trigger/maintenance-reminders
 * @desc    Manually trigger maintenance reminder emails
 * @access  Private (Admin/Vendor)
 */
router.post('/trigger/maintenance-reminders', EmailTestController.triggerMaintenanceReminders);

/**
 * @route   POST /api/email/trigger/expiration-alerts
 * @desc    Manually trigger expiration alert emails
 * @access  Private (Admin/Vendor)
 */
router.post('/trigger/expiration-alerts', EmailTestController.triggerExpirationAlerts);

/**
 * @route   GET /api/email/verify
 * @desc    Verify email configuration
 * @access  Private (Admin/Vendor)
 */
router.get('/verify', EmailTestController.verifyEmailConfiguration);

/**
 * @route   GET /api/email/preview/:templateType
 * @desc    Preview email template
 * @access  Private (Admin/Vendor)
 */
router.get('/preview/:templateType', EmailTestController.previewEmailTemplate);

export default router;
