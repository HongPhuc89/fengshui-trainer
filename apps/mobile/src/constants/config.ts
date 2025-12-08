/**
 * App Configuration
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:3000' : 'https://api.quizgame.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

// App Constants
export const APP_CONFIG = {
  NAME: 'Quiz Game',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@quizgame.com',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@quiz_game:auth_token',
  REFRESH_TOKEN: '@quiz_game:refresh_token',
  USER_DATA: '@quiz_game:user_data',
  THEME: '@quiz_game:theme',
  LANGUAGE: '@quiz_game:language',
} as const;

// Animation Durations (ms)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Quiz Constants
export const QUIZ_CONFIG = {
  DEFAULT_TIME_LIMIT: 30, // minutes
  DEFAULT_QUESTIONS: 10,
  PASSING_SCORE: 70, // percentage
} as const;

export type ApiConfig = typeof API_CONFIG;
export type AppConfig = typeof APP_CONFIG;
export type StorageKeys = typeof STORAGE_KEYS;
