import * as configConstants from '../config.constants';
import { sendMessageNotification } from '../notificationService';
import { db, DB_COLLECTIONS, DatabaseService } from '../databaseService';
import { apiService } from '../apiService';
import { logger } from '../loggerService';
import { CHAT_SCOPE } from './constants';
import {
  ChatSendResult,
  Message,
  BackendMessage,
  BackendConversation,
} from './types';
import {
  nowIso,
  sanitizeParticipants,
  generateId,
  toMessagePreviewText,
  toConversationModel,
  toMessageModel,
  sortMessagesByTimestamp,
  toError,
  logError,
} from './utils';
import { getConversationById, getConversations } from './conversations';
import { notifyConversationListeners, notifyMessageListeners } from './realtime';

export const sendMessage = async (
  message: Omit<Message, 'id'>,
  fallbackParticipants?: string[],
): Promise<ChatSendResult> => {
  try {
    const timestamp = message.timestamp || nowIso();
    let activeConversationId = message.conversationId;
    let participants = sanitizeParticipants(fallbackParticipants || []);
    let messageId = generateId('msg');
    let backendMessage: BackendMessage | null = null;

    const senderView = await getConversationById(activeConversationId, message.senderId);
    if (senderView?.participants?.length) {
      participants = sanitizeParticipants(senderView.participants);
    }

    if (participants.length === 0 && configConstants.USE_BACKEND) {
      try {
        const convResponse = await apiService.getUserConversations(message.senderId);
        if (convResponse.success && Array.isArray(convResponse.data)) {
          const backendConversations = convResponse.data as BackendConversation[];
          const backendConv = backendConversations.find(
            (conversation) =>
              conversation.id === activeConversationId ||
              conversation.metadata?.legacy_id === activeConversationId,
          );

          if (backendConv && backendConv.participants) {
            participants = sanitizeParticipants(backendConv.participants);
            activeConversationId = backendConv.id;
            await db.createChat(message.senderId, activeConversationId, toConversationModel(backendConv));
          }
        }
      } catch (error) {
        logger.warn(CHAT_SCOPE, 'Failed to resolve participants from backend conversation', {
          conversationId: activeConversationId,
          error: toError(error).message,
        });
      }
    }

    if (participants.length === 0) {
      throw new Error('Conversation participants could not be resolved');
    }

    if (!participants.includes(message.senderId)) {
      participants = sanitizeParticipants([...participants, message.senderId]);
    }

    if (!senderView && participants.length > 0) {
      const fallbackConversation = {
        id: activeConversationId,
        participants,
        lastMessageText: '',
        lastMessageTime: timestamp,
        unreadCount: 0,
        createdAt: timestamp,
      };
      await Promise.all(
        participants.map((participantId) =>
          db.createChat(participantId, activeConversationId, fallbackConversation),
        ),
      );
    }

    if (configConstants.USE_BACKEND) {
      try {
        const backendMessageData: Record<string, unknown> = {
          conversation_id: activeConversationId,
          sender_id: message.senderId,
          content: message.text || '',
          message_type: message.type || 'text',
          reply_to_id: message.replyTo || null,
          participants,
        };

        if (message.fileData) {
          backendMessageData.file_url = message.fileData.uri;
          backendMessageData.file_name = message.fileData.name;
          backendMessageData.file_size = message.fileData.size || null;
          backendMessageData.file_type = message.fileData.mimeType || message.fileData.type;
          if (message.fileData.thumbnail || message.fileData.duration || message.fileData.dimensions) {
            backendMessageData.metadata = JSON.stringify({
              thumbnail: message.fileData.thumbnail,
              duration: message.fileData.duration,
              dimensions: message.fileData.dimensions,
            });
          }
        }

        const response = await apiService.sendMessage(backendMessageData);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to send message to backend');
        }

        backendMessage = response.data as BackendMessage;
        messageId = backendMessage.id || messageId;

        if ((response.data as BackendMessage).conversation_created && response.data.conversation_id) {
          activeConversationId = response.data.conversation_id;
          const convResponse = await apiService.getUserConversations(message.senderId);
          if (convResponse.success && Array.isArray(convResponse.data)) {
            const createdConversation = (convResponse.data as BackendConversation[]).find(
              (conversation) => conversation.id === activeConversationId,
            );
            if (createdConversation) {
              const mappedConversation = toConversationModel(createdConversation);
              participants = sanitizeParticipants(mappedConversation.participants);
              await Promise.all(
                participants.map(async (participantId) => {
                  await db.createChat(participantId, activeConversationId, mappedConversation);
                  try {
                    await DatabaseService.delete(DB_COLLECTIONS.CHATS, participantId, message.conversationId);
                  } catch {
                    // ignore missing legacy conversation
                  }
                }),
              );
            }
          }
        }
      } catch (error) {
        logger.error(CHAT_SCOPE, 'Backend send message error, continuing with local persistence', {
          conversationId: activeConversationId,
          error: toError(error).message,
        });
      }
    }

    const newMessage: Message = {
      ...message,
      conversationId: activeConversationId,
      id: messageId,
      timestamp,
      status: backendMessage ? 'sent' : 'sending',
    };

    await Promise.all(
      participants.map((participantId) => db.createMessage(participantId, messageId, newMessage)),
    );

    const displayText = toMessagePreviewText(newMessage);
    await Promise.all(
      participants.map(async (participantId) => {
        const existing = await db.getChat(participantId, activeConversationId);
        const baseConversation = (existing as any) || {
          id: activeConversationId,
          participants,
          lastMessageText: '',
          lastMessageTime: timestamp,
          unreadCount: 0,
          createdAt: timestamp,
        };
        const unreadCount =
          participantId === message.senderId ? 0 : (baseConversation.unreadCount || 0) + 1;
        const updatedConversation = {
          ...baseConversation,
          participants,
          lastMessageText: displayText,
          lastMessageTime: timestamp,
          unreadCount,
        };
        await db.createChat(participantId, activeConversationId, updatedConversation);
      }),
    );

    await Promise.all(
      participants.map((participantId) =>
        notifyMessageListeners(activeConversationId, participantId, getMessages),
      ),
    );
    await Promise.all(
      participants.map((participantId) => notifyConversationListeners(participantId, getConversations)),
    );

    participants.forEach((participantId) => {
      if (participantId !== message.senderId) {
        sendMessageNotification('משתמש', message.text, activeConversationId, participantId);
      }
    });

    if (configConstants.USE_BACKEND && backendMessage) {
      setTimeout(() => {
        participants.forEach((participantId) => {
          notifyConversationListeners(participantId, getConversations).catch((notifyError) => {
            logger.warn(CHAT_SCOPE, 'Failed to refresh conversations after backend send', {
              participantId,
              error: toError(notifyError).message,
            });
          });
        });
      }, 500);
    }

    return activeConversationId !== message.conversationId
      ? { messageId, newConversationId: activeConversationId }
      : messageId;
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Send message error', { error: resolvedError.message });
    throw resolvedError;
  }
};

export const getMessages = async (conversationId: string, userId: string): Promise<Message[]> => {
  try {
    if (configConstants.USE_BACKEND) {
      try {
        const response = await apiService.getConversationMessages(conversationId, 100, 0);

        if (response.success && response.data && Array.isArray(response.data)) {
          const messages = sortMessagesByTimestamp(
            (response.data as BackendMessage[]).map(toMessageModel),
          );
          await Promise.all(messages.map((msg) => db.createMessage(userId, msg.id, msg)));
          logger.debug(CHAT_SCOPE, 'Got messages from backend', { conversationId, count: messages.length });
          return messages;
        }
        logger.warn(CHAT_SCOPE, 'Backend returned invalid messages response, falling back to local', {
          conversationId,
        });
      } catch (backendError) {
        logger.error(CHAT_SCOPE, 'Backend get messages error', {
          conversationId,
          error: toError(backendError).message,
        });
      }
    }

    const messages = await db.getChatMessages(userId, conversationId);
    return sortMessagesByTimestamp(messages as Message[]);
  } catch (error) {
    logger.error(CHAT_SCOPE, 'Get messages error', {
      conversationId,
      userId,
      error: toError(error).message,
    });
    return [];
  }
};

export const markMessagesAsRead = async (conversationId: string, userId: string): Promise<void> => {
  try {
    logger.info(CHAT_SCOPE, 'Marking messages as read', { conversationId, userId });

    if (configConstants.USE_BACKEND) {
      try {
        const response = await apiService.markAllMessagesAsRead(conversationId, userId);
        if (response.success) {
          logger.info(CHAT_SCOPE, 'Messages marked as read on backend', {
            conversationId,
            markedCount: response.data?.marked_read || 0,
          });
        } else {
          logger.warn(CHAT_SCOPE, 'Backend mark as read failed, falling back to local', {
            conversationId,
            userId,
            error: response.error,
          });
        }
      } catch (backendError) {
        logError('Backend mark as read error, falling back to local', backendError, {
          conversationId,
          userId,
        });
      }
    }

    const messages = await getMessages(conversationId, userId);
    logger.debug(CHAT_SCOPE, 'Found total messages', { conversationId, userId, count: messages.length });

    await Promise.all(
      messages
        .filter((message) => message.conversationId === conversationId && message.senderId !== userId && !message.read)
        .map((message) =>
          DatabaseService.update(DB_COLLECTIONS.MESSAGES, userId, message.id, { read: true }),
        ),
    );

    const conversation = await getConversationById(conversationId, userId);
    if (conversation) {
      await db.createChat(userId, conversationId, { ...conversation, unreadCount: 0 });
      logger.debug(CHAT_SCOPE, 'Conversation unread count reset to 0', { conversationId, userId });
    } else {
      logger.warn(CHAT_SCOPE, 'Conversation not found while marking read', { conversationId, userId });
    }

    logger.info(CHAT_SCOPE, 'Messages marked as read', { conversationId, userId });
  } catch (error) {
    const resolvedError = toError(error);
    logger.error(CHAT_SCOPE, 'Mark as read error', {
      conversationId,
      userId,
      error: resolvedError.message,
    });
    throw resolvedError;
  }
};
