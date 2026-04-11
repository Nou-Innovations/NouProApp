export type User = {
  id: string;
  name: string;
  email: string;
  role: 'superAdmin' | 'admin' | 'staff';
  avatar?: string;
  assignedLocationIds?: string[]; // For staff - which locations they can fulfill orders at
  companyId: string; // User belongs to a company
};

export type Location = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  companyId: string;
};

export type Business = {
  id: string;
  name: string;
  logo?: string;
  locations: Location[];
  settings: {
    taxRate: number;
    currency: string;
    invoicePrefix: string;
  };
  connections_count?: number;
};

export type Message = {
  id: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'pdf' | 'invoice';
  senderId: string;
  timestamp: string;
  attachmentUrl?: string;
};

export type Channel = {
  id: string;
  name: string;
  type: 'public' | 'private';
  members: string[];
  lastMessage?: Message;
  companyId?: string; // Global company channels
  locationId?: string; // Location-specific channels (for staff)
  // Extended properties for chat functionality
  avatar?: string | null;
  isGroup: boolean;
  partnerId?: string;
  partnerType?: 'user' | 'business' | 'group';
  unreadCount: number;
  lastMessageTime?: Date | string;
};

/**
 * @deprecated Use `UIProduct` from `@/shared/types/product` for UI components,
 * or `Product` from `@/shared/types/product` for the API/backend shape.
 * This legacy type is only kept for `useAppStore` backwards compatibility.
 */
export type Product = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  costPrice: number;
  imageUrl: string;
  category: string;
  variants: ProductVariant[];
  companyId: string; // Product belongs to a company
  createdBy: string; // User who created the product
  isActive: boolean; // Global status
  minStockAlert: number; // Global threshold setting
};

/**
 * @deprecated Use `ProductVariant` from `@/shared/types/product` instead.
 * This legacy type is only kept for `useAppStore` backwards compatibility.
 */
export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  sku: string;
  barcode?: string;
  unit: string;
};

// Location-specific stock data
export type LocationStock = {
  id: string;
  productId: string;
  locationId: string;
  stockQuantity: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'in_production' | 'discontinued';
  minStockThreshold: number; // Location-specific threshold
  isVisible: boolean; // Whether visible to clients at this location
  lastUpdated: string;
};

/**
 * @deprecated Use `Order` from `@/shared/types/order` instead.
 * This legacy type has incorrect field names and lowercase statuses.
 * Kept temporarily for `useAppStore` backwards compatibility.
 */
export type LegacyOrder = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  locationId: string;
  companyId: string;
  items: OrderItem[];
  assignedTo?: string;
  transportMethod?: string;
  deliveryTime?: string;
};

/** @deprecated Use `Order` from `@/shared/types/order` instead. */
export type Order = LegacyOrder;

export type OrderItem = {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  loaded: boolean;
};

export type Invoice = {
  id: string;
  orderId?: string;
  clientId: string;
  clientName: string;
  date: string;
  dueDate: string;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  notes?: string;
  companyId: string; // Which company this invoice belongs to
  locationId?: string; // Associated location (if tied to a delivery)
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
  tax: number;
}; 