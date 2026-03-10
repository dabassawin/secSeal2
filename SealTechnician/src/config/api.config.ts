// SealTechnician/src/config/api.config.ts
// This file centralizes API configuration for the entire app
// ⚠️ Change SERVER_IP below when your network IP changes

import Constants from 'expo-constants';

// IP address of your machine on the local network
const SERVER_IP = '192.168.1.36';
const SERVER_PORT = '3000';

// Base URL is derived from SERVER_IP so you only update one place
const BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}/api`;

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
