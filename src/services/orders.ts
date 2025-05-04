import { useStore } from '../store';
import { Order, OrderItem } from '../types/store';

class OrderService {
  private store = useStore;

  async fetchOrders(locationId: string) {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/orders?locationId=${locationId}`);
      const orders: Order[] = await response.json();
      this.store.getState().setOrders(orders);
      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async createOrder(order: Omit<Order, 'id'>) {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });
      const newOrder: Order = await response.json();
      
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
      // TODO: Replace with actual API call
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const updatedOrder: Order = await response.json();
      
      this.store.getState().updateOrder(orderId, updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async updatePaymentStatus(orderId: string, paymentStatus: Order['paymentStatus']) {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentStatus }),
      });
      const updatedOrder: Order = await response.json();
      
      this.store.getState().updateOrder(orderId, updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  async assignOrder(orderId: string, staffId: string) {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffId }),
      });
      const updatedOrder: Order = await response.json();
      
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
      // TODO: Replace with actual API call
      const response = await fetch(`/api/orders/${orderId}/delivery`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(details),
      });
      const updatedOrder: Order = await response.json();
      
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