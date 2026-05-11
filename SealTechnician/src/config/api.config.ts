// SealTechnician/src/config/api.config.ts
// This file centralizes API configuration for the entire app
// ⚠️ Change SERVER_IP below when your network IP changes

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Try to get IP dynamically from Metro bundler in development
const getLocalServerIp = () => {
  const envHost = process.env.EXPO_PUBLIC_API_HOST;
  if (envHost) {
    // #region agent log
    fetch('http://127.0.0.1:7289/ingest/e24b5a4a-ad88-4125-a895-9696b8cf2e75',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4307f1'},body:JSON.stringify({sessionId:'4307f1',runId:'pre-fix',hypothesisId:'H_api_ip_source',location:'SealTechnician/src/config/api.config.ts:12',message:'Using EXPO_PUBLIC_API_HOST override',data:{source:'env',value:envHost},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return envHost;
  }

  // Constants.expoConfig?.hostUri is usually present in development mode via Expo Go and contains "IP:PORT"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    // #region agent log
    fetch('http://127.0.0.1:7289/ingest/e24b5a4a-ad88-4125-a895-9696b8cf2e75',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4307f1'},body:JSON.stringify({sessionId:'4307f1',runId:'pre-fix',hypothesisId:'H_api_ip_source',location:'SealTechnician/src/config/api.config.ts:24',message:'Derived SERVER_IP from Constants.expoConfig.hostUri',data:{source:'hostUri',hasHostUri:true,hostUri},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return hostUri.split(':')[0];
  }

  // Web fallback: use current page hostname when available
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    // #region agent log
    fetch('http://127.0.0.1:7289/ingest/e24b5a4a-ad88-4125-a895-9696b8cf2e75',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4307f1'},body:JSON.stringify({sessionId:'4307f1',runId:'pre-fix',hypothesisId:'H_api_ip_source',location:'SealTechnician/src/config/api.config.ts:33',message:'Derived SERVER_IP from window.location.hostname (web fallback)',data:{source:'web-hostname',hostname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return hostname;
  }

  // Fallback IP if not running in development or not via Expo Go
  // #region agent log
  fetch('http://127.0.0.1:7289/ingest/e24b5a4a-ad88-4125-a895-9696b8cf2e75',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4307f1'},body:JSON.stringify({sessionId:'4307f1',runId:'pre-fix',hypothesisId:'H_api_ip_source',location:'SealTechnician/src/config/api.config.ts:42',message:'Falling back to hardcoded SERVER_IP',data:{source:'hardcoded-fallback',hasHostUri:false,fallbackIp:'192.168.1.36'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return '192.168.1.36';
};

const SERVER_IP = getLocalServerIp();
const SERVER_PORT = '3000';

// Base URL is derived from SERVER_IP so you only update one place
const BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}/api`;

// #region agent log
fetch('http://127.0.0.1:7289/ingest/e24b5a4a-ad88-4125-a895-9696b8cf2e75',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4307f1'},body:JSON.stringify({sessionId:'4307f1',runId:'pre-fix',hypothesisId:'H_api_base_url',location:'SealTechnician/src/config/api.config.ts:28',message:'API base URL configured',data:{serverIp:SERVER_IP,serverPort:SERVER_PORT,baseUrl:BASE_URL},timestamp:Date.now()})}).catch(()=>{});
// #endregion

export const API_CONFIG = {
  SERVER_IP,
  SERVER_PORT: '3000',

  // API endpoints
  BASE_URL: BASE_URL,

  endpoints: {
    TECHNICIAN_LOGIN: '/technician/login',
    TECHNICIAN_REGISTER: '/technician/register',
    TECHNICIAN_MY_SEALS: '/technician/my-seals',
    TECHNICIAN_INSTALL_SEAL: '/technician/seals/install',
    TECHNICIAN_RETURN_SEAL: '/technician/seals/return',
    TECHNICIAN_CHECK_RETURN_SEAL: '/technician/seals/check-return',
    TECHNICIAN_NOTIFICATIONS: '/technician/notifications',
    TECHNICIAN_ME: '/technician/me',
    TECHNICIAN_AVATAR: '/technician/avatar',
    TECHNICIANS_LIST: '/technician/list',
    TECHNICIAN_TRANSFER_SEAL: '/technician/seals/transfer',
    TECHNICIAN_CONFIRM_SEAL: '/technician/seals/confirm',
    SCAN_SEAL: '/scan-seal',
    CHECK_SCAN_SEAL: '/scan-seal/check',
  },

  // Timeout settings (in milliseconds)
  TIMEOUT: 10000,

  // Retry configuration for failed requests
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Helper function to build full URLs
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
