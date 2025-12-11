import cron, { ScheduledTask } from 'node-cron';
import { pool } from '../config/database';
import { emailService } from '../services/emailService';
import { emailRepository } from '../models/EmailRepository';

class EmailScheduler {
  private maintenanceReminderJob: ScheduledTask | null = null;
  private expirationAlertJob: ScheduledTask | null = null;

  /**
   * Start all scheduled email jobs
   */
  start(): void {
    console.log('🚀 Starting email scheduler...');

    // Run maintenance reminders daily at 9 AM
    this.maintenanceReminderJob = cron.schedule('0 9 * * *', async () => {
      console.log('📧 Running scheduled maintenance reminders...');
      await this.sendMaintenanceReminders();
    });

    // Run expiration alerts daily at 10 AM
    this.expirationAlertJob = cron.schedule('0 10 * * *', async () => {
      console.log('📧 Running scheduled expiration alerts...');
      await this.sendExpirationAlerts();
    });

    console.log('✅ Email scheduler started successfully');
    console.log('   - Maintenance reminders: Daily at 9:00 AM');
    console.log('   - Expiration alerts: Daily at 10:00 AM');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('🛑 Stopping email scheduler...');
    
    if (this.maintenanceReminderJob) {
      this.maintenanceReminderJob.stop();
    }
    
    if (this.expirationAlertJob) {
      this.expirationAlertJob.stop();
    }

    console.log('✅ Email scheduler stopped');
  }

  /**
   * Send maintenance due reminders (30 days and 7 days before)
   */
  private async sendMaintenanceReminders(): Promise<void> {
    try {
      const query = `
        SELECT 
          ei.id as equipment_id,
          eq.equipment_name,
          ei.serial_number,
          ei.location,
          ei.next_maintenance_date,
          ei.maintenance_interval_days,
          c.id as client_id,
          c.company_name as client_name,
          cu.email as client_email,
          v.id as vendor_id,
          v.company_name as vendor_name,
          vu.email as vendor_email,
          EXTRACT(DAY FROM (ei.next_maintenance_date - CURRENT_DATE))::INTEGER as days_until_due
        FROM equipment_instance ei
        JOIN equipment eq ON ei.equipment_id = eq.id
        JOIN clients c ON ei.assigned_to = c.id
        JOIN "user" cu ON c.user_id = cu.id
        JOIN vendors v ON ei.vendor_id = v.id
        JOIN "user" vu ON v.user_id = vu.id
        WHERE ei.next_maintenance_date IS NOT NULL
          AND ei.status = 'available'
          AND (
            EXTRACT(DAY FROM (ei.next_maintenance_date - CURRENT_DATE)) = 30
            OR EXTRACT(DAY FROM (ei.next_maintenance_date - CURRENT_DATE)) = 7
          )
        ORDER BY ei.next_maintenance_date ASC;
      `;

      const result = await pool.query(query);
      const equipmentList = result.rows;

      console.log(`📬 Found ${equipmentList.length} equipment requiring maintenance reminders`);

      for (const equipment of equipmentList) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          
          // Send to CLIENT
          const clientEmailResult = await emailService.sendMaintenanceDueReminder({
            to: equipment.client_email,
            clientName: equipment.client_name,
            equipmentName: equipment.equipment_name,
            serialNumber: equipment.serial_number,
            location: equipment.location || 'Not specified',
            maintenanceDueDate: new Date(equipment.next_maintenance_date).toLocaleDateString(),
            maintenanceType: equipment.maintenance_interval_days ? `Every ${equipment.maintenance_interval_days} days` : 'Regular Maintenance',
            daysUntilDue: equipment.days_until_due,
            dashboardUrl: `${frontendUrl}/client/equipment/${equipment.equipment_id}`,
          });

          await emailRepository.logEmail({
            recipientEmail: equipment.client_email,
            templateType: 'maintenanceDueReminder',
            subject: `Maintenance Due in ${equipment.days_until_due} Days - ${equipment.equipment_name}`,
            status: clientEmailResult.success ? 'sent' : 'failed',
            messageId: clientEmailResult.messageId,
            errorMessage: clientEmailResult.error,
            metadata: { equipmentId: equipment.equipment_id, clientId: equipment.client_id, daysUntilDue: equipment.days_until_due, recipient: 'client' },
          });

          if (clientEmailResult.success) {
            console.log(`  ✅ Sent client reminder to ${equipment.client_email} (${equipment.days_until_due} days)`);
          } else {
            console.error(`  ❌ Failed client reminder to ${equipment.client_email}:`, clientEmailResult.error);
          }

          // Send to VENDOR
          const vendorEmailResult = await emailService.sendMaintenanceDueReminder({
            to: equipment.vendor_email,
            clientName: equipment.vendor_name,
            equipmentName: equipment.equipment_name,
            serialNumber: equipment.serial_number,
            location: equipment.location || 'Not specified',
            maintenanceDueDate: new Date(equipment.next_maintenance_date).toLocaleDateString(),
            maintenanceType: equipment.maintenance_interval_days ? `Every ${equipment.maintenance_interval_days} days` : 'Regular Maintenance',
            daysUntilDue: equipment.days_until_due,
            dashboardUrl: `${frontendUrl}/vendor/equipment/${equipment.equipment_id}`,
          });

          await emailRepository.logEmail({
            recipientEmail: equipment.vendor_email,
            templateType: 'maintenanceDueReminder',
            subject: `Maintenance Due in ${equipment.days_until_due} Days - ${equipment.equipment_name}`,
            status: vendorEmailResult.success ? 'sent' : 'failed',
            messageId: vendorEmailResult.messageId,
            errorMessage: vendorEmailResult.error,
            metadata: { equipmentId: equipment.equipment_id, vendorId: equipment.vendor_id, daysUntilDue: equipment.days_until_due, recipient: 'vendor' },
          });

          if (vendorEmailResult.success) {
            console.log(`  ✅ Sent vendor reminder to ${equipment.vendor_email} (${equipment.days_until_due} days)`);
          } else {
            console.error(`  ❌ Failed vendor reminder to ${equipment.vendor_email}:`, vendorEmailResult.error);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`  ❌ Error sending reminder for equipment ${equipment.equipment_id}:`, error);
        }
      }

      console.log('✅ Maintenance reminder job completed');
    } catch (error) {
      console.error('❌ Failed to send maintenance reminders:', error);
    }
  }

  /**
   * Send equipment expiration alerts (30 days before)
   */
  private async sendExpirationAlerts(): Promise<void> {
    try {
      const query = `
        SELECT 
          ei.id as equipment_id,
          eq.equipment_name,
          ei.serial_number,
          ei.location,
          ei.expiry_date as expiration_date,
          ei.status,
          c.id as client_id,
          c.company_name as client_name,
          cu.email as client_email,
          v.id as vendor_id,
          v.company_name as vendor_name,
          vu.email as vendor_email,
          EXTRACT(DAY FROM (ei.expiry_date - CURRENT_DATE))::INTEGER as days_until_expiration
        FROM equipment_instance ei
        JOIN equipment eq ON ei.equipment_id = eq.id
        JOIN clients c ON ei.assigned_to = c.id
        JOIN "user" cu ON c.user_id = cu.id
        JOIN vendors v ON ei.vendor_id = v.id
        JOIN "user" vu ON v.user_id = vu.id
        WHERE ei.expiry_date IS NOT NULL
          AND ei.status NOT IN ('retired', 'maintenance')
          AND EXTRACT(DAY FROM (ei.expiry_date - CURRENT_DATE)) = 30
        ORDER BY ei.expiry_date ASC;
      `;

      const result = await pool.query(query);
      const equipmentList = result.rows;

      console.log(`📬 Found ${equipmentList.length} equipment with expiring certifications`);

      for (const equipment of equipmentList) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          
          // Send to CLIENT
          const clientEmailResult = await emailService.sendEquipmentExpirationAlert({
            to: equipment.client_email,
            clientName: equipment.client_name,
            equipmentName: equipment.equipment_name,
            serialNumber: equipment.serial_number,
            location: equipment.location || 'Not specified',
            expirationDate: new Date(equipment.expiration_date).toLocaleDateString(),
            status: equipment.status,
            daysUntilExpiration: equipment.days_until_expiration,
            dashboardUrl: `${frontendUrl}/client/equipment/${equipment.equipment_id}`,
          });

          await emailRepository.logEmail({
            recipientEmail: equipment.client_email,
            templateType: 'equipmentExpirationAlert',
            subject: `Equipment Certification Expiring in ${equipment.days_until_expiration} Days`,
            status: clientEmailResult.success ? 'sent' : 'failed',
            messageId: clientEmailResult.messageId,
            errorMessage: clientEmailResult.error,
            metadata: { equipmentId: equipment.equipment_id, clientId: equipment.client_id, daysUntilExpiration: equipment.days_until_expiration, recipient: 'client' },
          });

          if (clientEmailResult.success) {
            console.log(`  ✅ Sent client expiration alert to ${equipment.client_email}`);
          } else {
            console.error(`  ❌ Failed client expiration alert to ${equipment.client_email}:`, clientEmailResult.error);
          }

          // Send to VENDOR
          const vendorEmailResult = await emailService.sendEquipmentExpirationAlert({
            to: equipment.vendor_email,
            clientName: equipment.vendor_name,
            equipmentName: equipment.equipment_name,
            serialNumber: equipment.serial_number,
            location: equipment.location || 'Not specified',
            expirationDate: new Date(equipment.expiration_date).toLocaleDateString(),
            status: equipment.status,
            daysUntilExpiration: equipment.days_until_expiration,
            dashboardUrl: `${frontendUrl}/vendor/equipment/${equipment.equipment_id}`,
          });

          await emailRepository.logEmail({
            recipientEmail: equipment.vendor_email,
            templateType: 'equipmentExpirationAlert',
            subject: `Equipment Certification Expiring in ${equipment.days_until_expiration} Days`,
            status: vendorEmailResult.success ? 'sent' : 'failed',
            messageId: vendorEmailResult.messageId,
            errorMessage: vendorEmailResult.error,
            metadata: { equipmentId: equipment.equipment_id, vendorId: equipment.vendor_id, daysUntilExpiration: equipment.days_until_expiration, recipient: 'vendor' },
          });

          if (vendorEmailResult.success) {
            console.log(`  ✅ Sent vendor expiration alert to ${equipment.vendor_email}`);
          } else {
            console.error(`  ❌ Failed vendor expiration alert to ${equipment.vendor_email}:`, vendorEmailResult.error);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`  ❌ Error sending alert for equipment ${equipment.equipment_id}:`, error);
        }
      }

      console.log('✅ Expiration alert job completed');
    } catch (error) {
      console.error('❌ Failed to send expiration alerts:', error);
    }
  }

  /**
   * Manually trigger maintenance reminders (for testing)
   */
  async triggerMaintenanceReminders(): Promise<void> {
    console.log('🔧 Manually triggering maintenance reminders...');
    await this.sendMaintenanceReminders();
  }

  /**
   * Manually trigger expiration alerts (for testing)
   */
  async triggerExpirationAlerts(): Promise<void> {
    console.log('🔧 Manually triggering expiration alerts...');
    await this.sendExpirationAlerts();
  }
}

// Export singleton instance
export const emailScheduler = new EmailScheduler();
export default emailScheduler;
