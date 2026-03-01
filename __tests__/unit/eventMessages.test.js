const { createMockRepos } = require('../mocks/repositories');

let mockRepos;
jest.mock('../../src/repositories', () => ({
  getRepos: () => mockRepos,
}));

const {
  generateMessageContent,
  findOrCreateChat,
  createEventMessage,
} = require('../../src/services/eventMessages');

beforeEach(() => {
  mockRepos = createMockRepos();
});

// ============================================================================
// generateMessageContent()
// ============================================================================

describe('generateMessageContent()', () => {
  it('generates order_event message', () => {
    const msg = generateMessageContent('order_event', { orderNumber: '1001' });
    expect(msg).toBe('New order #1001 created');
  });

  it('falls back to entityId for order_event when orderNumber is missing', () => {
    const msg = generateMessageContent('order_event', { entityId: 'ord-xyz' });
    expect(msg).toBe('New order #ord-xyz created');
  });

  it('generates status_update message', () => {
    const msg = generateMessageContent('status_update', {
      previousStatus: 'NEW',
      status: 'ACCEPTED',
    });
    expect(msg).toBe('Order status changed from NEW to ACCEPTED');
  });

  it('generates invoice message with amount', () => {
    const msg = generateMessageContent('invoice', { amount: 150.50, currency: 'EUR' });
    expect(msg).toContain('150');
    expect(msg).toContain('sent');
  });

  it('generates estimate message', () => {
    const msg = generateMessageContent('estimate', { amount: 200, currency: 'EUR' });
    expect(msg).toContain('200');
    expect(msg).toContain('sent');
  });

  it('generates estimate_confirmed message', () => {
    const msg = generateMessageContent('estimate_confirmed', {});
    expect(msg).toBe('Estimate confirmed and converted to invoice');
  });

  it('generates stock_alert message', () => {
    const msg = generateMessageContent('stock_alert', {
      productName: 'Widget A',
      currentStock: 3,
    });
    expect(msg).toBe('Low stock alert: Widget A has only 3 units remaining');
  });

  it('handles stock_alert with missing product name', () => {
    const msg = generateMessageContent('stock_alert', { currentStock: 0 });
    expect(msg).toContain('Unknown product');
  });

  it('returns fallback for unknown type', () => {
    const msg = generateMessageContent('magic_event', {});
    expect(msg).toBe('Business event: magic_event');
  });
});

// ============================================================================
// findOrCreateChat()
// ============================================================================

describe('findOrCreateChat()', () => {
  it('finds existing chat from businessA perspective', async () => {
    const existingChat = {
      id: 'chat-1',
      participants: ['biz-A', 'biz-B'],
    };
    mockRepos.chatRepo.getByBusinessId.mockResolvedValue({ chats: [existingChat] });

    const chat = await findOrCreateChat('biz-A', 'biz-B');
    expect(chat.id).toBe('chat-1');
    expect(mockRepos.chatRepo.create).not.toHaveBeenCalled();
  });

  it('finds existing chat from businessB perspective (bidirectional)', async () => {
    // businessA has no matching chat
    mockRepos.chatRepo.getByBusinessId
      .mockResolvedValueOnce({ chats: [] })
      // businessB has the chat
      .mockResolvedValueOnce({
        chats: [{
          id: 'chat-2',
          participants: ['biz-B', 'biz-A'],
        }],
      });

    const chat = await findOrCreateChat('biz-A', 'biz-B');
    expect(chat.id).toBe('chat-2');
    expect(mockRepos.chatRepo.create).not.toHaveBeenCalled();
  });

  it('supports legacy participant objects with businessId', async () => {
    const existingChat = {
      id: 'chat-3',
      participants: [{ businessId: 'biz-A' }, { businessId: 'biz-B' }],
    };
    mockRepos.chatRepo.getByBusinessId.mockResolvedValue({ chats: [existingChat] });

    const chat = await findOrCreateChat('biz-A', 'biz-B');
    expect(chat.id).toBe('chat-3');
  });

  it('supports legacy participant objects with companyId', async () => {
    const existingChat = {
      id: 'chat-4',
      participants: [{ companyId: 'biz-A' }, { companyId: 'biz-B' }],
    };
    mockRepos.chatRepo.getByBusinessId.mockResolvedValue({ chats: [existingChat] });

    const chat = await findOrCreateChat('biz-A', 'biz-B');
    expect(chat.id).toBe('chat-4');
  });

  it('creates new chat when no existing chat found', async () => {
    mockRepos.chatRepo.getByBusinessId
      .mockResolvedValueOnce({ chats: [] })
      .mockResolvedValueOnce({ chats: [] });
    mockRepos.chatRepo.create.mockResolvedValue({
      id: 'new-chat',
      participants: ['biz-A', 'biz-B'],
    });

    const chat = await findOrCreateChat('biz-A', 'biz-B');
    expect(chat.id).toBe('new-chat');
    expect(mockRepos.chatRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'biz-A',
        type: 'supplier',
        participants: ['biz-A', 'biz-B'],
      }),
    );
  });

  it('creates internal activity feed for single-party event (no toBusinessId)', async () => {
    mockRepos.chatRepo.getByBusinessId.mockResolvedValue({ chats: [] });
    mockRepos.chatRepo.create.mockResolvedValue({
      id: 'internal-chat',
      type: 'internal',
    });

    const chat = await findOrCreateChat('biz-A', null);
    expect(mockRepos.chatRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'internal',
        participants: ['biz-A'],
      }),
    );
  });
});

// ============================================================================
// createEventMessage()
// ============================================================================

describe('createEventMessage()', () => {
  it('creates a message in the found/created chat', async () => {
    const existingChat = { id: 'chat-1', participants: ['biz-A', 'biz-B'] };
    mockRepos.chatRepo.getByBusinessId.mockResolvedValue({ chats: [existingChat] });
    mockRepos.chatRepo.addMessage.mockResolvedValue({
      message: { id: 'msg-1', content: 'New order #100 created' },
    });

    const message = await createEventMessage({
      type: 'order_event',
      fromBusinessId: 'biz-A',
      toBusinessId: 'biz-B',
      entityId: 'ord-1',
      actorId: 'user-1',
      actorName: 'John',
      metadata: { orderNumber: '100' },
    });

    expect(message.content).toBe('New order #100 created');
    expect(mockRepos.chatRepo.addMessage).toHaveBeenCalledWith(
      'chat-1',
      expect.objectContaining({
        type: 'order_event',
        sender: { id: 'user-1', name: 'John' },
        status: 'sent',
      }),
    );
  });
});
