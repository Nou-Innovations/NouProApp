/**
 * Environment Configuration
 * 
 * Centralized environment detection and configuration for the app.
 * Controls behavior based on build profile (dev, demo, prod).
 * 
 * Build profiles set EXPO_PUBLIC_APP_ENV:
 * - development: unset or 'dev' (local development)
 * - preview: 'demo' (internal demos, investors, testing)
 * - production: 'prod' (App Store/Play Store)
 */

/**
 * App environment type
 */
export type AppEnvironment = 'dev' | 'demo' | 'prod';

/**
 * Current app environment
 * Read from EXPO_PUBLIC_APP_ENV, defaults to 'dev' in development, 'prod' otherwise
 */
export const APP_ENV: AppEnvironment = ((): AppEnvironment => {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  
  // Explicit environment set
  if (env === 'demo' || env === 'prod' || env === 'dev') {
    return env;
  }
  
  // Default: dev in __DEV__ mode, prod otherwise
  return __DEV__ ? 'dev' : 'prod';
})();

/**
 * Environment flags for easy checking
 */
export const IS_DEV = APP_ENV === 'dev';
export const IS_DEMO = APP_ENV === 'demo';
export const IS_PROD = APP_ENV === 'prod';

/**
 * API Base URL
 * Read from EXPO_PUBLIC_API_URL environment variable
 */
export const API_BASE_URL = ((): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Development fallback
  if (IS_DEV) {
    console.warn(
      '[ENV] No EXPO_PUBLIC_API_URL set. Using localhost:3000.\n' +
      'For physical device testing, set EXPO_PUBLIC_API_URL in .env file.'
    );
    return 'http://localhost:3000/api';
  }
  
  // Production/demo must have explicit URL
  throw new Error(
    `EXPO_PUBLIC_API_URL must be set for ${APP_ENV} environment.\n` +
    'Set it in your .env file or EAS build profile.'
  );
})();

/**
 * Feature flags based on environment
 */

/**
 * Whether payments are enabled
 * Disabled in demo builds to prevent real transactions
 */
export const PAYMENTS_ENABLED = !IS_DEMO;

/**
 * Whether analytics/tracking is enabled
 * Can be disabled in demo builds for privacy
 */
export const ANALYTICS_ENABLED = IS_PROD;

/**
 * Log configuration at startup (development only)
 */
if (__DEV__) {
  console.log('[ENV] Configuration:', {
    APP_ENV,
    API_BASE_URL,
    PAYMENTS_ENABLED,
    ANALYTICS_ENABLED,
  });
}

/**
 * Environment configuration export
 */
export const ENV_CONFIG = {
  APP_ENV,
  IS_DEV,
  IS_DEMO,
  IS_PROD,
  API_BASE_URL,
  PAYMENTS_ENABLED,
  ANALYTICS_ENABLED,
} as const;

export default ENV_CONFIG;
