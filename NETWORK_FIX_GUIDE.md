# Network Request Failed - Login Error Fix

## Problem
The SealTechnician app was showing: **"ERROR Login Error: [TypeError: Network request failed]"**

## Root Cause
The mobile app was hardcoded to connect to IP address `192.168.1.11:3000`, but the actual backend server was running on `192.168.1.40:3000`.

This IP mismatch caused all network requests to fail because the device couldn't reach the server at the incorrect address.

## Solution Applied
Updated the hardcoded API URLs in the following files:

### Files Modified
1. **SealTechnician/src/services/AuthService.ts**
   - Changed: `http://192.168.1.11:3000/api` → `http://192.168.1.40:3000/api`

2. **SealTechnician/src/services/TechnicianService.ts**
   - Changed: `http://192.168.1.11:3000/api` → `http://192.168.1.40:3000/api`

3. **SealTechnician/src/views/ScanScreen.tsx**
   - Changed: `http://192.168.1.11:3000/api/scan-seal` → `http://192.168.1.40:3000/api/scan-seal`

4. **SealClient/src/services/api.ts**
   - Updated to use the correct server IP: `http://192.168.1.40:3000`

## How to Find Your Server IP

If the IP changes in the future, use this command to find your server's actual IP:

**Windows PowerShell:**
```powershell
ipconfig | findstr "IPv4"
```

**macOS/Linux:**
```bash
ifconfig | grep inet
```

This shows the actual IP your server is running on.

## Testing the Fix

To test if the login endpoint is now reachable:

**PowerShell:**
```powershell
$body = @{username="tech1"; password="tech123"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://192.168.1.40:3000/api/technician/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
```

**Linux/macOS (curl):**
```bash
curl -X POST http://192.168.1.40:3000/api/technician/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tech1","password":"tech123"}'
```

## Troubleshooting Steps for Future Issues

### If you still get "Network request failed":

1. **Verify server is running:**
   ```powershell
   netstat -ano | findstr ":3000"
   ```
   Should show `LISTENING` if the server is running.

2. **Check actual server IP:**
   ```powershell
   ipconfig | findstr "IPv4"
   ```

3. **Verify network connectivity from mobile device:**
   - Ensure the device and server are on the same network
   - Try pinging the server IP from the device (if available in Expo)
   - Check firewall settings on the computer

4. **Test endpoint locally first:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET
   ```

5. **Check CORS configuration:**
   The backend has CORS enabled for all origins in `cmd/server/main.go`
   ```go
   app.Use(cors.New(cors.Config{
       AllowOrigins: "*",
       AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
       ...
   }))
   ```

## Server Details
- **Port:** 3000
- **API Base Path:** /api
- **Technician Login Endpoint:** POST /api/technician/login
- **Health Check:** GET /api/health

## API Endpoint Examples

### Login
```
POST http://192.168.1.40:3000/api/technician/login
Content-Type: application/json

{
  "username": "tech1",
  "password": "tech123"
}
```

### Get Assigned Seals (requires token)
```
GET http://192.168.1.40:3000/api/technician/my-seals
Authorization: Bearer <token>
```

## Notes
- The IP address may change if the network configuration changes
- Always verify the actual IP before deploying to production
- For production, consider using a domain name instead of hardcoded IPs
- For better maintainability, consider storing the API URL in environment variables or a config file
