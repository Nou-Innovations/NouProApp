/**
 * API Configuration
 * 
 * Centralized API configuration using Expo public environment variables.
 * 
 * Setup:
 * 1. Create a .env file in the project root
 * 2. Add: EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000/api
 * 
 * For physical device testing:
 * - Find your computer's LAN IP (e.g., 192.168.1.100)
 * - Use: EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
 * 
 * For simulator/emulator:
 * - iOS Simulator: http://localhost:3000/api
 * - Android Emulator: http://10.0.2.2:3000/api
 */

import Constants from 'expo-constants';

// Get API URL from environment or use sensible defaults
const getApiUrl = (): string => {
  // First try Expo public env var
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // Check Constants.expoConfig for extra config
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl) {
    return extraUrl;
  }
  
  // Default for development
  if (__DEV__) {
    console.warn(
      '[API Config] No EXPO_PUBLIC_API_URL set. Using localhost:3000.\n' +
      'For physical device testing, set EXPO_PUBLIC_API_URL to your LAN IP.'
    );
    return 'http://localhost:3000/api';
  }
  
  // Production should always have this set
  throw new Error('EXPO_PUBLIC_API_URL must be set in production');
};

const baseUrl = getApiUrl();

// Log baseURL at startup for network debugging
if (__DEV__) {
  console.log('[API] baseURL =', baseUrl);
}

export const API_CONFIG = {
  baseUrl,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

export default API_CONFIG;

