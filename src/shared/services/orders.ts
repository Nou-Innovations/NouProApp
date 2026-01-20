import { useAppStore } from '../store';
import { Order, OrderItem } from '@/shared/types/store';
import { get, post, patch } from '@/shared/services/api';

class OrderService {
  private store = useAppStore;

  async fetchOrders(locationId: string) {
    try {
      const orders = await get<Order[]>('/orders', { locationId });
      this.store.getState().setOrders(orders);
      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async createOrder(order: Omit<Order, 'id'>) {
    try {
      const newOrder = await post<Order>('/orders', order);
      
      const store = this.store.getState();
      store.setOrders([...store.orders, newOrder]);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status']) {
    try {
      const updatedOrder = await patch<Order>(`/orders/${orderId}/status`, { status });
      
      this.store.getState().updateOrder(orderId, updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async updatePaymentStatus(orderId: string, paymentStatus: Order['paymentStatus']) {
    try {
      const updatedOrder = await patch<Order>(`/orders/${orderId}/payment`, { paymentStatus });
      
      this.store.getState().updateOrder(orderId, updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  async assignOrder(orderId: string, staffId: string) {
    try {
      const updatedOrder = await patch<Order>(`/orders/${orderId}/assign`, { staffId });
      
      this.store.getState().updateOrder(orderId, updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error assigning order:', error);
      throw error;
    }
  }

  async updateDeliveryDetails(orderId: string, details: {
    transportMethod?: string;
    deliveryTime?: string;
  }) {
    try {
      const updatedOrder = await patch<Order>(`/orders/${orderId}/delivery`, details);
      
      this.store.getState().updateOrder(orderId, updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating delivery details:', error);
      throw error;
    }
  }

  getPendingOrders() {
    const store = this.store.getState();
    return store.orders.filter(order => order.status === 'pending');
  }

  getOrdersByStatus(status: Order['status']) {
    const store = this.store.getState();
    return store.orders.filter(order => order.status === status);
  }

  getOrdersByPaymentStatus(paymentStatus: Order['paymentStatus']) {
    const store = this.store.getState();
    return store.orders.filter(order => order.paymentStatus === paymentStatus);
  }
}

export const orderService = new OrderService(); 