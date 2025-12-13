import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/api';
import SmsService from '../services/SmsService';
import NotificationScheduler from '../services/NotificationScheduler';
import { pool } from '../config/database';

export class SmsController extends BaseController {
  constructor() {
    super();
    this.getBalance = this.getBalance.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
    this.getUserPreferences = this.getUserPreferences.bind(this);
    this.updateUserPreferences = this.updateUserPreferences.bind(this);
    this.getSystemSettings = this.getSystemSettings.bind(this);
    this.updateSystemSettings = this.updateSystemSettings.bind(this);
    this.triggerManualCheck = this.triggerManualCheck.bind(this);
    this.testSms = this.testSms.bind(this);
  }

  /**
   * Check Dialog eSMS account balance
   * GET /api/sms/balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // Only admins can check balance
      if (authReq.user?.user_type !== 'admin') {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      const result = await SmsService.checkBalance();
      
      if (result.success) {
        ApiResponseUtil.success(res, result, 'Balance retrieved successfully');
      } else {
        ApiResponseUtil.badRequest(res, result.message);
      }
    } catch (error) {
      console.error('Error checking SMS balance:', error);
      ApiResponseUtil.internalError(res, 'Failed to check balance');
    }
  }

  /**
   * Get SMS usage statistics
   * GET /api/sms/statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // Only admins can view statistics
      if (authReq.user?.user_type !== 'admin') {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      const stats = await SmsService.getStatistics(days);
      
      ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error) {
      console.error('Error fetching SMS statistics:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch statistics');
    }
  }

  /**
   * Get user's SMS notification preferences
   * GET /api/sms/preferences
   */
  async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      const result = await pool.query(
        `SELECT sms_notifications_enabled, sms_high_priority_tickets, 
                sms_compliance_alerts, sms_maintenance_reminders, phone
         FROM "user" WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        ApiResponseUtil.notFound(res, 'User not found');
        return;
      }

      ApiResponseUtil.success(res, result.rows[0], 'Preferences retrieved successfully');
    } catch (error) {
      console.error('Error fetching SMS preferences:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch preferences');
    }
  }

  /**
   * Update user's SMS notification preferences
   * PUT /api/sms/preferences
   */
  async updateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      const {
        sms_notifications_enabled,
        sms_high_priority_tickets,
        sms_compliance_alerts,
        sms_maintenance_reminders,
        phone,
      } = req.body;

      const result = await pool.query(
        `UPDATE "user" 
         SET sms_notifications_enabled = COALESCE($1, sms_notifications_enabled),
             sms_high_priority_tickets = COALESCE($2, sms_high_priority_tickets),
             sms_compliance_alerts = COALESCE($3, sms_compliance_alerts),
             sms_maintenance_reminders = COALESCE($4, sms_maintenance_reminders),
             phone = COALESCE($5, phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING sms_notifications_enabled, sms_high_priority_tickets, 
                   sms_compliance_alerts, sms_maintenance_reminders, phone`,
        [
          sms_notifications_enabled,
          sms_high_priority_tickets,
          sms_compliance_alerts,
          sms_maintenance_reminders,
          phone,
          userId,
        ]
      );

      ApiResponseUtil.success(res, result.rows[0], 'Preferences updated successfully');
    } catch (error) {
      console.error('Error updating SMS preferences:', error);
      ApiResponseUtil.internalError(res, 'Failed to update preferences');
    }
  }

  /**
   * Get SMS system settings
   * GET /api/sms/settings
   */
  async getSystemSettings(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // Only admins can view system settings
      if (authReq.user?.user_type !== 'admin') {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      const result = await pool.query(
        `SELECT setting_key, setting_value, setting_type, description
         FROM system_settings
         WHERE setting_key IN (
           'sms_enabled', 'sms_daily_limit', 
           'sms_compliance_warning_days', 'sms_maintenance_warning_days'
         )`
      );

      const settings = result.rows.reduce((acc: any, row) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
      }, {});

      ApiResponseUtil.success(res, settings, 'Settings retrieved successfully');
    } catch (error) {
      console.error('Error fetching SMS settings:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch settings');
    }
  }

  /**
   * Update SMS system settings
   * PUT /api/sms/settings
   */
  async updateSystemSettings(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.userId;
      
      // Only admins can update system settings
      if (authReq.user?.user_type !== 'admin') {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      const {
        sms_enabled,
        sms_daily_limit,
        sms_compliance_warning_days,
        sms_maintenance_warning_days,
      } = req.body;

      const updates: any[] = [];

      if (sms_enabled !== undefined) {
        updates.push(['sms_enabled', sms_enabled.toString()]);
      }
      if (sms_daily_limit !== undefined) {
        updates.push(['sms_daily_limit', sms_daily_limit.toString()]);
      }
      if (sms_compliance_warning_days !== undefined) {
        updates.push(['sms_compliance_warning_days', sms_compliance_warning_days.toString()]);
      }
      if (sms_maintenance_warning_days !== undefined) {
        updates.push(['sms_maintenance_warning_days', sms_maintenance_warning_days.toString()]);
      }

      for (const [key, value] of updates) {
        await pool.query(
          `UPDATE system_settings 
           SET setting_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
           WHERE setting_key = $3`,
          [value, userId, key]
        );
      }

      ApiResponseUtil.success(res, { updated: updates.length }, 'Settings updated successfully');
    } catch (error) {
      console.error('Error updating SMS settings:', error);
      ApiResponseUtil.internalError(res, 'Failed to update settings');
    }
  }

  /**
   * Trigger manual SMS notification check (for testing)
   * POST /api/sms/check-now
   */
  async triggerManualCheck(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // Only admins can trigger manual checks
      if (authReq.user?.user_type !== 'admin') {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      // Run checks asynchronously
      NotificationScheduler.runManualCheck().catch(err => {
        console.error('Manual check failed:', err);
      });

      ApiResponseUtil.success(res, { message: 'Manual check triggered' }, 'Check initiated successfully');
    } catch (error) {
      console.error('Error triggering manual check:', error);
      ApiResponseUtil.internalError(res, 'Failed to trigger check');
    }
  }

  /**
   * Send test SMS
   * POST /api/sms/test
   */
  async testSms(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.userId;
      
      if (!userId) {
        ApiResponseUtil.unauthorized(res);
        return;
      }

      // Get user's phone number
      const userResult = await pool.query(
        `SELECT id, phone, user_type FROM "user" WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].phone) {
        ApiResponseUtil.badRequest(res, 'Phone number not found for user');
        return;
      }

      const user = userResult.rows[0];
      const testMessage = 'Test message from Fire Guardian Control Center. Your SMS notifications are working!';

      const result = await SmsService.sendSms(
        [{ userId: user.id, phoneNumber: user.phone, userType: user.user_type }],
        testMessage,
        'TEST_MESSAGE' as any
      );

      if (result.success) {
        ApiResponseUtil.success(res, result, 'Test SMS sent successfully');
      } else {
        ApiResponseUtil.badRequest(res, result.statusMessage);
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      ApiResponseUtil.internalError(res, 'Failed to send test SMS');
    }
  }
}

export default new SmsController();
