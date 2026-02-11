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
} as const;

export type ColorKeys = keyof typeof colors;
