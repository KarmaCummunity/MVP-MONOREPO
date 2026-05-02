import { db, DB_COLLECTIONS, DatabaseService } from '../databaseService';
import { logger } from '../loggerService';
import { CHAT_SCOPE } from './constants';
import { sendMessage } from './messages';
import type { Conversation, Message } from './types';
import { generateId, nowIso, toError, logError } from './utils';
import { getConversations } from './conversations';

export const editMessage = async (
  userId: string,
  messageId: string,
  newText: string
): Promise<void> => {
  try {
    const sanitizedText = newText.trim();
    if (!sanitizedText) {
      throw new Error('Message text cannot be empty');
    }

    await db.updateMessage(userId, messageId, {
      text: sanitizedText,
      edited: true,
      editedAt: nowIso(),
    });

    logger.info(CHAT_SCOPE, 'Message edited', { userId, messageId });
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Edit message error', {
      userId,
      messageId,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};

export const deleteMessage = async (
  userId: string,
  messageId: string,
  deleteForEveryone: boolean = false
): Promise<void> => {
  try {
    if (deleteForEveryone) {
      await db.updateMessage(userId, messageId, {
        deleted: true,
        deletedAt: nowIso(),
        text: 'הודעה זו נמחקה',
      });
    } else {
      await db.deleteMessage(userId, messageId);
    }

    logger.info(CHAT_SCOPE, 'Message deleted', { userId, messageId, deleteForEveryone });
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Delete message error', {
      userId,
      messageId,
      deleteForEveryone,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};

export const addMessageReaction = async (
  userId: string,
  messageId: string,
  emoji: string
): Promise<void> => {
  try {
    const normalizedEmoji = emoji.trim();
    if (!normalizedEmoji) {
      throw new Error('Reaction emoji is required');
    }

    const reactionId = generateId('reaction');
    await db.addReaction(userId, reactionId, {
      id: reactionId,
      messageId,
      userId,
      emoji: normalizedEmoji,
      timestamp: nowIso(),
    });

    logger.info(CHAT_SCOPE, 'Reaction added', { userId, messageId, reactionId });
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Add reaction error', {
      userId,
      messageId,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};

export const removeMessageReaction = async (
  userId: string,
  reactionId: string
): Promise<void> => {
  try {
    await db.removeReaction(userId, reactionId);
    logger.info(CHAT_SCOPE, 'Reaction removed', { userId, reactionId });
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Remove reaction error', {
      userId,
      reactionId,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};

export const sendVoiceMessage = async (
  conversationId: string,
  senderId: string,
  voiceData: {
    uri: string;
    duration: number;
    mimeType: string;
  }
): Promise<string> => {
  try {
    if (!conversationId.trim() || !senderId.trim()) {
      throw new Error('conversationId and senderId are required');
    }
    if (!voiceData.uri?.trim()) {
      throw new Error('Voice message uri is required');
    }
    if (!voiceData.mimeType?.trim()) {
      throw new Error('Voice message mimeType is required');
    }
    if (!Number.isFinite(voiceData.duration) || voiceData.duration <= 0) {
      throw new Error('Voice message duration must be a positive number');
    }

    const timestamp = nowIso();
    const voiceId = generateId('voice');
    const messageId = generateId('msg');

    await db.saveVoiceMessage(senderId, voiceId, {
      id: voiceId,
      uri: voiceData.uri,
      duration: voiceData.duration,
      mimeType: voiceData.mimeType,
      timestamp,
    });

    const message: Message = {
      id: messageId,
      conversationId,
      senderId,
      text: '🎤 הודעה קולית',
      timestamp,
      read: false,
      type: 'voice',
      status: 'sent',
      fileData: {
        id: voiceId,
        name: 'voice_message.m4a',
        uri: voiceData.uri,
        type: 'voice',
        duration: voiceData.duration,
        mimeType: voiceData.mimeType,
      },
    };

    await sendMessage(message);
    return messageId;
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Send voice message error', {
      conversationId,
      senderId,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};

export const searchMessages = async (
  userId: string,
  searchQuery: string
): Promise<Message[]> => {
  try {
    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      return [];
    }

    const results = await db.searchMessages(userId, normalizedQuery);
    return results as Message[];
  } catch (error) {
    logError('Search messages error', error, { userId });
    return [];
  }
};

export const getMessageReactions = async (
  userId: string,
  messageId: string
): Promise<Array<{ userId: string; emoji: string; timestamp: string }>> => {
  try {
    const reactions = await db.getMessageReactions(userId, messageId);
    return (reactions as Array<{ userId: string; emoji: string; timestamp: string }>).filter(
      (reaction) => Boolean(reaction?.userId && reaction?.emoji && reaction?.timestamp),
    );
  } catch (error) {
    logError('Get reactions error', error, { userId, messageId });
    return [];
  }
};

export const setTypingStatus = async (
  userId: string,
  conversationId: string,
  isTyping: boolean
): Promise<void> => {
  try {
    if (isTyping) {
      await db.setTypingStatus(userId, conversationId, {
        userId,
        conversationId,
        isTyping: true,
        timestamp: nowIso(),
      });
    } else {
      await db.clearTypingStatus(userId, conversationId);
    }
  } catch (error) {
    logError('Set typing status error', error, { userId, conversationId, isTyping });
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
    const existingConversation = conversations.find((conversation) =>
      conversation.participants.includes(userId) &&
      conversation.participants.includes(otherUserId) &&
      conversation.participants.length === 2
    );
    return existingConversation ? existingConversation.id : null;
  } catch (error) {
    logError('Check conversation exists error', error, { userId, otherUserId });
    return null;
  }
};

export const debugDatabaseContent = async (userId: string): Promise<void> => {
  try {
    logger.debug(CHAT_SCOPE, '=== DATABASE DEBUG ===');
    logger.debug(CHAT_SCOPE, 'User ID', { userId });

    const chats = await db.getUserChats(userId);
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
