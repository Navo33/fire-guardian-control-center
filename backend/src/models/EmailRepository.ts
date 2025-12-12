import { pool } from '../config/database';
import { EmailTemplateType } from '../utils/emailTemplates';

export interface EmailLog {
  id: number;
  recipient_email: string;
  template_type: EmailTemplateType;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  message_id?: string;
  error_message?: string;
  sent_at?: Date;
  created_at: Date;
  metadata?: any;
}

export interface CreateEmailLogParams {
  recipientEmail: string;
  templateType: EmailTemplateType;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  messageId?: string;
  errorMessage?: string;
  metadata?: any;
}

class EmailRepository {
  /**
   * Log an email that was sent or attempted
   */
  async logEmail(params: CreateEmailLogParams): Promise<EmailLog | null> {
    try {
      // Check if email_logs table exists, if not skip logging
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_logs'
        );
      `;
      
      const tableCheck = await pool.query(tableCheckQuery);
      const tableExists = tableCheck.rows[0].exists;

      if (!tableExists) {
        console.warn('⚠️  email_logs table does not exist - skipping email logging');
        return null;
      }

      const query = `
        INSERT INTO email_logs (
          recipient_email,
          template_type,
          subject,
          status,
          message_id,
          error_message,
          sent_at,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const values = [
        params.recipientEmail,
        params.templateType,
        params.subject,
        params.status,
        params.messageId || null,
        params.errorMessage || null,
        params.status === 'sent' ? new Date() : null,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to log email:', error);
      // Don't throw - email logging failure shouldn't break the main flow
      return null;
    }
  }

  /**
   * Get email logs for a specific recipient
   */
  async getEmailLogsByRecipient(
    recipientEmail: string,
    limit: number = 50
  ): Promise<EmailLog[]> {
    try {
      const query = `
        SELECT *
        FROM email_logs
        WHERE recipient_email = $1
        ORDER BY created_at DESC
        LIMIT $2;
      `;

      const result = await pool.query(query, [recipientEmail, limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get email logs:', error);
      return [];
    }
  }

  /**
   * Get recent email logs
   */
  async getRecentEmailLogs(limit: number = 100): Promise<EmailLog[]> {
    try {
      const query = `
        SELECT *
        FROM email_logs
        ORDER BY created_at DESC
        LIMIT $1;
      `;

      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get recent email logs:', error);
      return [];
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(days: number = 30): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM email_logs
        WHERE created_at >= NOW() - INTERVAL '${days} days';
      `;

      const result = await pool.query(query);
      return {
        total: parseInt(result.rows[0].total) || 0,
        sent: parseInt(result.rows[0].sent) || 0,
        failed: parseInt(result.rows[0].failed) || 0,
        pending: parseInt(result.rows[0].pending) || 0,
      };
    } catch (error) {
      console.error('❌ Failed to get email stats:', error);
      return { total: 0, sent: 0, failed: 0, pending: 0 };
    }
  }

  /**
   * Create email_logs table if it doesn't exist
   */
  async createEmailLogsTable(): Promise<void> {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS email_logs (
          id SERIAL PRIMARY KEY,
          recipient_email VARCHAR(255) NOT NULL,
          template_type VARCHAR(100) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
          message_id VARCHAR(255),
          error_message TEXT,
          sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB,
          
          INDEX idx_email_logs_recipient (recipient_email),
          INDEX idx_email_logs_status (status),
          INDEX idx_email_logs_created (created_at)
        );
      `;

      await pool.query(query);
      console.log('✅ email_logs table created/verified');
    } catch (error) {
      console.error('❌ Failed to create email_logs table:', error);
      throw error;
    }
  }
}

export const emailRepository = new EmailRepository();
export default emailRepository;
