/**
 * Mock Chat Messages Data
 * Contains different message sets for Personal mode and Professional mode chats
 * Each chat ID has unique messages to showcase different message types
 */

export interface Sender {
  name: string;
  avatar: string;
  role: string;
}

export interface BaseMessage {
  id: string;
  type: string;
  isOutgoing: boolean;
  sender: Sender;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ReplyContext {
  senderName: string;
  messageSnippet: string;
  messageId: string;
}

export interface TextMessage extends BaseMessage {
  type: 'text';
  text: string;
  replyingTo?: ReplyContext;
}

export interface OrderMessage extends BaseMessage {
  type: 'order';
  orderId: string;
  itemCount: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  replyingTo?: ReplyContext;
}

export interface ImageMessage extends BaseMessage {
  type: 'image';
  imageUrl: string;
  replyingTo?: ReplyContext;
}

export interface VoiceMessage extends BaseMessage {
  type: 'voice';
  replyingTo?: ReplyContext;
}

export interface PdfMessage extends BaseMessage {
  type: 'pdf';
  fileName: string;
  replyingTo?: ReplyContext;
}

export interface InvoiceMessage extends BaseMessage {
  type: 'invoice';
  invoiceId: string;
  replyingTo?: ReplyContext;
}

export interface EventMessage extends BaseMessage {
  type: 'event';
  event: string;
}

export interface DeletedMessage extends BaseMessage {
  type: 'deleted';
}

export interface LocationMessage extends BaseMessage {
  type: 'location';
  locationName: string;
  address: string;
}

export interface ContactMessage extends BaseMessage {
  type: 'contact';
  contactName: string;
  contactPhone: string;
}

export type Message = 
  | TextMessage 
  | OrderMessage 
  | ImageMessage 
  | VoiceMessage 
  | PdfMessage 
  | InvoiceMessage 
  | EventMessage 
  | DeletedMessage
  | LocationMessage
  | ContactMessage;

// =====================================================
// PERSONAL MODE - Chat Messages
// =====================================================

// Sarah Johnson - Personal friend chat (casual conversation)
const sarahJohnsonMessages: Message[] = [
  {
    id: 's1',
    type: 'text',
    text: 'Hey! Are you coming to the meeting tomorrow?',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'user' },
    timestamp: '10:30',
    status: undefined
  },
  {
    id: 's2',
    type: 'text',
    text: "Yes, I'll be there! What time does it start?",
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '10:32',
    status: 'read'
  },
  {
    id: 's3',
    type: 'text',
    text: '3 PM sharp. We\'re meeting at the usual place 😊',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'user' },
    timestamp: '10:33',
    status: undefined
  },
  {
    id: 's4',
    type: 'location',
    locationName: 'The Coffee House',
    address: '123 Main Street, Port Louis',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'user' },
    timestamp: '10:34',
    status: undefined
  },
  {
    id: 's5',
    type: 'text',
    text: 'Perfect! I know that place. See you there!',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '10:35',
    status: 'delivered'
  },
  {
    id: 's6',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/coffee/300/200',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'user' },
    timestamp: '10:36',
    status: undefined
  },
  {
    id: 's7',
    type: 'text',
    text: 'Their new menu looks amazing! 🍰',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'user' },
    timestamp: '10:36',
    status: undefined
  },
];

// Mike Chen - Colleague chat (work-related personal)
const mikeChenMessages: Message[] = [
  {
    id: 'm1',
    type: 'text',
    text: 'Thanks for the help with the project!',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '09:15',
    status: 'read'
  },
  {
    id: 'm2',
    type: 'text',
    text: 'No problem at all! Happy to help anytime.',
    isOutgoing: false,
    sender: { name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'user' },
    timestamp: '09:17',
    status: undefined
  },
  {
    id: 'm3',
    type: 'pdf',
    fileName: 'Project_Report_Final.pdf',
    isOutgoing: false,
    sender: { name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'user' },
    timestamp: '09:18',
    status: undefined
  },
  {
    id: 'm4',
    type: 'text',
    text: 'Here\'s the final version with all the changes we discussed.',
    isOutgoing: false,
    sender: { name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'user' },
    timestamp: '09:18',
    status: undefined
  },
  {
    id: 'm5',
    type: 'voice',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '09:20',
    status: 'delivered'
  },
  {
    id: 'm6',
    type: 'text',
    text: "Got it! I'll review and send feedback by EOD.",
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '09:21',
    status: 'read'
  },
];

// NouPro Distribution - Business to personal chat
const nouproDistributionMessages: Message[] = [
  {
    id: 'np1',
    type: 'event',
    event: 'Order #ORD-2025-001 created',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '08:30',
    status: undefined
  },
  {
    id: 'np2',
    type: 'order',
    orderId: 'ORD-2025-001',
    itemCount: 3,
    totalAmount: 85.50,
    orderStatus: 'Ongoing',
    paymentStatus: 'Paid',
    isOutgoing: false,
    sender: { name: 'NouPro Distribution', avatar: 'https://picsum.photos/seed/noupro/40/40', role: 'business' },
    timestamp: '08:31',
    status: undefined
  },
  {
    id: 'np3',
    type: 'text',
    text: 'Your order has been shipped! Expected delivery tomorrow.',
    isOutgoing: false,
    sender: { name: 'NouPro Distribution', avatar: 'https://picsum.photos/seed/noupro/40/40', role: 'business' },
    timestamp: '08:45',
    status: undefined
  },
  {
    id: 'np4',
    type: 'text',
    text: 'Great, thank you! Can I track the delivery?',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '08:47',
    status: 'read'
  },
  {
    id: 'np5',
    type: 'text',
    text: 'Absolutely! Here\'s your tracking link: track.noupro.mu/ORD-2025-001',
    isOutgoing: false,
    sender: { name: 'NouPro Distribution', avatar: 'https://picsum.photos/seed/noupro/40/40', role: 'business' },
    timestamp: '08:48',
    status: undefined
  },
  {
    id: 'np6',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/package/300/200',
    isOutgoing: false,
    sender: { name: 'NouPro Distribution', avatar: 'https://picsum.photos/seed/noupro/40/40', role: 'business' },
    timestamp: '08:50',
    status: undefined
  },
  {
    id: 'np7',
    type: 'text',
    text: 'Package ready for delivery! 📦',
    isOutgoing: false,
    sender: { name: 'NouPro Distribution', avatar: 'https://picsum.photos/seed/noupro/40/40', role: 'business' },
    timestamp: '08:50',
    status: undefined
  },
];

// Emma Davis - Personal chat with documents
const emmaDavisMessages: Message[] = [
  {
    id: 'e1',
    type: 'text',
    text: 'Can you send me the documents?',
    isOutgoing: false,
    sender: { name: 'Emma Davis', avatar: 'https://picsum.photos/seed/emma/40/40', role: 'user' },
    timestamp: '16:20',
    status: undefined
  },
  {
    id: 'e2',
    type: 'text',
    text: 'Which ones do you need?',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '16:22',
    status: 'read'
  },
  {
    id: 'e3',
    type: 'text',
    text: 'The contract and the proposal we discussed last week.',
    isOutgoing: false,
    sender: { name: 'Emma Davis', avatar: 'https://picsum.photos/seed/emma/40/40', role: 'user' },
    timestamp: '16:23',
    status: undefined
  },
  {
    id: 'e4',
    type: 'pdf',
    fileName: 'Contract_Agreement_2025.pdf',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '16:25',
    status: 'delivered'
  },
  {
    id: 'e5',
    type: 'pdf',
    fileName: 'Business_Proposal_Draft.pdf',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '16:25',
    status: 'delivered'
  },
  {
    id: 'e6',
    type: 'text',
    text: 'Here you go! Let me know if you need anything else.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '16:26',
    status: 'sent'
  },
  {
    id: 'e7',
    type: 'voice',
    isOutgoing: false,
    sender: { name: 'Emma Davis', avatar: 'https://picsum.photos/seed/emma/40/40', role: 'user' },
    timestamp: '16:28',
    status: undefined
  },
];

// Global Supply Co. - Business inquiry
const globalSupplyMessages: Message[] = [
  {
    id: 'gs1',
    type: 'text',
    text: 'Hi! I saw your product listing online. Do you have the wireless speakers in stock?',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '14:20',
    status: 'read'
  },
  {
    id: 'gs2',
    type: 'text',
    text: 'Hello! Thank you for reaching out. Yes, we have those products in stock.',
    isOutgoing: false,
    sender: { name: 'Global Supply Co.', avatar: 'https://picsum.photos/seed/global/40/40', role: 'business' },
    timestamp: '14:25',
    status: undefined
  },
  {
    id: 'gs3',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/speakers/300/200',
    isOutgoing: false,
    sender: { name: 'Global Supply Co.', avatar: 'https://picsum.photos/seed/global/40/40', role: 'business' },
    timestamp: '14:26',
    status: undefined
  },
  {
    id: 'gs4',
    type: 'text',
    text: 'Here are the models currently available. We offer bulk discounts!',
    isOutgoing: false,
    sender: { name: 'Global Supply Co.', avatar: 'https://picsum.photos/seed/global/40/40', role: 'business' },
    timestamp: '14:27',
    status: undefined
  },
  {
    id: 'gs5',
    type: 'pdf',
    fileName: 'Product_Catalog_2025.pdf',
    isOutgoing: false,
    sender: { name: 'Global Supply Co.', avatar: 'https://picsum.photos/seed/global/40/40', role: 'business' },
    timestamp: '14:28',
    status: undefined
  },
  {
    id: 'gs6',
    type: 'text',
    text: 'Great! What\'s the minimum order quantity?',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '14:30',
    status: 'read'
  },
];

// James Wilson - Simple text exchange
const jamesWilsonMessages: Message[] = [
  {
    id: 'jw1',
    type: 'text',
    text: 'Hey! Did you check the prices I sent?',
    isOutgoing: false,
    sender: { name: 'James Wilson', avatar: 'https://picsum.photos/seed/james/40/40', role: 'user' },
    timestamp: '11:30',
    status: undefined
  },
  {
    id: 'jw2',
    type: 'text',
    text: 'Yes, they look good! The rates are competitive.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '11:35',
    status: 'read'
  },
  {
    id: 'jw3',
    type: 'text',
    text: 'Perfect, I\'ll place the order today.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '11:45',
    status: 'read'
  },
  {
    id: 'jw4',
    type: 'text',
    text: 'Awesome! Let me know when it\'s done 👍',
    isOutgoing: false,
    sender: { name: 'James Wilson', avatar: 'https://picsum.photos/seed/james/40/40', role: 'user' },
    timestamp: '11:46',
    status: undefined
  },
];

// Family Group - Group chat messages
const familyGroupMessages: Message[] = [
  {
    id: 'fg1',
    type: 'text',
    text: 'Who\'s bringing the cake for Sunday?',
    isOutgoing: false,
    sender: { name: 'Mom', avatar: 'https://picsum.photos/seed/mom/40/40', role: 'user' },
    timestamp: '09:00',
    status: undefined
  },
  {
    id: 'fg2',
    type: 'text',
    text: 'I can pick one up from the bakery!',
    isOutgoing: false,
    sender: { name: 'Dad', avatar: 'https://picsum.photos/seed/dad/40/40', role: 'user' },
    timestamp: '09:05',
    status: undefined
  },
  {
    id: 'fg3',
    type: 'text',
    text: 'Perfect! Get chocolate if possible 🍫',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '09:10',
    status: 'read'
  },
  {
    id: 'fg4',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/cake/300/200',
    isOutgoing: false,
    sender: { name: 'Lisa', avatar: 'https://picsum.photos/seed/lisa/40/40', role: 'user' },
    timestamp: '09:30',
    status: undefined
  },
  {
    id: 'fg5',
    type: 'text',
    text: 'Look what I found at the local bakery! Should I get this one?',
    isOutgoing: false,
    sender: { name: 'Lisa', avatar: 'https://picsum.photos/seed/lisa/40/40', role: 'user' },
    timestamp: '09:31',
    status: undefined
  },
  {
    id: 'fg6',
    type: 'text',
    text: 'That looks delicious! 😍',
    isOutgoing: false,
    sender: { name: 'Mom', avatar: 'https://picsum.photos/seed/mom/40/40', role: 'user' },
    timestamp: '09:35',
    status: undefined
  },
  {
    id: 'fg7',
    type: 'text',
    text: 'See you all this weekend!',
    isOutgoing: false,
    sender: { name: 'Lisa', avatar: 'https://picsum.photos/seed/lisa/40/40', role: 'user' },
    timestamp: '10:00',
    status: undefined
  },
];

// Fresh Farms Mauritius - Business with seasonal products
const freshFarmsMessages: Message[] = [
  {
    id: 'ff1',
    type: 'text',
    text: 'Hi! New seasonal fruits are available.',
    isOutgoing: false,
    sender: { name: 'Fresh Farms Mauritius', avatar: 'https://picsum.photos/seed/farms/40/40', role: 'business' },
    timestamp: '15:20',
    status: undefined
  },
  {
    id: 'ff2',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/fruits/300/200',
    isOutgoing: false,
    sender: { name: 'Fresh Farms Mauritius', avatar: 'https://picsum.photos/seed/farms/40/40', role: 'business' },
    timestamp: '15:21',
    status: undefined
  },
  {
    id: 'ff3',
    type: 'text',
    text: 'Fresh mangoes, lychees, and pineapples! Special prices this week.',
    isOutgoing: false,
    sender: { name: 'Fresh Farms Mauritius', avatar: 'https://picsum.photos/seed/farms/40/40', role: 'business' },
    timestamp: '15:22',
    status: undefined
  },
  {
    id: 'ff4',
    type: 'pdf',
    fileName: 'Weekly_Price_List.pdf',
    isOutgoing: false,
    sender: { name: 'Fresh Farms Mauritius', avatar: 'https://picsum.photos/seed/farms/40/40', role: 'business' },
    timestamp: '15:23',
    status: undefined
  },
];

// Work Team - Group chat
const workTeamMessages: Message[] = [
  {
    id: 'wt1',
    type: 'text',
    text: 'Team, please review the quarterly targets.',
    isOutgoing: false,
    sender: { name: 'Sarah', avatar: 'https://picsum.photos/seed/sarah2/40/40', role: 'user' },
    timestamp: '09:00',
    status: undefined
  },
  {
    id: 'wt2',
    type: 'pdf',
    fileName: 'Q1_Targets_2025.pdf',
    isOutgoing: false,
    sender: { name: 'Sarah', avatar: 'https://picsum.photos/seed/sarah2/40/40', role: 'user' },
    timestamp: '09:01',
    status: undefined
  },
  {
    id: 'wt3',
    type: 'text',
    text: 'Looking good! I\'ll prepare the presentation.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '09:15',
    status: 'read'
  },
  {
    id: 'wt4',
    type: 'text',
    text: 'Meeting notes uploaded',
    isOutgoing: false,
    sender: { name: 'Mike', avatar: 'https://picsum.photos/seed/mike2/40/40', role: 'user' },
    timestamp: '09:30',
    status: undefined
  },
  {
    id: 'wt5',
    type: 'pdf',
    fileName: 'Meeting_Notes_Jan15.pdf',
    isOutgoing: false,
    sender: { name: 'Mike', avatar: 'https://picsum.photos/seed/mike2/40/40', role: 'user' },
    timestamp: '09:31',
    status: undefined
  },
];

// =====================================================
// PROFESSIONAL MODE - Chat Messages
// =====================================================

// =====================================================
// SHOWCASE CHAT - V1 Message Types Demo
// This chat demonstrates all available message bubble types for V1
// =====================================================
const showcaseAllMessageTypes: Message[] = [
  // ==================== EVENT MESSAGES (with dates) ====================
  {
    id: 'show-event-1',
    type: 'event',
    event: 'Conversation started with Message Types Showcase',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-15T08:00:00',
    status: undefined
  },
  
  // ==================== TEXT MESSAGES ====================
  {
    id: 'show-text-1',
    type: 'text',
    text: '📝 TEXT MESSAGE (Incoming)\nThis is a regular text message received from another user.',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:01:00',
    status: undefined
  },
  {
    id: 'show-text-2',
    type: 'text',
    text: '📝 TEXT MESSAGE (Outgoing)\nThis is a text message you sent. Notice the primary color background.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:02:00',
    status: 'read'
  },
  {
    id: 'show-text-link',
    type: 'text',
    text: '🔗 TEXT WITH LINK\nCheck out this link: https://noupro.app - Links are highlighted and clickable!',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:03:00',
    status: undefined
  },
  
  // ==================== PDF/DOCUMENT MESSAGES ====================
  {
    id: 'show-pdf-1',
    type: 'pdf',
    fileName: 'Product_Catalog_2025.pdf',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:04:00',
    status: undefined
  },
  {
    id: 'show-text-pdf-1',
    type: 'text',
    text: '📄 PDF/DOCUMENT MESSAGE (Incoming)\nTap to view document. Long press to delete.',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:04:30',
    status: undefined
  },
  {
    id: 'show-pdf-2',
    type: 'pdf',
    fileName: 'Invoice_Summary.pdf',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:05:00',
    status: 'delivered'
  },
  {
    id: 'show-text-pdf-2',
    type: 'text',
    text: '📄 PDF/DOCUMENT MESSAGE (Outgoing)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:05:30',
    status: 'read'
  },
  
  // ==================== NEW ORDER EVENT CARD (Clean Version) ====================
  {
    id: 'show-order-event-new',
    type: 'order_event',
    isSystem: true,
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-15T08:05:30',
    status: undefined,
    payload: {
      orderId: 'ord-event-001',
      orderRef: 'ORD-EVT-001',
      buyer: {
        id: 'buyer-1',
        name: 'Acme Corp',
        logo: 'https://picsum.photos/seed/acme/40/40',
        location: 'Port Louis, Mauritius',
      },
      seller: {
        id: 'seller-1',
        name: 'NouPro Distribution',
        logo: 'https://picsum.photos/seed/noupro/40/40',
        location: 'Curepipe, Mauritius',
      },
      status: 'NEW',
      paymentStatus: 'Unpaid',
      itemsPreview: [
        { id: 'item-1', name: 'Premium Coffee Beans (1kg)', quantity: 5, unitPrice: 450.00, unit: 'bag' },
        { id: 'item-2', name: 'Organic Green Tea (500g)', quantity: 10, unitPrice: 180.00, unit: 'box' },
        { id: 'item-3', name: 'Artisan Chocolate (200g)', quantity: 8, unitPrice: 95.00, unit: 'bar' },
      ],
      totalItemsCount: 5,
      subtotal: 4810.00,
      vatAmount: 721.50,
      vatPercent: 15,
      deliveryFee: 150.00,
      totalAmount: 5681.50,
      currency: 'MUR',
      delivery: {
        type: 'delivery',
        expectedDate: 'Jan 20, 2024',
        address: '123 Business Park, Port Louis, Mauritius',
      },
      createdAt: '2024-01-15T08:05:30',
      schemaVersion: '1.0',
    },
  },
  {
    id: 'show-text-order-event-new',
    type: 'text',
    text: '📦 NEW ORDER EVENT CARD (Export, Seller view)\nClean card: state + next action. Tap card → View Order.',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:05:45',
    status: undefined
  },
  
  // ==================== ORDER MESSAGES - ALL STATUSES (Original) ====================
  {
    id: 'show-order-new',
    type: 'order',
    orderId: 'ORD-NEW-001',
    itemCount: 5,
    totalAmount: 150.00,
    orderStatus: 'New',
    paymentStatus: 'Unpaid',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:06:00',
    status: undefined
  },
  {
    id: 'show-text-order-new',
    type: 'text',
    text: '📦 ORDER - Status: NEW (Export)\nBorder color: Dark Red (#6E0000)',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:06:30',
    status: undefined
  },
  {
    id: 'show-order-ongoing',
    type: 'order',
    orderId: 'ORD-ONGOING-002',
    itemCount: 10,
    totalAmount: 450.00,
    orderStatus: 'Ongoing',
    paymentStatus: 'Unpaid',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:07:00',
    status: 'delivered'
  },
  {
    id: 'show-text-order-ongoing',
    type: 'text',
    text: '📦 ORDER - Status: ONGOING (Import)\nBorder color: Blue (#0075FF)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:07:30',
    status: 'read'
  },
  {
    id: 'show-order-pending',
    type: 'order',
    orderId: 'ORD-PENDING-003',
    itemCount: 3,
    totalAmount: 75.00,
    orderStatus: 'Pending',
    paymentStatus: 'Payment Pending Confirmation',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:08:00',
    status: undefined
  },
  {
    id: 'show-text-order-pending',
    type: 'text',
    text: '📦 ORDER - Status: PENDING\nBorder color: Yellow (#FFB600)',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:08:30',
    status: undefined
  },
  {
    id: 'show-order-done',
    type: 'order',
    orderId: 'ORD-DONE-004',
    itemCount: 20,
    totalAmount: 1200.00,
    orderStatus: 'Done',
    paymentStatus: 'Paid',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:09:00',
    status: 'read'
  },
  {
    id: 'show-text-order-done',
    type: 'text',
    text: '📦 ORDER - Status: DONE ✓\nBorder color: Green (#2ACF01)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:09:30',
    status: 'read'
  },
  
  // ==================== ORDER EVENT CARD - ONGOING (Unpaid) ====================
  {
    id: 'show-order-event-ongoing',
    type: 'order_event',
    isSystem: true,
    isOutgoing: true,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-15T08:09:45',
    status: undefined,
    payload: {
      orderId: 'ord-event-002',
      orderRef: 'ORD-EVT-002',
      buyer: {
        id: 'buyer-2',
        name: 'Your Business',
        logo: 'https://picsum.photos/seed/mybiz/40/40',
        location: 'Quatre Bornes, Mauritius',
      },
      seller: {
        id: 'seller-2',
        name: 'XYZ Suppliers',
        logo: 'https://picsum.photos/seed/xyz/40/40',
        location: 'Rose Hill, Mauritius',
      },
      status: 'ONGOING',
      paymentStatus: 'Unpaid',
      itemsPreview: [
        { id: 'item-4', name: 'Industrial Supplies Kit', quantity: 2, unitPrice: 1200.00, unit: 'kit' },
        { id: 'item-5', name: 'Safety Equipment Set', quantity: 5, unitPrice: 350.00, unit: 'set' },
      ],
      totalItemsCount: 2,
      subtotal: 4150.00,
      vatAmount: 622.50,
      vatPercent: 15,
      deliveryFee: 0,
      totalAmount: 4772.50,
      currency: 'MUR',
      delivery: {
        type: 'pickup',
        expectedDate: 'Jan 18, 2024',
      },
      createdAt: '2024-01-15T08:09:45',
      schemaVersion: '1.0',
    },
  },
  {
    id: 'show-text-order-event-ongoing',
    type: 'text',
    text: '📦 ORDER EVENT CARD - ONGOING (Import, Buyer view)\nPayment: Unpaid',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
  },
  
  // ==================== ORDER EVENT CARD - PENDING (Payment Pending Confirmation) ====================
  {
    id: 'show-order-event-pending',
    type: 'order_event',
    isSystem: true,
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-15T08:10:00',
    status: undefined,
    payload: {
      orderId: 'ord-event-003',
      orderRef: 'ORD-EVT-003',
      buyer: {
        id: 'buyer-3',
        name: 'Metro Supplies',
        logo: 'https://picsum.photos/seed/metro/40/40',
        location: 'Vacoas, Mauritius',
      },
      seller: {
        id: 'seller-3',
        name: 'NouPro Distribution',
        logo: 'https://picsum.photos/seed/noupro/40/40',
        location: 'Curepipe, Mauritius',
      },
      status: 'PENDING',
      paymentStatus: 'Payment Pending Confirmation',
      itemsPreview: [
        { id: 'item-6', name: 'Office Supplies Bundle', quantity: 3, unitPrice: 850.00, unit: 'bundle' },
        { id: 'item-7', name: 'Printer Paper (A4)', quantity: 20, unitPrice: 125.00, unit: 'ream' },
      ],
      totalItemsCount: 2,
      subtotal: 5050.00,
      vatAmount: 757.50,
      vatPercent: 15,
      deliveryFee: 100.00,
      totalAmount: 5907.50,
      currency: 'MUR',
      delivery: {
        type: 'delivery',
        expectedDate: 'Jan 22, 2024',
        address: '45 Commerce Street, Vacoas, Mauritius',
      },
      createdAt: '2024-01-15T08:10:00',
      schemaVersion: '1.0',
    },
  },
  {
    id: 'show-text-order-event-pending',
    type: 'text',
    text: '📦 ORDER EVENT CARD - PENDING\nPayment: Pending Confirmation (partial payments shown)',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
  },
  
  // ==================== ORDER EVENT CARD - DONE (Paid) ====================
  {
    id: 'show-order-event-done',
    type: 'order_event',
    isSystem: true,
    isOutgoing: true,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-15T08:11:00',
    status: undefined,
    payload: {
      orderId: 'ord-event-004',
      orderRef: 'ORD-EVT-004',
      buyer: {
        id: 'buyer-4',
        name: 'Island Retail Co',
        logo: 'https://picsum.photos/seed/island/40/40',
        location: 'Grand Baie, Mauritius',
      },
      seller: {
        id: 'seller-4',
        name: 'NouPro Distribution',
        logo: 'https://picsum.photos/seed/noupro/40/40',
        location: 'Curepipe, Mauritius',
      },
      status: 'DONE',
      paymentStatus: 'Paid',
      itemsPreview: [
        { id: 'item-8', name: 'Premium Snacks Assortment', quantity: 15, unitPrice: 280.00, unit: 'box' },
        { id: 'item-9', name: 'Beverages Mixed Pack', quantity: 10, unitPrice: 450.00, unit: 'case' },
        { id: 'item-10', name: 'Gourmet Condiments Set', quantity: 8, unitPrice: 195.00, unit: 'set' },
      ],
      totalItemsCount: 3,
      subtotal: 10260.00,
      vatAmount: 1539.00,
      vatPercent: 15,
      deliveryFee: 200.00,
      totalAmount: 11999.00,
      currency: 'MUR',
      delivery: {
        type: 'delivery',
        expectedDate: 'Jan 25, 2024',
        address: '78 Coastal Road, Grand Baie, Mauritius',
      },
      createdAt: '2024-01-15T08:11:00',
      schemaVersion: '1.0',
    },
  },
  {
    id: 'show-text-order-event-done',
    type: 'text',
    text: '📦 ORDER EVENT CARD - DONE ✓\nPayment: Paid (multiple partial payments shown)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:09:50',
    status: 'read'
  },
  
  {
    id: 'show-order-cancel',
    type: 'order',
    orderId: 'ORD-CANCEL-005',
    itemCount: 2,
    totalAmount: 50.00,
    orderStatus: 'Cancel',
    paymentStatus: 'Unpaid',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:10:00',
    status: undefined
  },
  {
    id: 'show-text-order-cancel',
    type: 'text',
    text: '📦 ORDER - Status: CANCELLED ✗\nBorder color: Light Red (#FF6B6B)',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:10:30',
    status: undefined
  },
  
  // ==================== INVOICE MESSAGES ====================
  {
    id: 'show-invoice-1',
    type: 'invoice',
    invoiceId: 'INV-2025-DEMO',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:11:00',
    status: undefined
  },
  {
    id: 'show-text-invoice-1',
    type: 'text',
    text: '🧾 INVOICE MESSAGE (Incoming)\nTap to view invoice details',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:11:30',
    status: undefined
  },
  {
    id: 'show-invoice-2',
    type: 'invoice',
    invoiceId: 'INV-2025-SENT',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:12:00',
    status: 'delivered'
  },
  {
    id: 'show-text-invoice-2',
    type: 'text',
    text: '🧾 INVOICE MESSAGE (Outgoing)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:12:30',
    status: 'read'
  },
  
  // ==================== DELETED MESSAGE ====================
  {
    id: 'show-deleted-1',
    type: 'deleted',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:13:00',
    status: undefined
  },
  {
    id: 'show-text-deleted-1',
    type: 'text',
    text: '🚫 DELETED MESSAGE (Incoming)\nLong press any message to delete it',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:13:30',
    status: undefined
  },
  {
    id: 'show-deleted-2',
    type: 'deleted',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:14:00',
    status: undefined
  },
  {
    id: 'show-text-deleted-2',
    type: 'text',
    text: '🚫 DELETED MESSAGE (Outgoing)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:14:30',
    status: 'read'
  },
  
  // ==================== MORE EVENT TYPES ====================
  {
    id: 'show-event-2',
    type: 'event',
    event: 'User removed from group chat',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-14T10:00:00',
    status: undefined
  },
  {
    id: 'show-text-event',
    type: 'text',
    text: '⚡ EVENT/SYSTEM MESSAGE\nCentered, gray background. Shows date above the event text.',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:15:00',
    status: undefined
  },
  {
    id: 'show-event-3',
    type: 'event',
    event: 'Demo Contact changed their name',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-08T14:00:00',
    status: undefined
  },
  
  // ==================== MESSAGE STATUS INDICATORS ====================
  {
    id: 'show-status-sent',
    type: 'text',
    text: '✓ Status: SENT (single gray checkmark)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:16:00',
    status: 'sent'
  },
  {
    id: 'show-status-delivered',
    type: 'text',
    text: '✓✓ Status: DELIVERED (double gray checkmarks)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:17:00',
    status: 'delivered'
  },
  {
    id: 'show-status-read',
    type: 'text',
    text: '✓✓ Status: READ (double accent colour checkmarks)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '2024-01-15T08:18:00',
    status: 'read'
  },
  
  // ==================== SUMMARY ====================
  {
    id: 'show-summary',
    type: 'text',
    text: '📋 V1 MESSAGE TYPES:\n\n• Text (with link detection)\n• PDF/Document\n• Order (5 statuses: New, Ongoing, Pending, Done, Cancel)\n• Invoice\n• Deleted (long press to delete)\n• Event/System (with dates)\n\n📊 STATUS INDICATORS:\n• Sent ✓\n• Delivered ✓✓\n• Read ✓✓ (accent)',
    isOutgoing: false,
    sender: { name: 'Demo Contact', avatar: 'https://picsum.photos/seed/demo/40/40', role: 'client' },
    timestamp: '2024-01-15T08:19:00',
    status: undefined
  },
];

// Sarah Johnson (Business) - Client with photo
const sarahJohnsonBusinessMessages: Message[] = [
  {
    id: 'sjb1',
    type: 'text',
    text: 'Hi! I wanted to share some photos of the product issue.',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
    timestamp: '10:00',
    status: undefined
  },
  {
    id: 'sjb2',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/product1/300/200',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
    timestamp: '10:01',
    status: undefined
  },
  {
    id: 'sjb3',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/product2/300/200',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
    timestamp: '10:02',
    status: undefined
  },
  {
    id: 'sjb4',
    type: 'text',
    text: 'The packaging was damaged. Can we get a replacement?',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
    timestamp: '10:03',
    status: undefined
  },
  {
    id: 'sjb5',
    type: 'text',
    text: 'I apologize for the inconvenience. We\'ll send a replacement immediately.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '10:10',
    status: 'read'
  },
  {
    id: 'sjb6',
    type: 'text',
    text: 'Thank you so much! 😊',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'client' },
    timestamp: '10:15',
    status: undefined
  },
];

// XYZ Suppliers - Supplier chat
const xyzSuppliersMessages: Message[] = [
  {
    id: 'xyz1',
    type: 'text',
    text: 'Hi! We have new products available for order.',
    isOutgoing: false,
    sender: { name: 'XYZ Suppliers', avatar: 'https://picsum.photos/seed/xyz/40/40', role: 'supplier' },
    timestamp: '09:00',
    status: undefined
  },
  {
    id: 'xyz2',
    type: 'pdf',
    fileName: 'New_Products_Catalog.pdf',
    isOutgoing: false,
    sender: { name: 'XYZ Suppliers', avatar: 'https://picsum.photos/seed/xyz/40/40', role: 'supplier' },
    timestamp: '09:01',
    status: undefined
  },
  {
    id: 'xyz3',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/newproducts/300/200',
    isOutgoing: false,
    sender: { name: 'XYZ Suppliers', avatar: 'https://picsum.photos/seed/xyz/40/40', role: 'supplier' },
    timestamp: '09:02',
    status: undefined
  },
  {
    id: 'xyz4',
    type: 'text',
    text: 'These include premium quality items from our new collection.',
    isOutgoing: false,
    sender: { name: 'XYZ Suppliers', avatar: 'https://picsum.photos/seed/xyz/40/40', role: 'supplier' },
    timestamp: '09:03',
    status: undefined
  },
  {
    id: 'xyz5',
    type: 'text',
    text: 'Thanks! I\'ll review the catalog and get back to you.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '09:10',
    status: 'read'
  },
  {
    id: 'xyz6',
    type: 'order',
    orderId: 'ORD-SUP-2025-005',
    itemCount: 50,
    totalAmount: 5000.00,
    orderStatus: 'New',
    paymentStatus: 'Unpaid',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '09:15',
    status: 'delivered'
  },
];

// Mike Chen (Business) - Video call history
const mikeChenBusinessMessages: Message[] = [
  {
    id: 'mcb1',
    type: 'text',
    text: 'Hi! Can we schedule a call to discuss the partnership?',
    isOutgoing: false,
    sender: { name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'client' },
    timestamp: '08:30',
    status: undefined
  },
  {
    id: 'mcb2',
    type: 'text',
    text: 'Sure! I\'m available at 2 PM today.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '08:35',
    status: 'read'
  },
  {
    id: 'mcb3',
    type: 'event',
    event: 'Video call ended (15 min)',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '09:00',
    status: undefined
  },
  {
    id: 'mcb4',
    type: 'text',
    text: 'Great call! I\'ll send the proposal document.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '09:02',
    status: 'delivered'
  },
  {
    id: 'mcb5',
    type: 'pdf',
    fileName: 'Partnership_Proposal.pdf',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '09:05',
    status: 'delivered'
  },
];

// Warehouse A Team - Group chat with multiple senders
const warehouseATeamMessages: Message[] = [
  {
    id: 'wa1',
    type: 'event',
    event: 'Marie Manager created this group',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '08:00',
    status: undefined
  },
  {
    id: 'wa2',
    type: 'text',
    text: 'Hey team! Let\'s use this group to coordinate our sales efforts.',
    isOutgoing: false,
    sender: { name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
    timestamp: '08:05',
    status: undefined
  },
  {
    id: 'wa3',
    type: 'text',
    text: 'Sounds good!',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
    timestamp: '08:10',
    status: undefined
  },
  {
    id: 'wa4',
    type: 'text',
    text: 'I\'m in!',
    isOutgoing: false,
    sender: { name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'staff' },
    timestamp: '08:12',
    status: undefined
  },
  {
    id: 'wa5',
    type: 'text',
    text: 'Let\'s start with reviewing last month\'s performance.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '08:20',
    status: 'read'
  },
  {
    id: 'wa6',
    type: 'text',
    text: 'I\'ve prepared a summary of our Q4 results.',
    isOutgoing: false,
    sender: { name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
    timestamp: '08:25',
    status: undefined
  },
  {
    id: 'wa7',
    type: 'text',
    text: 'We exceeded targets by 15%!',
    isOutgoing: false,
    sender: { name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
    timestamp: '08:26',
    status: undefined
  },
  {
    id: 'wa8',
    type: 'text',
    text: 'That\'s amazing! 🎉',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
    timestamp: '08:30',
    status: undefined
  },
  {
    id: 'wa9',
    type: 'text',
    text: 'Congrats everyone!',
    isOutgoing: false,
    sender: { name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'staff' },
    timestamp: '08:35',
    status: undefined
  },
  {
    id: 'wa10',
    type: 'text',
    text: 'Great work team!',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '08:40',
    status: 'read'
  },
  {
    id: 'wa11',
    type: 'text',
    text: 'Let\'s aim for 20% next quarter.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '08:41',
    status: 'read'
  },
  {
    id: 'wa12',
    type: 'text',
    text: 'Challenge accepted!',
    isOutgoing: false,
    sender: { name: 'Mike Chen', avatar: 'https://picsum.photos/seed/mike/40/40', role: 'staff' },
    timestamp: '08:45',
    status: undefined
  },
  {
    id: 'wa13',
    type: 'text',
    text: 'I have some ideas for new strategies.',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
    timestamp: '08:50',
    status: undefined
  },
  {
    id: 'wa14',
    type: 'text',
    text: 'Let\'s discuss them in our meeting tomorrow.',
    isOutgoing: false,
    sender: { name: 'Sarah Johnson', avatar: 'https://picsum.photos/seed/sarah/40/40', role: 'staff' },
    timestamp: '08:51',
    status: undefined
  },
  {
    id: 'wa15',
    type: 'text',
    text: 'Great job on the quarterly targets!',
    isOutgoing: false,
    sender: { name: 'Marie Manager', avatar: 'https://picsum.photos/seed/marie/40/40', role: 'admin' },
    timestamp: '09:00',
    status: undefined
  },
];

// Tech Solutions Inc - Invoice chat
const techSolutionsMessages: Message[] = [
  {
    id: 'ts1',
    type: 'order',
    orderId: 'ORD-2025-003',
    itemCount: 25,
    totalAmount: 3750.00,
    orderStatus: 'Done',
    paymentStatus: 'Unpaid',
    isOutgoing: false,
    sender: { name: 'Tech Solutions Inc', avatar: 'https://picsum.photos/seed/tech/40/40', role: 'client' },
    timestamp: '15:00',
    status: undefined
  },
  {
    id: 'ts2',
    type: 'text',
    text: 'Order delivered! Please find the invoice attached.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '16:00',
    status: 'read'
  },
  {
    id: 'ts3',
    type: 'invoice',
    invoiceId: 'INV-2025-001',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '16:01',
    status: 'delivered'
  },
  {
    id: 'ts4',
    type: 'text',
    text: 'Got it! We\'ll process the payment this week.',
    isOutgoing: false,
    sender: { name: 'Tech Solutions Inc', avatar: 'https://picsum.photos/seed/tech/40/40', role: 'client' },
    timestamp: '16:15',
    status: undefined
  },
  {
    id: 'ts5',
    type: 'event',
    event: 'Payment received for Invoice #INV-2025-001',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '16:20',
    status: undefined
  },
];

// Global Distributors - PDF contract
const globalDistributorsMessages: Message[] = [
  {
    id: 'gd1',
    type: 'text',
    text: 'Hi! We\'d like to finalize the distribution agreement.',
    isOutgoing: false,
    sender: { name: 'Global Distributors', avatar: 'https://picsum.photos/seed/global/40/40', role: 'client' },
    timestamp: '14:00',
    status: undefined
  },
  {
    id: 'gd2',
    type: 'text',
    text: 'Of course! I\'ll prepare the contract document.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '14:30',
    status: 'read'
  },
  {
    id: 'gd3',
    type: 'pdf',
    fileName: 'Contract_Agreement.pdf',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '15:45',
    status: 'delivered'
  },
  {
    id: 'gd4',
    type: 'text',
    text: 'Please review and sign. Happy to discuss any terms.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '15:46',
    status: 'sent'
  },
  {
    id: 'gd5',
    type: 'voice',
    isOutgoing: false,
    sender: { name: 'Global Distributors', avatar: 'https://picsum.photos/seed/global/40/40', role: 'client' },
    timestamp: '16:00',
    status: undefined
  },
];

// Premium Foods Ltd - Invoice chat
const premiumFoodsMessages: Message[] = [
  {
    id: 'pf1',
    type: 'order',
    orderId: 'ORD-2025-004',
    itemCount: 100,
    totalAmount: 8500.00,
    orderStatus: 'Done',
    paymentStatus: 'Paid',
    isOutgoing: false,
    sender: { name: 'Premium Foods Ltd', avatar: 'https://picsum.photos/seed/premium/40/40', role: 'client' },
    timestamp: '13:00',
    status: undefined
  },
  {
    id: 'pf2',
    type: 'invoice',
    invoiceId: 'INV-2025-002',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '14:00',
    status: 'read'
  },
  {
    id: 'pf3',
    type: 'text',
    text: 'Thank you for your business! Invoice attached.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '14:01',
    status: 'read'
  },
  {
    id: 'pf4',
    type: 'event',
    event: 'Payment received - Rs 8,500.00',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '14:30',
    status: undefined
  },
  {
    id: 'pf5',
    type: 'text',
    text: 'Payment completed! Looking forward to our next order.',
    isOutgoing: false,
    sender: { name: 'Premium Foods Ltd', avatar: 'https://picsum.photos/seed/premium/40/40', role: 'client' },
    timestamp: '14:35',
    status: undefined
  },
];

// Distribution Center Updates - Delivery tracking
const distributionCenterMessages: Message[] = [
  {
    id: 'dc1',
    type: 'event',
    event: 'Delivery #DEL-001 assigned',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '10:00',
    status: undefined
  },
  {
    id: 'dc2',
    type: 'text',
    text: 'Delivery started. Driver: Alex M.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '10:30',
    status: 'delivered'
  },
  {
    id: 'dc3',
    type: 'location',
    locationName: 'En route',
    address: 'Curepipe Highway - 15 min away',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '11:00',
    status: 'delivered'
  },
  {
    id: 'dc4',
    type: 'image',
    imageUrl: 'https://picsum.photos/seed/delivery/300/200',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '11:30',
    status: 'delivered'
  },
  {
    id: 'dc5',
    type: 'event',
    event: 'Delivery #DEL-001 completed ✓',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '14:30',
    status: undefined
  },
];

// Logistics Team - Ongoing delivery
const logisticsTeamMessages: Message[] = [
  {
    id: 'lt1',
    type: 'event',
    event: 'Delivery #DEL-002 created',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '11:00',
    status: undefined
  },
  {
    id: 'lt2',
    type: 'text',
    text: 'New delivery assigned to Route B.',
    isOutgoing: false,
    sender: { name: 'Alex', avatar: 'https://picsum.photos/seed/alex/40/40', role: 'internal' },
    timestamp: '11:05',
    status: undefined
  },
  {
    id: 'lt3',
    type: 'text',
    text: 'Got it! Starting now.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '11:10',
    status: 'read'
  },
  {
    id: 'lt4',
    type: 'location',
    locationName: 'Pickup Location',
    address: 'Warehouse B, Industrial Zone',
    isOutgoing: false,
    sender: { name: 'Alex', avatar: 'https://picsum.photos/seed/alex/40/40', role: 'internal' },
    timestamp: '11:15',
    status: undefined
  },
  {
    id: 'lt5',
    type: 'text',
    text: 'Delivery #DEL-002 in progress - 3 stops remaining',
    isOutgoing: false,
    sender: { name: 'Alex', avatar: 'https://picsum.photos/seed/alex/40/40', role: 'internal' },
    timestamp: '13:15',
    status: undefined
  },
];

// Warehouse B Team - New order received
const warehouseBTeamMessages: Message[] = [
  {
    id: 'wb1',
    type: 'event',
    event: 'New order received from Premium Foods Ltd',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '11:45',
    status: undefined
  },
  {
    id: 'wb2',
    type: 'text',
    text: 'New delivery order received! Processing now.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'business' },
    timestamp: '12:00',
    status: 'delivered'
  },
  {
    id: 'wb3',
    type: 'order',
    orderId: 'ORD-2025-005',
    itemCount: 45,
    totalAmount: 2250.00,
    orderStatus: 'New',
    paymentStatus: 'Unpaid',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '12:01',
    status: undefined
  },
  {
    id: 'wb4',
    type: 'text',
    text: 'Items ready for packing. Estimated completion: 2 hours.',
    isOutgoing: false,
    sender: { name: 'Maria', avatar: 'https://picsum.photos/seed/maria/40/40', role: 'internal' },
    timestamp: '12:30',
    status: undefined
  },
];

// =====================================================
// Message Lookup Functions
// =====================================================

// =====================================================
// PERSONAL MODE SHOWCASE - V1 Message Types Demo
// =====================================================
const personalShowcaseMessages: Message[] = [
  // ==================== EVENT MESSAGES (with dates) ====================
  {
    id: 'pshow-event-1',
    type: 'event',
    event: 'You started a conversation with Personal Showcase',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-15T08:00:00',
    status: undefined
  },
  
  // ==================== TEXT MESSAGES ====================
  {
    id: 'pshow-text-1',
    type: 'text',
    text: '📝 TEXT MESSAGE (Incoming)\nRegular text message from a friend.',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:01:00',
    status: undefined
  },
  {
    id: 'pshow-text-2',
    type: 'text',
    text: '📝 TEXT MESSAGE (Outgoing)\nYour sent message with primary color.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '2024-01-15T08:02:00',
    status: 'read'
  },
  {
    id: 'pshow-text-link',
    type: 'text',
    text: '🔗 TEXT WITH LINK\nCheck this: https://example.com - Clickable!',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:03:00',
    status: undefined
  },
  
  // ==================== PDF MESSAGES ====================
  {
    id: 'pshow-pdf-1',
    type: 'pdf',
    fileName: 'Invitation_Party.pdf',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:04:00',
    status: undefined
  },
  {
    id: 'pshow-text-pdf',
    type: 'text',
    text: '📄 PDF/DOCUMENT MESSAGE\nTap to view. Long press to delete.',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:04:30',
    status: undefined
  },
  {
    id: 'pshow-pdf-2',
    type: 'pdf',
    fileName: 'Tickets_Concert.pdf',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '2024-01-15T08:05:00',
    status: 'delivered'
  },
  
  // ==================== DELETED MESSAGE ====================
  {
    id: 'pshow-deleted-1',
    type: 'deleted',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:06:00',
    status: undefined
  },
  {
    id: 'pshow-text-deleted',
    type: 'text',
    text: '🚫 DELETED MESSAGE\nLong press any message to delete it.',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:06:30',
    status: undefined
  },
  {
    id: 'pshow-deleted-2',
    type: 'deleted',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '2024-01-15T08:07:00',
    status: undefined
  },
  
  // ==================== MORE EVENT TYPES ====================
  {
    id: 'pshow-event-2',
    type: 'event',
    event: 'User removed from group chat',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-14T10:00:00',
    status: undefined
  },
  {
    id: 'pshow-text-event',
    type: 'text',
    text: '⚡ EVENT/SYSTEM MESSAGE\nShows date above the event text.',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:08:00',
    status: undefined
  },
  {
    id: 'pshow-event-3',
    type: 'event',
    event: 'Demo Contact changed their name',
    isOutgoing: false,
    sender: { name: 'System', avatar: '', role: 'system' },
    timestamp: '2024-01-08T14:00:00',
    status: undefined
  },
  
  // ==================== MESSAGE STATUS INDICATORS ====================
  {
    id: 'pshow-status-sent',
    type: 'text',
    text: '✓ Status: SENT (single gray checkmark)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '2024-01-15T08:09:00',
    status: 'sent'
  },
  {
    id: 'pshow-status-delivered',
    type: 'text',
    text: '✓✓ Status: DELIVERED (double gray checkmarks)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '2024-01-15T08:10:00',
    status: 'delivered'
  },
  {
    id: 'pshow-status-read',
    type: 'text',
    text: '✓✓ Status: READ (double accent colour checkmarks)',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '2024-01-15T08:11:00',
    status: 'read'
  },
  
  // ==================== SUMMARY ====================
  {
    id: 'pshow-summary',
    type: 'text',
    text: '📋 V1 PERSONAL MODE TYPES:\n\n• Text (with links)\n• PDF/Document\n• Deleted (long press to delete)\n• Event/System (with dates)\n\n📊 STATUS INDICATORS:\n• Sent ✓\n• Delivered ✓✓\n• Read ✓✓ (accent)',
    isOutgoing: false,
    sender: { name: 'Personal Demo', avatar: 'https://picsum.photos/seed/pdemo/40/40', role: 'user' },
    timestamp: '2024-01-15T08:12:00',
    status: undefined
  },
];

// Personal mode chat messages map
const personalChatMessages: { [key: string]: Message[] } = {
  'pchat-1': personalShowcaseMessages, // SHOWCASE: All personal message types demo
  'pchat-2': mikeChenMessages,
  'pchat-3': nouproDistributionMessages,
  'pchat-4': emmaDavisMessages,
  'pchat-5': globalSupplyMessages,
  'pchat-6': jamesWilsonMessages,
  'pchat-7': familyGroupMessages,
  'pchat-8': freshFarmsMessages,
  'pchat-9': workTeamMessages,
};

// Business/Professional mode chat messages map
const businessChatMessages: { [key: string]: Message[] } = {
  '1': showcaseAllMessageTypes, // SHOWCASE: All message types demo
  '2': sarahJohnsonBusinessMessages,
  '3': xyzSuppliersMessages,
  '4': mikeChenBusinessMessages,
  '5': warehouseATeamMessages,
  '6': techSolutionsMessages,
  '7': globalDistributorsMessages,
  '8': premiumFoodsMessages,
  '9': distributionCenterMessages,
  '10': logisticsTeamMessages,
  '11': warehouseBTeamMessages,
};

// Default fallback messages
const defaultMessages: Message[] = [
  {
    id: 'default1',
    type: 'text',
    text: 'Hello! How can I help you today?',
    isOutgoing: false,
    sender: { name: 'Contact', avatar: '', role: 'user' },
    timestamp: '10:00',
    status: undefined
  },
  {
    id: 'default2',
    type: 'text',
    text: 'Hi! I was looking at your products.',
    isOutgoing: true,
    sender: { name: 'You', avatar: '', role: 'user' },
    timestamp: '10:05',
    status: 'read'
  },
];

/**
 * Get messages for a specific chat based on chat ID
 * Supports both personal mode (pchat-*) and business mode chat IDs
 */
export function getMessagesForChat(chatId: string): Message[] {
  // Check personal mode chats first
  if (personalChatMessages[chatId]) {
    return [...personalChatMessages[chatId]].reverse();
  }
  
  // Check business mode chats
  if (businessChatMessages[chatId]) {
    return [...businessChatMessages[chatId]].reverse();
  }
  
  // Return default messages for unknown chats
  return [...defaultMessages].reverse();
}

/**
 * Check if a chat ID belongs to personal mode
 */
export function isPersonalModeChat(chatId: string): boolean {
  return chatId.startsWith('pchat-');
}

export default {
  getMessagesForChat,
  isPersonalModeChat,
  personalChatMessages,
  businessChatMessages,
};

