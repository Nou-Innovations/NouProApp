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
  OrderStatus, 
  CartItem, 
  BusinessCart,
  CreateOrderPayload 
} from '@/shared/types/order';

/**
 * Order Store State
 */
interface OrderState {
  // Cart state - organized by target business (supplier)
  carts: Record<string, BusinessCart>; // Key is to_business_id
  
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
  ) => OrderWithItems | null;
  
  createManualOrder: (payload: CreateOrderPayload & {
    fromBusinessName: string;
    toBusinessName: string;
  }) => OrderWithItems;
  
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
 * Generate unique order ID
 */
const generateOrderId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

/**
 * Generate unique item ID
 */
const generateItemId = (): string => {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
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
            product_id: product.id,
            product,
            quantity,
          };

          if (existingCart) {
            // Check if product already exists in cart
            const existingItemIndex = existingCart.items.findIndex(
              (item) => item.product_id === product.id
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
                  business_id: toBusinessId,
                  business_name: toBusinessName,
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
            (item) => item.product_id !== productId
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
            item.product_id === productId ? { ...item, quantity } : item
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
       * Place order from cart
       */
      placeOrder: (
        fromBusinessId,
        fromBusinessName,
        toBusinessId,
        toBusinessName,
        notes,
        createdBy = 'current-user'
      ) => {
        const cart = get().carts[toBusinessId];
        if (!cart || cart.items.length === 0) return null;

        const orderId = generateOrderId();
        const now = new Date().toISOString();

        // Convert cart items to order items
        const orderItems: OrderItem[] = cart.items.map((item) => ({
          id: generateItemId(),
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.product.price * item.quantity,
        }));

        const newOrder: OrderWithItems = {
          id: orderId,
          from_business_id: fromBusinessId,
          to_business_id: toBusinessId,
          from_business_name: fromBusinessName,
          to_business_name: toBusinessName,
          status: 'pending',
          total_price: cart.total,
          notes,
          created_by: createdBy,
          created_at: now,
          items: orderItems,
        };

        set((state) => {
          // Add order and clear cart
          const { [toBusinessId]: removed, ...restCarts } = state.carts;
          return {
            orders: [newOrder, ...state.orders],
            carts: restCarts,
          };
        });

        return newOrder;
      },

      /**
       * Create manual order (for distributors creating orders for clients)
       */
      createManualOrder: (payload) => {
        const orderId = generateOrderId();
        const now = new Date().toISOString();

        const orderItems: OrderItem[] = payload.items.map((item) => ({
          id: generateItemId(),
          order_id: orderId,
          product_id: item.product_id,
          product_name: '', // Will be filled from product lookup
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        }));

        const totalPrice = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

        const newOrder: OrderWithItems = {
          id: orderId,
          from_business_id: payload.from_business_id,
          to_business_id: payload.to_business_id,
          from_business_name: payload.fromBusinessName,
          to_business_name: payload.toBusinessName,
          status: 'pending',
          total_price: totalPrice,
          notes: payload.notes,
          created_by: 'current-user',
          created_at: now,
          items: orderItems,
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));

        return newOrder;
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
              ? { ...order, status, updated_at: new Date().toISOString() }
              : order
          ),
          selectedOrder:
            state.selectedOrder?.id === orderId
              ? { ...state.selectedOrder, status, updated_at: new Date().toISOString() }
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
        return get().orders.filter((order) => order.to_business_id === businessId);
      },

      /**
       * Get outgoing orders (orders FROM this business)
       */
      getOutgoingOrders: (businessId) => {
        return get().orders.filter((order) => order.from_business_id === businessId);
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




