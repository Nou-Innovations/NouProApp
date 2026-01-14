/**
 * Store Index
 * Central export for all Zustand stores
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * STORE ARCHITECTURE GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This project uses multiple Zustand stores with SPECIFIC purposes:
 * 
 * ✅ useProfileStore (profileStore.ts) - AUTH & USER IDENTITY
 *    - User identity (currentUser)
 *    - Auth tokens (accessToken, refreshToken)
 *    - App mode (personal/business)
 *    - Active business context
 *    - User's businesses list
 * 
 * ✅ useBusinessStore (businessStore.ts) - BUSINESS CRUD
 *    - Business entities (CRUD operations)
 *    - Business locations
 *    - Company data fetching
 * 
 * ✅ useOrderStore (orderStore.ts) - ORDER MANAGEMENT
 *    - Order management
 * 
 * ✅ useInboxStore (features/inbox/inbox.store.ts) - CHAT/INBOX STATE
 *    - Channels list
 *    - Messages by channel
 *    - Active channel selection
 *    → chat.ts service now uses this store (not useAppStore)
 * 
 * ⚠️  useAppStore (below) - LEGACY/TRANSITIONAL (being drained)
 *    - Cart state
 *    - Products and location stocks
 *    - Orders and invoices (filterable by location)
 *    - UI state (section expanded state)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚫 FROZEN FIELDS - DO NOT ADD NEW USAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * The following fields in useAppStore are FROZEN (legacy only):
 * 
 * - currentUser, currentBusiness → Use useProfileStore / useBusinessStore
 * - channels, messages, activeChannel → Use useInboxStore
 *   (chat.ts has been migrated; UI screens should follow)
 * 
 * No new code should read/write these fields. They remain for backward
 * compatibility during migration. Once all consumers are migrated, these
 * fields will be removed.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import {
  User,
  Business,
  Location,
  Message,
  Channel,
  Product,
  LocationStock,
  Order,
  Invoice,
} from '@/shared/types/store';

// Export new stores (RECOMMENDED)
export { useProfileStore } from './profileStore';
export { useBusinessStore } from './businessStore';
export { useOrderStore } from './orderStore';

// Cart types
export interface CartItem {
  productId: string;
  quantity: number;
  product: any; // Store product data for easy access
}



interface AppState {
  // User & Business
  /** @deprecated Use useProfileStore().currentUser instead */
  currentUser: User | null;
  /** @deprecated Use useBusinessStore().currentBusiness instead */
  currentBusiness: Business | null;
  
  // Messages & Channels
  /** @deprecated Use useInboxStore from @/features/inbox instead */
  channels: Channel[];
  /** @deprecated Use useInboxStore from @/features/inbox instead */
  messages: Record<string, Message[]>;
  /** @deprecated Use useInboxStore from @/features/inbox instead */
  activeChannel: string | null;
  
  // Products (global products + location stock)
  products: Product[];
  locationStocks: LocationStock[];
  selectedProduct: Product | null;
  
  // Orders (global, filterable by location)
  orders: Order[];
  selectedOrder: Order | null;
  
  // Invoices (global, filterable by location)
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  
  // UI State
  sectionExpandedState: Record<string, Record<string, boolean>>;
  
  // Cart State
  cartItems: CartItem[];
  
  // Actions
  /** @deprecated Use useProfileStore().setCurrentUser() or login() instead */
  setCurrentUser: (user: User | null) => void;
  /** @deprecated Use useBusinessStore().setBusiness() instead */
  setCurrentBusiness: (business: Business | null) => void;
  
  // Message Actions
  /** @deprecated Use useInboxStore from @/features/inbox instead */
  setChannels: (channels: Channel[]) => void;
  /** @deprecated Use useInboxStore from @/features/inbox instead */
  setMessages: (channelId: string, messages: Message[]) => void;
  /** @deprecated Use useInboxStore from @/features/inbox instead */
  addMessage: (channelId: string, message: Message) => void;
  /** @deprecated Use useInboxStore from @/features/inbox instead */
  setActiveChannel: (channelId: string | null) => void;
  
  // Product Actions (global products)
  setProducts: (products: Product[]) => void;
  setLocationStocks: (stocks: LocationStock[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  updateLocationStock: (stockId: string, updates: Partial<LocationStock>) => void;
  
  // Order Actions (global orders)
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  
  // Invoice Actions (global invoices)
  setInvoices: (invoices: Invoice[]) => void;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
  
  // UI State Actions
  getSectionExpandedState: (entityId: string, sectionKey: string) => boolean;
  setSectionExpandedState: (entityId: string, sectionKey: string, isExpanded: boolean) => void;
  
  // Helper Methods for Global Data Filtering
  getProductsForLocation: (locationId?: string) => Product[];
  getOrdersForLocation: (locationId?: string) => Order[];
  getInvoicesForLocation: (locationId?: string) => Invoice[];
  
  // Cart Actions
  addToCart: (product: any, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartItem: (productId: string) => CartItem | undefined;
  placeOrder: (businessId: string, businessName: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  currentUser: null,
  currentBusiness: null,
  channels: [],
  messages: {},
  activeChannel: null,
  products: [],
  locationStocks: [],
  selectedProduct: null,
  orders: [],
  selectedOrder: null,
  invoices: [],
  selectedInvoice: null,
  sectionExpandedState: {},
  cartItems: [],
  
  // User & Business Actions
  // ⚠️ DEPRECATED: Use useProfileStore for auth state
  setCurrentUser: (user) => {
    if (__DEV__) {
      console.warn(
        '[useAppStore] DEPRECATED: setCurrentUser() called. ' +
        'Use useProfileStore.setCurrentUser() instead. ' +
        'This will be removed in a future release.'
      );
    }
    set({ currentUser: user });
  },
  // ⚠️ DEPRECATED: Use useBusinessStore for business entities
  setCurrentBusiness: (business) => {
    if (__DEV__) {
      console.warn(
        '[useAppStore] DEPRECATED: setCurrentBusiness() called. ' +
        'Use useBusinessStore.setBusiness() instead. ' +
        'This will be removed in a future release.'
      );
    }
    set({ currentBusiness: business });
  },
  
  // Message Actions
  // ⚠️ DEPRECATED: Use useInboxStore from @/features/inbox instead
  // chat.ts has been migrated; these remain for backward compatibility
  setChannels: (channels) => {
    if (__DEV__) {
      console.warn(
        '[useAppStore] DEPRECATED: setChannels() called. ' +
        'Use useInboxStore.setChannels() from @/features/inbox instead.'
      );
    }
    set({ channels });
  },
  setMessages: (channelId, messages) => {
    if (__DEV__) {
      console.warn(
        '[useAppStore] DEPRECATED: setMessages() called. ' +
        'Use useInboxStore.setMessages() from @/features/inbox instead.'
      );
    }
    set((state) => ({
      messages: { ...state.messages, [channelId]: messages },
    }));
  },
  addMessage: (channelId, message) => {
    if (__DEV__) {
      console.warn(
        '[useAppStore] DEPRECATED: addMessage() called. ' +
        'Use useInboxStore.addMessage() from @/features/inbox instead.'
      );
    }
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), message],
      },
    }));
  },
  setActiveChannel: (channelId) => {
    if (__DEV__) {
      console.warn(
        '[useAppStore] DEPRECATED: setActiveChannel() called. ' +
        'Use useInboxStore.setActiveChannel() from @/features/inbox instead.'
      );
    }
    set({ activeChannel: channelId });
  },
  
  // Product Actions
  setProducts: (products) => set({ products }),
  setLocationStocks: (stocks) => set({ locationStocks: stocks }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  updateProduct: (productId, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    })),
  updateLocationStock: (stockId, updates) =>
    set((state) => ({
      locationStocks: state.locationStocks.map((s) =>
        s.id === stockId ? { ...s, ...updates } : s
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
    
  // UI State Actions
  getSectionExpandedState: (entityId, sectionKey) => {
    const state = get();
    return state.sectionExpandedState[entityId]?.[sectionKey] || false;
  },
  setSectionExpandedState: (entityId, sectionKey, isExpanded) =>
    set((state) => ({
      sectionExpandedState: {
        ...state.sectionExpandedState,
        [entityId]: {
          ...state.sectionExpandedState[entityId],
          [sectionKey]: isExpanded,
        },
      },
    })),
    
  // Helper Methods for Global Data Filtering
  getProductsForLocation: (locationId) => {
    const state = get();
    if (!locationId) return state.products; // Return all products if no location filter
    
    // Filter products that have stock at the specified location
    const stocksAtLocation = state.locationStocks.filter(s => s.locationId === locationId);
    const productIdsAtLocation = stocksAtLocation.map(s => s.productId);
    return state.products.filter(p => productIdsAtLocation.includes(p.id));
  },
  
  getOrdersForLocation: (locationId) => {
    const state = get();
    if (!locationId) return state.orders; // Return all orders if no location filter
    return state.orders.filter(o => o.locationId === locationId);
  },
  
  getInvoicesForLocation: (locationId) => {
    const state = get();
    if (!locationId) return state.invoices; // Return all invoices if no location filter
    return state.invoices.filter(i => i.locationId === locationId);
  },
  
  // Cart Actions
  addToCart: (product, quantity) =>
    set((state) => {
      const existingItem = state.cartItems.find(item => item.productId === product.id);
      if (existingItem) {
        return {
          cartItems: state.cartItems.map(item =>
            item.productId === product.id
              ? { ...item, quantity }
              : item
          ),
        };
      } else {
        return {
          cartItems: [...state.cartItems, { productId: product.id, quantity, product }],
        };
      }
    }),
  
  removeFromCart: (productId) =>
    set((state) => ({
      cartItems: state.cartItems.filter(item => item.productId !== productId),
    })),
  
  updateCartItemQuantity: (productId, quantity) =>
    set((state) => ({
      cartItems: state.cartItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      ),
    })),
  
  clearCart: () => set({ cartItems: [] }),
  
  getCartItem: (productId) => {
    const state = get();
    return state.cartItems.find(item => item.productId === productId);
  },
  
  placeOrder: (businessId, businessName) => {
    const state = get();
    if (state.cartItems.length === 0) return;
    
    // Calculate order details
    const totalItems = state.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = state.cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    // Create order message content
    const orderSummary = state.cartItems.map(item => 
      `${item.product.name} x${item.quantity} - Rs ${(item.product.price * item.quantity).toLocaleString()}`
    ).join('\n');
    
    const orderMessage = {
      id: `order-${Date.now()}`,
      content: `🛒 **New Order**\n\n${orderSummary}\n\n**Total Items:** ${totalItems}\n**Total Amount:** Rs ${totalAmount.toLocaleString()}\n\nOrder placed on ${new Date().toLocaleString()}`,
      senderId: 'current-user',
      timestamp: new Date().toISOString(),
      type: 'text' as const,
      orderData: {
        items: state.cartItems,
        totalAmount,
        totalItems,
        orderId: `ORDER-${Date.now()}`,
        status: 'pending'
      }
    };
    
    // Find or create channel for this business
    let channelId = state.channels.find(channel => 
      channel.partnerId === businessId && channel.partnerType === 'business'
    )?.id;
    
    if (!channelId) {
      // Create new channel
      channelId = `channel-${businessId}`;
      const newChannel = {
        id: channelId,
        name: businessName,
        type: 'private' as const,
        members: ['current-user', businessId],
        avatar: null,
        isGroup: false,
        partnerId: businessId,
        partnerType: 'business' as const,
        unreadCount: 0,
        lastMessage: orderMessage,
        lastMessageTime: orderMessage.timestamp,
      };
      
      set(state => ({
        channels: [...state.channels, newChannel]
      }));
    } else {
      // Update existing channel
      set(state => ({
        channels: state.channels.map(channel =>
          channel.id === channelId
            ? {
                ...channel,
                lastMessage: orderMessage,
                lastMessageTime: orderMessage.timestamp,
                unreadCount: channel.unreadCount + 1
              }
            : channel
        )
      }));
    }
    
    // Add message to channel
    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), orderMessage],
      },
    }));
    
    // Clear cart after placing order
    set({ cartItems: [] });
  },
}));

// NOTE: The deprecated `useStore` alias has been removed.
// All code should import `useAppStore` directly.
// See STORE ARCHITECTURE GUIDE above for proper store usage. 