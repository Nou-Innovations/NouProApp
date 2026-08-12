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
export interface SignedInDevice {
  id: string;
  deviceName: string | null;
  platform: string | null;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

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
  /** Why a refresh failed. 'transient' must NOT sign the user out. */
  type RefreshOutcome =
    | { ok: true; token: string }
    | { ok: false; reason: 'revoked' | 'transient' };

  let isRefreshing = false;
  let refreshPromise: Promise<RefreshOutcome> | null = null;

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

      // Auto-retry network/timeout errors (no HTTP response). The main cause is the
      // Render free-tier cold start: the very first request after the server has been
      // idle times out while it wakes up, then succeeds on retry. Because the server
      // never answered (no response), retrying cannot double-submit. Limited to safe
      // requests: idempotent reads (GET/HEAD/OPTIONS) and login/refresh. Max 2 retries
      // with backoff so the user just waits a little instead of seeing an error.
      const retryConfig = error.config as (typeof error.config & { _retryCount?: number }) | undefined;
      const isNetworkOrTimeout = !error.response && (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || status === 0);
      if (retryConfig && isNetworkOrTimeout) {
        const method = (retryConfig.method ?? 'get').toLowerCase();
        const url = retryConfig.url ?? '';
        const isSafeToRetry =
          ['get', 'head', 'options'].includes(method) ||
          ['/auth/login', '/auth/refresh'].some((p) => url.includes(p));
        const attempt = retryConfig._retryCount ?? 0;
        if (isSafeToRetry && attempt < 2) {
          retryConfig._retryCount = attempt + 1;
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1))); // 1.5s, then 3s
          return client.request(retryConfig);
        }
      }

      // Handle 401 errors with token refresh
      if (status === 401) {
        const url = error.config?.url || '';
        const method = (error.config?.method || '').toLowerCase();
        const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh'].some(
          (p) => url.includes(p)
        );

        // A 401 from these means "wrong password", NOT "expired token". Refreshing does
        // nothing (the session is fine) and retrying replays the same wrong password, so
        // the request loops. Treat them as terminal and surface the error to the screen.
        const isPasswordCheck =
          [
            '/auth/change-email/confirm',
            '/auth/change-phone/confirm',
            '/auth/change-password',
            '/auth/2fa/setup',
            '/auth/2fa/verify-setup',
            '/auth/2fa/disable',
          ].some((p) => url.includes(p)) ||
          // DELETE /users/me verifies a password; GET /users/me is an ordinary read whose
          // 401 SHOULD still trigger a refresh, so this one is matched on method too.
          (method === 'delete' && url.includes('/users/me'));

        // Don't attempt refresh for auth endpoints -- just throw
        if (isAuthEndpoint || isPasswordCheck) {
          throw new ApiError(message, status, code, error.response?.data);
        }

        // Attempt token refresh (once, not recursively).
        //
        // The result is DISCRIMINATED on purpose. This used to `catch { return null }`,
        // which made a 429, a 500 and a genuinely revoked session indistinguishable —
        // all three logged the user out. A busy server or one crowded office wifi could
        // therefore sign people out at random (audit A-5).
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = (async (): Promise<RefreshOutcome> => {
            try {
              const refreshToken = useProfileStore.getState().refreshToken;
              if (!refreshToken) return { ok: false, reason: 'revoked' };

              const resp = await client.post('/auth/refresh', { refreshToken });
              const tokenData = resp.data?.data || resp.data;
              if (tokenData?.token) {
                useProfileStore.getState().setTokens(tokenData.token, tokenData.refreshToken);
                return { ok: true, token: tokenData.token as string };
              }
              return { ok: false, reason: 'revoked' };
            } catch (refreshErr: any) {
              const refreshStatus = refreshErr?.response?.status;
              // Only the server saying "this token is no good" means signed out.
              // Anything else — rate limit, 5xx, cold start, no network — is transient.
              const isRevoked = refreshStatus === 401 || refreshStatus === 403;
              return { ok: false, reason: isRevoked ? 'revoked' : 'transient' };
            } finally {
              isRefreshing = false;
              // Don't null refreshPromise here — other 401 handlers may still be awaiting it
            }
          })();
        }

        // Capture ref before awaiting — prevents reading null if finally already ran
        const pendingRefresh = refreshPromise;
        const outcome: RefreshOutcome = pendingRefresh
          ? await pendingRefresh
          : { ok: false, reason: 'transient' };

        if (outcome.ok && error.config) {
          // Retry the original request with the new token — ONCE.
          //
          // Without this flag the replay re-enters this interceptor, and any request that
          // 401s for a reason a refresh cannot fix loops forever: 401 → refresh (succeeds,
          // the session is fine) → replay → 401 → … The existing _retryCount guard covers
          // only network/timeout errors, not this path. Bounding it here fixes the whole
          // class, not just the endpoints enumerated above.
          const cfg = error.config as typeof error.config & { _refreshRetried?: boolean };
          if (cfg._refreshRetried) {
            throw new ApiError(message, status, code, error.response?.data);
          }
          cfg._refreshRetried = true;
          cfg.headers.Authorization = `Bearer ${outcome.token}`;
          return client.request(cfg);
        }

        if (outcome.ok === false && outcome.reason === 'revoked') {
          // Genuinely signed out. Remove the push token locally (no API call: the token
          // is already invalid, so calling the backend would 401 recursively).
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.removeItem('noupro_push_token');
          } catch {}
          // Tell the user why they were bounced — this reason has never been shown.
          useProfileStore.getState().logout('session_expired');
          // Return instead of falling through to the throw below: the screen is being
          // unmounted this very tick, and throwing makes it flash an alert on the way out.
          return Promise.reject(
            new ApiError('Your session expired. Please sign in again.', 401, 'SESSION_EXPIRED'),
          );
        }
        // Transient: keep the user signed in and let the caller surface a retryable error.
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
 * @param data Optional request body (axios sends DELETE bodies via `config.data`)
 * @returns The unwrapped `data` field from the response
 */
export async function del<T = void>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T>>(
    url,
    data !== undefined ? { data } : undefined,
  );
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
  businesses: Record<string, unknown>[];
}

/**
 * Response of POST /auth/change-email|phone/confirm.
 *
 * The updated user fields, PLUS a fresh token pair. The server bumps `tokenVersion` and
 * revokes every other session on a verified contact change (audit AUTH-2), which would
 * otherwise invalidate the caller's OWN refresh token too — so it hands back a new pair
 * and the client MUST adopt it. Discarding this is a silent sign-out ~30 minutes later.
 *
 * NOTE the nesting: these endpoints go through the `post<T>` helper, which already unwraps
 * `.data.data`, so the tokens are at `result.tokens.token` — NOT `result.data.token` like
 * the `changePassword` path, which calls apiClient directly. Easy and silent to get wrong.
 */
export interface ContactChangeResult {
  id?: string;
  email?: string;
  phone?: string;
  tokens?: { token: string; refreshToken: string };
  [key: string]: unknown;
}

/** Shape of the GDPR account-data export (backend: GET /users/me/export). */
export interface AccountDataExport {
  exportedAt: string;
  profile: Record<string, unknown>;
  businesses: Record<string, unknown>[];
  connections: Record<string, unknown>[];
  workExperience: Record<string, unknown>[];
  education: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  suggestions: Record<string, unknown>[];
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
  /**
   * What to label this device as in Settings > Signed-in devices.
   * expo-device is already a dependency (used by the push registration).
   */
  _deviceInfo: (): { deviceName?: string; platform: string } => {
    try {
      const Device = require('expo-device');
      const { Platform } = require('react-native');
      return { deviceName: Device.modelName || undefined, platform: Platform.OS };
    } catch {
      const { Platform } = require('react-native');
      return { platform: Platform.OS };
    }
  },

  login: async (email: string, password: string): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post('/auth/login', { email, password, ...authAPI._deviceInfo() });
    return response.data;
  },

  register: async (userData: {
    firstName: string;
    lastName: string;
    phone: string;
    countryCode?: string;
    email?: string;
    password: string;
    /** Proof from verify-phone / verify-email. Register records which contact details
     *  were actually verified, and can be configured to require one. */
    phoneVerificationToken?: string;
    emailVerificationToken?: string;
  }): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post('/auth/register', { ...userData, ...authAPI._deviceInfo() });
    return response.data;
  },

  logout: (): void => {
    // Snapshot the access token BEFORE clearing local state, then sign the user out
    // of the UI immediately so it returns to the Launch screen without waiting on
    // the network. The backend cleanup runs in the background using this snapshotted
    // token, which stays valid until it expires (the access token itself isn't
    // revoked on logout — only refresh tokens are, via tokenVersion).
    const { accessToken } = useProfileStore.getState();
    const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

    // 1) Sign out of the UI right away.
    useProfileStore.getState().logout();

    // 2) Best-effort backend cleanup, fire-and-forget. Headers are passed explicitly
    //    because the store token is already cleared (the request interceptor would
    //    otherwise find none). Errors are ignored — the local session is gone
    //    regardless, and an unsent push token simply expires on the backend.
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const pushToken = await AsyncStorage.getItem('noupro_push_token');
        if (pushToken) {
          await apiClient.delete('/push-tokens/unregister', {
            data: { token: pushToken },
            headers: authHeaders,
          });
          await AsyncStorage.removeItem('noupro_push_token');
        }
      } catch {
        // ignore
      }
      try {
        await apiClient.post('/auth/logout', undefined, { headers: authHeaders });
      } catch {
        // ignore
      }
    })().catch(() => {});
  },

  /**
   * Permanently delete the signed-in user's account (GDPR erasure / App Store 5.1.1(v)).
   * Backend anonymizes the user row and removes personal data; business records
   * (orders, invoices) are retained by law. Caller must run authAPI.logout() on success.
   * Throws 401 on bad password/2FA code, 409 when business ownership must be
   * transferred first (message === 'OWNERSHIP_TRANSFER_REQUIRED').
   */
  deleteAccount: async (password: string, twoFactorCode?: string): Promise<void> => {
    await del<void>('/users/me', twoFactorCode ? { password, twoFactorCode } : { password });
  },

  /** GDPR data export — returns the user's personal data as a JSON bundle. */
  exportMyData: async (): Promise<AccountDataExport> => {
    return get<AccountDataExport>('/users/me/export');
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
      useProfileStore.getState().setTokens(tokenData.token, tokenData.refreshToken);
    }
    return response.data;
  },

  /**
   * Verified email change. PATCH /auth/me refuses to change email or phone, because
   * login is email-only and an unverified change (or a cleared field) locks the account
   * out permanently. Request sends a code to the NEW address; confirm applies it.
   */
  /**
   * Which verification channels can actually reach a user right now.
   * Called before collecting a code so the client can route to a channel that works,
   * instead of dead-ending on a 503 when Twilio isn't configured.
   */
  /** Devices currently signed in to this account. */
  getSessions: async (): Promise<{ sessions: SignedInDevice[] }> => {
    return get<{ sessions: SignedInDevice[] }>('/auth/sessions');
  },

  /** Sign out one device. */
  revokeSession: async (sessionId: string): Promise<void> => {
    await del(`/auth/sessions/${sessionId}`);
  },

  /** Sign out every device except this one. */
  revokeOtherSessions: async (): Promise<{ revoked: number }> => {
    return del<{ revoked: number }>('/auth/sessions');
  },

  getVerificationCapabilities: async (): Promise<{ sms: boolean; email: boolean }> => {
    return get<{ sms: boolean; email: boolean }>('/auth/verification-capabilities');
  },

  requestEmailChange: async (newEmail: string): Promise<void> => {
    await post<void>('/auth/change-email/request', { newEmail });
  },

  confirmEmailChange: async (
    newEmail: string,
    code: string,
    currentPassword?: string,
  ): Promise<ContactChangeResult> => {
    return post<ContactChangeResult>('/auth/change-email/confirm', { newEmail, code, currentPassword });
  },

  requestPhoneChange: async (newPhone: string): Promise<void> => {
    await post<void>('/auth/change-phone/request', { newPhone });
  },

  confirmPhoneChange: async (
    newPhone: string,
    code: string,
    currentPassword?: string,
  ): Promise<ContactChangeResult> => {
    return post<ContactChangeResult>('/auth/change-phone/confirm', { newPhone, code, currentPassword });
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
  //
  // Both setup steps require the current password (audit AUTH-5): without it, a stolen
  // access token let an attacker enrol THEIR authenticator and lock the owner out. The
  // server guards each step independently, so the password goes to both — sending it only
  // to /setup would leave /verify-setup callable on its own.
  setup2FA: async (currentPassword?: string): Promise<ApiResponse<{ secret: string; otpauthUrl: string }>> => {
    const response = await apiClient.post('/auth/2fa/setup', { currentPassword });
    return response.data;
  },

  verifySetup2FA: async (
    code: string,
    currentPassword?: string,
  ): Promise<ApiResponse<{ backupCodes: string[]; message: string }>> => {
    const response = await apiClient.post('/auth/2fa/verify-setup', { code, currentPassword });
    return response.data;
  },

  disable2FA: async (password: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/2fa/disable', { password });
    return response.data;
  },

  verify2FA: async (tempToken: string, code: string): Promise<ApiResponse<AuthResponseData>> => {
    const response = await apiClient.post('/auth/2fa/verify', { tempToken, code, ...authAPI._deviceInfo() });
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

  /** Returns a short-lived token proving the number was verified; register checks it. */
  verifyPhoneOTP: async (phone: string, countryCode: string, code: string): Promise<{ verificationToken?: string }> => {
    const response = await apiClient.post('/auth/verify-phone', { phone, countryCode, code });
    return response.data?.data || {};
  },

  sendEmailOTP: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/auth/send-email-otp', { email });
    return response.data;
  },

  /** Returns a short-lived token proving the address was verified; register checks it. */
  verifyEmailOTP: async (email: string, code: string): Promise<{ verificationToken?: string }> => {
    const response = await apiClient.post('/auth/verify-email', { email, code });
    return response.data?.data || {};
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
