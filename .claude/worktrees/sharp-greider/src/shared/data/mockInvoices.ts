export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'upi' | 'other';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage
  tax: number; // percentage
  total: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
  recordedBy: string;
}

export interface ActivityLog {
  id: string;
  type: 'created' | 'sent' | 'viewed' | 'payment_recorded' | 'reminder_sent' | 'status_changed';
  date: string;
  description: string;
  user: string;
}

export interface ClientContact {
  email: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface Invoice {
  id: string;
  number: string; // Formatted number like "INV-2024-001"
  locationId?: string; // Location this invoice belongs to (for filtering)
  clientName: string;
  clientContact: ClientContact;
  date: string; // Issue date
  dueDate: string;
  total: number;
  subtotal: number;
  taxTotal: number;
  discount?: number; // global discount percentage
  shipping?: number;
  balanceDue: number;
  status: InvoiceStatus;
  type: 'Invoice' | 'Estimate';
  items: InvoiceItem[];
  payments: Payment[];
  activityLog: ActivityLog[];
  notes?: string;
  terms?: string;
  poReference?: string;
  currency: string;
  paymentTerms: string;
  pdfUrl?: string;
  createdBy: string;
}

const mockInvoices: Invoice[] = [
  { 
    id: 'inv-001', 
    number: 'INV-2024-001',
    locationId: 'LOC-001', // Main Warehouse
    clientName: 'Acme Corporation', 
    clientContact: {
      email: 'billing@acmecorp.com',
      phone: '+91 98765 43210',
      address: {
        line1: '123 Business Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      }
    },
    date: '2024-07-28', 
    dueDate: '2024-08-27',
    subtotal: 135.00,
    taxTotal: 15.00,
    total: 150.00,
    balanceDue: 0,
    status: 'paid', 
    type: 'Invoice',
    currency: 'INR',
    paymentTerms: 'Net 30',
    poReference: 'PO-ACME-2024-078',
    items: [
      {
        id: 'item-001',
        description: 'Website Design Services',
        quantity: 1,
        unitPrice: 100.00,
        discount: 0,
        tax: 10,
        total: 110.00
      },
      {
        id: 'item-002',
        description: 'Hosting Setup',
        quantity: 1,
        unitPrice: 25.00,
        discount: 0,
        tax: 20,
        total: 30.00
      }
    ],
    payments: [
      {
        id: 'payment-001',
        amount: 150.00,
        date: '2024-08-02',
        method: 'bank_transfer',
        reference: 'ACME-TRX-54321',
        recordedBy: 'John Admin'
      }
    ],
    activityLog: [
      {
        id: 'log-001',
        type: 'created',
        date: '2024-07-28T10:30:00Z',
        description: 'Invoice created',
        user: 'John Admin'
      },
      {
        id: 'log-002',
        type: 'sent',
        date: '2024-07-28T10:35:00Z',
        description: 'Invoice sent to client',
        user: 'John Admin'
      },
      {
        id: 'log-003',
        type: 'viewed',
        date: '2024-07-29T14:22:00Z',
        description: 'Invoice viewed by client',
        user: 'Client'
      },
      {
        id: 'log-004',
        type: 'payment_recorded',
        date: '2024-08-02T11:45:00Z',
        description: 'Payment of ₹150.00 recorded',
        user: 'John Admin'
      },
      {
        id: 'log-005',
        type: 'status_changed',
        date: '2024-08-02T11:45:00Z',
        description: 'Status changed from sent to paid',
        user: 'John Admin'
      }
    ],
    notes: 'Thank you for your business!',
    terms: 'Payment due within 30 days. Late payments subject to 1.5% monthly interest.',
    pdfUrl: 'https://example.com/invoices/inv-001.pdf',
    createdBy: 'John Admin'
  },

  { 
    id: 'est-002', 
    number: 'EST-2024-002',
    clientName: 'TechStart Inc.', 
    clientContact: {
      email: 'finance@techstart.co',
      phone: '+91 87654 32109',
      address: {
        line1: '456 Startup Avenue',
        line2: 'Floor 3',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India'
      }
    },
    date: '2024-07-27', 
    dueDate: '2024-08-10', // Estimate expiry date
    subtotal: 75.00,
    taxTotal: 10.50,
    total: 85.50,
    balanceDue: 85.50,
    status: 'sent', 
    type: 'Estimate',
    currency: 'INR',
    paymentTerms: 'Due on acceptance',
    items: [
      {
        id: 'item-003',
        description: 'Mobile App Development - Initial Phase',
        quantity: 1,
        unitPrice: 75.00,
        discount: 0,
        tax: 14,
        total: 85.50
      }
    ],
    payments: [],
    activityLog: [
      {
        id: 'log-006',
        type: 'created',
        date: '2024-07-27T09:15:00Z',
        description: 'Estimate created',
        user: 'John Admin'
      },
      {
        id: 'log-007',
        type: 'sent',
        date: '2024-07-27T09:20:00Z',
        description: 'Estimate sent to client',
        user: 'John Admin'
      }
    ],
    notes: 'This estimate is valid for 15 days.',
    terms: 'This is an estimate only. Final invoice may vary based on actual work performed.',
    pdfUrl: 'https://example.com/estimates/est-002.pdf',
    createdBy: 'John Admin'
  },

  { 
    id: 'inv-003', 
    number: 'INV-2024-003',
    locationId: 'LOC-002', // Downtown Branch
    clientName: 'GlobalTrade Ltd.', 
    clientContact: {
      email: 'accounts@globaltrade.com',
      phone: '+91 76543 21098',
      address: {
        line1: '789 Industrial Zone',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India'
      }
    },
    date: '2024-07-26', 
    dueDate: '2024-08-10',
    subtotal: 182.00,
    taxTotal: 28.00,
    total: 210.00,
    balanceDue: 210.00, 
    status: 'overdue', 
    type: 'Invoice',
    currency: 'INR',
    paymentTerms: 'Net 15',
    poReference: 'PO-GT-789',
    items: [
      {
        id: 'item-004',
        description: 'SEO Services - Monthly Package',
        quantity: 1,
        unitPrice: 150.00,
        discount: 10, // 10% discount
        tax: 18,
        total: 159.30
      },
      {
        id: 'item-005',
        description: 'Content Writing - 5 Articles',
        quantity: 5,
        unitPrice: 10.00,
        discount: 0,
        tax: 18,
        total: 59.00
      }
    ],
    payments: [],
    activityLog: [
      {
        id: 'log-008',
        type: 'created',
        date: '2024-07-26T14:20:00Z',
        description: 'Invoice created',
        user: 'Jane Admin'
      },
      {
        id: 'log-009',
        type: 'sent',
        date: '2024-07-26T14:25:00Z',
        description: 'Invoice sent to client',
        user: 'Jane Admin'
      },
      {
        id: 'log-010',
        type: 'reminder_sent',
        date: '2024-08-11T10:00:00Z',
        description: 'Payment reminder sent',
        user: 'System'
      },
      {
        id: 'log-011',
        type: 'status_changed',
        date: '2024-08-11T00:00:00Z',
        description: 'Status changed from sent to overdue',
        user: 'System'
      }
    ],
    notes: 'Please make payment by the due date.',
    terms: 'Payment due within 15 days. Late payments subject to 2% monthly interest.',
    pdfUrl: 'https://example.com/invoices/inv-003.pdf',
    createdBy: 'Jane Admin'
  },

  { 
    id: 'inv-004', 
    number: 'INV-2024-004',
    locationId: 'LOC-001', // Main Warehouse
    clientName: 'Acme Corporation', 
    clientContact: {
      email: 'billing@acmecorp.com',
      phone: '+91 98765 43210',
      address: {
        line1: '123 Business Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      }
    },
    date: '2024-07-25', 
    dueDate: '2024-08-24',
    subtotal: 50.00,
    taxTotal: 5.00,
    total: 55.00,
    balanceDue: 55.00,
    status: 'draft', 
    type: 'Invoice',
    currency: 'INR',
    paymentTerms: 'Net 30',
    items: [
      {
        id: 'item-006',
        description: 'Website Maintenance - Monthly',
        quantity: 1,
        unitPrice: 50.00,
        discount: 0,
        tax: 10,
        total: 55.00
      }
    ],
    payments: [],
    activityLog: [
      {
        id: 'log-012',
        type: 'created',
        date: '2024-07-25T16:45:00Z',
        description: 'Invoice created as draft',
        user: 'John Admin'
      }
    ],
    notes: 'Monthly maintenance fee as per our service agreement.',
    terms: 'Payment due within 30 days. Late payments subject to 1.5% monthly interest.',
    createdBy: 'John Admin'
  }
];

export default mockInvoices; 