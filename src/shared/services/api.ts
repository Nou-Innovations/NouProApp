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
      
      if (__DEV__) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error.message);
      return Promise.reject(error);
    }
  );

  // Response interceptor: unwrap data, handle errors
  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<unknown>>) => {
      // Backend always returns { success, data, message }
      // We return the full response, let the service unwrap .data
      return response;
    },
    (error: AxiosError<ApiErrorResponse>) => {
      const status = error.response?.status ?? 0;
      const message = error.response?.data?.message ?? error.message ?? 'Network error';
      const code = error.code ?? 'UNKNOWN';
      
      // Log once here, not in every screen
      if (__DEV__) {
        console.error(`[API] Error ${status}: ${message}`);
      }

      // Handle auth errors globally
      if (status === 401) {
        useProfileStore.getState().logout();
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
 * Auth API
 * Note: These return raw API response. Use profileStore.login() to set state after success.
 */
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    businessName?: string;
  }) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Always clear local auth state
      useProfileStore.getState().logout();
    }
  },

  refreshToken: async () => {
    const refreshToken = useProfileStore.getState().refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    if (response.data?.token) {
      useProfileStore.getState().setTokens(response.data.token);
    }
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export const productsAPI = {
  getProducts: async (locationId: string) => {
    const response = await apiClient.get(`/products?locationId=${locationId}`);
    return response.data;
  },

  getProduct: async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}`);
    return response.data;
  },

  createProduct: async (productData: any) => {
    const response = await apiClient.post('/products', productData);
    return response.data;
  },

  updateProduct: async (productId: string, updates: any) => {
    const response = await apiClient.patch(`/products/${productId}`, updates);
    return response.data;
  },

  deleteProduct: async (productId: string) => {
    await apiClient.delete(`/products/${productId}`);
  },

  updateStock: async (productId: string, variantId: string, quantity: number) => {
    const response = await apiClient.patch(`/products/${productId}/stock`, {
      variantId,
      quantity,
    });
    return response.data;
  },
};

export const ordersAPI = {
  getOrders: async (locationId: string) => {
    const response = await apiClient.get(`/orders?locationId=${locationId}`);
    return response.data;
  },

  getOrder: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (orderData: any) => {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await apiClient.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  updatePaymentStatus: async (orderId: string, paymentStatus: string) => {
    const response = await apiClient.patch(`/orders/${orderId}/payment`, {
      paymentStatus,
    });
    return response.data;
  },

  assignOrder: async (orderId: string, staffId: string) => {
    const response = await apiClient.patch(`/orders/${orderId}/assign`, { staffId });
    return response.data;
  },

  updateDeliveryDetails: async (
    orderId: string,
    details: { transportMethod?: string; deliveryTime?: string }
  ) => {
    const response = await apiClient.patch(`/orders/${orderId}/delivery`, details);
    return response.data;
  },
};

export const invoicesAPI = {
  getInvoices: async (locationId: string) => {
    const response = await apiClient.get(`/invoices?locationId=${locationId}`);
    return response.data;
  },

  getInvoice: async (invoiceId: string) => {
    const response = await apiClient.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  createInvoice: async (invoiceData: any) => {
    const response = await apiClient.post('/invoices', invoiceData);
    return response.data;
  },

  updateInvoiceStatus: async (invoiceId: string, status: string) => {
    const response = await apiClient.patch(`/invoices/${invoiceId}/status`, { status });
    return response.data;
  },

  generatePDF: async (invoiceId: string) => {
    const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const chatAPI = {
  getChannels: async () => {
    const response = await apiClient.get('/channels');
    return response.data;
  },

  getMessages: async (channelId: string) => {
    const response = await apiClient.get(`/channels/${channelId}/messages`);
    return response.data;
  },

  createChannel: async (channelData: any) => {
    const response = await apiClient.post('/channels', channelData);
    return response.data;
  },
};

// ============================================================================
// Export
// ============================================================================

export default apiClient;
