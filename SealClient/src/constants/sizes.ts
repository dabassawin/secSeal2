// Size and spacing constants for the application
export const sizes = {
    // Spacing
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,

    // Font sizes
    fontXs: 12,
    fontSm: 14,
    fontMd: 16,
    fontLg: 18,
    fontXl: 24,
    fontXxl: 32,

    // Border radius
    radiusXs: 4,
    radiusSm: 8,
    radiusMd: 12,
    radiusLg: 16,
    radiusRound: 9999,
} as const;

export type SizeKeys = keyof typeof sizes;
