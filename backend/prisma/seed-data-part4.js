/**
 * Seed Data Part 4: Chats, Messages, Feed Posts, Connections
 */

const now = new Date();
const ago = (h) => new Date(now.getTime() - h * 3600000).toISOString();

const chats = [
  {
    id: 'chat-001', companyId: 'biz-1', locationId: null, type: 'group', name: 'NouPro Team',
    participants: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
    lastMessage: { text: 'Stock transfer to Ebene is on its way', sender: 'Raj Doobur', timestamp: ago(2) },
    unreadCount: 0, avatar: null,
  },
  {
    id: 'chat-002', companyId: 'biz-1', locationId: null, type: 'direct', name: null,
    participants: ['user-1', 'user-3'],
    lastMessage: { text: 'The Phoenix Trading order is confirmed', sender: 'Jean-Marc Perrier', timestamp: ago(12) },
    unreadCount: 1, avatar: null,
  },
  {
    id: 'chat-003', companyId: 'biz-1', locationId: null, type: 'direct', name: null,
    participants: ['user-1', 'user-6'],
    lastMessage: { text: 'Can we schedule a call about the new product line?', sender: 'Sophie Lagesse', timestamp: ago(24) },
    unreadCount: 2, avatar: null,
  },
  {
    id: 'chat-004', companyId: 'biz-4', locationId: null, type: 'group', name: 'TechParts Sales',
    participants: ['user-12', 'user-25'],
    lastMessage: { text: 'DigitalEdge order shipped today', sender: 'Deepak Doorgakant', timestamp: ago(8) },
    unreadCount: 0, avatar: null,
  },
  {
    id: 'chat-005', companyId: 'biz-5', locationId: null, type: 'group', name: 'Oceanview Procurement',
    participants: ['user-13', 'user-14', 'user-28'],
    lastMessage: { text: 'Need to reorder cleaning supplies this week', sender: 'Meera Doobary', timestamp: ago(6) },
    unreadCount: 1, avatar: null,
  },
  {
    id: 'chat-006', companyId: null, locationId: null, type: 'direct', name: null,
    participants: ['user-1', 'user-13'],
    lastMessage: { text: 'Thanks for the updated price list', sender: 'Arnaud Labonne', timestamp: ago(48) },
    unreadCount: 0, avatar: null,
  },
  {
    id: 'chat-007', companyId: 'biz-8', locationId: null, type: 'direct', name: null,
    participants: ['user-19', 'user-20'],
    lastMessage: { text: 'Invoice sent to Oceanview', sender: 'Vanessa Goinden', timestamp: ago(192) },
    unreadCount: 0, avatar: null,
  },
];

const messages = {
  'chat-001': [
    { id: 'msg-001', senderId: 'user-1', senderName: 'Arnaud Labonne', content: 'Good morning team! We have 3 orders to process today.', type: 'text', timestamp: ago(48), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-002', senderId: 'user-2', senderName: 'Priya Devi', content: 'I\'ve started preparing the Oceanview order already.', type: 'text', timestamp: ago(47), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-003', senderId: 'user-3', senderName: 'Jean-Marc Perrier', content: 'Phoenix Trading wants to add 20 more Nescafe to their order, is that ok?', type: 'text', timestamp: ago(46), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-004', senderId: 'user-1', senderName: 'Arnaud Labonne', content: 'Yes, we have enough stock. Go ahead.', type: 'text', timestamp: ago(45), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-005', senderId: 'user-5', senderName: 'Raj Doobur', content: 'Stock transfer to Ebene is on its way', type: 'text', timestamp: ago(2), status: 'delivered', isRead: false, isOutgoing: false },
  ],
  'chat-002': [
    { id: 'msg-006', senderId: 'user-3', senderName: 'Jean-Marc Perrier', content: 'I met with Phoenix Trading today. They want to increase their monthly orders.', type: 'text', timestamp: ago(36), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-007', senderId: 'user-1', senderName: 'Arnaud Labonne', content: 'Great news! What volumes are they thinking?', type: 'text', timestamp: ago(35), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-008', senderId: 'user-3', senderName: 'Jean-Marc Perrier', content: 'About 30% more on beverages and snacks. I\'ll send the details.', type: 'text', timestamp: ago(34), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-009', senderId: 'user-3', senderName: 'Jean-Marc Perrier', content: 'The Phoenix Trading order is confirmed', type: 'text', timestamp: ago(12), status: 'delivered', isRead: false, isOutgoing: false },
  ],
  'chat-003': [
    { id: 'msg-010', senderId: 'user-6', senderName: 'Sophie Lagesse', content: 'Hi Arnaud, we\'d like to discuss becoming a distributor for your Heineken range.', type: 'text', timestamp: ago(48), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-011', senderId: 'user-1', senderName: 'Arnaud Labonne', content: 'Sure, happy to discuss. What regions are you covering?', type: 'text', timestamp: ago(47), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-012', senderId: 'user-6', senderName: 'Sophie Lagesse', content: 'Mainly Phoenix, Quatre Bornes, and Vacoas areas.', type: 'text', timestamp: ago(46), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-013', senderId: 'user-6', senderName: 'Sophie Lagesse', content: 'Can we schedule a call about the new product line?', type: 'text', timestamp: ago(24), status: 'delivered', isRead: false, isOutgoing: false },
  ],
  'chat-004': [
    { id: 'msg-014', senderId: 'user-12', senderName: 'Fatima Joomun', content: 'The DigitalEdge order for networking equipment is ready to ship.', type: 'text', timestamp: ago(24), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-015', senderId: 'user-25', senderName: 'Deepak Doorgakant', content: 'I\'ll handle the delivery tomorrow.', type: 'text', timestamp: ago(20), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-016', senderId: 'user-25', senderName: 'Deepak Doorgakant', content: 'DigitalEdge order shipped today', type: 'text', timestamp: ago(8), status: 'delivered', isRead: true, isOutgoing: false },
  ],
  'chat-005': [
    { id: 'msg-017', senderId: 'user-13', senderName: 'Didier Moulin', content: 'Team, let\'s review our supplier orders for next week.', type: 'text', timestamp: ago(24), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-018', senderId: 'user-14', senderName: 'Meera Doobary', content: 'I\'ve checked our stock levels. We\'re running low on cleaning supplies.', type: 'text', timestamp: ago(12), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-019', senderId: 'user-14', senderName: 'Meera Doobary', content: 'Need to reorder cleaning supplies this week', type: 'text', timestamp: ago(6), status: 'delivered', isRead: false, isOutgoing: false },
  ],
  'chat-006': [
    { id: 'msg-020', senderId: 'user-13', senderName: 'Didier Moulin', content: 'Arnaud, could you send the updated price list for beverages?', type: 'text', timestamp: ago(72), status: 'delivered', isRead: true, isOutgoing: false },
    { id: 'msg-021', senderId: 'user-1', senderName: 'Arnaud Labonne', content: 'Sure, I\'ll prepare it today.', type: 'text', timestamp: ago(70), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-022', senderId: 'user-1', senderName: 'Arnaud Labonne', content: 'Thanks for the updated price list', type: 'text', timestamp: ago(48), status: 'delivered', isRead: true, isOutgoing: true },
  ],
  'chat-007': [
    { id: 'msg-023', senderId: 'user-19', senderName: 'Christophe Leal', content: 'Vanessa, did you send the invoice for the Oceanview delivery?', type: 'text', timestamp: ago(216), status: 'delivered', isRead: true, isOutgoing: true },
    { id: 'msg-024', senderId: 'user-20', senderName: 'Vanessa Goinden', content: 'Invoice sent to Oceanview', type: 'text', timestamp: ago(192), status: 'delivered', isRead: true, isOutgoing: false },
  ],
};

const feedPosts = [
  {
    id: 'feed-001', businessId: 'biz-1', type: 'brand_presentation', timestamp: '2h ago',
    data: {
      distributorId: 'biz-1', distributorName: 'NouPro Distribution Ltd',
      distributorLogo: 'https://ui-avatars.com/api/?name=NP&background=6366f1&color=fff&size=200',
      brandName: 'Coca-Cola', brandLogo: 'https://logo.clearbit.com/coca-cola.com',
      description: 'Full range of Coca-Cola beverages now available for wholesale!',
      products: [
        { id: 'prod-001', name: 'Coca-Cola Classic 500ml', unit: '500ml', price: 45, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400', brandName: 'Coca-Cola' },
        { id: 'prod-002', name: 'Coca-Cola Zero 330ml Can', unit: '330ml', price: 35, image: 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=400', brandName: 'Coca-Cola' },
        { id: 'prod-005', name: 'Sprite 500ml', unit: '500ml', price: 40, image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400', brandName: 'Coca-Cola' },
      ],
    },
    createdAt: ago(2),
  },
  {
    id: 'feed-002', businessId: 'biz-4', type: 'company_presentation', timestamp: '5h ago',
    data: {
      distributorId: 'biz-4', distributorName: 'TechParts Mauritius',
      distributorLogo: 'https://ui-avatars.com/api/?name=TP&background=3b82f6&color=fff&size=200',
      description: 'Your one-stop shop for Samsung, LG, Sony, and more. Authorized dealer in Mauritius.',
      industry: 'Technology', category: 'Electronics & Technology',
    },
    createdAt: ago(5),
  },
  {
    id: 'feed-003', businessId: 'biz-1', type: 'brand_presentation', timestamp: '8h ago',
    data: {
      distributorId: 'biz-1', distributorName: 'NouPro Distribution Ltd',
      distributorLogo: 'https://ui-avatars.com/api/?name=NP&background=6366f1&color=fff&size=200',
      brandName: 'Red Bull', brandLogo: 'https://logo.clearbit.com/redbull.com',
      description: 'Energy drinks for your business - competitive wholesale prices.',
      products: [
        { id: 'prod-023', name: 'Red Bull Energy 250ml', unit: '250ml', price: 85, image: 'https://images.unsplash.com/photo-1613048367766-63b9f3b5db8a?w=400', brandName: 'Red Bull' },
        { id: 'prod-024', name: 'Red Bull Sugar Free 250ml', unit: '250ml', price: 85, image: 'https://images.unsplash.com/photo-1613048367766-63b9f3b5db8a?w=400', brandName: 'Red Bull' },
        { id: 'prod-025', name: 'Red Bull Tropical 250ml', unit: '250ml', price: 90, image: 'https://images.unsplash.com/photo-1613048367766-63b9f3b5db8a?w=400', brandName: 'Red Bull' },
      ],
    },
    createdAt: ago(8),
  },
  {
    id: 'feed-004', businessId: 'biz-2', type: 'brand_presentation', timestamp: '12h ago',
    data: {
      distributorId: 'biz-2', distributorName: 'Phoenix Trading Co',
      distributorLogo: 'https://ui-avatars.com/api/?name=PT&background=f59e0b&color=fff&size=200',
      brandName: 'Pringles', brandLogo: 'https://logo.clearbit.com/pringles.com',
      description: 'Pringles range now available - perfect for hotel mini-bars and retail.',
      products: [
        { id: 'prod-046', name: 'Pringles Original 150g', unit: '150g', price: 135, image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', brandName: 'Pringles' },
        { id: 'prod-047', name: 'Pringles Sour Cream 150g', unit: '150g', price: 135, image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', brandName: 'Pringles' },
        { id: 'prod-048', name: 'Pringles Hot & Spicy 150g', unit: '150g', price: 135, image: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400', brandName: 'Pringles' },
      ],
    },
    createdAt: ago(12),
  },
  {
    id: 'feed-005', businessId: 'biz-8', type: 'company_presentation', timestamp: '1d ago',
    data: {
      distributorId: 'biz-8', distributorName: 'MauriClean Supplies',
      distributorLogo: 'https://ui-avatars.com/api/?name=MC&background=14b8a6&color=fff&size=200',
      description: 'Commercial cleaning and hygiene products for hotels, restaurants, and offices.',
      industry: 'Distribution', category: 'Cleaning & Hygiene',
    },
    createdAt: ago(24),
  },
  {
    id: 'feed-006', businessId: 'biz-1', type: 'brand_presentation', timestamp: '1d ago',
    data: {
      distributorId: 'biz-1', distributorName: 'NouPro Distribution Ltd',
      distributorLogo: 'https://ui-avatars.com/api/?name=NP&background=6366f1&color=fff&size=200',
      brandName: 'Dyson', brandLogo: 'https://logo.clearbit.com/dyson.com',
      description: 'Premium Dyson appliances - vacuum cleaners, fans, and hair dryers.',
      products: [
        { id: 'prod-102', name: 'Dyson V8 Absolute Vacuum', unit: '1pc', price: 18500, image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400', brandName: 'Dyson' },
        { id: 'prod-103', name: 'Dyson Pure Cool Tower Fan', unit: '1pc', price: 22000, image: 'https://images.unsplash.com/photo-1622480914584-e07da8b6e6f3?w=400', brandName: 'Dyson' },
      ],
    },
    createdAt: ago(28),
  },
  {
    id: 'feed-007', businessId: 'biz-4', type: 'brand_presentation', timestamp: '2d ago',
    data: {
      distributorId: 'biz-4', distributorName: 'TechParts Mauritius',
      distributorLogo: 'https://ui-avatars.com/api/?name=TP&background=3b82f6&color=fff&size=200',
      brandName: 'Samsung', brandLogo: 'https://logo.clearbit.com/samsung.com',
      description: 'Samsung Galaxy smartphones, TVs, and accessories at wholesale prices.',
      products: [
        { id: 'prod-057', name: 'Samsung Galaxy A15 128GB', unit: '1pc', price: 8500, image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400', brandName: 'Samsung' },
        { id: 'prod-058', name: 'Samsung 32" LED TV', unit: '1pc', price: 12500, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', brandName: 'Samsung' },
        { id: 'prod-059', name: 'Samsung Galaxy Buds FE', unit: '1pc', price: 4200, image: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400', brandName: 'Samsung' },
      ],
    },
    createdAt: ago(48),
  },
  {
    id: 'feed-008', businessId: 'biz-3', type: 'company_presentation', timestamp: '2d ago',
    data: {
      distributorId: 'biz-3', distributorName: 'Island Fresh Imports',
      distributorLogo: 'https://ui-avatars.com/api/?name=IF&background=10b981&color=fff&size=200',
      description: 'Premium frozen foods and canned vegetables from McCain and Bonduelle.',
      industry: 'Import/Export', category: 'Food & Beverage',
    },
    createdAt: ago(52),
  },
  {
    id: 'feed-009', businessId: 'biz-1', type: 'brand_presentation', timestamp: '3d ago',
    data: {
      distributorId: 'biz-1', distributorName: 'NouPro Distribution Ltd',
      distributorLogo: 'https://ui-avatars.com/api/?name=NP&background=6366f1&color=fff&size=200',
      brandName: 'Heineken', brandLogo: 'https://logo.clearbit.com/heineken.com',
      description: 'Heineken beer range - Lager, Silver, and 0.0 Non-Alcoholic.',
      products: [
        { id: 'prod-026', name: 'Heineken Lager 330ml', unit: '330ml', price: 75, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400', brandName: 'Heineken' },
        { id: 'prod-027', name: 'Heineken 0.0 Non-Alcoholic 330ml', unit: '330ml', price: 65, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400', brandName: 'Heineken' },
        { id: 'prod-028', name: 'Heineken Silver 330ml', unit: '330ml', price: 80, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400', brandName: 'Heineken' },
      ],
    },
    createdAt: ago(72),
  },
  {
    id: 'feed-010', businessId: 'biz-2', type: 'brand_presentation', timestamp: '3d ago',
    data: {
      distributorId: 'biz-2', distributorName: 'Phoenix Trading Co',
      distributorLogo: 'https://ui-avatars.com/api/?name=PT&background=f59e0b&color=fff&size=200',
      brandName: 'Dove', brandLogo: 'https://logo.clearbit.com/dove.com',
      description: 'Dove personal care products for retail distribution.',
      products: [
        { id: 'prod-049', name: 'Dove Beauty Bar 100g', unit: '100g', price: 65, image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400', brandName: 'Dove' },
        { id: 'prod-050', name: 'Dove Body Wash 500ml', unit: '500ml', price: 175, image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400', brandName: 'Dove' },
      ],
    },
    createdAt: ago(76),
  },
  {
    id: 'feed-011', businessId: 'biz-1', type: 'brand_presentation', timestamp: '4d ago',
    data: {
      distributorId: 'biz-1', distributorName: 'NouPro Distribution Ltd',
      distributorLogo: 'https://ui-avatars.com/api/?name=NP&background=6366f1&color=fff&size=200',
      brandName: 'Nestle', brandLogo: 'https://logo.clearbit.com/nestle.com',
      description: 'Full Nestle range - from Nescafe to Maggi to KitKat.',
      products: [
        { id: 'prod-010', name: 'Nescafe Classic 200g', unit: '200g', price: 185, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400', brandName: 'Nestle' },
        { id: 'prod-012', name: 'KitKat 4-Finger', unit: '45g', price: 35, image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400', brandName: 'Nestle' },
        { id: 'prod-013', name: 'Milo 400g', unit: '400g', price: 145, image: 'https://images.unsplash.com/photo-1574015974293-817f0ebebb79?w=400', brandName: 'Nestle' },
      ],
    },
    createdAt: ago(96),
  },
  {
    id: 'feed-012', businessId: 'biz-6', type: 'company_presentation', timestamp: '5d ago',
    data: {
      distributorId: 'biz-6', distributorName: 'QuickShip Logistics',
      distributorLogo: 'https://ui-avatars.com/api/?name=QS&background=ef4444&color=fff&size=200',
      description: 'Island-wide delivery and warehousing services for businesses of all sizes.',
      industry: 'Logistics', category: 'Transportation & Logistics',
    },
    createdAt: ago(120),
  },
];

const userConnections = [
  { senderId: 'user-1', receiverId: 'user-6', status: 'accepted' },
  { senderId: 'user-1', receiverId: 'user-12', status: 'accepted' },
  { senderId: 'user-1', receiverId: 'user-13', status: 'accepted' },
  { senderId: 'user-1', receiverId: 'user-15', status: 'accepted' },
  { senderId: 'user-1', receiverId: 'user-19', status: 'accepted' },
  { senderId: 'user-3', receiverId: 'user-6', status: 'accepted' },
  { senderId: 'user-6', receiverId: 'user-13', status: 'accepted' },
  { senderId: 'user-12', receiverId: 'user-23', status: 'accepted' },
];

const businessConnections = [
  { requesterBusinessId: 'biz-1', targetBusinessId: 'biz-2', status: 'accepted' },
  { requesterBusinessId: 'biz-1', targetBusinessId: 'biz-3', status: 'accepted' },
  { requesterBusinessId: 'biz-1', targetBusinessId: 'biz-5', status: 'accepted' },
  { requesterBusinessId: 'biz-4', targetBusinessId: 'biz-10', status: 'accepted' },
  { requesterBusinessId: 'biz-8', targetBusinessId: 'biz-5', status: 'accepted' },
];

module.exports = { chats, messages, feedPosts, userConnections, businessConnections };
