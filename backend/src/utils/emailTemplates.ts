import Handlebars from 'handlebars';

// Brand colors from Fire Guardian design system
export const brandColors = {
  primaryBg: '#F5F7FA',
  primaryText: '#333333',
  fireOrange: '#E65100',
  fireOrangeHover: '#D84315',
  danger: '#E53935',
  success: '#388E3C',
  gray200: '#E4E7EB',
  gray500: '#7B8794',
};

// Base email layout with Fire Guardian branding
const baseEmailLayout = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${brandColors.primaryBg};
      color: ${brandColors.primaryText};
      line-height: 1.7;
    }
    .email-wrapper {
      width: 100%;
      padding: 40px 20px;
      background-color: ${brandColors.primaryBg};
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.06);
    }
    .email-header {
      background: linear-gradient(135deg, ${brandColors.fireOrange} 0%, ${brandColors.fireOrangeHover} 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
      position: relative;
    }
    .email-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
    }
    .email-header h1 {
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .email-header p {
      margin: 0;
      font-size: 15px;
      opacity: 0.95;
      font-weight: 500;
    }
    .email-body {
      padding: 48px 40px;
      background-color: #ffffff;
    }
    .email-content h2 {
      color: ${brandColors.fireOrange};
      font-size: 24px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.3px;
    }
    .email-content p {
      margin: 16px 0;
      font-size: 15px;
      line-height: 1.7;
      color: ${brandColors.primaryText};
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: ${brandColors.primaryText};
      margin-bottom: 8px;
    }
    .info-box {
      background-color: #FAFBFC;
      border: 2px solid #E8EAED;
      border-left: 4px solid ${brandColors.fireOrange};
      padding: 24px;
      margin: 28px 0;
      border-radius: 8px;
    }
    .info-box-warning {
      background-color: #FFF8F0;
      border-color: #FFE0B2;
      border-left-color: ${brandColors.danger};
    }
    .info-box-success {
      background-color: #F0F9F4;
      border-color: #C8E6C9;
      border-left-color: ${brandColors.success};
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #E8EAED;
    }
    .info-row:first-child {
      padding-top: 0;
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-label {
      font-weight: 600;
      color: ${brandColors.gray500};
      font-size: 14px;
      flex: 0 0 auto;
      min-width: 140px;
    }
    .info-value {
      color: ${brandColors.primaryText};
      font-weight: 600;
      font-size: 14px;
      text-align: right;
      flex: 1;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 36px;
      background-color: ${brandColors.fireOrange};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0.3px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(230, 81, 0, 0.2);
    }
    .button:hover {
      background-color: ${brandColors.fireOrangeHover};
      box-shadow: 0 4px 8px rgba(230, 81, 0, 0.3);
      transform: translateY(-1px);
    }
    .alert-box {
      background-color: #FFF3E0;
      border-left: 4px solid #FF6F00;
      padding: 20px;
      margin: 24px 0;
      border-radius: 6px;
    }
    .alert-box h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 700;
      color: #E65100;
    }
    .alert-box p {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
    }
    .alert-box ul {
      margin: 12px 0 0 0;
      padding-left: 20px;
    }
    .alert-box li {
      margin: 6px 0;
      font-size: 14px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, rgba(232, 234, 237, 0) 0%, ${brandColors.gray200} 50%, rgba(232, 234, 237, 0) 100%);
      margin: 32px 0;
    }
    .signature {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #F0F2F5;
      font-size: 15px;
      color: ${brandColors.primaryText};
    }
    .signature strong {
      color: ${brandColors.fireOrange};
    }
    .email-footer {
      background: linear-gradient(to bottom, #FAFBFC, #F5F7FA);
      padding: 32px 40px;
      text-align: center;
      font-size: 13px;
      color: ${brandColors.gray500};
      border-top: 2px solid #E8EAED;
    }
    .email-footer p {
      margin: 6px 0;
      line-height: 1.6;
    }
    .email-footer strong {
      color: ${brandColors.primaryText};
      font-weight: 700;
    }
    .footer-tagline {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #E8EAED;
      font-size: 12px;
      opacity: 0.8;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px;
      }
      .email-body {
        padding: 32px 24px;
      }
      .email-footer {
        padding: 24px 20px;
      }
      .info-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      .info-label {
        min-width: auto;
      }
      .info-value {
        text-align: left;
      }
      .button {
        display: block;
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1>🔥 Fire Guardian</h1>
        <p>Fire Safety Equipment Management System</p>
      </div>
      <div class="email-body">
        <div class="email-content">
          {{{content}}}
        </div>
      </div>
      <div class="email-footer">
        <p><strong>Fire Guardian Control Center</strong></p>
        <p>Professional Fire Safety Equipment Management & Compliance</p>
        <p class="footer-tagline">
          This is an automated notification. Please do not reply to this email.<br>
          For support, please log in to your dashboard.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Maintenance Ticket Created Template
export const maintenanceTicketCreatedTemplate = `
<h2>🎫 New Maintenance Ticket Created</h2>
<p class="greeting">Hello {{clientName}},</p>
<p>A new maintenance ticket has been created for your equipment. Please review the details below:</p>

<div class="info-box">
  <div class="info-row">
    <span class="info-label">Ticket ID</span>
    <span class="info-value">#{{ticketId}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Equipment</span>
    <span class="info-value">{{equipmentName}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Serial Number</span>
    <span class="info-value">{{serialNumber}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Scheduled Date</span>
    <span class="info-value">{{scheduledDate}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Priority</span>
    <span class="info-value">{{priority}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Status</span>
    <span class="info-value">{{status}}</span>
  </div>
</div>

{{#if description}}
<div class="alert-box">
  <h3>Issue Description</h3>
  <p>{{description}}</p>
</div>
{{/if}}

<p>You can view and track this ticket in real-time through your dashboard.</p>

<div class="button-container">
  <a href="{{dashboardUrl}}" class="button">View Ticket Details</a>
</div>

<p>If you have any questions or concerns, please contact your service provider through the dashboard.</p>

<div class="signature">
  <p>Best regards,<br><strong>Fire Guardian Team</strong></p>
</div>
`;

// Maintenance Ticket Updated Template
export const maintenanceTicketUpdatedTemplate = `
<h2>🔄 Maintenance Ticket Updated</h2>
<p class="greeting">Hello {{clientName}},</p>
<p>Your maintenance ticket has been updated. Please see the latest information below:</p>

<div class="info-box">
  <div class="info-row">
    <span class="info-label">Ticket ID</span>
    <span class="info-value">#{{ticketId}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Equipment</span>
    <span class="info-value">{{equipmentName}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Updated Status</span>
    <span class="info-value">{{status}}</span>
  </div>
  {{#if completedDate}}
  <div class="info-row">
    <span class="info-label">Completed Date</span>
    <span class="info-value">{{completedDate}}</span>
  </div>
  {{/if}}
  {{#if technicianName}}
  <div class="info-row">
    <span class="info-label">Technician</span>
    <span class="info-value">{{technicianName}}</span>
  </div>
  {{/if}}
</div>

{{#if technicianNotes}}
<div class="alert-box">
  <h3>Technician Notes</h3>
  <p>{{technicianNotes}}</p>
</div>
{{/if}}

{{#if updateReason}}
<div class="alert-box">
  <h3>Update Reason</h3>
  <p>{{updateReason}}</p>
</div>
{{/if}}

<div class="button-container">
  <a href="{{dashboardUrl}}" class="button">View Full Details</a>
</div>

<p>Thank you for your continued commitment to fire safety compliance.</p>

<div class="signature">
  <p>Best regards,<br><strong>Fire Guardian Team</strong></p>
</div>
`;

// Maintenance Due Reminder Template (30 days)
export const maintenanceDueReminderTemplate = `
<h2>⏰ Upcoming Maintenance Due</h2>
<p class="greeting">Hello {{clientName}},</p>
<p>This is a friendly reminder that maintenance is due for your fire safety equipment in <strong>{{daysUntilDue}} days</strong>.</p>

<div class="info-box info-box-warning">
  <div class="info-row">
    <span class="info-label">Equipment</span>
    <span class="info-value">{{equipmentName}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Serial Number</span>
    <span class="info-value">{{serialNumber}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Location</span>
    <span class="info-value">{{location}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Maintenance Due</span>
    <span class="info-value">{{maintenanceDueDate}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Maintenance Type</span>
    <span class="info-value">{{maintenanceType}}</span>
  </div>
</div>

<div class="alert-box">
  <h3>Why This Matters</h3>
  <p>Regular maintenance is required to ensure compliance with NFPA standards and to keep your fire safety equipment in optimal working condition. Failure to maintain equipment on schedule may result in compliance issues.</p>
</div>

<div class="button-container">
  <a href="{{dashboardUrl}}" class="button">Schedule Maintenance</a>
</div>

<p>If you have already scheduled this maintenance, you can safely disregard this reminder.</p>

<div class="signature">
  <p>Stay safe and compliant,<br><strong>Fire Guardian Team</strong></p>
</div>
`;

// Equipment Expiration Alert Template
export const equipmentExpirationAlertTemplate = `
<h2>⚠️ Equipment Certification Expiring Soon</h2>
<p class="greeting">Hello {{clientName}},</p>
<p><strong style="color: #E65100;">Important Notice:</strong> Your fire safety equipment certification will expire in <strong style="color: #E53935;">{{daysUntilExpiration}} days</strong>.</p>

<div class="info-box info-box-warning">
  <div class="info-row">
    <span class="info-label">Equipment</span>
    <span class="info-value">{{equipmentName}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Serial Number</span>
    <span class="info-value">{{serialNumber}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Location</span>
    <span class="info-value">{{location}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Expiration Date</span>
    <span class="info-value">{{expirationDate}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Current Status</span>
    <span class="info-value">{{status}}</span>
  </div>
</div>

<div class="alert-box">
  <h3>🚨 Action Required</h3>
  <p>To maintain compliance and ensure continued operation, please contact your service provider to schedule an inspection and recertification before the expiration date.</p>
</div>

<div class="button-container">
  <a href="{{dashboardUrl}}" class="button">View Equipment Details</a>
</div>

<div class="alert-box">
  <h3>Compliance Impact</h3>
  <p>Expired equipment certifications may result in:</p>
  <ul>
    <li>Non-compliance with fire safety regulations</li>
    <li>Potential insurance issues</li>
    <li>Safety concerns for your facility</li>
  </ul>
</div>

<p>Please take immediate action to prevent any compliance issues.</p>

<div class="signature">
  <p>Best regards,<br><strong>Fire Guardian Team</strong></p>
</div>
`;

// Maintenance Completed Template
export const maintenanceCompletedTemplate = `
<h2>✅ Maintenance Completed Successfully</h2>
<p class="greeting">Hello {{clientName}},</p>
<p>Great news! The scheduled maintenance for your equipment has been completed successfully.</p>

<div class="info-box info-box-success">
  <div class="info-row">
    <span class="info-label">Ticket ID</span>
    <span class="info-value">#{{ticketId}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Equipment</span>
    <span class="info-value">{{equipmentName}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Completed Date</span>
    <span class="info-value">{{completedDate}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Technician</span>
    <span class="info-value">{{technicianName}}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Next Maintenance Due</span>
    <span class="info-value">{{nextMaintenanceDate}}</span>
  </div>
</div>

{{#if technicianNotes}}
<div class="alert-box">
  <h3>📋 Service Report</h3>
  <p>{{technicianNotes}}</p>
</div>
{{/if}}

{{#if complianceStatus}}
<div class="alert-box" style="background-color: #F0F9F4; border-left-color: #388E3C;">
  <h3>Compliance Status</h3>
  <p><strong style="color: #388E3C;">{{complianceStatus}}</strong></p>
</div>
{{/if}}

<div class="button-container">
  <a href="{{dashboardUrl}}" class="button">View Service Report</a>
</div>

<p>Your equipment is now compliant and ready for operation. A detailed service report is available in your dashboard.</p>

<p><strong>Thank you for prioritizing fire safety! 🔥</strong></p>

<div class="signature">
  <p>Best regards,<br><strong>Fire Guardian Team</strong></p>
</div>
`;

// Compile templates
export const compiledTemplates = {
  base: Handlebars.compile(baseEmailLayout),
  maintenanceTicketCreated: Handlebars.compile(maintenanceTicketCreatedTemplate),
  maintenanceTicketUpdated: Handlebars.compile(maintenanceTicketUpdatedTemplate),
  maintenanceDueReminder: Handlebars.compile(maintenanceDueReminderTemplate),
  equipmentExpirationAlert: Handlebars.compile(equipmentExpirationAlertTemplate),
  maintenanceCompleted: Handlebars.compile(maintenanceCompletedTemplate),
};

// Email template types
export type EmailTemplateType = 
  | 'maintenanceTicketCreated'
  | 'maintenanceTicketUpdated'
  | 'maintenanceDueReminder'
  | 'equipmentExpirationAlert'
  | 'maintenanceCompleted';

// Generate full email HTML
export const generateEmailHTML = (
  templateType: EmailTemplateType,
  data: any,
  subject: string
): string => {
  const contentTemplate = compiledTemplates[templateType];
  const content = contentTemplate(data);
  
  return compiledTemplates.base({ subject, content });
};

// Generate plain text version (fallback)
export const generatePlainText = (templateType: EmailTemplateType, data: any): string => {
  // Simple plain text version
  const htmlContent = compiledTemplates[templateType](data);
  // Strip HTML tags for plain text
  return htmlContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
