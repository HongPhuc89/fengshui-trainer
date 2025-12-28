/**
 * Typography System
 * Vietnamese fonts with system fallbacks
 */

export const fonts = {
  // Vietnamese fonts
  heading: 'UTM-Avo', // Tiêu đề
  body: 'SVN-Gilroy', // Nội dung
  decorative: 'UTM-Cookies', // Trang trí

  // Fallback to system fonts
  system: {
    ios: 'SF Pro Display',
    android: 'Roboto',
    default: 'System',
  },
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeights = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
} as const;

export type Fonts = typeof fonts;
export type FontSizes = typeof fontSizes;
export type FontWeights = typeof fontWeights;
