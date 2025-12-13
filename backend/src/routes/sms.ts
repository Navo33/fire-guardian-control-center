import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import SmsController from '../controllers/SmsController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Balance check (admin only)
router.get('/balance', SmsController.getBalance);

// Statistics (admin only)
router.get('/statistics', SmsController.getStatistics);

// User preferences
router.get('/preferences', SmsController.getUserPreferences);
router.put('/preferences', SmsController.updateUserPreferences);

// System settings (admin only)
router.get('/settings', SmsController.getSystemSettings);
router.put('/settings', SmsController.updateSystemSettings);

// Manual check trigger (admin only)
router.post('/check-now', SmsController.triggerManualCheck);

// Test SMS
router.post('/test', SmsController.testSms);

export default router;
