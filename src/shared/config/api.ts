/**
 * API Configuration
 * 
 * Centralized API configuration for HTTP requests.
 * Base URL and environment settings come from @/config/env
 * 
 * Setup:
 * 1. Create a .env file in the project root
 * 2. Add: EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000/api
 * 3. For demo builds: EXPO_PUBLIC_APP_ENV=demo
 * 
 * For physical device testing:
 * - Find your computer's LAN IP (e.g., 192.168.1.100)
 * - Use: EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
 * 
 * For simulator/emulator:
 * - iOS Simulator: http://localhost:3000/api
 * - Android Emulator: http://10.0.2.2:3000/api
 */

import { API_BASE_URL } from '@/config/env';

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

export default API_CONFIG;

