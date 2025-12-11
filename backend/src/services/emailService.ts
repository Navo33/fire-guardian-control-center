import { createEmailTransporter, emailConfig } from '../config/email';
import { 
  generateEmailHTML, 
  generatePlainText, 
  EmailTemplateType 
} from '../utils/emailTemplates';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  templateType: EmailTemplateType;
  data: any;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  /**
   * Send an email using a template
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Check if email is configured
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('⚠️  Email not configured - skipping email send');
        return {
          success: false,
          error: 'Email service not configured',
        };
      }

      const transporter = createEmailTransporter();

      // Generate HTML and text content
      const html = generateEmailHTML(options.templateType, options.data, options.subject);
      const text = generatePlainText(options.templateType, options.data);

      // Prepare email
      const mailOptions = {
        from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        text,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send maintenance ticket created email
   */
  async sendMaintenanceTicketCreated(params: {
    to: string;
    clientName: string;
    ticketId: number;
    equipmentName: string;
    serialNumber: string;
    scheduledDate: string;
    priority: string;
    status: string;
    description?: string;
    dashboardUrl: string;
  }): Promise<EmailResult> {
    return this.sendEmail({
      to: params.to,
      subject: `New Maintenance Ticket Created - #${params.ticketId}`,
      templateType: 'maintenanceTicketCreated',
      data: params,
    });
  }

  /**
   * Send maintenance ticket updated email
   */
  async sendMaintenanceTicketUpdated(params: {
    to: string;
    clientName: string;
    ticketId: number;
    equipmentName: string;
    status: string;
    completedDate?: string;
    technicianName?: string;
    technicianNotes?: string;
    updateReason?: string;
    dashboardUrl: string;
  }): Promise<EmailResult> {
    return this.sendEmail({
      to: params.to,
      subject: `Maintenance Ticket Updated - #${params.ticketId}`,
      templateType: 'maintenanceTicketUpdated',
      data: params,
    });
  }

  /**
   * Send maintenance due reminder email
   */
  async sendMaintenanceDueReminder(params: {
    to: string;
    clientName: string;
    equipmentName: string;
    serialNumber: string;
    location: string;
    maintenanceDueDate: string;
    maintenanceType: string;
    daysUntilDue: number;
    dashboardUrl: string;
  }): Promise<EmailResult> {
    const urgency = params.daysUntilDue <= 7 ? 'Urgent: ' : '';
    return this.sendEmail({
      to: params.to,
      subject: `${urgency}Maintenance Due in ${params.daysUntilDue} Days - ${params.equipmentName}`,
      templateType: 'maintenanceDueReminder',
      data: params,
    });
  }

  /**
   * Send equipment expiration alert email
   */
  async sendEquipmentExpirationAlert(params: {
    to: string;
    clientName: string;
    equipmentName: string;
    serialNumber: string;
    location: string;
    expirationDate: string;
    status: string;
    daysUntilExpiration: number;
    dashboardUrl: string;
  }): Promise<EmailResult> {
    return this.sendEmail({
      to: params.to,
      subject: `Equipment Certification Expiring in ${params.daysUntilExpiration} Days - ${params.equipmentName}`,
      templateType: 'equipmentExpirationAlert',
      data: params,
    });
  }

  /**
   * Send maintenance completed email
   */
  async sendMaintenanceCompleted(params: {
    to: string;
    clientName: string;
    ticketId: number;
    equipmentName: string;
    completedDate: string;
    technicianName: string;
    technicianNotes?: string;
    complianceStatus?: string;
    nextMaintenanceDate: string;
    dashboardUrl: string;
  }): Promise<EmailResult> {
    return this.sendEmail({
      to: params.to,
      subject: `Maintenance Completed - #${params.ticketId}`,
      templateType: 'maintenanceCompleted',
      data: params,
    });
  }

  /**
   * Send test email to verify configuration
   */
  async sendTestEmail(to: string): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: 'Fire Guardian - Test Email',
      templateType: 'maintenanceTicketCreated',
      data: {
        clientName: 'Test User',
        ticketId: 12345,
        equipmentName: 'Test Fire Extinguisher',
        serialNumber: 'TEST-001',
        scheduledDate: new Date().toLocaleDateString(),
        priority: 'Medium',
        status: 'Scheduled',
        description: 'This is a test email to verify email configuration.',
        dashboardUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      },
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
