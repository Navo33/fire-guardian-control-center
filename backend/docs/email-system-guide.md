# Email System Implementation Guide

## Overview

The Fire Guardian email system provides automated compliance notifications for maintenance tickets, equipment reminders, and expiration alerts. The system is designed to be template-based, reusable, and includes comprehensive testing capabilities.

## Features

### Email Types
1. **Maintenance Ticket Created** - Sent immediately when a ticket is created
2. **Maintenance Ticket Updated** - Sent when ticket status changes or updates occur
3. **Maintenance Completed** - Sent when maintenance is successfully completed
4. **Maintenance Due Reminders** - Automated reminders at 30 and 7 days before due date
5. **Equipment Expiration Alerts** - Automated alerts 30 days before expiration

### Key Features
- ✅ Professional branded email templates with Fire Guardian colors
- ✅ HTML and plain text versions for all emails
- ✅ Automated scheduled reminders (cron jobs)
- ✅ Email logging and tracking
- ✅ Testing endpoints for template preview and test sends
- ✅ Gmail SMTP support (free tier)
- ✅ Configurable via environment variables

---

## Setup Instructions

### 1. Gmail Configuration (Recommended for Testing)

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. Enable 2-Step Verification

#### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password

#### Step 3: Update Environment Variables
Add to your `.env` file:

\`\`\`env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME=Fire Guardian
EMAIL_FROM_ADDRESS=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
\`\`\`

### 2. Alternative Email Providers

#### SendGrid
\`\`\`env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
\`\`\`

#### AWS SES
\`\`\`env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
\`\`\`

---

## Email Templates

All templates use the Fire Guardian brand colors:
- **Primary Orange**: #E65100
- **Danger Red**: #E53935
- **Success Green**: #388E3C
- **Primary Background**: #F5F7FA
- **Primary Text**: #333333

Templates are located in: `backend/src/utils/emailTemplates.ts`

### Template Customization

You can customize templates by editing the Handlebars templates in `emailTemplates.ts`. All templates support dynamic data through template variables.

---

## API Endpoints

### Testing & Management

#### 1. Send Test Email
```http
POST /api/email/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "test@example.com"
}
```

#### 2. Preview Email Template
```http
GET /api/email/preview/:templateType
Authorization: Bearer {token}
```

Template types:
- `maintenanceTicketCreated`
- `maintenanceTicketUpdated`
- `maintenanceDueReminder`
- `equipmentExpirationAlert`
- `maintenanceCompleted`

#### 3. Verify Email Configuration
```http
GET /api/email/verify
Authorization: Bearer {token}
```

#### 4. Get Email Logs
```http
GET /api/email/logs?limit=100&recipient=email@example.com
Authorization: Bearer {token}
```

#### 5. Get Email Statistics
```http
GET /api/email/stats?days=30
Authorization: Bearer {token}
```

#### 6. Manually Trigger Reminders
```http
POST /api/email/trigger/maintenance-reminders
Authorization: Bearer {token}
```

```http
POST /api/email/trigger/expiration-alerts
Authorization: Bearer {token}
```

---

## Automated Scheduling

### Scheduled Jobs

The email scheduler runs automatically when the server starts (if email is configured):

1. **Maintenance Reminders**: Daily at 9:00 AM
   - Sends reminders 30 days before due date
   - Sends urgent reminders 7 days before due date

2. **Expiration Alerts**: Daily at 10:00 AM
   - Sends alerts 30 days before equipment expiration

### Scheduler Configuration

Located in: `backend/src/services/emailScheduler.ts`

To change schedule times, modify the cron expressions:
```typescript
// Run at 9 AM daily
cron.schedule('0 9 * * *', async () => { ... });

// Run at 10 AM daily
cron.schedule('0 10 * * *', async () => { ... });
```

Cron format: `minute hour day month day-of-week`

---

## Testing the Email System

### 1. Test Email Configuration
```bash
curl -X GET http://localhost:5000/api/email/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Send Test Email
```bash
curl -X POST http://localhost:5000/api/email/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

### 3. Preview Templates in Browser
Open in browser (while logged in):
- http://localhost:5000/api/email/preview/maintenanceTicketCreated
- http://localhost:5000/api/email/preview/maintenanceDueReminder
- http://localhost:5000/api/email/preview/equipmentExpirationAlert

### 4. Test Automated Reminders
```bash
# Trigger maintenance reminders manually
curl -X POST http://localhost:5000/api/email/trigger/maintenance-reminders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger expiration alerts manually
curl -X POST http://localhost:5000/api/email/trigger/expiration-alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Email Logging

All sent emails are logged in the database for tracking and debugging.

### Email Log Structure
- `recipient_email`: Email address
- `template_type`: Type of email sent
- `subject`: Email subject line
- `status`: 'sent', 'failed', or 'pending'
- `message_id`: Unique message identifier
- `error_message`: Error details (if failed)
- `sent_at`: Timestamp
- `metadata`: Additional data (ticket ID, etc.)

### Viewing Email Logs
```bash
curl -X GET "http://localhost:5000/api/email/logs?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Integration Points

### Automatic Email Triggers

#### Maintenance Ticket Created
Location: `backend/src/controllers/MaintenanceTicketController.ts`
```typescript
const result = await MaintenanceTicketRepository.createTicket(vendorId, ticketData);

// Email sent automatically after ticket creation
this.sendTicketCreatedEmail(result.ticket_id);
```

#### Maintenance Ticket Updated
```typescript
const result = await MaintenanceTicketRepository.updateTicket(ticketId, vendorId, updateData);

// Email sent automatically on status/schedule changes
if (updateData.ticket_status || updateData.scheduled_date) {
  this.sendTicketUpdatedEmail(ticketId, req.body.update_reason);
}
```

---

## Troubleshooting

### Email Not Sending

1. **Check Configuration**
   ```bash
   curl -X GET http://localhost:5000/api/email/verify \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Common Issues**:
   - Gmail: Make sure you're using an App Password, not your regular password
   - Firewall: Ensure port 587 is not blocked
   - Credentials: Double-check EMAIL_USER and EMAIL_PASSWORD in .env

3. **Check Logs**:
   - Look for email errors in server console
   - Check email logs via API: `/api/email/logs`

### Scheduler Not Running

1. **Verify Email Config**: Scheduler only starts if email is configured
2. **Check Server Logs**: Look for "✅ Email scheduler started successfully"
3. **Manual Trigger**: Use `/api/email/trigger/*` endpoints for testing

### Template Not Rendering

1. **Preview Template**: Use `/api/email/preview/:templateType`
2. **Check Data**: Ensure all required template variables are provided
3. **Handlebars Syntax**: Verify template syntax in `emailTemplates.ts`

---

## Production Deployment

### Recommended Settings

\`\`\`env
NODE_ENV=production
EMAIL_HOST=smtp.sendgrid.net  # Use professional service
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-production-api-key
EMAIL_FROM_NAME=Fire Guardian
EMAIL_FROM_ADDRESS=noreply@yourcompany.com
FRONTEND_URL=https://your-production-domain.com
\`\`\`

### Best Practices

1. **Use Professional Email Service**: SendGrid, AWS SES, or similar
2. **Monitor Email Logs**: Regularly check `/api/email/stats`
3. **Set Up Domain Authentication**: SPF, DKIM, DMARC records
4. **Rate Limiting**: Respect email provider's rate limits
5. **Error Handling**: Monitor failed emails and retry if needed

---

## Architecture

### Files & Structure

\`\`\`
backend/src/
├── config/
│   └── email.ts                    # Email configuration & transporter
├── controllers/
│   ├── EmailTestController.ts      # Test & management endpoints
│   └── MaintenanceTicketController.ts  # Auto-email integration
├── models/
│   └── EmailRepository.ts          # Email logging & tracking
├── routes/
│   └── email.ts                    # Email API routes
├── services/
│   ├── emailService.ts             # Core email sending logic
│   └── emailScheduler.ts           # Cron jobs for automation
└── utils/
    └── emailTemplates.ts           # HTML templates & branding
\`\`\`

---

## Future Enhancements

- [ ] Email queue system for better scalability
- [ ] Email rate limiting per recipient
- [ ] Template editor in admin panel
- [ ] SMS notifications integration
- [ ] Email preferences per client
- [ ] Digest emails (weekly summaries)
- [ ] Attachment support for reports
- [ ] Email open/click tracking

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs for detailed errors
3. Test with `/api/email/test` endpoint
4. Preview templates with `/api/email/preview/:type`

## Credits

Built with:
- **Nodemailer** - Email sending
- **Handlebars** - Template engine
- **Node-cron** - Scheduled jobs
- **Fire Guardian Brand Colors** - Professional design
