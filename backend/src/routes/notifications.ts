import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// Get user notifications with pagination and filtering
router.get('/', NotificationController.getUserNotifications);

// Get notification KPIs (unread count, etc.)
router.get('/kpis', NotificationController.getNotificationKPIs);

// Mark notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', NotificationController.markAllAsRead);

// Archive notification
router.patch('/:id/archive', NotificationController.archiveNotification);

export default router;