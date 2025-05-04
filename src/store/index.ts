import { create } from 'zustand';
import {
  User,
  Business,
  Location,
  Message,
  Channel,
  Product,
  Order,
  Invoice,
} from '../types/store';

interface AppState {
  // User & Business
  currentUser: User | null;
  currentBusiness: Business | null;
  selectedLocation: Location | null;
  
  // Messages & Channels
  channels: Channel[];
  messages: Record<string, Message[]>;
  activeChannel: string | null;
  
  // Products
  products: Product[];
  selectedProduct: Product | null;
  
  // Orders
  orders: Order[];
  selectedOrder: Order | null;
  
  // Invoices
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrentBusiness: (business: Business | null) => void;
  setSelectedLocation: (location: Location | null) => void;
  
  // Message Actions
  setChannels: (channels: Channel[]) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  setActiveChannel: (channelId: string | null) => void;
  
  // Product Actions
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  
  // Order Actions
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  
  // Invoice Actions
  setInvoices: (invoices: Invoice[]) => void;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial State
  currentUser: null,
  currentBusiness: null,
  selectedLocation: null,
  channels: [],
  messages: {},
  activeChannel: null,
  products: [],
  selectedProduct: null,
  orders: [],
  selectedOrder: null,
  invoices: [],
  selectedInvoice: null,
  
  // User & Business Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentBusiness: (business) => set({ currentBusiness: business }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  
  // Message Actions
  setChannels: (channels) => set({ channels }),
  setMessages: (channelId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [channelId]: messages },
    })),
  addMessage: (channelId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), message],
      },
    })),
  setActiveChannel: (channelId) => set({ activeChannel: channelId }),
  
  // Product Actions
  setProducts: (products) => set({ products }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  updateProduct: (productId, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    })),
  
  // Order Actions
  setOrders: (orders) => set({ orders }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  updateOrder: (orderId, updates) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, ...updates } : o
      ),
    })),
  
  // Invoice Actions
  setInvoices: (invoices) => set({ invoices }),
  setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),
  updateInvoice: (invoiceId, updates) =>
    set((state) => ({
      invoices: state.invoices.map((i) =>
        i.id === invoiceId ? { ...i, ...updates } : i
      ),
    })),
})); 