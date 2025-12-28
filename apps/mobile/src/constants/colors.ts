/**
 * Feng Shui Color Palette
 * Inspired by Vietnamese feng shui aesthetics
 */

export const colors = {
  // Primary - Màu may mắn (Lucky Red)
  primary: {
    red: '#C41E3A', // Đỏ may mắn chính
    redDark: '#8B0000', // Đỏ đậm
    redLight: '#E63946', // Đỏ sáng
  },

  // Secondary - Vàng kim (Gold)
  secondary: {
    gold: '#FFD700', // Vàng kim
    goldDark: '#DAA520', // Vàng đậm
    goldLight: '#FFF8DC', // Vàng nhạt/kem
  },

  // Accent - Màu phụ
  accent: {
    jade: '#00A86B', // Xanh ngọc - growth, learning
    brown: '#8B4513', // Nâu gỗ - stability
    cream: '#FFF8DC', // Kem - softness
  },

  // Gradients
  gradients: {
    lucky: ['#C41E3A', '#8B0000'], // Gradient đỏ
    gold: ['#FFD700', '#FFA500'], // Gradient vàng
    redGold: ['#C41E3A', '#FFD700'], // Đỏ sang vàng (main gradient)
    jade: ['#00A86B', '#006B4E'], // Xanh ngọc
  },

  // Neutral
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export type Colors = typeof colors;
