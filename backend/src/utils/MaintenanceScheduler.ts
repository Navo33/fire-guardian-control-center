import { pool } from '../config/database';
import { DebugLogger } from '../utils/DebugLogger';

/**
 * MaintenanceScheduler - Handles automatic creation of maintenance tickets for overdue equipment
 */
export class MaintenanceScheduler {
  
  /**
   * Create maintenance tickets for overdue equipment that doesn't have active tickets
   */
  static async createOverdueMaintenanceTickets(): Promise<{created: number, errors: any[]}> {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Starting overdue maintenance ticket creation', {}, 'MAINTENANCE_SCHEDULER');
    
    try {
      // Find overdue equipment without active maintenance tickets
      const overdueEquipmentQuery = `
        SELECT 
          ei.id as equipment_instance_id,
          ei.serial_number,
          ei.vendor_id,
          ei.assigned_to as client_id,
          ei.next_maintenance_date,
          e.equipment_name,
          e.equipment_type,
          ei.maintenance_interval_days,
          v.company_name as vendor_name,
          c.company_name as client_name
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        JOIN vendors v ON ei.vendor_id = v.id
        LEFT JOIN clients c ON ei.assigned_to = c.id
        WHERE ei.next_maintenance_date < CURRENT_DATE
          AND ei.compliance_status = 'overdue'
          AND ei.deleted_at IS NULL
          AND ei.status NOT IN ('retired', 'recalled')
          AND NOT EXISTS (
            SELECT 1 FROM maintenance_ticket mt 
            WHERE mt.equipment_instance_id = ei.id 
              AND mt.ticket_status IN ('open', 'resolved')
              AND mt.support_type = 'maintenance'
          )
        ORDER BY ei.next_maintenance_date ASC
      `;
      
      const overdueEquipment = await pool.query(overdueEquipmentQuery);
      
      if (overdueEquipment.rows.length === 0) {
        DebugLogger.log('No overdue equipment found requiring maintenance tickets', {}, 'MAINTENANCE_SCHEDULER');
        return { created: 0, errors: [] };
      }
      
      DebugLogger.log(`Found ${overdueEquipment.rows.length} overdue equipment items`, 
        { count: overdueEquipment.rows.length }, 'MAINTENANCE_SCHEDULER');
      
      let createdCount = 0;
      const errors: any[] = [];
      
      // Create tickets for each overdue equipment
      for (const equipment of overdueEquipment.rows) {
        try {
          const daysPastDue = Math.abs(Math.floor((new Date().getTime() - new Date(equipment.next_maintenance_date).getTime()) / (1000 * 60 * 60 * 24)));
          
          const issueDescription = `Automated maintenance ticket for overdue equipment.
Equipment: ${equipment.equipment_name} (${equipment.equipment_type})
Serial Number: ${equipment.serial_number}
Last Scheduled Maintenance: ${equipment.next_maintenance_date}
Days Overdue: ${daysPastDue}
Client: ${equipment.client_name || 'Unassigned'}

This ticket was automatically created by the system for overdue maintenance.`;
          
          // Determine priority based on how overdue the equipment is
          let priority = 'normal';
          if (daysPastDue > 90) {
            priority = 'high';
          } else if (daysPastDue > 30) {
            priority = 'normal';
          }
          
          const insertTicketQuery = `
            INSERT INTO maintenance_ticket (
              equipment_instance_id, 
              client_id, 
              vendor_id,
              ticket_status, 
              support_type, 
              priority,
              issue_description, 
              category,
              created_at
            ) VALUES ($1, $2, $3, 'open', 'maintenance', $4, $5, 'Scheduled Maintenance', CURRENT_TIMESTAMP)
            RETURNING id, ticket_number
          `;
          
          const result = await pool.query(insertTicketQuery, [
            equipment.equipment_instance_id,
            equipment.client_id,
            equipment.vendor_id,
            priority,
            issueDescription
          ]);
          
          createdCount++;
          DebugLogger.log(`Created maintenance ticket for equipment ${equipment.serial_number}`, 
            { 
              ticketNumber: result.rows[0].ticket_number,
              equipmentSerial: equipment.serial_number,
              daysPastDue,
              priority 
            }, 'MAINTENANCE_SCHEDULER');
            
        } catch (error) {
          const errorInfo = {
            equipment_id: equipment.equipment_instance_id,
            serial_number: equipment.serial_number,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          errors.push(errorInfo);
          DebugLogger.error(`Failed to create maintenance ticket for equipment ${equipment.serial_number}`, 
            error, errorInfo);
        }
      }
      
      DebugLogger.performance('Overdue maintenance ticket creation completed', startTime);
      DebugLogger.log(`Maintenance ticket creation summary`, 
        { 
          totalOverdue: overdueEquipment.rows.length,
          created: createdCount,
          errors: errors.length 
        }, 'MAINTENANCE_SCHEDULER');
      
      return { created: createdCount, errors };
      
    } catch (error) {
      DebugLogger.error('Error in overdue maintenance ticket creation', error, {});
      throw error;
    }
  }
  
  /**
   * Create proactive maintenance tickets for equipment due soon (within 7 days)
   */
  static async createProactiveMaintenanceTickets(): Promise<{created: number, errors: any[]}> {
    const startTime = DebugLogger.startTimer();
    DebugLogger.log('Starting proactive maintenance ticket creation', {}, 'MAINTENANCE_SCHEDULER');
    
    try {
      // Find equipment due for maintenance within 7 days
      const dueSoonEquipmentQuery = `
        SELECT 
          ei.id as equipment_instance_id,
          ei.serial_number,
          ei.vendor_id,
          ei.assigned_to as client_id,
          ei.next_maintenance_date,
          e.equipment_name,
          e.equipment_type,
          v.company_name as vendor_name,
          c.company_name as client_name
        FROM equipment_instance ei
        JOIN equipment e ON ei.equipment_id = e.id
        JOIN vendors v ON ei.vendor_id = v.id
        LEFT JOIN clients c ON ei.assigned_to = c.id
        WHERE ei.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND ei.compliance_status = 'due_soon'
          AND ei.deleted_at IS NULL
          AND ei.status NOT IN ('retired', 'recalled')
          AND NOT EXISTS (
            SELECT 1 FROM maintenance_ticket mt 
            WHERE mt.equipment_instance_id = ei.id 
              AND mt.ticket_status IN ('open', 'resolved')
              AND mt.support_type = 'maintenance'
          )
        ORDER BY ei.next_maintenance_date ASC
      `;
      
      const dueSoonEquipment = await pool.query(dueSoonEquipmentQuery);
      
      if (dueSoonEquipment.rows.length === 0) {
        DebugLogger.log('No equipment due soon found requiring maintenance tickets', {}, 'MAINTENANCE_SCHEDULER');
        return { created: 0, errors: [] };
      }
      
      DebugLogger.log(`Found ${dueSoonEquipment.rows.length} equipment items due soon`, 
        { count: dueSoonEquipment.rows.length }, 'MAINTENANCE_SCHEDULER');
      
      let createdCount = 0;
      const errors: any[] = [];
      
      // Create tickets for each equipment due soon
      for (const equipment of dueSoonEquipment.rows) {
        try {
          const daysUntilDue = Math.ceil((new Date(equipment.next_maintenance_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          const issueDescription = `Proactive maintenance ticket for equipment due soon.
Equipment: ${equipment.equipment_name} (${equipment.equipment_type})
Serial Number: ${equipment.serial_number}
Scheduled Maintenance Date: ${equipment.next_maintenance_date}
Days Until Due: ${daysUntilDue}
Client: ${equipment.client_name || 'Unassigned'}

This ticket was automatically created by the system for proactive maintenance scheduling.`;
          
          const insertTicketQuery = `
            INSERT INTO maintenance_ticket (
              equipment_instance_id, 
              client_id, 
              vendor_id,
              ticket_status, 
              support_type, 
              priority,
              issue_description, 
              category,
              scheduled_date,
              created_at
            ) VALUES ($1, $2, $3, 'open', 'maintenance', 'normal', $4, 'Scheduled Maintenance', $5, CURRENT_TIMESTAMP)
            RETURNING id, ticket_number
          `;
          
          const result = await pool.query(insertTicketQuery, [
            equipment.equipment_instance_id,
            equipment.client_id,
            equipment.vendor_id,
            issueDescription,
            equipment.next_maintenance_date
          ]);
          
          createdCount++;
          DebugLogger.log(`Created proactive maintenance ticket for equipment ${equipment.serial_number}`, 
            { 
              ticketNumber: result.rows[0].ticket_number,
              equipmentSerial: equipment.serial_number,
              daysUntilDue,
              scheduledDate: equipment.next_maintenance_date
            }, 'MAINTENANCE_SCHEDULER');
            
        } catch (error) {
          const errorInfo = {
            equipment_id: equipment.equipment_instance_id,
            serial_number: equipment.serial_number,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          errors.push(errorInfo);
          DebugLogger.error(`Failed to create proactive maintenance ticket for equipment ${equipment.serial_number}`, 
            error, errorInfo);
        }
      }
      
      DebugLogger.performance('Proactive maintenance ticket creation completed', startTime);
      DebugLogger.log(`Proactive maintenance ticket creation summary`, 
        { 
          totalDueSoon: dueSoonEquipment.rows.length,
          created: createdCount,
          errors: errors.length 
        }, 'MAINTENANCE_SCHEDULER');
      
      return { created: createdCount, errors };
      
    } catch (error) {
      DebugLogger.error('Error in proactive maintenance ticket creation', error, {});
      throw error;
    }
  }
  
  /**
   * Run all maintenance scheduling tasks
   */
  static async runScheduledTasks(): Promise<{overdue: any, proactive: any}> {
    DebugLogger.log('Running scheduled maintenance tasks', {}, 'MAINTENANCE_SCHEDULER');
    
    const overdue = await this.createOverdueMaintenanceTickets();
    const proactive = await this.createProactiveMaintenanceTickets();
    
    const summary = {
      overdue: { created: overdue.created, errors: overdue.errors.length },
      proactive: { created: proactive.created, errors: proactive.errors.length },
      total_created: overdue.created + proactive.created,
      total_errors: overdue.errors.length + proactive.errors.length
    };
    
    DebugLogger.log('Scheduled maintenance tasks completed', summary, 'MAINTENANCE_SCHEDULER');
    
    return { overdue, proactive };
  }
}