// SealTechnician/src/config/api.config.ts
// This file centralizes API configuration for the entire app

import Constants from 'expo-constants';

// Function to get the correct base URL based on environment
const getBaseUrl = () => {
  // Always use the local network IP for Expo Go on physical device testing
  return 'http://192.168.1.38:3000/api';
};

const BASE_URL = getBaseUrl();

export const API_CONFIG = {
  // IP address of your machine on the local network
  SERVER_IP: '192.168.1.38',
  SERVER_PORT: '3000',

  // API endpoints
  BASE_URL: BASE_URL,

  endpoints: {
    TECHNICIAN_LOGIN: '/technician/login',
    TECHNICIAN_REGISTER: '/technician/register',
    TECHNICIAN_MY_SEALS: '/technician/my-seals',
    TECHNICIAN_INSTALL_SEAL: '/technician/seals/install',
    TECHNICIAN_RETURN_SEAL: '/technician/seals/return',
    SCAN_SEAL: '/scan-seal',
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
