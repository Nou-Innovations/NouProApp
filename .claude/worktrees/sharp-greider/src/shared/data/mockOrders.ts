/**
 * Mock Orders Data
 * Sample B2B orders for development and testing
 */

import { OrderWithItems, OrderStatus } from '@/shared/types/order';

/**
 * Mock orders for development
 * Includes both incoming and outgoing orders for different businesses
 */
export const mockOrders: OrderWithItems[] = [
  // Incoming orders (to our business biz-001)
  {
    id: 'ORD-001',
    from_business_id: 'biz-003',
    to_business_id: 'biz-001',
    from_business_name: 'FreshMart Retailers',
    to_business_name: 'NouPro Distribution',
    status: 'pending',
    total_price: 245000,
    notes: 'Please deliver before 10 AM. We need this for weekend rush.',
    created_by: 'user-003',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    items: [
      {
        id: 'item-001',
        order_id: 'ORD-001',
        product_id: 'prod-2',
        product_name: 'Smart Wireless Earbuds',
        quantity: 20,
        unit_price: 89900,
        subtotal: 179800,
      },
      {
        id: 'item-002',
        order_id: 'ORD-001',
        product_id: 'prod-3',
        product_name: 'USB-C Fast Charger',
        quantity: 15,
        unit_price: 45900,
        subtotal: 68850,
      },
    ],
  },
  {
    id: 'ORD-002',
    from_business_id: 'biz-004',
    to_business_id: 'biz-001',
    from_business_name: 'Tech Haven Store',
    to_business_name: 'NouPro Distribution',
    status: 'accepted',
    total_price: 625000,
    notes: 'Monthly restocking order.',
    created_by: 'user-004',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-003',
        order_id: 'ORD-002',
        product_id: 'prod-4',
        product_name: 'Bluetooth Speaker Pro',
        quantity: 50,
        unit_price: 125000,
        subtotal: 625000,
      },
    ],
  },
  {
    id: 'ORD-003',
    from_business_id: 'biz-005',
    to_business_id: 'biz-001',
    from_business_name: 'GreenLife Supermarket',
    to_business_name: 'NouPro Distribution',
    status: 'completed',
    total_price: 156000,
    created_by: 'user-005',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-004',
        order_id: 'ORD-003',
        product_id: 'prod-10',
        product_name: 'Bamboo Toothbrush Set',
        quantity: 30,
        unit_price: 18000,
        subtotal: 54000,
      },
      {
        id: 'item-005',
        order_id: 'ORD-003',
        product_id: 'prod-11',
        product_name: 'Reusable Water Bottle',
        quantity: 20,
        unit_price: 55000,
        subtotal: 110000,
      },
    ],
  },
  {
    id: 'ORD-004',
    from_business_id: 'biz-006',
    to_business_id: 'biz-001',
    from_business_name: 'Island Electronics',
    to_business_name: 'NouPro Distribution',
    status: 'cancelled',
    total_price: 325000,
    notes: 'Cancelled due to budget constraints.',
    created_by: 'user-006',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-006',
        order_id: 'ORD-004',
        product_id: 'prod-24',
        product_name: 'Adjustable Dumbbells',
        quantity: 10,
        unit_price: 325000,
        subtotal: 325000,
      },
    ],
  },
  
  // Outgoing orders (from our business biz-001)
  {
    id: 'ORD-005',
    from_business_id: 'biz-001',
    to_business_id: 'biz-007',
    from_business_name: 'NouPro Distribution',
    to_business_name: 'Premium Suppliers Ltd',
    status: 'pending',
    total_price: 850000,
    notes: 'Urgent: Need for a large client order.',
    created_by: 'user-001',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    items: [
      {
        id: 'item-007',
        order_id: 'ORD-005',
        product_id: 'prod-60',
        product_name: 'Watch Collection',
        quantity: 25,
        unit_price: 195000,
        subtotal: 487500,
      },
      {
        id: 'item-008',
        order_id: 'ORD-005',
        product_id: 'prod-61',
        product_name: 'Handbag Premium',
        quantity: 15,
        unit_price: 225000,
        subtotal: 337500,
      },
    ],
  },
  {
    id: 'ORD-006',
    from_business_id: 'biz-001',
    to_business_id: 'biz-008',
    from_business_name: 'NouPro Distribution',
    to_business_name: 'Global Wholesale Co',
    status: 'accepted',
    total_price: 445000,
    created_by: 'user-001',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-009',
        order_id: 'ORD-006',
        product_id: 'prod-46',
        product_name: 'Gourmet Spice Set',
        quantity: 50,
        unit_price: 85000,
        subtotal: 425000,
      },
    ],
  },
  {
    id: 'ORD-007',
    from_business_id: 'biz-001',
    to_business_id: 'biz-009',
    from_business_name: 'NouPro Distribution',
    to_business_name: 'Quality Products Inc',
    status: 'completed',
    total_price: 268000,
    created_by: 'user-001',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-010',
        order_id: 'ORD-007',
        product_id: 'prod-22',
        product_name: 'Resistance Band Set',
        quantity: 40,
        unit_price: 65000,
        subtotal: 260000,
      },
    ],
  },
  
  // More pending orders for testing
  {
    id: 'ORD-008',
    from_business_id: 'biz-010',
    to_business_id: 'biz-001',
    from_business_name: 'Corner Shop Mauritius',
    to_business_name: 'NouPro Distribution',
    status: 'pending',
    total_price: 95000,
    created_by: 'user-010',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    items: [
      {
        id: 'item-011',
        order_id: 'ORD-008',
        product_id: 'prod-32',
        product_name: 'Ceramic Coffee Mug Set',
        quantity: 12,
        unit_price: 75000,
        subtotal: 90000,
      },
    ],
  },
  {
    id: 'ORD-009',
    from_business_id: 'biz-011',
    to_business_id: 'biz-001',
    from_business_name: 'Fitness First Shop',
    to_business_name: 'NouPro Distribution',
    status: 'pending',
    total_price: 520000,
    notes: 'New store opening - bulk order for fitness equipment.',
    created_by: 'user-011',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    items: [
      {
        id: 'item-012',
        order_id: 'ORD-009',
        product_id: 'prod-23',
        product_name: 'Yoga Mat Premium',
        quantity: 30,
        unit_price: 85000,
        subtotal: 255000,
      },
      {
        id: 'item-013',
        order_id: 'ORD-009',
        product_id: 'prod-25',
        product_name: 'Foam Roller',
        quantity: 25,
        unit_price: 55000,
        subtotal: 137500,
      },
      {
        id: 'item-014',
        order_id: 'ORD-009',
        product_id: 'prod-26',
        product_name: 'Jump Rope Pro',
        quantity: 40,
        unit_price: 32000,
        subtotal: 128000,
      },
    ],
  },
];

/**
 * Get orders by status
 */
export const getOrdersByStatus = (status: OrderStatus): OrderWithItems[] => {
  return mockOrders.filter((order) => order.status === status);
};

/**
 * Get incoming orders for a business
 */
export const getIncomingOrders = (businessId: string): OrderWithItems[] => {
  return mockOrders.filter((order) => order.to_business_id === businessId);
};

/**
 * Get outgoing orders for a business
 */
export const getOutgoingOrders = (businessId: string): OrderWithItems[] => {
  return mockOrders.filter((order) => order.from_business_id === businessId);
};

/**
 * Format currency helper
 */
export const formatCurrency = (amount: number): string => {
  return `Rs ${amount.toLocaleString()}`;
};

/**
 * Format relative time
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};




