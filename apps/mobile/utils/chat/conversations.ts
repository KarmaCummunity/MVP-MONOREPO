import { apiService } from '../apiService';
import { db } from '../databaseService';
import { logger } from '../loggerService';
import * as config from '../config.constants';
import { CHAT_SCOPE } from './constants';
import { BackendConversation, Conversation } from './types';
import {
  dedupeConversations,
  sanitizeParticipants,
  sortConversationsByLastMessage,
  toError,
  toConversationModel,
  nowIso,
  generateId,
} from './utils';
import { notifyConversationListeners } from './realtime';

export const createConversation = async (participants: string[]): Promise<string> => {
  try {
    const normalizedParticipants = sanitizeParticipants(participants);
    if (normalizedParticipants.length < 2) {
      throw new Error('Conversation requires at least two participants');
    }

    let conversationId: string;
    if (config.USE_BACKEND) {
      const response = await apiService.createConversation({
        participants: normalizedParticipants,
        type: 'direct',
        created_by: normalizedParticipants[0],
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create conversation on backend');
      }
      conversationId = response.data.id;
      logger.info(CHAT_SCOPE, 'Conversation created on backend', { conversationId });
    } else {
      conversationId = generateId('conv');
      logger.info(CHAT_SCOPE, 'Conversation created locally', { conversationId });
    }

    const createdAt = nowIso();
    const newConversation: Conversation = {
      id: conversationId,
      participants: normalizedParticipants,
      lastMessageText: '',
      lastMessageTime: createdAt,
      unreadCount: 0,
      createdAt,
    };

    await Promise.all(
      normalizedParticipants.map((participantId) =>
        db.createChat(participantId, conversationId, { ...newConversation, unreadCount: 0 }),
      ),
    );
    await Promise.all(
      normalizedParticipants.map((participantId) =>
        notifyConversationListeners(participantId, getConversations),
      ),
    );

    return conversationId;
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Create conversation error', { error: resolvedError.message });
    throw resolvedError;
  }
};

export const getConversations = async (userId: string): Promise<Conversation[]> => {
  const loadLocalConversations = async (): Promise<Conversation[]> => {
    const conversations = (await db.getUserChats(userId)) as Conversation[];
    logger.debug(CHAT_SCOPE, 'Loaded conversations from local store', {
      userId,
      count: conversations.length,
    });
    return sortConversationsByLastMessage(conversations);
  };

  try {
    logger.info(CHAT_SCOPE, 'Getting conversations for user', { userId });

    if (config.USE_BACKEND) {
      const response = await apiService.getUserConversations(userId);
      if (response.success && response.data && Array.isArray(response.data)) {
        const backendConversations = response.data as BackendConversation[];
        const mappedConversations = backendConversations.map(toConversationModel);
        const uniqueConversations = sortConversationsByLastMessage(
          dedupeConversations(mappedConversations),
        );

        await Promise.all(
          uniqueConversations.map((conversation) => db.createChat(userId, conversation.id, conversation)),
        );

        logger.debug(CHAT_SCOPE, 'Got conversations from backend', {
          count: uniqueConversations.length,
          originalCount: mappedConversations.length,
        });
        return uniqueConversations;
      }

      logger.warn(CHAT_SCOPE, 'Backend returned invalid conversations response, falling back to local', {
        userId,
      });
    }

    return await loadLocalConversations();
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Get conversations error', { userId, error: resolvedError.message });
    try {
      return await loadLocalConversations();
    } catch (fallbackError) {
      logger.error(CHAT_SCOPE, 'Fallback to local storage also failed', {
        userId,
        error: toError(fallbackError).message,
      });
      return [];
    }
  }
};

export const getConversationById = async (
  conversationId: string,
  userId: string,
): Promise<Conversation | null> => {
  try {
    const conversation = await db.getChat(userId, conversationId);
    return conversation as Conversation | null;
  } catch (error) {
    logger.error(CHAT_SCOPE, 'Get conversation error', {
      userId,
      conversationId,
      error: toError(error).message,
    });
    return null;
  }
};

export const getAllConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    return await getConversations(userId);
  } catch (error) {
    logger.error(CHAT_SCOPE, 'Get all conversations error', {
      userId,
      error: toError(error).message,
    });
    return [];
  }
};

export const conversationExists = async (
  userId: string,
  otherUserId: string,
): Promise<string | null> => {
  try {
    const conversations = await getAllConversations(userId);
    const existingConversation = conversations.find(
      (conversation) =>
        conversation.participants.includes(userId) &&
        conversation.participants.includes(otherUserId) &&
        conversation.participants.length === 2,
    );
    return existingConversation ? existingConversation.id : null;
  } catch (error) {
    logger.error(CHAT_SCOPE, 'Check conversation exists error', {
      userId,
      otherUserId,
      error: toError(error).message,
    });
    return null;
  }
};
