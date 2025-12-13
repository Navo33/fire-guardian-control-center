# Token Management & Automatic Refresh System

## Overview

The Fire Guardian Control Center now uses a **database-driven, auto-refreshing JWT token system**. All session-related settings are stored in the `system_settings` table and can be configured dynamically without code changes.

## Key Features

✅ **Automatic Token Refresh** - Tokens refresh automatically before expiration  
✅ **Database-Configured Settings** - All timeouts/thresholds stored in database  
✅ **Smart Token Management** - Detects expiration and refreshes proactively  
✅ **Consistent Token Payload** - All tokens include vendorId for vendors  
✅ **Activity Tracking** - Last login updates on refresh for accurate session tracking  

---

## Architecture

### Backend Components

#### 1. System Settings (Database)
```sql
-- system_settings table
session_timeout_minutes = 30             -- Token lifetime in minutes
token_refresh_threshold_minutes = 5      -- Auto-refresh when expiring within X minutes
```

#### 2. Token Generation
**Location:** `backend/src/controllers/AuthController.ts`

- **Login:** Generates JWT with `session_timeout_minutes` expiration
- **Refresh:** Generates new JWT with same timeout, updates last_login

**Token Payload:**
```typescript
{
  userId: number,
  email: string,
  user_type: 'admin' | 'vendor' | 'client',
  role_id?: number,
  vendorId?: number,  // For vendors only
  iat: number,        // Issued at (timestamp)
  exp: number         // Expiration (timestamp)
}
```

#### 3. Refresh Endpoint
**POST** `/api/auth/refresh`

- Requires valid (not expired) token
- Reads `session_timeout_minutes` from database
- Fetches vendorId if missing in token
- Updates `last_login` timestamp
- Returns new token

---

### Frontend Components

#### 1. Token Manager Utility
**Location:** `frontend/src/utils/tokenManager.ts`

**Functions:**
- `decodeToken(token)` - Decode JWT payload
- `getTokenExpirationMinutes(token)` - Get minutes until expiration
- `isTokenExpired(token)` - Check if token expired
- `shouldRefreshToken(token, threshold)` - Check if refresh needed
- `refreshAuthToken()` - Call refresh endpoint
- `ensureValidToken()` - Auto-refresh if needed
- `startTokenRefreshMonitor()` - Start background check (every 60s)
- `stopTokenRefreshMonitor()` - Stop background monitoring

#### 2. Token Context Provider
**Location:** `frontend/src/contexts/TokenContext.tsx`

Provides app-wide token management:
```tsx
const { 
  isTokenValid,           // Boolean - is token still valid
  tokenExpiresInMinutes,  // Number - minutes until expiration
  tokenExpirationString,  // String - human-readable time
  refreshToken            // Function - manual refresh trigger
} = useToken();
```

**Features:**
- Starts automatic monitoring on mount
- Updates UI every 30 seconds
- Provides manual refresh function
- Cleans up on unmount

#### 3. Token Expiration Indicator (Optional)
**Location:** `frontend/src/components/ui/TokenExpirationIndicator.tsx`

Visual indicator showing token status:
- 🟢 Green: > 10 minutes remaining
- 🟡 Yellow: 5-10 minutes remaining
- 🔴 Red: < 5 minutes remaining
- Shows "Extend" button when expiring soon

---

## How It Works

### Automatic Refresh Flow

```
1. User logs in → Token generated (30min expiry)
   ↓
2. Token stored in localStorage
   ↓
3. TokenProvider starts monitoring (checks every 60s)
   ↓
4. [25 minutes later]
   Monitor detects: expires in 5 minutes
   ↓
5. Auto-refresh triggered
   ↓
6. POST /api/auth/refresh with current token
   ↓
7. Backend validates token, generates new one
   ↓
8. New token stored in localStorage
   ↓
9. User continues working seamlessly (no interruption)
```

### Session Extension on Activity

Every API request updates `last_login` timestamp:
- Middleware: `checkSessionTimeout` in `security.ts`
- Updates: `UPDATE "user" SET last_login = CURRENT_TIMESTAMP`
- Tracks: Inactivity timeout (separate from token expiration)

---

## Configuration

### Database Settings

All settings in `system_settings` table:

| Setting | Default | Purpose |
|---------|---------|---------|
| `session_timeout_minutes` | 30 | Token lifetime |
| `token_refresh_threshold_minutes` | 5 | Auto-refresh trigger |
| `max_failed_login_attempts` | 5 | Account lock threshold |
| `account_lock_duration_minutes` | 30 | Lock duration |
| `password_expiry_days` | 90 | Force password reset |

### Updating Settings

**Via Admin UI:**
```
Dashboard → Settings → Security Settings
```

**Via Database:**
```sql
UPDATE system_settings 
SET setting_value = '60' 
WHERE setting_key = 'session_timeout_minutes';
```

**Via API:**
```typescript
POST /api/settings
{
  settings: [
    { key: 'session_timeout_minutes', value: '60' }
  ]
}
```

---

## Usage Examples

### Basic Usage (Automatic)

Token management works automatically once `TokenProvider` is in the app layout:

```tsx
// app/layout.tsx
<TokenProvider>
  <YourApp />
</TokenProvider>
```

No additional code needed! Token auto-refreshes in background.

---

### Manual Token Check

```tsx
'use client';
import { useToken } from '../contexts/TokenContext';

export default function MyComponent() {
  const { 
    isTokenValid, 
    tokenExpiresInMinutes, 
    refreshToken 
  } = useToken();

  if (!isTokenValid) {
    return <div>Session expired</div>;
  }

  return (
    <div>
      <p>Token expires in: {tokenExpiresInMinutes} minutes</p>
      <button onClick={refreshToken}>Refresh Now</button>
    </div>
  );
}
```

---

### Show Expiration Indicator

```tsx
import { TokenExpirationIndicator } from '../components/ui/TokenExpirationIndicator';

export default function Dashboard() {
  return (
    <div>
      <header>
        <TokenExpirationIndicator showAlways={false} />
      </header>
      {/* Rest of dashboard */}
    </div>
  );
}
```

---

### Ensure Token Valid Before API Call

```tsx
import { ensureValidToken } from '../utils/tokenManager';

async function makeApiCall() {
  // Ensures token is valid, refreshes if needed
  const token = await ensureValidToken();
  
  if (!token) {
    // User will be redirected to login
    return;
  }

  // Make API call
  const response = await fetch('/api/data', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

---

## Security Benefits

### Before (Previous System)
❌ Hardcoded 30-minute timeout  
❌ Token expires, user kicked out  
❌ No proactive refresh  
❌ Settings in .env (requires restart)  
❌ Inconsistent vendorId in tokens  

### After (New System)
✅ Configurable timeout (database)  
✅ Auto-refresh prevents logout  
✅ Proactive token management  
✅ Hot-reload settings (no restart)  
✅ Consistent token payload  
✅ Activity tracking on refresh  

---

## Testing

### Test Auto-Refresh

1. Set short timeout for testing:
```sql
UPDATE system_settings 
SET setting_value = '2' 
WHERE setting_key = 'session_timeout_minutes';

UPDATE system_settings 
SET setting_value = '1' 
WHERE setting_key = 'token_refresh_threshold_minutes';
```

2. Login and wait 1 minute
3. Check browser console - should see: `🔄 Token expiring soon, refreshing...`
4. Check network tab - should see POST to `/api/auth/refresh`
5. User stays logged in seamlessly

### Test Token Payload

```javascript
// Browser console
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);

// Should show:
{
  userId: 1,
  email: "admin@example.com",
  user_type: "admin",
  role_id: 1,
  vendorId: null,  // Or number for vendors
  iat: 1734000000,
  exp: 1734001800  // iat + 30 minutes
}
```

---

## Troubleshooting

### Token Refresh Fails

**Symptom:** User logged out unexpectedly

**Check:**
1. Backend logs for 401 errors
2. Token expiration: `getTokenExpirationMinutes(token)`
3. Database connection to `system_settings`
4. JWT_SECRET still in .env (required for signing)

**Solution:**
```javascript
// Check token in console
const token = localStorage.getItem('token');
console.log('Token expires in:', getTokenExpirationMinutes(token), 'minutes');

// Manual refresh
await refreshAuthToken();
```

---

### Token Not Auto-Refreshing

**Check:**
1. `TokenProvider` wrapped around app
2. Console for monitoring messages
3. Background monitor running: every 60s check

**Debug:**
```javascript
// Check if monitor is running
import { startTokenRefreshMonitor } from './utils/tokenManager';
startTokenRefreshMonitor();
// Should log: "✅ Token refresh monitor started"
```

---

### Settings Not Applied

**Check:**
1. Database connection
2. Setting exists in `system_settings`
3. Backend cache (restart backend)

**Verify:**
```sql
SELECT * FROM system_settings 
WHERE setting_key LIKE '%token%' 
OR setting_key LIKE '%session%';
```

---

## Migration Notes

### From Old System

No migration needed! New system is backward compatible:

- Old tokens still work until expiration
- On next login, new format token issued
- Middleware handles legacy tokens (fetches vendorId if missing)

### New Installations

Run migrations:
```bash
npm run db:init
```

This creates `system_settings` with defaults.

---

## Performance Impact

**Minimal overhead:**
- Background check: Every 60 seconds (not per request)
- UI update: Every 30 seconds (no re-renders)
- Refresh call: Only when needed (5min before expiry)
- Database reads: Cached by repository pattern

**Network traffic:**
- 1 refresh request per session (~every 25 minutes)
- No polling or continuous requests

---

## Future Enhancements

Potential improvements:

1. **Refresh Token Rotation** - Issue refresh tokens with longer expiry
2. **Multiple Device Sessions** - Track all active sessions
3. **Session Revocation** - Admin can force logout
4. **WebSocket Push** - Server-initiated token refresh
5. **Token Blacklist** - Revoke specific tokens

---

## Summary

The new token system provides:
- ✅ **Seamless user experience** - No unexpected logouts
- ✅ **Flexible configuration** - Change settings without code
- ✅ **Better security** - Activity tracking, automatic refresh
- ✅ **Easy maintenance** - Database-driven, no hardcoded values

All token settings are now controlled from the database `system_settings` table, making the system more maintainable and enterprise-ready.
