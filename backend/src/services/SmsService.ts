/**
 * Dialog eSMS Service
 * Handles SMS sending via Sri Lanka's Dialog Axiata Gateway
 */

import axios from 'axios';
import { pool } from '../config/database';
import { smsConfig, SmsStatusCodes, SmsMessageType } from '../config/sms';

interface SmsRecipient {
  userId: number;
  phoneNumber: string;
  userType: 'admin' | 'vendor' | 'client';
}

interface SmsSendResult {
  success: boolean;
  statusCode: string;
  statusMessage: string;
  recipientCount: number;
  failedRecipients?: string[];
}

interface SmsLogEntry {
  userId: number;
  phoneNumber: string;
  message: string;
  messageType: string;
  status: 'pending' | 'sent' | 'failed';
  dialogResponse?: string;
  dialogStatusCode?: string;
  errorMessage?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

class SmsService {
  /**
   * Send SMS to single or multiple recipients
   */
  async sendSms(
    recipients: SmsRecipient[],
    message: string,
    messageType: SmsMessageType,
    relatedEntityType?: string,
    relatedEntityId?: number
  ): Promise<SmsSendResult> {
    try {
      // Check if SMS is enabled globally
      if (!smsConfig.enabled || !smsConfig.user || !smsConfig.digest || !smsConfig.mask) {
        console.log('SMS service disabled or not configured');
        return {
          success: false,
          statusCode: '0',
          statusMessage: 'SMS service not enabled',
          recipientCount: 0,
        };
      }

      // Check daily limit
      const canSend = await this.checkDailyLimit(recipients.length);
      if (!canSend) {
        console.error('Daily SMS limit reached');
        return {
          success: false,
          statusCode: '0',
          statusMessage: 'Daily SMS limit reached',
          recipientCount: 0,
        };
      }

      // Filter recipients based on their SMS preferences
      const eligibleRecipients = await this.filterEligibleRecipients(recipients, messageType);
      
      if (eligibleRecipients.length === 0) {
        console.log('No eligible recipients for SMS');
        return {
          success: false,
          statusCode: '0',
          statusMessage: 'No eligible recipients',
          recipientCount: 0,
        };
      }

      // Format phone numbers for Dialog eSMS (Sri Lankan format)
      const phoneNumbers = eligibleRecipients.map(r => this.formatPhoneNumber(r.phoneNumber));
      const numberList = phoneNumbers.join(',');

      // Build Dialog eSMS API URL
      const url = this.buildApiUrl(numberList, message);

      // Send SMS via Dialog API
      const response = await axios.get(url, {
        timeout: smsConfig.timeout,
      });

      const statusCode = response.data?.toString().trim() || '0';
      const statusMessage = SmsStatusCodes[statusCode] || 'Unknown response';
      const success = statusCode === '1';

      // Log each SMS
      await this.logSmsMessages(
        eligibleRecipients,
        message,
        messageType,
        success ? 'sent' : 'failed',
        response.data?.toString(),
        statusCode,
        success ? undefined : statusMessage,
        relatedEntityType,
        relatedEntityId
      );

      // Update daily usage stats
      if (success) {
        await this.updateUsageStats(eligibleRecipients.length, messageType);
      }

      return {
        success,
        statusCode,
        statusMessage,
        recipientCount: eligibleRecipients.length,
      };
    } catch (error: any) {
      console.error('SMS sending failed:', error);
      
      // Log failures
      await this.logSmsMessages(
        recipients,
        message,
        messageType,
        'failed',
        undefined,
        undefined,
        error.message,
        relatedEntityType,
        relatedEntityId
      );

      return {
        success: false,
        statusCode: '0',
        statusMessage: error.message,
        recipientCount: 0,
      };
    }
  }

  /**
   * Check account balance
   */
  async checkBalance(): Promise<{ success: boolean; balance?: number; message: string }> {
    try {
      if (!smsConfig.user || !smsConfig.digest || !smsConfig.mask) {
        return { success: false, message: 'Dialog SMS configuration not complete' };
      }

      // Dialog Axiata doesn't provide a balance check endpoint via HTTP API
      // This is a placeholder - balance checking should be done via Dialog's web portal
      return { success: true, message: 'SMS service is configured', balance: 0 };
    } catch (error: any) {
      console.error('Balance check failed:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Filter recipients based on SMS preferences
   */
  private async filterEligibleRecipients(
    recipients: SmsRecipient[],
    messageType: SmsMessageType
  ): Promise<SmsRecipient[]> {
    const userIds = recipients.map(r => r.userId);
    
    const result = await pool.query(
      `SELECT id, phone, sms_notifications_enabled, 
              sms_high_priority_tickets, sms_compliance_alerts, sms_maintenance_reminders
       FROM "user" 
       WHERE id = ANY($1) AND phone IS NOT NULL AND phone != ''`,
      [userIds]
    );

    const eligibleUsers = result.rows.filter(user => {
      if (!user.sms_notifications_enabled) return false;

      // Check specific preferences based on message type
      if (messageType === SmsMessageType.HIGH_PRIORITY_TICKET && !user.sms_high_priority_tickets) {
        return false;
      }
      if (
        (messageType === SmsMessageType.COMPLIANCE_EXPIRING_7_DAYS ||
          messageType === SmsMessageType.COMPLIANCE_EXPIRING_TODAY) &&
        !user.sms_compliance_alerts
      ) {
        return false;
      }
      if (
        (messageType === SmsMessageType.MAINTENANCE_DUE_3_DAYS ||
          messageType === SmsMessageType.MAINTENANCE_OVERDUE) &&
        !user.sms_maintenance_reminders
      ) {
        return false;
      }

      return true;
    });

    return recipients.filter(r => eligibleUsers.some(u => u.id === r.userId));
  }

  /**
   * Format phone number to Sri Lankan format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 94
    if (cleaned.startsWith('0')) {
      cleaned = '94' + cleaned.substring(1);
    }

    // If doesn't start with country code, add it
    if (!cleaned.startsWith('94')) {
      cleaned = '94' + cleaned;
    }

    return cleaned;
  }

  /**
   * Build Dialog eSMS API URL
   */
  private buildApiUrl(numberList: string, message: string): string {
    // Dialog eSMS API expects: esmsqk (API key), list (recipients), source_address (mask), message
    // We use user as the API key identifier for Dialog's system
    const params = new URLSearchParams({
      esmsqk: smsConfig.user, // API key identifier
      list: numberList, // comma-separated recipient list
      source_address: smsConfig.mask, // sender ID
      message: message,
    });

    // Dialog Axiata SMS Gateway URL format
    return `https://e-sms.dialog.lk/api/v1/message-via-url/create/url-campaign?${params.toString()}`;
  }

  /**
   * Log SMS to database
   */
  private async logSmsMessages(
    recipients: SmsRecipient[],
    message: string,
    messageType: string,
    status: 'pending' | 'sent' | 'failed',
    dialogResponse?: string,
    dialogStatusCode?: string,
    errorMessage?: string,
    relatedEntityType?: string,
    relatedEntityId?: number
  ): Promise<void> {
    const values = recipients.map(r => [
      r.userId,
      r.phoneNumber,
      message,
      messageType,
      status,
      dialogResponse,
      dialogStatusCode,
      status === 'sent' ? new Date() : null,
      errorMessage,
      relatedEntityType,
      relatedEntityId,
    ]);

    const query = `
      INSERT INTO sms_logs 
        (user_id, phone_number, message, message_type, status, dialog_response, 
         dialog_status_code, sent_at, error_message, related_entity_type, related_entity_id)
      VALUES ${values.map((_, i) => `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`).join(', ')}
    `;

    await pool.query(query, values.flat());
  }

  /**
   * Check if daily limit is reached
   */
  private async checkDailyLimit(messageCount: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'sms_daily_limit'`
    );

    const dailyLimit = result.rows[0]?.setting_value
      ? parseInt(result.rows[0].setting_value)
      : 1000;

    const today = new Date().toISOString().split('T')[0];
    const usageResult = await pool.query(
      `SELECT total_sent FROM sms_usage_stats WHERE date = $1`,
      [today]
    );

    const currentUsage = usageResult.rows[0]?.total_sent || 0;
    return currentUsage + messageCount <= dailyLimit;
  }

  /**
   * Update daily usage statistics
   */
  private async updateUsageStats(count: number, messageType: SmsMessageType): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    let typeColumn = 'total_sent';
    if (messageType === SmsMessageType.HIGH_PRIORITY_TICKET) {
      typeColumn = 'high_priority_tickets';
    } else if (
      messageType === SmsMessageType.COMPLIANCE_EXPIRING_7_DAYS ||
      messageType === SmsMessageType.COMPLIANCE_EXPIRING_TODAY
    ) {
      typeColumn = 'compliance_alerts';
    } else if (
      messageType === SmsMessageType.MAINTENANCE_DUE_3_DAYS ||
      messageType === SmsMessageType.MAINTENANCE_OVERDUE
    ) {
      typeColumn = 'maintenance_reminders';
    }

    await pool.query(
      `INSERT INTO sms_usage_stats (date, total_sent, ${typeColumn})
       VALUES ($1, $2, $2)
       ON CONFLICT (date) 
       DO UPDATE SET 
         total_sent = sms_usage_stats.total_sent + $2,
         ${typeColumn} = sms_usage_stats.${typeColumn} + $2,
         updated_at = CURRENT_TIMESTAMP`,
      [today, count]
    );
  }

  /**
   * Get SMS logs for a user
   */
  async getUserSmsLogs(userId: number, limit: number = 50): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM sms_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get SMS statistics
   */
  async getStatistics(days: number = 30): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM sms_usage_stats 
       WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date DESC`
    );

    return result.rows;
  }
}

export default new SmsService();
