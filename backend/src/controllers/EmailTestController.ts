import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { emailService } from '../services/emailService';
import { emailRepository } from '../models/EmailRepository';
import { emailScheduler } from '../services/emailScheduler';
import { verifyEmailConfig } from '../config/email';
import { AuthenticatedRequest } from '../types/api';

export class EmailTestController extends BaseController {
  
  constructor() {
    super();
    this.sendTestEmail = this.sendTestEmail.bind(this);
    this.getEmailLogs = this.getEmailLogs.bind(this);
    this.getEmailStats = this.getEmailStats.bind(this);
    this.triggerMaintenanceReminders = this.triggerMaintenanceReminders.bind(this);
    this.triggerExpirationAlerts = this.triggerExpirationAlerts.bind(this);
    this.verifyEmailConfiguration = this.verifyEmailConfiguration.bind(this);
    this.previewEmailTemplate = this.previewEmailTemplate.bind(this);
  }

  /**
   * Send a test email
   * POST /api/email/test
   */
  async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to } = req.body;

      if (!to) {
        ApiResponseUtil.badRequest(res, 'Email address is required');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        ApiResponseUtil.badRequest(res, 'Invalid email address format');
        return;
      }

      const result = await emailService.sendTestEmail(to);

      if (result.success) {
        ApiResponseUtil.success(res, { 
          messageId: result.messageId,
          recipient: to 
        }, 'Test email sent successfully');
      } else {
        ApiResponseUtil.internalError(res, result.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      ApiResponseUtil.internalError(res, 'Failed to send test email');
    }
  }

  /**
   * Get email logs
   * GET /api/email/logs
   */
  async getEmailLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const recipient = req.query.recipient as string;

      let logs;
      if (recipient) {
        logs = await emailRepository.getEmailLogsByRecipient(recipient, limit);
      } else {
        logs = await emailRepository.getRecentEmailLogs(limit);
      }

      ApiResponseUtil.success(res, logs, 'Email logs retrieved successfully');
    } catch (error) {
      console.error('Error fetching email logs:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch email logs');
    }
  }

  /**
   * Get email statistics
   * GET /api/email/stats
   */
  async getEmailStats(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      
      const stats = await emailRepository.getEmailStats(days);

      ApiResponseUtil.success(res, stats, 'Email statistics retrieved successfully');
    } catch (error) {
      console.error('Error fetching email stats:', error);
      ApiResponseUtil.internalError(res, 'Failed to fetch email statistics');
    }
  }

  /**
   * Manually trigger maintenance reminders
   * POST /api/email/trigger/maintenance-reminders
   */
  async triggerMaintenanceReminders(req: Request, res: Response): Promise<void> {
    try {
      // Run reminders in the background
      emailScheduler.triggerMaintenanceReminders().catch(err => {
        console.error('Background maintenance reminder job failed:', err);
      });

      ApiResponseUtil.success(res, null, 'Maintenance reminder job triggered successfully');
    } catch (error) {
      console.error('Error triggering maintenance reminders:', error);
      ApiResponseUtil.internalError(res, 'Failed to trigger maintenance reminders');
    }
  }

  /**
   * Manually trigger expiration alerts
   * POST /api/email/trigger/expiration-alerts
   */
  async triggerExpirationAlerts(req: Request, res: Response): Promise<void> {
    try {
      // Run alerts in the background
      emailScheduler.triggerExpirationAlerts().catch(err => {
        console.error('Background expiration alert job failed:', err);
      });

      ApiResponseUtil.success(res, null, 'Expiration alert job triggered successfully');
    } catch (error) {
      console.error('Error triggering expiration alerts:', error);
      ApiResponseUtil.internalError(res, 'Failed to trigger expiration alerts');
    }
  }

  /**
   * Verify email configuration
   * GET /api/email/verify
   */
  async verifyEmailConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const isConfigured = await verifyEmailConfig();

      if (isConfigured) {
        ApiResponseUtil.success(res, { configured: true }, 'Email configuration is valid');
      } else {
        ApiResponseUtil.internalError(res, 'Email configuration is invalid or incomplete');
      }
    } catch (error) {
      console.error('Error verifying email configuration:', error);
      ApiResponseUtil.internalError(res, 'Failed to verify email configuration');
    }
  }

  /**
   * Preview email template (returns HTML)
   * GET /api/email/preview/:templateType
   */
  async previewEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateType } = req.params;
      
      const validTemplates = [
        'maintenanceTicketCreated',
        'maintenanceTicketUpdated',
        'maintenanceDueReminder',
        'equipmentExpirationAlert',
        'maintenanceCompleted'
      ];

      if (!validTemplates.includes(templateType)) {
        ApiResponseUtil.badRequest(res, 'Invalid template type');
        return;
      }

      // Sample data for preview
      const sampleData: any = {
        maintenanceTicketCreated: {
          clientName: 'Sample Client Corp',
          ticketId: 12345,
          equipmentName: 'Fire Extinguisher ABC-123',
          serialNumber: 'FE-2024-001',
          scheduledDate: new Date().toLocaleDateString(),
          priority: 'High',
          status: 'Open',
          description: 'Routine maintenance inspection required',
          dashboardUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
        maintenanceTicketUpdated: {
          clientName: 'Sample Client Corp',
          ticketId: 12345,
          equipmentName: 'Fire Extinguisher ABC-123',
          status: 'In Progress',
          technicianName: 'John Technician',
          technicianNotes: 'Equipment inspected. All systems functioning properly.',
          updateReason: 'Status updated after inspection',
          dashboardUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
        maintenanceDueReminder: {
          clientName: 'Sample Client Corp',
          equipmentName: 'Fire Extinguisher ABC-123',
          serialNumber: 'FE-2024-001',
          location: 'Building A, Floor 3',
          maintenanceDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          maintenanceType: 'Annual Inspection',
          daysUntilDue: 30,
          dashboardUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
        equipmentExpirationAlert: {
          clientName: 'Sample Client Corp',
          equipmentName: 'Fire Extinguisher ABC-123',
          serialNumber: 'FE-2024-001',
          location: 'Building A, Floor 3',
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          status: 'Active',
          daysUntilExpiration: 30,
          dashboardUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
        maintenanceCompleted: {
          clientName: 'Sample Client Corp',
          ticketId: 12345,
          equipmentName: 'Fire Extinguisher ABC-123',
          completedDate: new Date().toLocaleDateString(),
          technicianName: 'John Technician',
          technicianNotes: 'Equipment serviced successfully. All tests passed.',
          complianceStatus: 'Fully Compliant',
          nextMaintenanceDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          dashboardUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      };

      const { generateEmailHTML } = require('../utils/emailTemplates');
      const data = sampleData[templateType];
      const subject = `Preview: ${templateType}`;
      const html = generateEmailHTML(templateType, data, subject);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error previewing email template:', error);
      ApiResponseUtil.internalError(res, 'Failed to preview email template');
    }
  }
}

export default new EmailTestController();
