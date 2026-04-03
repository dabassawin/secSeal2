# API Configuration Setup Guide

## Overview
The app now uses a centralized API configuration in `src/config/api.config.ts` instead of hardcoded URLs scattered across multiple files.

This makes it easier to:
- Update the server IP in one place
- Add new API endpoints
- Configure timeouts and retry logic
- Maintain consistency across the app

## Current Configuration

### File: `SealTechnician/src/config/api.config.ts`

```typescript
export const API_CONFIG = {
  SERVER_IP: '192.168.137.1',     // Change this when server IP changes
  SERVER_PORT: '3000',
  BASE_URL: 'http://192.168.137.1:3000/api',
  
  endpoints: {
    TECHNICIAN_LOGIN: '/technician/login',
    TECHNICIAN_REGISTER: '/technician/register',
    TECHNICIAN_MY_SEALS: '/technician/my-seals',
    TECHNICIAN_INSTALL_SEAL: '/technician/seals/install',
    TECHNICIAN_RETURN_SEAL: '/technician/seals/return',
    SCAN_SEAL: '/scan-seal',
  },
  
  TIMEOUT: 10000,           // Request timeout in ms
  RETRY_ATTEMPTS: 3,        // Number of retry attempts
  RETRY_DELAY: 1000,        // Delay between retries in ms
};
```

## How to Update the Server IP

### Step 1: Find the new server IP
```powershell
ipconfig | findstr "IPv4"
```

### Step 2: Update the config file
Edit `SealTechnician/src/config/api.config.ts` and change:
```typescript
SERVER_IP: '192.168.137.1',  // Change this line to the new IP
```

Also update the BASE_URL:
```typescript
BASE_URL: 'http://NEW_IP:3000/api',
```

### Step 3: Restart the app
The changes take effect immediately when you restart the Expo app.

## Using the Configuration

### In AuthService:
```typescript
import { API_CONFIG, getApiUrl } from '../config/api.config';

// Instead of: `${API_URL}/technician/login`
// Use: getApiUrl(API_CONFIG.endpoints.TECHNICIAN_LOGIN)
```

### Adding New Endpoints

If you add a new API endpoint:

1. **Add it to the config:**
```typescript
endpoints: {
  // ... existing endpoints
  NEW_ENDPOINT: '/path/to/endpoint',
}
```

2. **Use it in your code:**
```typescript
const url = getApiUrl(API_CONFIG.endpoints.NEW_ENDPOINT);
```

## Files Updated to Use New Configuration

1. ✅ `src/services/AuthService.ts` - Uses `getApiUrl()` helper
2. ✅ `src/services/TechnicianService.ts` - Uses `getApiUrl()` helper
3. ✅ `src/views/ScanScreen.tsx` - Uses `getApiUrl()` helper

## Benefits of This Approach

| Before | After |
|--------|-------|
| Hardcoded URLs in multiple files | Single source of truth |
| Update IP in 3+ places | Update IP in 1 place |
| Inconsistent endpoints | Centralized endpoint definitions |
| No retry/timeout config | Configurable retry and timeout |
| Difficult to track API usage | All endpoints in one place |

## Future Improvements

For production, consider:
1. **Environment-based configuration:**
   ```typescript
   const IS_PRODUCTION = process.env.NODE_ENV === 'production';
   const SERVER_IP = IS_PRODUCTION ? 'api.example.com' : '192.168.137.1';
   ```

2. **Read from environment file (.env):**
   ```typescript
   const SERVER_IP = process.env.REACT_APP_API_SERVER_IP || 'localhost';
   ```

3. **Use a configuration server:**
   - Load configuration from a config endpoint on app startup
   - Allow dynamic IP/endpoint changes without redeploying

4. **Use a domain name instead of IP:**
   - More reliable and maintainable
   - Works across network changes
   - Better for production deployment

## Testing the Configuration

### Test login with the app:
1. Open the SealTechnician app in Expo
2. Try logging in with valid technician credentials
3. If successful, the network configuration is correct

### Manual endpoint test:
```powershell
$body = @{username="tech1"; password="tech123"} | ConvertTo-Json
$url = "http://192.168.137.1:3000/api/technician/login"
Invoke-WebRequest -Uri $url -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
```
