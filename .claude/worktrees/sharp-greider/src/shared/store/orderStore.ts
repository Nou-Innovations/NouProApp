/**
 * Order Store
 * Manages B2B ordering system including:
 * - Cart per business (multiple carts for different suppliers)
 * - Orders (incoming and outgoing)
 * - Order lifecycle management
 * 
 * Based on app-logic.json Phase 4: B2B Ordering System
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Order, 
  OrderItem, 
  OrderWithItems, 
  CartItem, 
  BusinessCart,
  CreateOrderPayload 
} from '@/shared/types/order';
import type { OrderStatus } from '@/shared/constants/orderStatus';
import { 
  createOrder as createOrderAPI, 
  fetchOrders as fetchOrdersAPI, 
  fetchPlacedOrders as fetchPlacedOrdersAPI 
} from '@/shared/services/orders';

/**
 * Order Store State
 */
interface OrderState {
  // Cart state - organized by target business (supplier)
  carts: Record<string, BusinessCart>; // Key is toBusinessId
  
  // Orders - both incoming and outgoing
  orders: OrderWithItems[];
  selectedOrder: OrderWithItems | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * Order Store Actions
 */
interface OrderActions {
  // Cart actions
  addToCart: (
    toBusinessId: string, 
    toBusinessName: string, 
    product: CartItem['product'], 
    quantity: number
  ) => void;
  removeFromCart: (toBusinessId: string, productId: string) => void;
  updateCartQuantity: (toBusinessId: string, productId: string, quantity: number) => void;
  clearCart: (toBusinessId: string) => void;
  clearAllCarts: () => void;
  getCart: (toBusinessId: string) => BusinessCart | null;
  getCartItemCount: (toBusinessId: string) => number;
  getCartTotal: (toBusinessId: string) => number;
  getTotalCartItems: () => number;
  
  // Order actions
  placeOrder: (
    fromBusinessId: string,
    fromBusinessName: string,
    toBusinessId: string,
    toBusinessName: string,
    notes?: string,
    createdBy?: string
  ) => Promise<Order | null>;
  
  // Order fetching from API
  fetchOrders: (businessId: string) => Promise<void>;
  fetchPlacedOrders: (businessId: string) => Promise<void>;

  // Order management
  setOrders: (orders: OrderWithItems[]) => void;
  addOrder: (order: OrderWithItems) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  setSelectedOrder: (order: OrderWithItems | null) => void;
  getOrderById: (orderId: string) => OrderWithItems | undefined;
  
  // Filter helpers
  getIncomingOrders: (businessId: string) => OrderWithItems[];
  getOutgoingOrders: (businessId: string) => OrderWithItems[];
  getOrdersByStatus: (businessId: string, status: OrderStatus, type: 'incoming' | 'outgoing') => OrderWithItems[];
  
  // Utility
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type OrderStore = OrderState & OrderActions;

/**
 * Initial state
 */
const initialState: OrderState = {
  carts: {},
  orders: [],
  selectedOrder: null,
  isLoading: false,
  error: null,
};

/**
 * Order Store
 */
export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== Cart Actions ==========

      /**
       * Add product to cart for a specific business
       */
      addToCart: (toBusinessId, toBusinessName, product, quantity) => {
        set((state) => {
          const existingCart = state.carts[toBusinessId];
          const newItem: CartItem = {
            productId: product.id,
            product,
            quantity,
          };

          if (existingCart) {
            // Check if product already exists in cart
            const existingItemIndex = existingCart.items.findIndex(
              (item) => item.productId === product.id
            );

            let updatedItems: CartItem[];
            if (existingItemIndex >= 0) {
              // Update quantity if product exists
              updatedItems = existingCart.items.map((item, index) =>
                index === existingItemIndex
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              );
            } else {
              // Add new item
              updatedItems = [...existingCart.items, newItem];
            }

            // Calculate new total
            const newTotal = updatedItems.reduce(
              (sum, item) => sum + item.product.price * item.quantity,
              0
            );

            return {
              carts: {
                ...state.carts,
                [toBusinessId]: {
                  ...existingCart,
                  items: updatedItems,
                  total: newTotal,
                },
              },
            };
          } else {
            // Create new cart for this business
            return {
              carts: {
                ...state.carts,
                [toBusinessId]: {
                  businessId: toBusinessId,
                  businessName: toBusinessName,
                  items: [newItem],
                  total: product.price * quantity,
                },
              },
            };
          }
        });
      },

      /**
       * Remove product from cart
       */
      removeFromCart: (toBusinessId, productId) => {
        set((state) => {
          const cart = state.carts[toBusinessId];
          if (!cart) return state;

          const updatedItems = cart.items.filter(
            (item) => item.productId !== productId
          );

          // If cart is empty, remove it entirely
          if (updatedItems.length === 0) {
            const { [toBusinessId]: removed, ...restCarts } = state.carts;
            return { carts: restCarts };
          }

          const newTotal = updatedItems.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          );

          return {
            carts: {
              ...state.carts,
              [toBusinessId]: {
                ...cart,
                items: updatedItems,
                total: newTotal,
              },
            },
          };
        });
      },

      /**
       * Update cart item quantity
       */
      updateCartQuantity: (toBusinessId, productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(toBusinessId, productId);
          return;
        }

        set((state) => {
          const cart = state.carts[toBusinessId];
          if (!cart) return state;

          const updatedItems = cart.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          );

          const newTotal = updatedItems.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          );

          return {
            carts: {
              ...state.carts,
              [toBusinessId]: {
                ...cart,
                items: updatedItems,
                total: newTotal,
              },
            },
          };
        });
      },

      /**
       * Clear cart for a specific business
       */
      clearCart: (toBusinessId) => {
        set((state) => {
          const { [toBusinessId]: removed, ...restCarts } = state.carts;
          return { carts: restCarts };
        });
      },

      /**
       * Clear all carts
       */
      clearAllCarts: () => {
        set({ carts: {} });
      },

      /**
       * Get cart for a specific business
       */
      getCart: (toBusinessId) => {
        return get().carts[toBusinessId] || null;
      },

      /**
       * Get item count for a specific cart
       */
      getCartItemCount: (toBusinessId) => {
        const cart = get().carts[toBusinessId];
        if (!cart) return 0;
        return cart.items.reduce((sum, item) => sum + item.quantity, 0);
      },

      /**
       * Get total for a specific cart
       */
      getCartTotal: (toBusinessId) => {
        const cart = get().carts[toBusinessId];
        return cart?.total || 0;
      },

      /**
       * Get total items across all carts
       */
      getTotalCartItems: () => {
        const { carts } = get();
        return Object.values(carts).reduce(
          (total, cart) =>
            total + cart.items.reduce((sum, item) => sum + item.quantity, 0),
          0
        );
      },

      // ========== Order Actions ==========

      /**
       * Place order from cart - calls backend API
       */
      placeOrder: async (
        fromBusinessId,
        fromBusinessName,
        toBusinessId,
        toBusinessName,
        notes,
        createdBy = 'current-user'
      ) => {
        const cart = get().carts[toBusinessId];
        if (!cart || cart.items.length === 0) return null;

        set({ isLoading: true, error: null });

        try {
          // Build payload for the backend
          const payload: Omit<CreateOrderPayload, 'businessId'> = {
            buyerBusinessId: fromBusinessId,
            buyerBusinessName: fromBusinessName,
            customerName: fromBusinessName,
            createdBy,
            items: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              subtotal: item.product.price * item.quantity,
            })),
            totalAmount: cart.total,
            notes,
          };

          // Call the backend API - toBusinessId is the seller
          const created = await createOrderAPI(toBusinessId, payload);

          // Clear cart and add order to local state
          set((state) => {
            const { [toBusinessId]: removed, ...restCarts } = state.carts;
            return {
              orders: [created as OrderWithItems, ...state.orders],
              carts: restCarts,
              isLoading: false,
            };
          });

          return created;
        } catch (err: any) {
          const message = err?.message || 'Failed to place order';
          set({ isLoading: false, error: message });
          console.error('Failed to place order:', err);
          return null;
        }
      },

      /**
       * Fetch incoming orders (orders TO this business) from API
       */
      fetchOrders: async (businessId) => {
        set({ isLoading: true, error: null });
        try {
          const orders = await fetchOrdersAPI(businessId);
          // Merge with existing orders (replace incoming, keep outgoing)
          set((state) => {
            const outgoing = state.orders.filter((o) => o.buyerBusinessId === businessId);
            const merged = [...(orders as OrderWithItems[]), ...outgoing];
            // Deduplicate by id
            const seen = new Set<string>();
            const unique = merged.filter((o) => {
              if (seen.has(o.id)) return false;
              seen.add(o.id);
              return true;
            });
            return { orders: unique, isLoading: false };
          });
        } catch (err: any) {
          set({ isLoading: false, error: err?.message || 'Failed to fetch orders' });
        }
      },

      /**
       * Fetch placed/outgoing orders (orders FROM this business) from API
       */
      fetchPlacedOrders: async (businessId) => {
        set({ isLoading: true, error: null });
        try {
          const placedOrders = await fetchPlacedOrdersAPI(businessId);
          // Merge with existing orders (replace outgoing, keep incoming)
          set((state) => {
            const incoming = state.orders.filter((o) => o.businessId === businessId && o.buyerBusinessId !== businessId);
            const merged = [...incoming, ...(placedOrders as OrderWithItems[])];
            // Deduplicate by id
            const seen = new Set<string>();
            const unique = merged.filter((o) => {
              if (seen.has(o.id)) return false;
              seen.add(o.id);
              return true;
            });
            return { orders: unique, isLoading: false };
          });
        } catch (err: any) {
          set({ isLoading: false, error: err?.message || 'Failed to fetch placed orders' });
        }
      },

      /**
       * Set orders from API
       */
      setOrders: (orders) => {
        set({ orders });
      },

      /**
       * Add a single order
       */
      addOrder: (order) => {
        set((state) => ({
          orders: [order, ...state.orders],
        }));
      },

      /**
       * Update order status
       */
      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, status, updatedAt: new Date().toISOString() }
              : order
          ),
          selectedOrder:
            state.selectedOrder?.id === orderId
              ? { ...state.selectedOrder, status, updatedAt: new Date().toISOString() }
              : state.selectedOrder,
        }));
      },

      /**
       * Set selected order
       */
      setSelectedOrder: (order) => {
        set({ selectedOrder: order });
      },

      /**
       * Get order by ID
       */
      getOrderById: (orderId) => {
        return get().orders.find((order) => order.id === orderId);
      },

      // ========== Filter Helpers ==========

      /**
       * Get incoming orders (orders TO this business)
       */
      getIncomingOrders: (businessId) => {
        return get().orders.filter((order) => order.businessId === businessId);
      },

      /**
       * Get outgoing orders (orders FROM this business)
       */
      getOutgoingOrders: (businessId) => {
        return get().orders.filter((order) => order.buyerBusinessId === businessId);
      },

      /**
       * Get orders by status for a specific business
       */
      getOrdersByStatus: (businessId, status, type) => {
        const orders =
          type === 'incoming'
            ? get().getIncomingOrders(businessId)
            : get().getOutgoingOrders(businessId);
        return orders.filter((order) => order.status === status);
      },

      // ========== Utility ==========

      /**
       * Set error state
       */
      setError: (error) => {
        set({ error });
      },

      /**
       * Set loading state
       */
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'noupro-order-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist carts and orders
      partialize: (state) => ({
        carts: state.carts,
        orders: state.orders,
      }),
    }
  )
);

// ========== Selector Hooks ==========

/**
 * Get all carts
 */
export const useCarts = () => useOrderStore((state) => state.carts);

/**
 * Get cart for a specific business
 */
export const useCart = (businessId: string) =>
  useOrderStore((state) => state.carts[businessId] || null);

/**
 * Get all orders
 */
export const useOrders = () => useOrderStore((state) => state.orders);

/**
 * Get selected order
 */
export const useSelectedOrder = () => useOrderStore((state) => state.selectedOrder);

/**
 * Get loading state
 */
export const useOrderLoading = () => useOrderStore((state) => state.isLoading);

/**
 * Get error state
 */
export const useOrderError = () => useOrderStore((state) => state.error);
