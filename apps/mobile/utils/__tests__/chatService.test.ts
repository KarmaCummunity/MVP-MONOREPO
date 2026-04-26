import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockConfig = {
  USE_BACKEND: false,
  USE_FIRESTORE: false,
};

const mockDatabaseService = {
  delete: jest.fn(),
  batchDelete: jest.fn(),
  update: jest.fn(),
  list: jest.fn(),
  deleteUserData: jest.fn(),
  clearAllData: jest.fn(),
};

const mockDb = {
  createChat: jest.fn(),
  getChat: jest.fn(),
  getUserChats: jest.fn(),
  createMessage: jest.fn(),
  getChatMessages: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  getMessageReactions: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessage: jest.fn(),
  searchMessages: jest.fn(),
  saveVoiceMessage: jest.fn(),
  setTypingStatus: jest.fn(),
  clearTypingStatus: jest.fn(),
};

const mockApiService = {
  createConversation: jest.fn(),
  getUserConversations: jest.fn(),
  sendMessage: jest.fn(),
  getConversationMessages: jest.fn(),
  markAllMessagesAsRead: jest.fn(),
};

jest.mock('../config.constants', () => mockConfig);
jest.mock('../databaseService', () => ({
  db: mockDb,
  DB_COLLECTIONS: {
    CHATS: 'chats',
    MESSAGES: 'messages',
  },
  DatabaseService: mockDatabaseService,
}));
jest.mock('../apiService', () => ({
  apiService: mockApiService,
}));
jest.mock('../firebaseClient', () => ({
  getFirebase: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('../notificationService', () => ({
  sendMessageNotification: jest.fn(),
}));
jest.mock('../loggerService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('chatService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockConfig.USE_BACKEND = false;
    mockConfig.USE_FIRESTORE = false;
    mockDb.getChat.mockResolvedValue(null);
    mockDb.getUserChats.mockResolvedValue([]);
    mockDb.getChatMessages.mockResolvedValue([]);
    mockDb.getMessageReactions.mockResolvedValue([]);
  });

  const loadChatService = () => require('../chatService') as typeof import('../chatService');

  it('creates conversation locally with sanitized participants', async () => {
    const { createConversation } = loadChatService();

    const id = await createConversation([' user-a ', 'user-b', 'user-a']);

    expect(id.startsWith('conv_')).toBe(true);
    expect(mockDb.createChat).toHaveBeenCalledTimes(2);
    expect(mockDb.createChat).toHaveBeenCalledWith(
      'user-a',
      expect.any(String),
      expect.objectContaining({
        participants: ['user-a', 'user-b'],
      }),
    );
    expect(mockDb.createChat).toHaveBeenCalledWith(
      'user-b',
      expect.any(String),
      expect.objectContaining({
        participants: ['user-a', 'user-b'],
      }),
    );
  });

  it('throws when creating a conversation with less than 2 participants', async () => {
    const { createConversation } = loadChatService();

    await expect(createConversation(['only-user'])).rejects.toThrow(
      'Conversation requires at least two participants',
    );
  });

  it('sends message in local mode and updates conversation counters', async () => {
    const { sendMessage } = loadChatService();

    mockDb.getChat.mockResolvedValueOnce({
      id: 'conv1',
      participants: ['sender', 'recipient'],
      lastMessageText: '',
      lastMessageTime: '2024-01-01T00:00:00.000Z',
      unreadCount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    mockDb.getChat.mockResolvedValueOnce({
      id: 'conv1',
      participants: ['sender', 'recipient'],
      lastMessageText: '',
      lastMessageTime: '2024-01-01T00:00:00.000Z',
      unreadCount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    mockDb.getChat.mockResolvedValueOnce({
      id: 'conv1',
      participants: ['sender', 'recipient'],
      lastMessageText: '',
      lastMessageTime: '2024-01-01T00:00:00.000Z',
      unreadCount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const result = await sendMessage({
      conversationId: 'conv1',
      senderId: 'sender',
      text: 'hello',
      timestamp: '2024-01-02T00:00:00.000Z',
      read: false,
      type: 'text',
      status: 'sending',
    });

    expect(typeof result).toBe('string');
    expect(mockDb.createMessage).toHaveBeenCalledTimes(2);
    expect(mockDb.createChat).toHaveBeenCalledWith(
      'recipient',
      'conv1',
      expect.objectContaining({ unreadCount: 1, lastMessageText: 'hello' }),
    );
    expect(mockDb.createChat).toHaveBeenCalledWith(
      'sender',
      'conv1',
      expect.objectContaining({ unreadCount: 0, lastMessageText: 'hello' }),
    );
  });
});
