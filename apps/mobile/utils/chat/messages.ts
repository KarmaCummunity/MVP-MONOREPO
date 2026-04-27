import * as configConstants from '../config.constants';
import { sendMessageNotification } from '../notificationService';
import { db, DB_COLLECTIONS, DatabaseService } from '../databaseService';
import { apiService } from '../apiService';
import { logger } from '../loggerService';
import { CHAT_SCOPE } from './constants';
import {
  ChatSendResult,
  Conversation,
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

interface SendMessageState {
  activeConversationId: string;
  participants: string[];
  senderViewExists: boolean;
}

interface BackendMessageSendResponse {
  id?: string;
  conversation_created?: boolean;
  conversation_id?: string;
}

const getBackendFlag = (): boolean => Boolean(configConstants?.USE_BACKEND);

const resolveParticipants = async (
  message: Omit<Message, 'id'>,
  fallbackParticipants?: string[],
): Promise<SendMessageState> => {
  let activeConversationId = message.conversationId;
  let participants = sanitizeParticipants(fallbackParticipants || []);
  const senderView = await getConversationById(activeConversationId, message.senderId);

  if (senderView?.participants?.length) {
    participants = sanitizeParticipants(senderView.participants);
  }

  if (participants.length === 0 && getBackendFlag()) {
    try {
      const convResponse = await apiService.getUserConversations(message.senderId);
      if (convResponse.success && Array.isArray(convResponse.data)) {
        const backendConversations = convResponse.data as BackendConversation[];
        const backendConversation = backendConversations.find(
          (conversation) =>
            conversation.id === activeConversationId ||
            conversation.metadata?.legacy_id === activeConversationId,
        );

        if (backendConversation?.participants) {
          participants = sanitizeParticipants(backendConversation.participants);
          activeConversationId = backendConversation.id;
          await db.createChat(
            message.senderId,
            activeConversationId,
            toConversationModel(backendConversation),
          );
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

  const normalizedParticipants = participants.includes(message.senderId)
    ? participants
    : sanitizeParticipants([...participants, message.senderId]);

  return {
    activeConversationId,
    participants: normalizedParticipants,
    senderViewExists: Boolean(senderView),
  };
};

const ensureFallbackConversation = async (
  senderViewExists: boolean,
  participants: string[],
  activeConversationId: string,
  timestamp: string,
): Promise<void> => {
  if (senderViewExists || participants.length === 0) {
    return;
  }

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
};

const buildBackendMessageData = (
  message: Omit<Message, 'id'>,
  activeConversationId: string,
  participants: string[],
): Record<string, unknown> => {
  const backendMessageData: Record<string, unknown> = {
    conversation_id: activeConversationId,
    sender_id: message.senderId,
    content: message.text || '',
    message_type: message.type || 'text',
    reply_to_id: message.replyTo || null,
    participants,
  };

  if (!message.fileData) {
    return backendMessageData;
  }

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

  return backendMessageData;
};

const syncBackendCreatedConversation = async (
  responseData: BackendMessageSendResponse,
  senderId: string,
  legacyConversationId: string,
  participants: string[],
): Promise<{ activeConversationId: string; participants: string[] }> => {
  const newConversationId = responseData.conversation_id;
  if (!responseData.conversation_created || !newConversationId) {
    return { activeConversationId: legacyConversationId, participants };
  }

  const convResponse = await apiService.getUserConversations(senderId);
  if (!convResponse.success || !Array.isArray(convResponse.data)) {
    return { activeConversationId: newConversationId, participants };
  }

  const createdConversation = (convResponse.data as BackendConversation[]).find(
    (conversation) => conversation.id === newConversationId,
  );
  if (!createdConversation) {
    return { activeConversationId: newConversationId, participants };
  }

  const mappedConversation = toConversationModel(createdConversation);
  const normalizedParticipants = sanitizeParticipants(mappedConversation.participants);

  await Promise.all(
    normalizedParticipants.map(async (participantId) => {
      await db.createChat(participantId, newConversationId, mappedConversation);
      try {
        await DatabaseService.delete(DB_COLLECTIONS.CHATS, participantId, legacyConversationId);
      } catch {
        // ignore missing legacy conversation
      }
    }),
  );

  return { activeConversationId: newConversationId, participants: normalizedParticipants };
};

const sendMessageToBackend = async (
  message: Omit<Message, 'id'>,
  state: SendMessageState,
): Promise<{ messageId: string; backendMessage: BackendMessage | null; state: SendMessageState }> => {
  const initialMessageId = generateId('msg');
  if (!getBackendFlag()) {
    return { messageId: initialMessageId, backendMessage: null, state };
  }

  try {
    const backendMessageData = buildBackendMessageData(
      message,
      state.activeConversationId,
      state.participants,
    );
    const response = await apiService.sendMessage(backendMessageData);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to send message to backend');
    }

    const backendMessage = response.data as BackendMessage;
    const responseData = response.data as BackendMessageSendResponse;
    const syncedConversation = await syncBackendCreatedConversation(
      responseData,
      message.senderId,
      message.conversationId,
      state.participants,
    );

    return {
      messageId: backendMessage.id || initialMessageId,
      backendMessage,
      state: {
        ...state,
        activeConversationId: syncedConversation.activeConversationId,
        participants: syncedConversation.participants,
      },
    };
  } catch (error) {
    logger.error(CHAT_SCOPE, 'Backend send message error, continuing with local persistence', {
      conversationId: state.activeConversationId,
      error: toError(error).message,
    });
    return { messageId: initialMessageId, backendMessage: null, state };
  }
};

const persistMessageAndConversations = async (
  message: Omit<Message, 'id'>,
  messageId: string,
  timestamp: string,
  backendMessage: BackendMessage | null,
  state: SendMessageState,
): Promise<void> => {
  const newMessage: Message = {
    ...message,
    conversationId: state.activeConversationId,
    id: messageId,
    timestamp,
    status: backendMessage ? 'sent' : 'sending',
  };

  await Promise.all(
    state.participants.map((participantId) => db.createMessage(participantId, messageId, newMessage)),
  );

  const displayText = toMessagePreviewText(newMessage);
  await Promise.all(
    state.participants.map(async (participantId) => {
      const existing = await db.getChat(participantId, state.activeConversationId);
      const baseConversation: Conversation = (existing as Conversation | null) || {
        id: state.activeConversationId,
        participants: state.participants,
        lastMessageText: '',
        lastMessageTime: timestamp,
        unreadCount: 0,
        createdAt: timestamp,
      };
      const unreadCount =
        participantId === message.senderId ? 0 : (baseConversation.unreadCount || 0) + 1;
      const updatedConversation: Conversation = {
        ...baseConversation,
        participants: state.participants,
        lastMessageText: displayText,
        lastMessageTime: timestamp,
        unreadCount,
      };
      await db.createChat(participantId, state.activeConversationId, updatedConversation);
    }),
  );
};

const notifyMessageDelivery = async (
  message: Omit<Message, 'id'>,
  backendMessage: BackendMessage | null,
  state: SendMessageState,
): Promise<void> => {
  await Promise.all(
    state.participants.map((participantId) =>
      notifyMessageListeners(state.activeConversationId, participantId, getMessages),
    ),
  );
  await Promise.all(
    state.participants.map((participantId) =>
      notifyConversationListeners(participantId, getConversations),
    ),
  );

  state.participants.forEach((participantId) => {
    if (participantId !== message.senderId) {
      sendMessageNotification('משתמש', message.text, state.activeConversationId, participantId);
    }
  });

  if (getBackendFlag() && backendMessage) {
    setTimeout(() => {
      state.participants.forEach((participantId) => {
        notifyConversationListeners(participantId, getConversations).catch((notifyError) => {
          logger.warn(CHAT_SCOPE, 'Failed to refresh conversations after backend send', {
            participantId,
            error: toError(notifyError).message,
          });
        });
      });
    }, 500);
  }
};

export const sendMessage = async (
  message: Omit<Message, 'id'>,
  fallbackParticipants?: string[],
): Promise<ChatSendResult> => {
  try {
    const timestamp = message.timestamp || nowIso();
    let state = await resolveParticipants(message, fallbackParticipants);
    await ensureFallbackConversation(
      state.senderViewExists,
      state.participants,
      state.activeConversationId,
      timestamp,
    );

    const backendResult = await sendMessageToBackend(message, state);
    state = backendResult.state;

    await persistMessageAndConversations(
      message,
      backendResult.messageId,
      timestamp,
      backendResult.backendMessage,
      state,
    );
    await notifyMessageDelivery(message, backendResult.backendMessage, state);

    if (state.activeConversationId === message.conversationId) {
      return backendResult.messageId;
    }

    return { messageId: backendResult.messageId, newConversationId: state.activeConversationId };
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
