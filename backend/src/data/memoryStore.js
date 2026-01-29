// ============================================================================
// MEMORY STORE - In-memory data for development/testing
// This file consolidates all mock data arrays from the original server.js
// ============================================================================

// ============================================================================
// CONSTANTS
// ============================================================================

const SUBSCRIPTION_TIERS = {
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE'
};

const LOCATION_MODES = {
  DEPENDENT: 'DEPENDENT',
  INDEPENDENT: 'INDEPENDENT'
};

const ORDER_STATUS = {
  NEW: 'NEW',
  ACCEPTED: 'ACCEPTED',
  ONGOING: 'ONGOING',
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELED: 'CANCELED',
  REJECTED: 'REJECTED'
};

const ORDER_SCOPE = {
  PARENT: 'PARENT',
  LOCATION: 'LOCATION'
};

const INVOICE_SCOPE = {
  PARENT: 'PARENT',
  LOCATION: 'LOCATION'
};

const MEMBER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff'
};

const MEMBER_STATUS = {
  INVITED: 'invited',
  ACCEPTED: 'accepted',
  SUSPENDED: 'suspended'
};

// ============================================================================
// MOCK DATABASE - BUSINESSES (Companies with enhanced fields)
// ============================================================================

let companies = [
  {
    id: 'biz-001',
    name: 'NouPro Distribution Inc.',
    logoUrl: 'https://picsum.photos/seed/biz001/100/100',
    description: 'Leading distribution company serving multiple locations',
    phone: '+1-555-123-4567',
    email: 'info@noupro.com',
    subscriptionTier: SUBSCRIPTION_TIERS.ENTERPRISE,
    settings: {
      taxRate: 0.15,
      currency: 'MUR',
      invoicePrefix: 'INV',
      allowPartialPayments: true,
      autoGenerateInvoices: false,
      timezone: 'Indian/Mauritius',
      allowLocationPriceOverride: true,
      allowLocationTaxOverride: false
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'biz-002',
    name: 'Global Supply Co.',
    logoUrl: 'https://picsum.photos/seed/biz002/100/100',
    description: 'Global supply chain management specialists',
    phone: '+1-555-987-6543',
    email: 'contact@globalsupply.com',
    subscriptionTier: SUBSCRIPTION_TIERS.PRO,
    settings: {
      taxRate: 0.12,
      currency: 'MUR',
      invoicePrefix: 'GSC',
      allowPartialPayments: true,
      autoGenerateInvoices: true,
      timezone: 'Indian/Mauritius',
      allowLocationPriceOverride: false,
      allowLocationTaxOverride: false
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'biz-003',
    name: 'Small Retail Shop',
    logoUrl: 'https://picsum.photos/seed/biz003/100/100',
    description: 'Local corner shop',
    phone: '+230-5999-1234',
    email: 'shop@local.mu',
    subscriptionTier: SUBSCRIPTION_TIERS.FREE,
    settings: {
      taxRate: 0.15,
      currency: 'MUR',
      invoicePrefix: 'SRS',
      allowPartialPayments: false,
      autoGenerateInvoices: false,
      timezone: 'Indian/Mauritius',
      allowLocationPriceOverride: false,
      allowLocationTaxOverride: false
    },
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - LOCATIONS
// ============================================================================

let locations = [
  {
    id: 'loc-001',
    companyId: 'biz-001',
    name: 'Warehouse A - Port Louis',
    address: '123 Royal Road, Port Louis, Mauritius',
    phone: '+230-5123-4567',
    email: 'warehouse-a@noupro.mu',
    latitude: -20.1609,
    longitude: 57.5012,
    operatingMode: LOCATION_MODES.INDEPENDENT,
    isPublic: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'loc-002',
    companyId: 'biz-001',
    name: 'Warehouse B - Curepipe',
    address: '456 Industrial Zone, Curepipe, Mauritius',
    phone: '+230-5987-6543',
    email: 'warehouse-b@noupro.mu',
    latitude: -20.3162,
    longitude: 57.5166,
    operatingMode: LOCATION_MODES.DEPENDENT,
    isPublic: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'loc-003',
    companyId: 'biz-001',
    name: 'Distribution Center - Ebene',
    address: '789 Cyber Tower, Ebene, Mauritius',
    phone: '+230-5555-0123',
    email: 'distribution@noupro.mu',
    latitude: -20.2456,
    longitude: 57.4897,
    operatingMode: LOCATION_MODES.INDEPENDENT,
    isPublic: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'loc-004',
    companyId: 'biz-002',
    name: 'Global Hub - Quatre Bornes',
    address: '321 Business Park, Quatre Bornes, Mauritius',
    phone: '+230-5999-8888',
    email: 'hub@globalsupply.mu',
    latitude: -20.2674,
    longitude: 57.4791,
    operatingMode: LOCATION_MODES.DEPENDENT,
    isPublic: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'loc-005',
    companyId: 'biz-003',
    name: 'Main Shop',
    address: '10 Market Street, Rose Hill, Mauritius',
    phone: '+230-5999-1234',
    email: 'shop@local.mu',
    latitude: -20.2445,
    longitude: 57.4677,
    operatingMode: LOCATION_MODES.DEPENDENT,
    isPublic: false,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'loc-006',
    companyId: 'biz-003',
    name: 'Branch Store - Curepipe',
    address: '25 Royal Road, Curepipe, Mauritius',
    phone: '+230-5999-5678',
    email: 'curepipe@local.mu',
    latitude: -20.3162,
    longitude: 57.5166,
    operatingMode: LOCATION_MODES.DEPENDENT,
    isPublic: false,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'loc-007',
    companyId: 'biz-003',
    name: 'Warehouse',
    address: '100 Industrial Zone, Phoenix, Mauritius',
    phone: '+230-5999-9999',
    email: 'warehouse@local.mu',
    latitude: -20.2890,
    longitude: 57.4940,
    operatingMode: LOCATION_MODES.INDEPENDENT,
    isPublic: false,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - PRODUCTS
// ============================================================================

let products = [
  {
    id: 'prd-001',
    companyId: 'biz-001',
    name: 'Coca-Cola 0.5L x10',
    brand: 'Coca-Cola',
    brandLogo: 'https://picsum.photos/seed/cocacola/40/40',
    productPicture: 'https://picsum.photos/seed/prd-001/80/80',
    price: 25.99,
    category: 'Beverages',
    status: 'Available',
    variants: ['Regular', 'Zero', 'Cherry'],
    unit: '10 pack',
    stockQuantity: 1500,
    is_listed: true,
    isCreatedByUser: true,
    isDisplayable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'prd-002',
    companyId: 'biz-001',
    name: 'Fanta Orange 1L x6',
    brand: 'Fanta',
    brandLogo: 'https://picsum.photos/seed/fanta/40/40',
    productPicture: 'https://picsum.photos/seed/prd-002/80/80',
    price: 19.50,
    category: 'Beverages',
    status: 'Available',
    variants: ['Orange', 'Grape', 'Pineapple'],
    unit: '6 pack',
    stockQuantity: 800,
    is_listed: true,
    isCreatedByUser: true,
    isDisplayable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'prd-003',
    companyId: 'biz-001',
    name: 'Sprite 2L x4',
    brand: 'Sprite',
    brandLogo: 'https://picsum.photos/seed/sprite/40/40',
    productPicture: 'https://picsum.photos/seed/prd-003/80/80',
    price: 16.75,
    category: 'Beverages',
    status: 'Out of Stock',
    variants: ['Regular', 'Zero'],
    unit: '4 pack',
    stockQuantity: 0,
    is_listed: true,
    isImported: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'prd-004',
    companyId: 'biz-001',
    name: 'Rice Premium 5kg',
    brand: 'Island Grains',
    brandLogo: 'https://picsum.photos/seed/islandgrains/40/40',
    productPicture: 'https://picsum.photos/seed/prd-004/80/80',
    price: 45.00,
    category: 'Groceries',
    status: 'Available',
    variants: ['White', 'Basmati', 'Brown'],
    unit: '5 kg bag',
    stockQuantity: 2500,
    is_listed: true,
    isCreatedByUser: true,
    isDisplayable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'prd-005',
    companyId: 'biz-001',
    name: 'Cooking Oil 1L',
    brand: 'Golden Sun',
    brandLogo: 'https://picsum.photos/seed/goldensun/40/40',
    productPicture: 'https://picsum.photos/seed/prd-005/80/80',
    price: 12.99,
    category: 'Groceries',
    status: 'In Production',
    unit: '1 L bottle',
    stockQuantity: 0,
    is_listed: false,
    isCreatedByUser: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'prd-006',
    companyId: 'biz-001',
    name: 'Flour All-Purpose 2kg',
    brand: 'Island Grains',
    brandLogo: 'https://picsum.photos/seed/islandgrains/40/40',
    productPicture: 'https://picsum.photos/seed/prd-006/80/80',
    price: 8.50,
    category: 'Groceries',
    status: 'Available',
    unit: '2 kg bag',
    stockQuantity: 3200,
    is_listed: true,
    isImported: true,
    isDisplayable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'prd-007',
    companyId: 'biz-001',
    name: 'Fresh Milk 1L',
    brand: 'DairyBest',
    brandLogo: 'https://picsum.photos/seed/dairybest/40/40',
    productPicture: 'https://picsum.photos/seed/prd-007/80/80',
    price: 4.99,
    category: 'Dairy',
    status: 'Available',
    variants: ['Full Cream', 'Low Fat', 'Skim'],
    unit: '1 L carton',
    stockQuantity: 450,
    is_listed: true,
    isImported: true,
    isDisplayable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'prd-008',
    companyId: 'biz-001',
    name: 'Cheese Cheddar 250g',
    brand: 'DairyBest',
    brandLogo: 'https://picsum.photos/seed/dairybest/40/40',
    productPicture: 'https://picsum.photos/seed/prd-008/80/80',
    price: 9.99,
    category: 'Dairy',
    status: 'Inactive',
    unit: '250 g block',
    stockQuantity: 50,
    is_listed: false,
    isCreatedByUser: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - LOCATION PRODUCT OVERRIDES
// ============================================================================

let locationProducts = [
  {
    id: 'lp-001',
    businessId: 'biz-001',
    locationId: 'loc-001',
    productId: 'prd-001',
    priceOverride: 27.99,
    taxOverride: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'lp-002',
    businessId: 'biz-001',
    locationId: 'loc-003',
    productId: 'prd-001',
    priceOverride: 24.99,
    taxOverride: 0.10,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - STOCKS
// ============================================================================

let stocks = [
  { id: 'stk-001', businessId: 'biz-001', locationId: 'loc-001', productId: 'prd-001', qtyOnHand: 500 },
  { id: 'stk-002', businessId: 'biz-001', locationId: 'loc-001', productId: 'prd-002', qtyOnHand: 300 },
  { id: 'stk-003', businessId: 'biz-001', locationId: 'loc-001', productId: 'prd-004', qtyOnHand: 1000 },
  { id: 'stk-004', businessId: 'biz-001', locationId: 'loc-002', productId: 'prd-001', qtyOnHand: 400 },
  { id: 'stk-005', businessId: 'biz-001', locationId: 'loc-002', productId: 'prd-002', qtyOnHand: 200 },
  { id: 'stk-006', businessId: 'biz-001', locationId: 'loc-003', productId: 'prd-001', qtyOnHand: 600 },
  { id: 'stk-007', businessId: 'biz-001', locationId: 'loc-003', productId: 'prd-004', qtyOnHand: 1500 }
];

// ============================================================================
// MOCK DATABASE - ORDERS
// ============================================================================

let orders = [
  {
    id: 'ord-001',
    businessId: 'biz-001',
    soldByScope: ORDER_SCOPE.PARENT,
    soldByLocationId: null,
    fulfillmentLocationId: 'loc-001',
    customerId: 'client-001',
    customerName: 'Grocery Mart Ltd',
    customerAddress: '123 Main Street, Port Louis',
    customerPhone: '+230 5123 4567',
    items: [
      { productId: 'prd-001', name: 'Coca-Cola 0.5L x10', quantity: 3, unitPrice: 25.99, subtotal: 77.97 },
      { productId: 'prd-002', name: 'Fanta Orange 1L x6', quantity: 2, unitPrice: 19.50, subtotal: 39.00 }
    ],
    totalAmount: 116.97,
    status: ORDER_STATUS.ACCEPTED,
    paymentStatus: 'UNPAID',
    notes: 'Please call before delivery',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ord-002',
    businessId: 'biz-001',
    soldByScope: ORDER_SCOPE.LOCATION,
    soldByLocationId: 'loc-001',
    fulfillmentLocationId: 'loc-001',
    customerId: 'client-002',
    customerName: 'Super Store Express',
    customerAddress: '456 Commerce Ave, Curepipe',
    customerPhone: '+230 5234 5678',
    items: [
      { productId: 'prd-004', name: 'Rice Premium 5kg', quantity: 10, unitPrice: 45.00, subtotal: 450.00 }
    ],
    totalAmount: 450.00,
    status: ORDER_STATUS.ONGOING,
    paymentStatus: 'PAID',
    notes: '',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'ord-003',
    businessId: 'biz-001',
    soldByScope: ORDER_SCOPE.PARENT,
    soldByLocationId: null,
    fulfillmentLocationId: null,
    customerId: 'client-003',
    customerName: 'Mini Mart Plus',
    customerAddress: '789 Industrial Rd, Vacoas',
    customerPhone: '+230 5345 6789',
    items: [
      { productId: 'prd-001', name: 'Coca-Cola 0.5L x10', quantity: 5, unitPrice: 25.99, subtotal: 129.95 },
      { productId: 'prd-006', name: 'Flour All-Purpose 2kg', quantity: 20, unitPrice: 8.50, subtotal: 170.00 }
    ],
    totalAmount: 299.95,
    status: ORDER_STATUS.NEW,
    paymentStatus: 'UNPAID',
    notes: 'Urgent order',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ord-004',
    businessId: 'biz-001',
    soldByScope: ORDER_SCOPE.LOCATION,
    soldByLocationId: 'loc-003',
    fulfillmentLocationId: 'loc-003',
    customerId: 'client-004',
    customerName: 'Fresh Mart Central',
    customerAddress: '321 Market Street, Quatre Bornes',
    customerPhone: '+230 5567 8901',
    items: [
      { productId: 'prd-007', name: 'Fresh Milk 1L', quantity: 50, unitPrice: 4.99, subtotal: 249.50 }
    ],
    totalAmount: 249.50,
    status: ORDER_STATUS.DONE,
    paymentStatus: 'PAID',
    notes: '',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
  }
];

// ============================================================================
// MOCK DATABASE - BUSINESS MEMBERS
// ============================================================================

let businessMembers = [
  {
    id: 'bm-001',
    businessId: 'biz-001',
    userId: 'usr-001',
    role: MEMBER_ROLES.SUPER_ADMIN,
    status: MEMBER_STATUS.ACCEPTED,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'bm-002',
    businessId: 'biz-001',
    userId: 'usr-002',
    role: MEMBER_ROLES.ADMIN,
    status: MEMBER_STATUS.ACCEPTED,
    createdAt: '2024-03-01T00:00:00Z'
  },
  {
    id: 'bm-003',
    businessId: 'biz-002',
    userId: 'usr-003',
    role: MEMBER_ROLES.SUPER_ADMIN,
    status: MEMBER_STATUS.ACCEPTED,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - LOCATION MEMBERS
// ============================================================================

let locationMembers = [
  {
    id: 'lm-001',
    locationId: 'loc-001',
    businessId: 'biz-001',
    userId: 'usr-001',
    role: MEMBER_ROLES.SUPER_ADMIN,
    status: MEMBER_STATUS.ACCEPTED,
    permissions: ['orders', 'stock', 'deliveries', 'invoices'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'lm-002',
    locationId: 'loc-001',
    businessId: 'biz-001',
    userId: 'usr-004',
    role: MEMBER_ROLES.STAFF,
    status: MEMBER_STATUS.ACCEPTED,
    permissions: ['deliveries'],
    createdAt: '2024-06-01T00:00:00Z'
  },
  {
    id: 'lm-003',
    locationId: 'loc-002',
    businessId: 'biz-001',
    userId: 'usr-001',
    role: MEMBER_ROLES.ADMIN,
    status: MEMBER_STATUS.ACCEPTED,
    permissions: ['orders', 'stock', 'deliveries'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'lm-004',
    locationId: 'loc-003',
    businessId: 'biz-001',
    userId: 'usr-001',
    role: MEMBER_ROLES.SUPER_ADMIN,
    status: MEMBER_STATUS.ACCEPTED,
    permissions: ['orders', 'stock', 'deliveries', 'invoices'],
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - DELIVERIES
// ============================================================================

let deliveries = [
  {
    id: 'del-001',
    companyId: 'biz-001',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-001',
    clientId: 'client-001',
    clientCompanyLogo: 'https://picsum.photos/seed/grocerymart/100/100',
    clientCompanyName: 'Grocery Mart Ltd',
    clientAddress: '123 Main Street, Port Louis',
    clientEmail: 'orders@grocerymart.mu',
    clientPhone: '+230 5123 4567',
    clientNotes: 'Please call before delivery',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    itemCount: 5,
    items: [
      { id: 'itm-001', productId: 'prd-001', name: 'Coca-Cola 0.5L x10', image: 'https://picsum.photos/seed/product1/100/100', price: 25.99, quantityOrdered: 3, isLoaded: false, status: 'In Stock' },
      { id: 'itm-002', productId: 'prd-002', name: 'Fanta Orange 1L x6', image: 'https://picsum.photos/seed/product2/100/100', price: 19.50, quantityOrdered: 2, isLoaded: false, status: 'Available' }
    ],
    totalAmount: 116.97,
    trackingNumber: 'TRK-001-2025',
    deliveryStatus: 'NOT_ASSIGNED',
    paymentStatus: 'UNPAID',
    assignedStaffId: null,
    assignedTo: null,
    transportMode: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'del-002',
    companyId: 'biz-001',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-001',
    clientId: 'client-002',
    clientCompanyLogo: 'https://picsum.photos/seed/superstore/100/100',
    clientCompanyName: 'Super Store Express',
    clientAddress: '456 Commerce Ave, Curepipe',
    clientEmail: 'purchasing@superstore.mu',
    clientPhone: '+230 5234 5678',
    clientNotes: 'Delivery dock at back entrance',
    distributorNotes: 'High priority customer',
    orderTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    itemCount: 8,
    items: [
      { id: 'itm-003', productId: 'prd-003', name: 'Sprite 2L x4', image: 'https://picsum.photos/seed/product3/100/100', price: 16.75, quantityOrdered: 4, isLoaded: true, status: 'Available' },
      { id: 'itm-004', productId: 'prd-004', name: 'Juice Box x12', image: 'https://picsum.photos/seed/product4/100/100', price: 35.00, quantityOrdered: 4, isLoaded: true, status: 'In Stock' }
    ],
    totalAmount: 207.00,
    trackingNumber: 'TRK-002-2025',
    deliveryStatus: 'OUT_FOR_DELIVERY',
    paymentStatus: 'PAID',
    assignedStaffId: 'stf-001',
    assignedTo: 'John Doe',
    transportMode: 'Truck',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'del-003',
    companyId: 'biz-001',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-002',
    clientId: 'client-003',
    clientCompanyLogo: 'https://picsum.photos/seed/minimart/100/100',
    clientCompanyName: 'Mini Mart Plus',
    clientAddress: '789 Industrial Rd, Vacoas',
    clientEmail: 'orders@minimart.mu',
    clientPhone: '+230 5345 6789',
    clientNotes: '',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    itemCount: 3,
    totalAmount: 89.50,
    trackingNumber: 'TRK-003-2025',
    deliveryStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    assignedStaffId: 'stf-002',
    assignedTo: 'Jane Smith',
    transportMode: 'Van',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'del-004',
    companyId: 'biz-001',
    type: 'delivery',
    direction: 'incoming',
    locationId: 'loc-001',
    clientId: 'supplier-001',
    clientCompanyLogo: 'https://picsum.photos/seed/supplier/100/100',
    clientCompanyName: 'Phoenix Beverages Ltd',
    clientAddress: 'Industrial Zone, Phoenix',
    clientEmail: 'orders@phoenix.mu',
    clientPhone: '+230 5456 7890',
    clientNotes: 'Receiving at warehouse dock A',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    itemCount: 50,
    totalAmount: 2500.00,
    trackingNumber: 'TRK-004-2025',
    deliveryStatus: 'ASSIGNED',
    paymentStatus: 'UNPAID',
    assignedStaffId: null,
    assignedTo: null,
    transportMode: null,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'del-005',
    companyId: 'biz-001',
    type: 'transfer',
    direction: 'outgoing',
    locationId: 'loc-001',
    fromLocation: 'Warehouse A - Port Louis',
    toLocation: 'Warehouse B - Curepipe',
    clientCompanyName: 'Internal Transfer',
    clientAddress: 'Warehouse B, Industrial Zone, Curepipe',
    clientNotes: 'Stock replenishment',
    distributorNotes: '',
    orderTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    itemCount: 20,
    totalAmount: 0,
    deliveryStatus: 'ASSIGNED',
    paymentStatus: 'PAID',
    assignedStaffId: 'stf-003',
    assignedTo: 'Bob Johnson',
    transportMode: 'Truck',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'del-006',
    companyId: 'biz-001',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'loc-002',
    clientId: 'client-004',
    clientCompanyLogo: 'https://picsum.photos/seed/freshmart/100/100',
    clientCompanyName: 'Fresh Mart Central',
    clientAddress: '321 Market Street, Quatre Bornes',
    clientEmail: 'supply@freshmart.mu',
    clientPhone: '+230 5567 8901',
    clientNotes: 'Urgent - Low stock alert',
    distributorNotes: 'Express delivery requested',
    orderTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    itemCount: 12,
    totalAmount: 345.75,
    trackingNumber: 'TRK-006-2025',
    deliveryStatus: 'NOT_ASSIGNED',
    paymentStatus: 'Pending Confirmation',
    assignedStaffId: null,
    assignedTo: null,
    transportMode: null,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

// ============================================================================
// MOCK DATABASE - INVOICES
// ============================================================================

let invoices = [
  {
    id: 'inv-001',
    businessId: 'biz-001',
    issuedByScope: INVOICE_SCOPE.PARENT,
    issuedByLocationId: null,
    orderId: 'ord-001',
    invoiceNumber: 'INV-2025-001',
    clientName: 'Grocery Mart Ltd',
    clientEmail: 'orders@grocerymart.mu',
    amount: 116.97,
    taxAmount: 17.55,
    totalAmount: 134.52,
    status: 'SENT',
    type: 'invoice',
    issueDate: '2025-01-15',
    dueDate: '2025-02-14',
    items: [
      { productId: 'prd-001', description: 'Coca-Cola 0.5L x10', quantity: 3, unitPrice: 25.99, totalPrice: 77.97 },
      { productId: 'prd-002', description: 'Fanta Orange 1L x6', quantity: 2, unitPrice: 19.50, totalPrice: 39.00 }
    ],
    notes: 'Payment terms: Net 30',
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-01-15T09:00:00Z'
  },
  {
    id: 'inv-002',
    businessId: 'biz-001',
    issuedByScope: INVOICE_SCOPE.LOCATION,
    issuedByLocationId: 'loc-001',
    orderId: 'ord-002',
    invoiceNumber: 'WHA-2025-001',
    clientName: 'Super Store Express',
    clientEmail: 'purchasing@superstore.mu',
    amount: 450.00,
    taxAmount: 67.50,
    totalAmount: 517.50,
    status: 'PAID',
    type: 'invoice',
    issueDate: '2025-01-14',
    dueDate: '2025-02-13',
    items: [
      { productId: 'prd-004', description: 'Rice Premium 5kg', quantity: 10, unitPrice: 45.00, totalPrice: 450.00 }
    ],
    notes: '',
    createdAt: '2025-01-14T10:00:00Z',
    updatedAt: '2025-01-14T14:00:00Z'
  },
  {
    id: 'inv-003',
    businessId: 'biz-001',
    issuedByScope: INVOICE_SCOPE.LOCATION,
    issuedByLocationId: 'loc-003',
    orderId: 'ord-004',
    invoiceNumber: 'DIS-2025-001',
    clientName: 'Fresh Mart Central',
    clientEmail: 'supply@freshmart.mu',
    amount: 249.50,
    taxAmount: 37.43,
    totalAmount: 286.93,
    status: 'PAID',
    type: 'invoice',
    issueDate: '2025-01-06',
    dueDate: '2025-02-05',
    items: [
      { productId: 'prd-007', description: 'Fresh Milk 1L', quantity: 50, unitPrice: 4.99, totalPrice: 249.50 }
    ],
    notes: '',
    createdAt: '2025-01-06T08:00:00Z',
    updatedAt: '2025-01-07T10:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - CHATS
// ============================================================================

let chats = [
  {
    id: 'chat-001',
    companyId: 'biz-001',
    locationId: null,
    type: 'client',
    name: '📋 Message Types Showcase',
    participants: ['usr-001', 'demo-001'],
    lastMessage: {
      id: 'msg-showcase',
      content: 'View all chat bubble types here',
      type: 'text',
      senderId: 'demo-001',
      senderName: 'Demo Contact',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered'
    },
    unreadCount: 10,
    avatar: 'https://picsum.photos/seed/showcase/40/40',
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-002',
    companyId: 'biz-001',
    locationId: null,
    type: 'client',
    name: 'Sarah Johnson',
    participants: ['usr-001', 'sarah-001'],
    lastMessage: {
      id: 'msg-sarah',
      content: 'Photo',
      type: 'photo',
      senderId: 'sarah-001',
      senderName: 'Sarah Johnson',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered'
    },
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/sarah/40/40',
    createdAt: '2025-01-14T10:00:00Z',
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-003',
    companyId: 'biz-001',
    locationId: null,
    type: 'supplier',
    name: 'XYZ Suppliers',
    participants: ['usr-001', 'xyz-001'],
    lastMessage: {
      id: 'msg-xyz',
      content: 'New_Products_Catalog.pdf',
      type: 'pdf',
      senderId: 'xyz-001',
      senderName: 'XYZ Suppliers',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'seen'
    },
    unreadCount: 1,
    avatar: 'https://picsum.photos/seed/xyz/40/40',
    createdAt: '2025-01-13T14:00:00Z',
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-004',
    companyId: 'biz-001',
    locationId: null,
    type: 'client',
    name: 'Mike Chen',
    participants: ['usr-001', 'mike-001'],
    lastMessage: {
      id: 'msg-mike',
      content: 'Video call ended (15 min)',
      type: 'video_call',
      senderId: 'usr-001',
      senderName: 'You',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      isOutgoing: true,
      status: 'delivered'
    },
    unreadCount: 0,
    avatar: 'https://picsum.photos/seed/mike/40/40',
    createdAt: '2025-01-12T09:00:00Z',
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'chat-005',
    companyId: 'biz-001',
    locationId: 'loc-001',
    type: 'internal',
    name: 'Warehouse A Team',
    participants: ['usr-001', 'usr-002', 'sarah-001', 'mike-001'],
    lastMessage: {
      id: 'msg-005-latest',
      content: 'Great job on the quarterly targets!',
      type: 'text',
      senderId: 'usr-002',
      senderName: 'Marie Manager',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      isRead: false,
      isOutgoing: false,
      status: 'delivered'
    },
    unreadCount: 5,
    avatar: null,
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  }
];

// ============================================================================
// MOCK DATABASE - MESSAGES
// ============================================================================

let messages = {
  'chat-001': [
    {
      id: 'msg-001-001',
      chatId: 'chat-001',
      type: 'event',
      event: 'Conversation started',
      isOutgoing: false,
      sender: { id: 'system', name: 'System', avatar: '', role: 'system' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-001-002',
      chatId: 'chat-001',
      type: 'text',
      text: '📝 TEXT MESSAGE (Incoming)\nThis is a regular text message received from another user.',
      isOutgoing: false,
      sender: { id: 'demo-001', name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-001-003',
      chatId: 'chat-001',
      type: 'text',
      text: '📝 TEXT MESSAGE (Outgoing)\nThis is a text message you sent.',
      isOutgoing: true,
      sender: { id: 'usr-001', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
      status: 'read'
    }
  ],
  'chat-002': [
    {
      id: 'msg-002-001',
      chatId: 'chat-002',
      type: 'text',
      text: 'Hi! I wanted to share some photos of the product issue.',
      isOutgoing: false,
      sender: { id: 'sarah-001', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    }
  ],
  'chat-003': [
    {
      id: 'msg-003-001',
      chatId: 'chat-003',
      type: 'text',
      text: 'Hi! We have new products available for order.',
      isOutgoing: false,
      sender: { id: 'xyz-001', name: 'XYZ Suppliers', avatar: 'https://picsum.photos/seed/xyz/40/40', role: 'supplier' },
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  ],
  'chat-005': [
    {
      id: 'msg-005-001',
      chatId: 'chat-005',
      type: 'event',
      event: 'Marie Manager created this group',
      isOutgoing: false,
      sender: { id: 'system', name: 'System', avatar: '', role: 'system' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-002',
      chatId: 'chat-005',
      type: 'text',
      text: 'Hey team! Let\'s use this group to coordinate our sales efforts.',
      isOutgoing: false,
      sender: { id: 'usr-002', name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
      timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-003',
      chatId: 'chat-005',
      type: 'text',
      text: 'Sounds good!',
      isOutgoing: false,
      sender: { id: 'sarah-001', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
      timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-004',
      chatId: 'chat-005',
      type: 'text',
      text: 'I\'m in!',
      isOutgoing: false,
      sender: { id: 'mike-001', name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'staff' },
      timestamp: new Date(Date.now() - 108 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-005',
      chatId: 'chat-005',
      type: 'text',
      text: 'Let\'s start with reviewing last month\'s performance.',
      isOutgoing: true,
      sender: { id: 'usr-001', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg-005-006',
      chatId: 'chat-005',
      type: 'text',
      text: 'I\'ve prepared a summary of our Q4 results.',
      isOutgoing: false,
      sender: { id: 'usr-002', name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
      timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-007',
      chatId: 'chat-005',
      type: 'text',
      text: 'We exceeded targets by 15%!',
      isOutgoing: false,
      sender: { id: 'usr-002', name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
      timestamp: new Date(Date.now() - 94 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-008',
      chatId: 'chat-005',
      type: 'text',
      text: 'That\'s amazing! 🎉',
      isOutgoing: false,
      sender: { id: 'sarah-001', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-009',
      chatId: 'chat-005',
      type: 'text',
      text: 'Congrats everyone!',
      isOutgoing: false,
      sender: { id: 'mike-001', name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'staff' },
      timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-010',
      chatId: 'chat-005',
      type: 'text',
      text: 'Great work team!',
      isOutgoing: true,
      sender: { id: 'usr-001', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg-005-011',
      chatId: 'chat-005',
      type: 'text',
      text: 'Let\'s aim for 20% next quarter.',
      isOutgoing: true,
      sender: { id: 'usr-001', name: 'You', avatar: '', role: 'business' },
      timestamp: new Date(Date.now() - 79 * 60 * 1000).toISOString(),
      status: 'read'
    },
    {
      id: 'msg-005-012',
      chatId: 'chat-005',
      type: 'text',
      text: 'Challenge accepted!',
      isOutgoing: false,
      sender: { id: 'mike-001', name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'staff' },
      timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-013',
      chatId: 'chat-005',
      type: 'text',
      text: 'I have some ideas for new strategies.',
      isOutgoing: false,
      sender: { id: 'sarah-001', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
      timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-014',
      chatId: 'chat-005',
      type: 'text',
      text: 'Let\'s discuss them in our meeting tomorrow.',
      isOutgoing: false,
      sender: { id: 'sarah-001', name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
      timestamp: new Date(Date.now() - 69 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-005-015',
      chatId: 'chat-005',
      type: 'text',
      text: 'Great job on the quarterly targets!',
      isOutgoing: false,
      sender: { id: 'usr-002', name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    }
  ]
};

// ============================================================================
// MOCK DATABASE - USERS
// ============================================================================

let users = [
  {
    id: 'usr-001',
    email: 'admin@noupro.com',
    name: 'Arnaud Labonne',
    avatar: 'https://picsum.photos/seed/admin/100/100',
    phone: '+230-5123-4567',
    description: 'Founder & CEO of NouPro Distribution. Passionate about streamlining supply chain operations and building innovative distribution solutions.',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2025-01-15T08:00:00Z'
  },
  {
    id: 'usr-002',
    email: 'manager@noupro.com',
    name: 'Marie Manager',
    avatar: 'https://picsum.photos/seed/marie/100/100',
    phone: '+230-5234-5678',
    createdAt: '2024-03-01T00:00:00Z',
    lastLoginAt: '2025-01-14T09:00:00Z'
  },
  {
    id: 'usr-003',
    email: 'owner@globalsupply.mu',
    name: 'Global Owner',
    avatar: 'https://picsum.photos/seed/global/100/100',
    phone: '+230-5345-6789',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2025-01-15T07:00:00Z'
  },
  {
    id: 'usr-004',
    email: 'driver@noupro.com',
    name: 'John Driver',
    avatar: 'https://picsum.photos/seed/driver/100/100',
    phone: '+230-5456-7890',
    createdAt: '2024-06-01T00:00:00Z',
    lastLoginAt: '2025-01-15T06:00:00Z'
  }
];

// ============================================================================
// MOCK DATABASE - FEED POSTS
// ============================================================================

let feedPosts = [
  {
    id: 'post-001',
    type: 'brand_presentation',
    timestamp: '2h ago',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    data: {
      brandId: 'brand-001',
      brandName: 'Tropicana',
      brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Tropicana_Logo.svg/512px-Tropicana_Logo.svg.png',
      distributorName: 'NouPro Distribution',
      distributorId: 'biz-001',
      products: [
        { id: 'prd-feed-001', name: 'Premium Orange Juice', unit: '1L', price: 125.00, image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', isNew: true },
        { id: 'prd-feed-002', name: 'Tropical Mango Smoothie', unit: '500ml', price: 145.00, image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', isNew: false }
      ]
    }
  },
  {
    id: 'post-002',
    type: 'company_presentation',
    timestamp: '4h ago',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    data: {
      companyId: 'biz-002',
      companyName: 'Phoenix Beverages',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/512px-Phoenix_Beverages_Limited_logo.svg.png',
      location: 'Port Louis, Mauritius',
      isConnected: false,
      brands: [
        { id: 'brand-101', name: 'Phoenix Beer', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Phoenix_Beverages_Limited_logo.svg/200px-Phoenix_Beverages_Limited_logo.svg.png', productsCount: 24 }
      ]
    }
  }
];

// ============================================================================
// MOCK DATABASE - NOTIFICATION READS
// ============================================================================
// Tracks which notifications have been read by each user
// Key format: `${userId}_${notificationKey}` -> { readAt: Date }

let notificationReads = {};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  SUBSCRIPTION_TIERS,
  LOCATION_MODES,
  ORDER_STATUS,
  ORDER_SCOPE,
  INVOICE_SCOPE,
  MEMBER_ROLES,
  MEMBER_STATUS,
  
  // Data arrays (mutable)
  companies,
  locations,
  products,
  locationProducts,
  stocks,
  orders,
  businessMembers,
  locationMembers,
  deliveries,
  invoices,
  chats,
  messages,
  users,
  feedPosts,
  notificationReads
};

