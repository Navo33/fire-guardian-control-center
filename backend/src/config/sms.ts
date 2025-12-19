/**
 * Dialog eSMS Configuration
 * Sri Lanka's Dialog Axiata SMS Gateway
 */

export const smsConfig = {
  user: process.env.DIALOG_SMS_USER || '',
  digest: process.env.DIALOG_SMS_DIGEST || '',
  mask: process.env.DIALOG_SMS_MASK || 'Pegasus',
  campaignName: 'FireGuardian',
  enabled: process.env.DIALOG_SMS_ENABLED === 'true',
  timeout: 10000, // 10 seconds
};

// SMS Message Types
export enum SmsMessageType {
  HIGH_PRIORITY_TICKET = 'HIGH_PRIORITY_TICKET',
  COMPLIANCE_EXPIRING_7_DAYS = 'COMPLIANCE_EXPIRING_7_DAYS',
  COMPLIANCE_EXPIRING_TODAY = 'COMPLIANCE_EXPIRING_TODAY',
  MAINTENANCE_DUE_3_DAYS = 'MAINTENANCE_DUE_3_DAYS',
  MAINTENANCE_OVERDUE = 'MAINTENANCE_OVERDUE',
  TICKET_STATUS_UPDATE = 'TICKET_STATUS_UPDATE',
  EQUIPMENT_ASSIGNED = 'EQUIPMENT_ASSIGNED',
}

// SMS Status Codes from Dialog eSMS
export const SmsStatusCodes: Record<string, string> = {
  '1': 'Success',
  '2001': 'Error occurred during campaign creation',
  '2002': 'Bad request',
  '2003': 'Empty number list',
  '2004': 'Empty message body',
  '2005': 'Invalid number list format',
  '2006': 'Not eligible to send messages via GET requests',
  '2007': 'Invalid key (esmsqk parameter is invalid)',
  '2008': 'Not enough money in wallet or package limit reached',
  '2009': 'No valid numbers found after mask blocked numbers removal',
  '2010': 'Not eligible to consume packaging',
  '2011': 'Transactional error',
};

// Message templates (keep under 160 chars for single SMS)
export const SmsTemplates = {
  [SmsMessageType.HIGH_PRIORITY_TICKET]: (ticketId: string, equipment: string) =>
    `URGENT: Service ticket #${ticketId} created for ${equipment}. Priority: HIGH. Check FireGuardian for details.`,
  
  [SmsMessageType.COMPLIANCE_EXPIRING_7_DAYS]: (equipment: string, expiryDate: string) =>
    `ALERT: Compliance certificate for ${equipment} expires on ${expiryDate}. Take action immediately.`,
  
  [SmsMessageType.COMPLIANCE_EXPIRING_TODAY]: (equipment: string) =>
    `CRITICAL: Compliance certificate for ${equipment} expires TODAY! Urgent action required.`,
  
  [SmsMessageType.MAINTENANCE_DUE_3_DAYS]: (equipment: string, dueDate: string) =>
    `REMINDER: Maintenance for ${equipment} due on ${dueDate}. Schedule service soon.`,
  
  [SmsMessageType.MAINTENANCE_OVERDUE]: (equipment: string, daysPastDue: number) =>
    `OVERDUE: Maintenance for ${equipment} is ${daysPastDue} days past due. Immediate attention required.`,
  
  [SmsMessageType.TICKET_STATUS_UPDATE]: (ticketId: string, status: string) =>
    `Ticket #${ticketId} status updated to: ${status}. View details in FireGuardian.`,
  
  [SmsMessageType.EQUIPMENT_ASSIGNED]: (equipment: string, count: number) =>
    `${count} ${equipment} unit(s) assigned to your account. Check FireGuardian dashboard.`,
};
