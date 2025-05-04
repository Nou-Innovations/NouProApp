import axios from 'axios';
import { useStore } from '../store';

const API_URL = 'YOUR_API_URL';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useStore.getState().currentUser?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      useStore.getState().setCurrentUser(null);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    businessName: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};

export const productsAPI = {
  getProducts: async (locationId: string) => {
    const response = await api.get(`/products?locationId=${locationId}`);
    return response.data;
  },

  getProduct: async (productId: string) => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  createProduct: async (productData: any) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  updateProduct: async (productId: string, updates: any) => {
    const response = await api.patch(`/products/${productId}`, updates);
    return response.data;
  },

  deleteProduct: async (productId: string) => {
    await api.delete(`/products/${productId}`);
  },

  updateStock: async (productId: string, variantId: string, quantity: number) => {
    const response = await api.patch(`/products/${productId}/stock`, {
      variantId,
      quantity,
    });
    return response.data;
  },
};

export const ordersAPI = {
  getOrders: async (locationId: string) => {
    const response = await api.get(`/orders?locationId=${locationId}`);
    return response.data;
  },

  getOrder: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await api.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  updatePaymentStatus: async (orderId: string, paymentStatus: string) => {
    const response = await api.patch(`/orders/${orderId}/payment`, {
      paymentStatus,
    });
    return response.data;
  },

  assignOrder: async (orderId: string, staffId: string) => {
    const response = await api.patch(`/orders/${orderId}/assign`, { staffId });
    return response.data;
  },

  updateDeliveryDetails: async (
    orderId: string,
    details: { transportMethod?: string; deliveryTime?: string }
  ) => {
    const response = await api.patch(`/orders/${orderId}/delivery`, details);
    return response.data;
  },
};

export const invoicesAPI = {
  getInvoices: async (locationId: string) => {
    const response = await api.get(`/invoices?locationId=${locationId}`);
    return response.data;
  },

  getInvoice: async (invoiceId: string) => {
    const response = await api.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  createInvoice: async (invoiceData: any) => {
    const response = await api.post('/invoices', invoiceData);
    return response.data;
  },

  updateInvoiceStatus: async (invoiceId: string, status: string) => {
    const response = await api.patch(`/invoices/${invoiceId}/status`, { status });
    return response.data;
  },

  generatePDF: async (invoiceId: string) => {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const chatAPI = {
  getChannels: async () => {
    const response = await api.get('/channels');
    return response.data;
  },

  getMessages: async (channelId: string) => {
    const response = await api.get(`/channels/${channelId}/messages`);
    return response.data;
  },

  createChannel: async (channelData: any) => {
    const response = await api.post('/channels', channelData);
    return response.data;
  },
};

export default api; 