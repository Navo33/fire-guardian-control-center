/**
 * SMS Notification Scheduler
 * Checks for compliance expiry and maintenance due dates
 * Sends SMS notifications based on configured thresholds
 */

import { schedule, ScheduledTask } from 'node-cron';
import { pool } from '../config/database';
import SmsService from './SmsService';
import { SmsMessageType, SmsTemplates } from '../config/sms';

class NotificationScheduler {
  private jobs: ScheduledTask[] = [];

  /**
   * Start all scheduled jobs
   */
  start(): void {
    console.log('Starting SMS notification scheduler...');

    // Run daily at 8:00 AM
    const dailyJob = schedule('0 8 * * *', async () => {
      console.log('Running daily SMS notification check...');
      await this.checkComplianceExpiry();
      await this.checkMaintenanceDue();
    });

    this.jobs.push(dailyJob);
    console.log('SMS scheduler started - Daily checks at 8:00 AM');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    this.jobs.forEach(job => job.stop());
    console.log('SMS scheduler stopped');
  }

  /**
   * Check for compliance certificates expiring soon
   */
  async checkComplianceExpiry(): Promise<void> {
    try {
      // Get warning threshold from settings
      const settingsResult = await pool.query(
        `SELECT setting_value FROM system_settings 
         WHERE setting_key = 'sms_compliance_warning_days'`
      );
      const warningDays = parseInt(settingsResult.rows[0]?.setting_value || '7');

      // Find equipment with compliance expiring in X days
      const expiringResult = await pool.query(
        `SELECT 
          e.id as equipment_id,
          e.equipment_name,
          e.compliance_expiry_date,
          e.client_id,
          c.vendor_id,
          cu.id as client_user_id,
          cu.phone as client_phone,
          vu.id as vendor_user_id,
          vu.phone as vendor_phone
         FROM equipment e
         JOIN clients c ON e.client_id = c.id
         LEFT JOIN "user" cu ON c.user_id = cu.id
         LEFT JOIN vendors v ON c.vendor_id = v.id
         LEFT JOIN "user" vu ON v.user_id = vu.id
         WHERE e.compliance_expiry_date IS NOT NULL
           AND e.compliance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${warningDays} days'
           AND e.deleted_at IS NULL
           AND (cu.phone IS NOT NULL OR vu.phone IS NOT NULL)`
      );

      for (const equipment of expiringResult.rows) {
        const daysUntilExpiry = Math.ceil(
          (new Date(equipment.compliance_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const messageType =
          daysUntilExpiry <= 1
            ? SmsMessageType.COMPLIANCE_EXPIRING_TODAY
            : SmsMessageType.COMPLIANCE_EXPIRING_7_DAYS;

        const expiryDate = new Date(equipment.compliance_expiry_date).toLocaleDateString('en-LK');
        const message =
          messageType === SmsMessageType.COMPLIANCE_EXPIRING_TODAY
            ? SmsTemplates[SmsMessageType.COMPLIANCE_EXPIRING_TODAY](equipment.equipment_name)
            : SmsTemplates[SmsMessageType.COMPLIANCE_EXPIRING_7_DAYS](
                equipment.equipment_name,
                expiryDate
              );

        // Prepare recipients (both client and vendor)
        const recipients: any[] = [];
        if (equipment.client_user_id && equipment.client_phone) {
          recipients.push({
            userId: equipment.client_user_id,
            phoneNumber: equipment.client_phone,
            userType: 'client',
          });
        }
        if (equipment.vendor_user_id && equipment.vendor_phone) {
          recipients.push({
            userId: equipment.vendor_user_id,
            phoneNumber: equipment.vendor_phone,
            userType: 'vendor',
          });
        }

        if (recipients.length > 0) {
          await SmsService.sendSms(
            recipients,
            message,
            messageType,
            'equipment',
            equipment.equipment_id
          );
        }
      }

      console.log(
        `Compliance expiry check completed. Processed ${expiringResult.rows.length} equipment items.`
      );
    } catch (error) {
      console.error('Error checking compliance expiry:', error);
    }
  }

  /**
   * Check for maintenance due soon or overdue
   */
  async checkMaintenanceDue(): Promise<void> {
    try {
      // Get warning threshold from settings
      const settingsResult = await pool.query(
        `SELECT setting_value FROM system_settings 
         WHERE setting_key = 'sms_maintenance_warning_days'`
      );
      const warningDays = parseInt(settingsResult.rows[0]?.setting_value || '3');

      // Find equipment with maintenance due in X days or overdue
      const maintenanceResult = await pool.query(
        `SELECT 
          e.id as equipment_id,
          e.equipment_name,
          e.last_maintenance_date,
          e.maintenance_interval_months,
          e.client_id,
          c.vendor_id,
          cu.id as client_user_id,
          cu.phone as client_phone,
          vu.id as vendor_user_id,
          vu.phone as vendor_phone,
          (e.last_maintenance_date + (e.maintenance_interval_months || ' months')::interval) as next_maintenance_date
         FROM equipment e
         JOIN clients c ON e.client_id = c.id
         LEFT JOIN "user" cu ON c.user_id = cu.id
         LEFT JOIN vendors v ON c.vendor_id = v.id
         LEFT JOIN "user" vu ON v.user_id = vu.id
         WHERE e.last_maintenance_date IS NOT NULL
           AND e.maintenance_interval_months IS NOT NULL
           AND e.maintenance_interval_months > 0
           AND (e.last_maintenance_date + (e.maintenance_interval_months || ' months')::interval) <= CURRENT_DATE + INTERVAL '${warningDays} days'
           AND e.deleted_at IS NULL
           AND (cu.phone IS NOT NULL OR vu.phone IS NOT NULL)`
      );

      for (const equipment of maintenanceResult.rows) {
        const nextMaintenanceDate = new Date(equipment.next_maintenance_date);
        const today = new Date();
        const daysUntilDue = Math.ceil(
          (nextMaintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let messageType: SmsMessageType;
        let message: string;

        if (daysUntilDue < 0) {
          // Overdue
          messageType = SmsMessageType.MAINTENANCE_OVERDUE;
          message = SmsTemplates[SmsMessageType.MAINTENANCE_OVERDUE](
            equipment.equipment_name,
            Math.abs(daysUntilDue)
          );
        } else {
          // Due soon
          messageType = SmsMessageType.MAINTENANCE_DUE_3_DAYS;
          message = SmsTemplates[SmsMessageType.MAINTENANCE_DUE_3_DAYS](
            equipment.equipment_name,
            nextMaintenanceDate.toLocaleDateString('en-LK')
          );
        }

        // Prepare recipients (both client and vendor)
        const recipients: any[] = [];
        if (equipment.client_user_id && equipment.client_phone) {
          recipients.push({
            userId: equipment.client_user_id,
            phoneNumber: equipment.client_phone,
            userType: 'client',
          });
        }
        if (equipment.vendor_user_id && equipment.vendor_phone) {
          recipients.push({
            userId: equipment.vendor_user_id,
            phoneNumber: equipment.vendor_phone,
            userType: 'vendor',
          });
        }

        if (recipients.length > 0) {
          await SmsService.sendSms(
            recipients,
            message,
            messageType,
            'equipment',
            equipment.equipment_id
          );
        }
      }

      console.log(
        `Maintenance due check completed. Processed ${maintenanceResult.rows.length} equipment items.`
      );
    } catch (error) {
      console.error('Error checking maintenance due:', error);
    }
  }

  /**
   * Manual trigger for testing
   */
  async runManualCheck(): Promise<void> {
    console.log('Running manual SMS notification check...');
    await this.checkComplianceExpiry();
    await this.checkMaintenanceDue();
    console.log('Manual check completed');
  }
}

export default new NotificationScheduler();
