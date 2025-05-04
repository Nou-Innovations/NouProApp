export type User = {
  id: string;
  name: string;
  email: string;
  role: 'superAdmin' | 'admin' | 'staff';
  avatar?: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
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
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  costPrice: number;
  imageUrl: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'in_production' | 'discontinued';
  stockQuantity: number;
  minStockAlert: number;
  locationId: string;
  category: string;
  variants: ProductVariant[];
};

export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  sku: string;
  barcode?: string;
  unit: string;
  quantity: number;
};

export type Order = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  locationId: string;
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
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  price: number;
  tax: number;
}; 