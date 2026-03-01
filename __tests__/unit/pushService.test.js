// Mock expo-server-sdk before requiring the module
const mockSendPushNotificationsAsync = jest.fn().mockResolvedValue([]);
const mockChunkPushNotifications = jest.fn((messages) => [messages]);

jest.mock('expo-server-sdk', () => {
  return {
    Expo: jest.fn().mockImplementation(() => ({
      sendPushNotificationsAsync: mockSendPushNotificationsAsync,
      chunkPushNotifications: mockChunkPushNotifications,
    })),
  };
});

// Need to also make Expo.isExpoPushToken a static method
const { Expo } = require('expo-server-sdk');
Expo.isExpoPushToken = jest.fn((token) => token.startsWith('ExponentPushToken'));

const { sendToUsers } = require('../../src/services/pushService');
const { createMockRepos } = require('../mocks/repositories');

let mockRepos;

beforeEach(() => {
  jest.clearAllMocks();
  mockRepos = createMockRepos();
});

describe('sendToUsers()', () => {
  it('sends push notification to users with valid tokens', async () => {
    mockRepos.notificationPreferenceRepo.getByUserId.mockResolvedValue({ orders: true });
    mockRepos.pushTokenRepo.getActiveByUserId.mockResolvedValue([
      { token: 'ExponentPushToken[abc123]' },
    ]);

    await sendToUsers(
      { userIds: ['user-1'], title: 'Order Update', body: 'Your order shipped', category: 'orders' },
      mockRepos,
    );

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          to: 'ExponentPushToken[abc123]',
          title: 'Order Update',
          body: 'Your order shipped',
        }),
      ]),
    );
  });

  it('skips users who have disabled the notification category', async () => {
    mockRepos.notificationPreferenceRepo.getByUserId.mockResolvedValue({ orders: false });

    await sendToUsers(
      { userIds: ['user-1'], title: 'Order Update', body: 'Test', category: 'orders' },
      mockRepos,
    );

    expect(mockRepos.pushTokenRepo.getActiveByUserId).not.toHaveBeenCalled();
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('filters out invalid Expo push tokens', async () => {
    mockRepos.notificationPreferenceRepo.getByUserId.mockResolvedValue(null);
    mockRepos.pushTokenRepo.getActiveByUserId.mockResolvedValue([
      { token: 'not-a-valid-expo-token' },
    ]);

    await sendToUsers(
      { userIds: ['user-1'], title: 'Test', body: 'Test', category: 'system' },
      mockRepos,
    );

    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('does nothing when userIds is empty', async () => {
    await sendToUsers(
      { userIds: [], title: 'Test', body: 'Test', category: 'system' },
      mockRepos,
    );

    expect(mockRepos.notificationPreferenceRepo.getByUserId).not.toHaveBeenCalled();
  });

  it('does nothing when userIds is undefined', async () => {
    await sendToUsers(
      { title: 'Test', body: 'Test', category: 'system' },
      mockRepos,
    );

    expect(mockRepos.notificationPreferenceRepo.getByUserId).not.toHaveBeenCalled();
  });

  it('handles send errors gracefully without throwing', async () => {
    mockRepos.notificationPreferenceRepo.getByUserId.mockResolvedValue(null);
    mockRepos.pushTokenRepo.getActiveByUserId.mockResolvedValue([
      { token: 'ExponentPushToken[abc123]' },
    ]);
    mockSendPushNotificationsAsync.mockRejectedValue(new Error('Network error'));

    // Should not throw
    await expect(
      sendToUsers(
        { userIds: ['user-1'], title: 'Test', body: 'Test', category: 'system' },
        mockRepos,
      ),
    ).resolves.toBeUndefined();
  });

  it('sends to multiple users with multiple tokens', async () => {
    mockRepos.notificationPreferenceRepo.getByUserId.mockResolvedValue(null);
    mockRepos.pushTokenRepo.getActiveByUserId
      .mockResolvedValueOnce([
        { token: 'ExponentPushToken[aaa]' },
        { token: 'ExponentPushToken[bbb]' },
      ])
      .mockResolvedValueOnce([
        { token: 'ExponentPushToken[ccc]' },
      ]);

    await sendToUsers(
      { userIds: ['user-1', 'user-2'], title: 'Test', body: 'Test', category: 'system' },
      mockRepos,
    );

    // Should have 3 messages total
    expect(mockChunkPushNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ to: 'ExponentPushToken[aaa]' }),
        expect.objectContaining({ to: 'ExponentPushToken[bbb]' }),
        expect.objectContaining({ to: 'ExponentPushToken[ccc]' }),
      ]),
    );
  });
});
