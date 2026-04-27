import { DB_COLLECTIONS, DatabaseService } from '../databaseService';
import { logger } from '../loggerService';
import { CHAT_SCOPE } from './constants';
import { getConversations } from './conversations';
import { getMessages } from './messages';
import { Conversation } from './types';
import { logError, nowIso, toError } from './utils';

export const deleteConversation = async (conversationId: string, userId: string): Promise<void> => {
  try {
    await DatabaseService.delete(DB_COLLECTIONS.CHATS, userId, conversationId);

    const messages = await getMessages(conversationId, userId);
    const messageIds = messages.map(msg => msg.id);
    await DatabaseService.batchDelete(DB_COLLECTIONS.MESSAGES, userId, messageIds);

    logger.info(CHAT_SCOPE, 'Conversation deleted', { conversationId, userId });
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Delete conversation error', {
      conversationId,
      userId,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};

export const clearAllData = async (userId?: string): Promise<void> => {
  try {
    if (userId) {
      await DatabaseService.deleteUserData(userId);
      logger.info(CHAT_SCOPE, 'All chat data cleared for user', { userId });
    } else {
      await DatabaseService.clearAllData();
      logger.info(CHAT_SCOPE, 'All chat data cleared');
    }
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Clear data error', {
      userId,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};

export const createSampleData = async (): Promise<void> => {
  try {
    logger.info(CHAT_SCOPE, 'Sample data creation disabled to prevent overwriting real conversations');
  } catch (error) {
    logError('Create sample data error', error);
  }
};

export const createSampleChatData = async (userId: string): Promise<void> => {
  try {
    logger.info(CHAT_SCOPE, 'Creating sample chat data for user', { userId });

    const timestamp = nowIso();
    const sampleConversations: Conversation[] = [
      {
        id: 'conv_sample_1',
        participants: [userId, 'char2'],
        lastMessageText: 'היי! איך אתה?',
        lastMessageTime: timestamp,
        unreadCount: 1,
        createdAt: timestamp,
      },
      {
        id: 'conv_sample_2',
        participants: [userId, 'char3'],
        lastMessageText: 'תודה על העזרה!',
        lastMessageTime: timestamp,
        unreadCount: 0,
        createdAt: timestamp,
      },
    ];

    const sampleMessages = [
      {
        id: 'msg_sample_1',
        conversationId: 'conv_sample_1',
        senderId: 'char2',
        text: 'היי! איך אתה?',
        timestamp,
        read: false,
        type: 'text' as const,
        status: 'sent' as const,
      },
      {
        id: 'msg_sample_2',
        conversationId: 'conv_sample_1',
        senderId: userId,
        text: 'מעולה, תודה! איך אתה?',
        timestamp,
        read: true,
        type: 'text' as const,
        status: 'sent' as const,
      },
      {
        id: 'msg_sample_3',
        conversationId: 'conv_sample_2',
        senderId: 'char3',
        text: 'תודה על העזרה!',
        timestamp,
        read: true,
        type: 'text' as const,
        status: 'sent' as const,
      },
    ];

    const mode = await (async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        return await AsyncStorage.getItem('auth_mode');
      } catch {
        return null;
      }
    })();
    if (mode === 'real') {
      logger.info(CHAT_SCOPE, 'Skipping sample chat data creation in real auth mode');
      return;
    }

    for (const conversation of sampleConversations) {
      await DatabaseService.create(DB_COLLECTIONS.CHATS, userId, conversation.id, conversation);
    }

    for (const message of sampleMessages) {
      await DatabaseService.create(DB_COLLECTIONS.MESSAGES, userId, message.id, message);
    }

    logger.info(CHAT_SCOPE, 'Sample chat data created for user', {
      userId,
      conversationCount: sampleConversations.length,
      messageCount: sampleMessages.length,
    });
  } catch (error) {
    logError('Create sample chat data error', error, { userId });
  }
};

export const getAllConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    return await getConversations(userId);
  } catch (error) {
    logError('Get all conversations error', error, { userId });
    return [];
  }
};

export const conversationExists = async (
  userId: string,
  otherUserId: string
): Promise<string | null> => {
  try {
    const conversations = await getAllConversations(userId);
    const existingConv = conversations.find(conv =>
      conv.participants.includes(userId) &&
      conv.participants.includes(otherUserId) &&
      conv.participants.length === 2
    );
    return existingConv ? existingConv.id : null;
  } catch (error) {
    logError('Check conversation exists error', error, { userId, otherUserId });
    return null;
  }
};

export const debugDatabaseContent = async (userId: string) => {
  try {
    logger.debug(CHAT_SCOPE, '=== DATABASE DEBUG ===');
    logger.debug(CHAT_SCOPE, 'User ID', { userId });

    const chats = await DatabaseService.list(DB_COLLECTIONS.CHATS, userId);
    logger.debug(CHAT_SCOPE, 'Total Chats', { count: chats.length });
    chats.forEach((chat: Conversation) => {
      logger.debug(CHAT_SCOPE, 'Chat', {
        id: chat.id,
        participants: chat.participants,
        lastMessage: chat.lastMessageText,
        lastTime: chat.lastMessageTime,
      });
    });

    const messages = await DatabaseService.list(DB_COLLECTIONS.MESSAGES, userId);
    logger.debug(CHAT_SCOPE, 'Total Messages', { count: messages.length });

    logger.debug(CHAT_SCOPE, '=== END DEBUG ===');
  } catch (error) {
    logError('Debug error', error, { userId });
  }
};
