import { Response } from 'express';
import { BaseController } from './BaseController';
import { AuthenticatedRequest } from '../types/api';
import { NotificationRepository } from '../models/NotificationRepository';

export class NotificationController extends BaseController {

  /**
   * Get notifications for authenticated user
   */
  static async getUserNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { 
        page = '1', 
        limit = '20', 
        unread_only = 'false',
        category 
      } = req.query;

      const options = {
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        unread_only: unread_only === 'true',
        category: category as string
      };

      const result = await NotificationRepository.getUserNotifications(userId, options);
      
      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          has_more: (parseInt(page as string) * parseInt(limit as string)) < result.total
        }
      });
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
  }

  /**
   * Get notification KPIs for authenticated user
   */
  static async getNotificationKPIs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      
      const kpis = await NotificationRepository.getUserNotificationKPIs(userId);
      
      res.json({ success: true, data: kpis });
    } catch (error) {
      console.error('Error fetching notification KPIs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notification KPIs' });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const notificationId = parseInt(req.params.id);

      if (!notificationId || isNaN(notificationId)) {
        res.status(400).json({ success: false, message: 'Invalid notification ID' });
        return;
      }

      const success = await NotificationRepository.markAsRead(notificationId, userId);
      
      if (success) {
        res.json({ success: true, message: 'Notification marked as read' });
      } else {
        res.status(404).json({ success: false, message: 'Notification not found or already read' });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      
      const count = await NotificationRepository.markAllAsRead(userId);
      
      res.json({ 
        success: true, 
        message: `${count} notifications marked as read`,
        data: { marked_count: count }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const notificationId = parseInt(req.params.id);

      if (!notificationId || isNaN(notificationId)) {
        res.status(400).json({ success: false, message: 'Invalid notification ID' });
        return;
      }

      const success = await NotificationRepository.archiveNotification(notificationId, userId);
      
      if (success) {
        res.json({ success: true, message: 'Notification archived' });
      } else {
        res.status(404).json({ success: false, message: 'Notification not found' });
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      res.status(500).json({ success: false, message: 'Failed to archive notification' });
    }
  }
}