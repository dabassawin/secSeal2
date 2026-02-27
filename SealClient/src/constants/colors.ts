// Color constants for the application
export const colors = {
    // Primary colors
    primary: '#752257', // Purple (PANTONE 7650 C)
    primaryDark: '#5E1B46',

    // Background colors
    background: '#ffffff',
    backgroundDark: '#1a1a1a',

    // Text colors
    text: '#333333',
    textLight: '#666666',
    textDark: '#ffffff', // White (PANTONE 000 C)

    // UI colors
    border: '#e0e0e0',
    success: '#4caf50',
    error: '#f44336',
    warning: '#C7911B', // Gold (PANTONE 1245 C)
    info: '#2196f3',

    // Dashboard Colors
    primaryPurple: '#752257', // Purple
    accentPurple: '#8E2C6A',  // Lighter purple
    accentYellow: '#C7911B',  // Gold (PANTONE 1245 C: rgb 199, 145, 27)
    accentBlue: '#2196F3',
    accentGreen: '#4CAF50',
    accentRed: '#F44336',
    bgLight: '#F5F5F5',
    white: '#FFFFFF',
} as const;

export type ColorKeys = keyof typeof colors;
