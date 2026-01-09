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

// Global product definition (company-wide)
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

export type Order = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  locationId: string; // Which location this order is for
  companyId: string; // Which company this order belongs to
  items: OrderItem[];
  assignedTo?: string;
  transportMethod?: string;
  deliveryTime?: string;
};

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