// Color constants for the application
export const colors = {
    // Primary colors
    primary: '#667eea',
    primaryDark: '#764ba2',

    // Background colors
    background: '#ffffff',
    backgroundDark: '#1a1a1a',

    // Text colors
    text: '#333333',
    textLight: '#666666',
    textDark: '#ffffff',

    // UI colors
    border: '#e0e0e0',
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',

    // Dashboard Colors
    primaryPurple: '#6A1B9A',
    accentPurple: '#8E24AA',
    accentYellow: '#FFC107',
    accentBlue: '#2196F3',
    accentGreen: '#4CAF50',
    bgLight: '#F5F5F5',
} as const;

export type ColorKeys = keyof typeof colors;
