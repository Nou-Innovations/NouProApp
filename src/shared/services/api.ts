/**
 * API Client
 * 
 * ARCHITECTURE: This is the SINGLE boundary between frontend and backend.
 * 
 * Rules:
 * - ALL HTTP requests go through this file
 * - Screens and components NEVER import axios directly
 * - Screens NEVER call fetch() directly
 * - This file handles: base URL, auth headers, error logging, response unwrapping
 * 
 * Backend contract:
 * - All responses are: { success: boolean, data: T, message: string }
 * - Auth token is sent via Authorization: Bearer <token>
 * - Base URL comes from EXPO_PUBLIC_API_URL
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { useProfileStore } from '@/shared/store/profileStore';

// ============================================================================
// Types
// ============================================================================

/** Standard backend response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/** Error response from backend */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
}

/** Custom error with typed response */
export class ApiError extends Error {
  status: number;
  code: string;
  response?: ApiErrorResponse;

  constructor(message: string, status: number, code: string, response?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.response = response;
  }
}

// ============================================================================
// Paywall Event System
// ============================================================================

/** Paywall event data emitted when backend returns a PAYWALL error */
export interface PaywallEvent {
  triggerId: string;
  requiredPlan: string;
  message: string;
}

type PaywallListener = (event: PaywallEvent) => void;

const paywallListeners = new Set<PaywallListener>();

/** Subscribe to paywall events (e.g., to show PaywallModal reactively) */
export function onPaywallEvent(listener: PaywallListener): () => void {
  paywallListeners.add(listener);
  return () => paywallListeners.delete(listener);
}

function emitPaywallEvent(event: PaywallEvent) {
  paywallListeners.forEach(fn => fn(event));
}

// ============================================================================
// Client Setup
// ============================================================================

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.baseUrl,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: add auth token
  client.interceptors.request.use(
    (config) => {
      const token = useProfileStore.getState().accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error.message);
      return Promise.reject(error);
    }
  );

  // Track whether a token refresh is in progress to prevent infinite loops
  let isRefreshing = false;
  let refreshPromise: Promise<string | null> | null = null;

  // Response interceptor: unwrap data, handle errors
  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<unknown>>) => {
      // Backend always returns { success, data, message }
      // We return the full response, let the service unwrap .data
      return response;
    },
    async (error: AxiosError<ApiErrorResponse>) => {
      const status = error.response?.status ?? 0;
      const message = error.response?.data?.message ?? error.message ?? 'Network error';
      const code = error.code ?? 'UNKNOWN';
      
      // Log once here, not in every screen
      if (__DEV__) {
        console.error(`[API] Error ${status}: ${message}`);
      }

      // Handle 401 errors with token refresh
      if (status === 401) {
        const url = error.config?.url || '';
        const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh'].some(
          (p) => url.includes(p)
        );

        // Don't attempt refresh for auth endpoints -- just throw
        if (isAuthEndpoint) {
          throw new ApiError(message, status, code, error.response?.data);
        }

        // Attempt token refresh (once, not recursively)
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const refreshToken = useProfileStore.getState().refreshToken;
              if (!refreshToken) return null;

              const resp = await client.post('/auth/refresh', { refreshToken });
              const tokenData = resp.data?.data || resp.data;
              if (tokenData?.token) {
                useProfileStore.getState().setTokens(tokenData.token);
                return tokenData.token as string;
              }
              return null;
            } catch {
              return null;
            } finally {
              isRefreshing = false;
              // Don't null refreshPromise here — other 401 handlers may still be awaiting it
            }
          })();
        }

        // Capture ref before awaiting — prevents reading null if finally already ran
        const pendingRefresh = refreshPromise;
        const newToken = pendingRefresh ? await pendingRefresh : null;
        if (newToken && error.config) {
          // Retry the original request with the new token
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return client.request(error.config);
        }

        // Refresh failed -- remove push token locally (no API call: token is already invalid,
        // calling the backend would trigger another 401 and create a recursive loop)
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem('noupro_push_token');
        } catch {}
        useProfileStore.getState().logout();
      }

      // Detect PAYWALL errors and emit event for reactive PaywallModal display
      if (status === 403) {
        const errorData = error.response?.data as any;
        const paywallError = errorData?.error;
        if (paywallError?.code === 'PAYWALL' && paywallError?.triggerId) {
          emitPaywallEvent({
            triggerId: paywallError.triggerId,
            requiredPlan: paywallError.requiredPlan || 'pro',
            message: paywallError.message || message,
          });
        }
      }

      throw new ApiError(message, status, code, error.response?.data);
    }
  );

  return client;
};

// Singleton instance
const apiClient = createApiClient();

// ============================================================================
// HTTP Methods (generic, typed)
// ============================================================================

/**
 * GET request
 * @returns The unwrapped `data` field from the response
 */
export async function get<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  // Filter out undefined params
  const cleanParams = params
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined))
    : undefined;
    
  const response = await apiClient.get<ApiResponse<T>>(url, { params: cleanParams });
  return response.data.data;
}

/**
 * GET request that returns the full API response (for paginated endpoints)
 * @returns The full response including { success, data, message, nextCursor, etc }
 */
export async function getFullResponse<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  // Filter out undefined params
  const cleanParams = params
    ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined))
    : undefined;
    
  const response = await apiClient.get<T>(url, { params: cleanParams });
  return response.data;
}

/**
 * POST request
 * @returns The unwrapped `data` field from the response
 */
export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(url, data);
  return response.data.data;
}

/**
 * PUT request
 * @returns The unwrapped `data` field from the response
 */
export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.put<ApiResponse<T>>(url, data);
  return response.data.data;
}

/**
 * PATCH request
 * @returns The unwrapped `data` field from the response
 */
export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.patch<ApiResponse<T>>(url, data);
  return response.data.data;
}

/**
 * DELETE request
 * @returns The unwrapped `data` field from the response
 */
export async function del<T = void>(url: string): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T>>(url);
  return response.data.data;
}

// ============================================================================
// Legacy API Objects (for backward compatibility)
// These will be gradually migrated to feature services
// ============================================================================

/**
 * Unwrap the standard auth response from the backend.
 * Backend returns { success, data: { user, token, refreshToken, businesses }, message }.
 * authAPI methods return response.data (the outer data), so the actual payload
 * is at response.data (inner) or directly on the response if already unwrapped.
 */
interface AuthResponseData {
  user: Record<string, unknown>;
  token: string;
  refreshToken: string;
  businesses: Array<Record<string, unknown>>;
}

export function unwrapAuthResponse(response: { data?: AuthResponseData } & Partial<AuthResponseData>): AuthResponseData {
  const data = response.data || response;
  return {
    user: data.user || {},
    token: data.token || '',
    refreshToken: data.refreshToken || '',
    businesses: data.businesses || [],
  };
}

/**
 * Auth API
 * Note: These return raw API response. Use profileStore.login() to set state after success.
 */
export const authAPI = {
  login: async (email: string, password: string): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: {
    firstName: string;
    lastName: string;
    phone: string;
    countryCode?: string;
    email?: string;
    password: string;
    profilePicture?: string | null;
  }): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      // Unregister push token before clearing auth
      const { unregisterTokenFromBackend } = require('@/shared/services/pushNotifications');
      await unregisterTokenFromBackend();
    } catch {
      // Ignore push token cleanup errors
    }
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Always clear local auth state
      useProfileStore.getState().logout();
    }
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string; refreshToken: string }>> => {
    const refreshToken = useProfileStore.getState().refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    // Backend wraps in successResponse(), so token is at response.data.data.token
    const tokenData = response.data?.data || response.data;
    if (tokenData?.token) {
      useProfileStore.getState().setTokens(tokenData.token);
    }
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Two-Factor Authentication
  setup2FA: async (): Promise<ApiResponse<{ secret: string; otpauthUrl: string }>> => {
    const response = await apiClient.post('/auth/2fa/setup');
    return response.data;
  },

  verifySetup2FA: async (code: string): Promise<ApiResponse<{ backupCodes: string[]; message: string }>> => {
    const response = await apiClient.post('/auth/2fa/verify-setup', { code });
    return response.data;
  },

  disable2FA: async (password: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/2fa/disable', { password });
    return response.data;
  },

  verify2FA: async (tempToken: string, code: string): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post('/auth/2fa/verify', { tempToken, code });
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Check if an access token is close to expiry (within 5 minutes) and
   * refresh it if needed. Returns fresh token + refreshToken pair.
   * Used in the registration flow where pendingAuth tokens may sit idle
   * while the user completes multi-step onboarding.
   */
  refreshTokenIfNeeded: async (
    accessToken: string,
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> => {
    try {
      // Decode the JWT payload (base64url) without verification
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        // Malformed token -- try refreshing
        throw new Error('Malformed token');
      }
      // Decode base64url (JWT uses URL-safe base64)
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      const exp = payload.exp; // seconds since epoch
      const nowSec = Math.floor(Date.now() / 1000);
      const bufferSec = 5 * 60; // 5 minutes

      if (exp && exp - nowSec > bufferSec) {
        // Token is still fresh -- return as-is
        return { token: accessToken, refreshToken };
      }

      // Token is expired or expiring soon -- refresh
      const resp = await apiClient.post('/auth/refresh', { refreshToken });
      const tokenData = resp.data?.data || resp.data;
      if (tokenData?.token) {
        return {
          token: tokenData.token,
          refreshToken: tokenData.refreshToken || refreshToken,
        };
      }

      // Fallback: return originals (login will proceed, may fail on first API call)
      return { token: accessToken, refreshToken };
    } catch {
      // If anything goes wrong, return originals
      return { token: accessToken, refreshToken };
    }
  },

  sendPhoneOTP: async (phone: string, countryCode: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/auth/send-phone-otp', { phone, countryCode });
    return response.data;
  },

  verifyPhoneOTP: async (phone: string, countryCode: string, code: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/verify-phone', { phone, countryCode, code });
    return response.data;
  },

  sendEmailOTP: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/auth/send-email-otp', { email });
    return response.data;
  },

  verifyEmailOTP: async (email: string, code: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/verify-email', { email, code });
    return response.data;
  },
};

// productsAPI removed -- unused dead code (use the generic get/post/patch/del helpers)
// invoicesAPI removed -- unused dead code (use the generic get/post/patch/del helpers)
// ordersAPI removed -- use src/shared/services/orders.ts instead (single source of truth)
// connectionsAPI removed -- callers use the unwrapped get<T>() helper directly

// ============================================================================
// Export
// ============================================================================

export default apiClient;
