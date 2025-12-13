# Dialog eSMS Integration - Complete Implementation Guide

## 📋 Overview

The Fire Guardian Control Center now includes complete SMS notification capabilities using Sri Lanka's **Dialog eSMS** service. This integration enables automated SMS alerts for critical events such as high-priority service tickets, compliance certificate expiration, and maintenance reminders.

---

## 🏗️ Architecture

### Backend Components

```
backend/
├── src/
│   ├── config/
│   │   └── sms.ts                      # Dialog eSMS configuration & message templates
│   ├── services/
│   │   ├── SmsService.ts               # Core SMS sending logic
│   │   └── NotificationScheduler.ts    # Cron jobs for automated checks
│   ├── controllers/
│   │   ├── SmsController.ts            # API endpoints for SMS management
│   │   └── MaintenanceTicketController.ts  # High-priority ticket SMS trigger
│   ├── routes/
│   │   └── sms.ts                      # SMS API routes
│   └── scripts/
│       └── add-sms-tables.sql          # Database migration
```

### Database Tables

#### `sms_logs`
Tracks all SMS messages sent through the system.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INT4 | Reference to user table |
| phone_number | VARCHAR(20) | Recipient phone number |
| message | TEXT | SMS message content |
| message_type | VARCHAR(50) | Type of notification |
| status | VARCHAR(20) | 'pending', 'sent', or 'failed' |
| dialog_response | TEXT | Raw response from Dialog API |
| dialog_status_code | VARCHAR(10) | Dialog status code |
| sent_at | TIMESTAMPTZ | When SMS was sent |
| error_message | TEXT | Error details if failed |
| related_entity_type | VARCHAR(50) | 'ticket', 'equipment', etc. |
| related_entity_id | INT4 | ID of related entity |

#### `sms_usage_stats`
Daily statistics for monitoring and quota management.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| date | DATE | Date of statistics (unique) |
| total_sent | INT4 | Total messages sent |
| total_failed | INT4 | Total failures |
| high_priority_tickets | INT4 | High priority ticket alerts |
| compliance_alerts | INT4 | Compliance expiry alerts |
| maintenance_reminders | INT4 | Maintenance reminders |

#### User Table Additions
New columns added to `user` table:

- `sms_notifications_enabled` (BOOLEAN) - Master toggle
- `sms_high_priority_tickets` (BOOLEAN) - High priority alerts
- `sms_compliance_alerts` (BOOLEAN) - Compliance expiry alerts
- `sms_maintenance_reminders` (BOOLEAN) - Maintenance reminders

---

## 🚀 Setup Instructions

### 1. Get Dialog eSMS Credentials

1. Visit [Dialog eSMS](https://www.dialog.lk/esms/)
2. Register for an account
3. Obtain your **API Key** (esmsqk parameter)
4. Get approval for **GET request access** from Dialog admin
5. Set up your **Sender ID/Mask** (e.g., "FireGuard")

### 2. Configure Environment Variables

Add to `backend/.env`:

```env
# Dialog eSMS Configuration
DIALOG_SMS_ENABLED=true
DIALOG_SMS_API_KEY=your-dialog-esms-api-key-here
DIALOG_SMS_SOURCE_ADDRESS=FireGuard
DIALOG_SMS_PUSH_URL=https://api.fireguardian.lk/sms/callback
```

### 3. Run Database Migration

```bash
cd backend
node -e "const {pool} = require('./dist/config/database'); const fs = require('fs'); const sql = fs.readFileSync('./src/scripts/add-sms-tables.sql', 'utf8'); pool.query(sql).then(() => { console.log('✅ SMS tables created'); process.exit(0); }).catch(err => { console.error('❌ Error:', err); process.exit(1); });"
```

Or manually run the SQL from `backend/src/scripts/add-sms-tables.sql`.

### 4. Configure System Settings

Add SMS settings via database:

```sql
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
VALUES 
    ('sms_enabled', 'true', 'boolean', 'Enable/disable SMS notifications globally'),
    ('sms_daily_limit', '1000', 'number', 'Maximum SMS messages per day'),
    ('sms_compliance_warning_days', '7', 'number', 'Days before compliance expiry to send SMS'),
    ('sms_maintenance_warning_days', '3', 'number', 'Days before maintenance due to send SMS');
```

### 5. Restart Backend

```bash
npm run dev
```

You should see:
```
✅ SMS notification scheduler started - Daily checks at 8:00 AM
```

---

## 📱 Features & Triggers

### Automated SMS Notifications

#### 1. High Priority Service Tickets
**Trigger:** When a new maintenance ticket is created with `priority = 'high'`
**Recipients:** Client + Vendor
**Message:** `URGENT: Service ticket #{ticket_number} created for {equipment_name}. Priority: HIGH. Check FireGuardian for details.`

#### 2. Compliance Expiring (7 Days)
**Trigger:** Daily check at 8:00 AM for certificates expiring in 7 days
**Recipients:** Client + Vendor
**Message:** `ALERT: Compliance certificate for {equipment_name} expires on {date}. Take action immediately.`

#### 3. Compliance Expiring Today
**Trigger:** Daily check at 8:00 AM for certificates expiring today
**Recipients:** Client + Vendor
**Message:** `CRITICAL: Compliance certificate for {equipment_name} expires TODAY! Urgent action required.`

#### 4. Maintenance Due (3 Days)
**Trigger:** Daily check at 8:00 AM for maintenance due in 3 days
**Recipients:** Client + Vendor
**Message:** `REMINDER: Maintenance for {equipment_name} due on {date}. Schedule service soon.`

#### 5. Maintenance Overdue
**Trigger:** Daily check at 8:00 AM for overdue maintenance
**Recipients:** Client + Vendor
**Message:** `OVERDUE: Maintenance for {equipment_name} is {days} days past due. Immediate attention required.`

---

## 🔧 API Endpoints

### User Endpoints

#### Get User Preferences
```http
GET /api/sms/preferences
Authorization: Bearer <token>
```

**Response:**
```json
{
  "sms_notifications_enabled": true,
  "sms_high_priority_tickets": true,
  "sms_compliance_alerts": true,
  "sms_maintenance_reminders": true,
  "phone": "+94771234567"
}
```

#### Update User Preferences
```http
PUT /api/sms/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "sms_notifications_enabled": true,
  "sms_high_priority_tickets": false,
  "phone": "+94771234567"
}
```

#### Send Test SMS
```http
POST /api/sms/test
Authorization: Bearer <token>
```

### Admin Endpoints

#### Check Balance
```http
GET /api/sms/balance
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "balance": 5000.00,
  "message": "Balance: LKR 5000.00"
}
```

#### Get Statistics
```http
GET /api/sms/statistics?days=30
Authorization: Bearer <admin-token>
```

**Response:**
```json
[
  {
    "date": "2025-12-12",
    "total_sent": 45,
    "total_failed": 2,
    "high_priority_tickets": 10,
    "compliance_alerts": 15,
    "maintenance_reminders": 20
  }
]
```

#### Get System Settings
```http
GET /api/sms/settings
Authorization: Bearer <admin-token>
```

#### Update System Settings
```http
PUT /api/sms/settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "sms_enabled": true,
  "sms_daily_limit": 1000,
  "sms_compliance_warning_days": 7,
  "sms_maintenance_warning_days": 3
}
```

#### Trigger Manual Check
```http
POST /api/sms/check-now
Authorization: Bearer <admin-token>
```

---

## 🎯 Phone Number Format

The system automatically formats phone numbers to Sri Lankan format:

- **Input:** `0771234567` → **Output:** `94771234567`
- **Input:** `771234567` → **Output:** `94771234567`
- **Input:** `+94771234567` → **Output:** `94771234567`

All non-digit characters are stripped, and country code `94` is added if missing.

---

## 🔒 User Preferences & Privacy

Users have granular control over SMS notifications:

1. **Master Toggle:** `sms_notifications_enabled` - Turns all SMS on/off
2. **High Priority Tickets:** Receive SMS for urgent service requests
3. **Compliance Alerts:** Get notified about expiring certificates
4. **Maintenance Reminders:** Reminders for scheduled maintenance

SMS is only sent to users who:
- Have `sms_notifications_enabled = true`
- Have the specific notification type enabled
- Have a valid phone number in their profile

---

## 💰 Cost Management

### Daily Quota System
- Default limit: **1000 SMS per day**
- Configurable via `sms_daily_limit` setting
- Checks before each send operation
- Tracks usage in `sms_usage_stats` table

### Balance Monitoring
Admins can check Dialog eSMS account balance via:
```bash
curl -H "Authorization: Bearer <admin-token>" http://localhost:5000/api/sms/balance
```

---

## 📊 Monitoring & Logging

### SMS Logs
Every SMS is logged in `sms_logs` table with:
- User ID and phone number
- Message content and type
- Dialog API response
- Success/failure status
- Related entity (ticket, equipment, etc.)

### Usage Statistics
Daily statistics tracked for:
- Total messages sent/failed
- Breakdown by notification type
- Date-based trends

### View Logs (Admin)
```sql
-- Recent SMS logs
SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 50;

-- Failed SMS
SELECT * FROM sms_logs WHERE status = 'failed' ORDER BY created_at DESC;

-- Usage by date
SELECT * FROM sms_usage_stats ORDER BY date DESC LIMIT 30;
```

---

## 🧪 Testing

### 1. Test SMS Sending
```bash
curl -X POST http://localhost:5000/api/sms/test \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json"
```

### 2. Manual Notification Check
```bash
curl -X POST http://localhost:5000/api/sms/check-now \
  -H "Authorization: Bearer <admin-token>"
```

### 3. Create High Priority Ticket
Use the frontend or API to create a ticket with `priority: 'high'` and verify SMS is sent.

---

## ⚙️ Scheduled Jobs

The `NotificationScheduler` runs automatically on server start.

**Schedule:** Daily at 8:00 AM (Sri Lankan time)

**Tasks:**
1. Check compliance certificates expiring in 7 days or today
2. Check maintenance due in 3 days or overdue
3. Send SMS to clients and vendors

**Cron Expression:** `0 8 * * *`

To change the schedule, edit `backend/src/services/NotificationScheduler.ts`:
```typescript
const dailyJob = cron.schedule('0 8 * * *', async () => {
  // Change '0 8 * * *' to your desired cron expression
});
```

---

## 🚨 Error Handling

### Dialog eSMS Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 1 | Success | Message sent |
| 2001 | Campaign creation error | Retry |
| 2002 | Bad request | Check parameters |
| 2003 | Empty number list | Add phone numbers |
| 2004 | Empty message | Check message template |
| 2005 | Invalid number format | Fix phone number |
| 2006 | No GET access | Contact Dialog admin |
| 2007 | Invalid API key | Check credentials |
| 2008 | Insufficient balance | Top up account |
| 2009 | No valid numbers | Check phone numbers |
| 2011 | Transactional error | Retry later |

### Graceful Degradation
- SMS failures don't block operations
- Errors are logged but don't crash the server
- Email notifications continue working independently

---

## 📝 Frontend Integration (Coming Soon)

The backend is ready. Frontend features to implement:

1. **User Settings Page**
   - Toggle SMS notifications on/off
   - Enable/disable specific notification types
   - Update phone number

2. **Admin Dashboard**
   - View SMS balance
   - View usage statistics (charts)
   - Configure system settings
   - View SMS logs
   - Test SMS sending

3. **SMS Settings Card**
   - Daily limit configuration
   - Warning threshold settings
   - Enable/disable SMS globally

---

## 🔐 Security Considerations

1. **API Key Protection:** Never expose Dialog API key in frontend
2. **Phone Number Validation:** Format validation before sending
3. **Rate Limiting:** Daily quota prevents abuse
4. **User Consent:** Users can opt-out of SMS notifications
5. **Admin Only:** System settings accessible to admins only

---

## 📚 Dependencies

```json
{
  "axios": "^1.x.x",
  "node-cron": "^3.x.x",
  "@types/node-cron": "^3.x.x"
}
```

---

## 🎉 Summary

✅ **Complete SMS Integration with Dialog eSMS**
✅ **Automated Daily Checks for Compliance & Maintenance**
✅ **High Priority Ticket Instant Alerts**
✅ **User Preference Management**
✅ **Admin Control Panel Ready**
✅ **Cost Management & Quota System**
✅ **Comprehensive Logging & Statistics**
✅ **Graceful Error Handling**

The system is **production-ready** and awaits your Dialog eSMS credentials to go live!

---

## 📞 Support

For Dialog eSMS account issues:
- Website: https://www.dialog.lk/esms/
- Email: esms@dialog.lk
- Phone: +94 777 678 678

For Fire Guardian integration support:
- Check logs in `sms_logs` table
- Monitor `sms_usage_stats` for trends
- Review backend console for scheduler output
