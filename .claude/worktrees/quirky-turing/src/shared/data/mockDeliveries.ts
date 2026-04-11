/**
 * Mock Deliveries Data
 * 
 * Uses types from @/shared/types/delivery for consistency with Prisma schema.
 * Status values match the DeliveryStatus enum:
 * - NOT_ASSIGNED: Just received, not yet processed
 * - ASSIGNED: Staff assigned, awaiting pickup/dispatch  
 * - PACKED: Items packed and ready
 * - OUT_FOR_DELIVERY: In transit
 * - DELIVERED: Completed successfully
 * - FAILED: Delivery attempt failed
 * - CANCELED: Canceled by either party
 */
import type { 
  Delivery, 
  DeliveryItem, 
  Staff, 
  TransportMode,
  DeliveryStatus,
  PaymentStatus,
  ItemStatus 
} from '@/shared/types/delivery';

// Re-export types for backward compatibility
export type { DeliveryStatus, PaymentStatus, ItemStatus, DeliveryItem, Delivery, Staff, TransportMode };

export const mockStaff: Staff[] = [
  { id: 'S001', name: 'John Doe', role: 'Delivery Driver', avatar: 'https://picsum.photos/seed/staff1/100/100' },
  { id: 'S002', name: 'Jane Smith', role: 'Warehouse Manager', avatar: 'https://picsum.photos/seed/staff2/100/100' },
  { id: 'S003', name: 'Bob Johnson', role: 'Delivery Driver', avatar: 'https://picsum.photos/seed/staff3/100/100' },
  { id: 'S004', name: 'Alice Brown', role: 'Team Leader', avatar: 'https://picsum.photos/seed/staff4/100/100' },
  { id: 'S005', name: 'Mike Wilson', role: 'Delivery Assistant', avatar: 'https://picsum.photos/seed/staff5/100/100' },
  { id: 'S006', name: 'Sarah Davis', role: 'Logistics Coordinator', avatar: 'https://picsum.photos/seed/staff6/100/100' },
  { id: 'S007', name: 'David Lee', role: 'Delivery Driver', avatar: 'https://picsum.photos/seed/staff7/100/100' },
  { id: 'S008', name: 'Emma Garcia', role: 'Team Leader', avatar: 'https://picsum.photos/seed/staff8/100/100' },
  { id: 'S009', name: 'Chris Taylor', role: 'Delivery Assistant', avatar: 'https://picsum.photos/seed/staff9/100/100' },
  { id: 'S010', name: 'Lisa Martinez', role: 'Warehouse Manager', avatar: 'https://picsum.photos/seed/staff10/100/100' },
  { id: 'S011', name: 'Ryan Anderson', role: 'Delivery Driver', avatar: 'https://picsum.photos/seed/staff11/100/100' },
  { id: 'S012', name: 'Nicole White', role: 'Logistics Coordinator', avatar: 'https://picsum.photos/seed/staff12/100/100' },
];

const mockItemsData: DeliveryItem[] = [
  {
    id: 'I001',
    productId: 'P001',
    name: 'Coca-Cola 0.5L x10',
    image: 'https://picsum.photos/seed/product1/100/100',
    price: 25.99,
    quantityOrdered: 3,
    isLoaded: false,
    status: 'In Stock',
    warehouseStock: { 'Warehouse A': 12, 'Warehouse B': 5 }
  },
  {
    id: 'I002',
    productId: 'P002',
    name: 'Fanta Orange 1L x6',
    image: 'https://picsum.photos/seed/product2/100/100',
    price: 19.50,
    quantityOrdered: 2,
    isLoaded: false,
    status: 'Available',
    warehouseStock: { 'Warehouse A': 8, 'Warehouse B': 0 }
  },
  {
    id: 'I003',
    productId: 'P003',
    name: 'Sprite 2L x4',
    image: 'https://picsum.photos/seed/product3/100/100',
    price: 16.75,
    quantityOrdered: 1,
    isLoaded: false,
    status: 'Out of Stock',
    warehouseStock: { 'Warehouse A': 0, 'Warehouse B': 0 }
  },
  {
    id: 'I004',
    productId: 'P004',
    name: 'Pepsi Max 1.5L x6',
    image: 'https://picsum.photos/seed/product4/100/100',
    price: 21.25,
    quantityOrdered: 2,
    isLoaded: false,
    status: 'In Stock',
    warehouseStock: { 'Warehouse A': 15, 'Warehouse B': 7 }
  },
  {
    id: 'I005',
    productId: 'P005',
    name: 'Mountain Dew 0.5L x12',
    image: 'https://picsum.photos/seed/product5/100/100',
    price: 18.99,
    quantityOrdered: 1,
    isLoaded: false,
    status: 'In Production',
    warehouseStock: { 'Warehouse A': 2, 'Warehouse B': 1 }
  },
  {
    id: 'I006',
    productId: 'P006',
    name: 'Red Bull 250ml x24',
    image: 'https://picsum.photos/seed/product6/100/100',
    price: 89.99,
    quantityOrdered: 1500,
    isLoaded: false,
    status: 'In Stock',
    warehouseStock: { 'Warehouse A': 2000, 'Warehouse B': 800 }
  },
  {
    id: 'I007',
    productId: 'P007',
    name: 'Evian Water 500ml x48',
    image: 'https://picsum.photos/seed/product7/100/100',
    price: 45.00,
    quantityOrdered: 125000,
    isLoaded: false,
    status: 'In Stock',
    warehouseStock: { 'Warehouse A': 100000, 'Warehouse B': 50000 }
  },
];

const mockDeliveries: Delivery[] = [
  // Outgoing deliveries (sending to other businesses)
  {
    id: 'ORD-2025-0001',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'LOC-001', // Main Warehouse
    clientId: 'B001',
    clientCompanyLogo: 'https://picsum.photos/seed/ORD-001/40/40',
    clientCompanyName: 'Client Alpha Inc.',
    clientAddress: '123 Main St, Anytown, USA',
    clientEmail: 'orders@alphainc.com',
    clientPhone: '+1-555-123-4567',
    clientNotes: 'Please deliver before noon. No substitutions please.',
    distributorNotes: 'Repeat customer, VIP treatment.',
    orderTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 5,
    items: [
      mockItemsData[0],
      mockItemsData[1],
      mockItemsData[2],
    ],
    totalAmount: 1250.75,
    trackingNumber: 'TRK12345XYZ',
    deliveryStatus: 'NOT_ASSIGNED',
    paymentStatus: 'UNPAID',
  },
  {
    id: 'ORD-2025-0002',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'LOC-002', // Downtown Branch
    clientId: 'B002',
    clientCompanyLogo: 'https://picsum.photos/seed/ORD-002/40/40',
    clientCompanyName: 'Client Beta Solutions',
    clientAddress: '456 Oak Ave, Otherville, USA',
    clientEmail: 'procurement@betasolutions.co',
    clientPhone: '+1-555-987-6543',
    clientNotes: 'Our loading dock is on the east side of the building.',
    orderTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 2,
    items: [
      mockItemsData[3],
      mockItemsData[4],
    ],
    totalAmount: 345.00,
    trackingNumber: 'TRK67890ABC',
    deliveryStatus: 'OUT_FOR_DELIVERY',
    paymentStatus: 'PAID',
    assignedStaffId: 'S001',
    transportMode: 'T002',
  },
  {
    id: 'ORD-2025-0003',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'LOC-001', // Main Warehouse
    clientId: 'B003',
    clientCompanyLogo: 'https://picsum.photos/seed/ORD-003/40/40',
    clientCompanyName: 'Client Gamma Corp.',
    clientAddress: '789 Pine Ln, Somewhere, USA',
    clientEmail: 'supply@gammacorp.org',
    clientPhone: '+1-555-246-8135',
    orderTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 12,
    items: [
      mockItemsData[0],
      mockItemsData[1],
      mockItemsData[2],
      mockItemsData[3],
      mockItemsData[4],
    ],
    totalAmount: 2800.50,
    trackingNumber: 'TRK24680DEF',
    deliveryStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    assignedStaffId: 'S003',
    transportMode: 'T001',
  },
  {
    id: 'ORD-2025-0004',
    type: 'delivery',
    direction: 'outgoing',
    locationId: 'LOC-003', // East Side Facility
    clientId: 'B004',
    clientCompanyName: 'Client Delta LLC',
    clientAddress: '101 Maple Dr, Lastplace, USA',
    clientEmail: 'purchasing@deltallc.net',
    clientPhone: '+1-555-369-2580',
    clientNotes: 'Call upon arrival.',
    orderTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 1,
    items: [
      mockItemsData[2],
    ],
    trackingNumber: 'TRK13579GHI',
    deliveryStatus: 'CANCELED',
    paymentStatus: 'UNPAID',
  },
  // Incoming deliveries (receiving from suppliers)
  {
    id: 'ORD-2025-0005',
    type: 'delivery',
    direction: 'incoming',
    locationId: 'LOC-001', // Main Warehouse
    clientId: 'B005',
    clientCompanyLogo: 'https://picsum.photos/seed/ORD-005/40/40',
    clientCompanyName: 'Supplier Express Ltd.',
    clientAddress: '500 Industrial Blvd, Supplytown, USA',
    clientEmail: 'dispatch@supplierexpress.com',
    clientPhone: '+1-555-777-8888',
    clientNotes: 'Large shipment, requires forklift.',
    orderTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 20,
    items: [
      mockItemsData[0],
      mockItemsData[1],
      mockItemsData[3],
    ],
    totalAmount: 5200.00,
    trackingNumber: 'TRK-INC-001',
    deliveryStatus: 'ASSIGNED',
    paymentStatus: 'UNPAID',
  },
  {
    id: 'ORD-2025-0006',
    type: 'delivery',
    direction: 'incoming',
    locationId: 'LOC-002', // Downtown Branch
    clientId: 'B006',
    clientCompanyLogo: 'https://picsum.photos/seed/ORD-006/40/40',
    clientCompanyName: 'Global Beverages Co.',
    clientAddress: '200 Factory Rd, Manufacture City, USA',
    clientEmail: 'logistics@globalbev.com',
    clientPhone: '+1-555-999-1111',
    orderTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 50,
    items: [
      mockItemsData[0],
      mockItemsData[4],
    ],
    totalAmount: 8500.00,
    trackingNumber: 'TRK-INC-002',
    deliveryStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    assignedStaffId: 'S002',
    transportMode: 'T001',
  },
  // Transfer examples (internal moves between locations)
  {
    id: 'TRF-2025-0001',
    type: 'transfer',
    direction: 'outgoing',
    locationId: 'LOC-001', // Origin: Main Warehouse
    clientCompanyName: 'NouPro Distribution Inc.',
    clientAddress: 'Internal Transfer',
    fromLocation: 'Warehouse A',
    toLocation: 'Warehouse B',
    orderTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 8,
    items: [
      mockItemsData[0],
      mockItemsData[1],
    ],
    totalAmount: 150.00,
    trackingNumber: 'TRF98765XYZ',
    deliveryStatus: 'PACKED',
    paymentStatus: 'PAID',
    assignedStaffId: 'S002',
    transportMode: 'T002',
  },
  {
    id: 'TRF-2025-0002',
    type: 'transfer',
    direction: 'incoming',
    locationId: 'LOC-001', // Destination: Main Warehouse
    clientCompanyName: 'NouPro Distribution Inc.',
    clientAddress: 'Internal Transfer',
    fromLocation: 'Distribution Center',
    toLocation: 'Warehouse A',
    orderTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 15,
    items: [
      mockItemsData[2],
      mockItemsData[3],
      mockItemsData[4],
    ],
    totalAmount: 420.00,
    trackingNumber: 'TRF54321ABC',
    deliveryStatus: 'OUT_FOR_DELIVERY',
    paymentStatus: 'PAID',
    assignedStaffId: 'S004',
    transportMode: 'T001',
  },
];

export default mockDeliveries; 