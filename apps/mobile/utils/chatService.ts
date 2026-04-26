import { USE_FIRESTORE, USE_BACKEND } from './config.constants';
import { getFirebase } from './firebaseClient';
import { collection as fsCollection, query as fsQuery, where as fsWhere, onSnapshot } from 'firebase/firestore';
import { sendMessageNotification } from './notificationService';
import { db, DB_COLLECTIONS, DatabaseService } from './databaseService';
import { apiService } from './apiService';
import { logger } from './loggerService';

export interface Conversation {
  id: string;
  participants: string[];
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'location';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  fileData?: {
    id: string;
    name: string;
    uri: string;
    type: 'image' | 'video' | 'file' | 'voice';
    size?: number;
    mimeType?: string;
    thumbnail?: string;
    duration?: number; // for audio/video
    dimensions?: { width: number; height: number }; // for images/videos
  };
  replyTo?: string; // ID of message being replied to
  edited?: boolean;
  editedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  reactions?: Array<{
    userId: string;
    emoji: string;
    timestamp: string;
  }>;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface BackendConversation {
  id: string;
  participants?: string[];
  last_message_content?: string | null;
  last_message_time?: string | null;
  unread_count?: number | null;
  created_at?: string;
  updated_at?: string;
  metadata?: { legacy_id?: string };
}

interface BackendMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string | null;
  created_at: string;
  message_type?: Message['type'];
  reply_to_id?: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  metadata?: unknown;
  conversation_created?: boolean;
}

type MessageListener = (messages: Message[]) => void;
type ConversationListener = (conversations: Conversation[]) => void;
type ChatSendResult = string | { messageId: string; newConversationId?: string };

const CHAT_SCOPE = 'ChatService';
const MESSAGE_POLL_INTERVAL_MS = 2_000;
const CONVERSATION_POLL_INTERVAL_MS = 5_000;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const nowIso = (): string => new Date().toISOString();

const sanitizeParticipants = (participants: string[]): string[] =>
  [...new Set((participants || []).map((id) => id.trim()).filter(Boolean))];

const logError = (action: string, error: unknown, context?: Record<string, unknown>): void => {
  const normalizedError = toError(error);
  logger.error(CHAT_SCOPE, action, {
    ...context,
    error: normalizedError.message,
  });
};

const buildMessageListenerKey = (conversationId: string, userId: string): string =>
  `${conversationId}_${userId}`;

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

const toMessagePreviewText = (message: Pick<Message, 'type' | 'text'>): string => {
  if (message.type === 'image') return '📷 תמונה';
  if (message.type === 'video') return '🎥 סרטון';
  if (message.type === 'file') return '📎 קובץ';
  return message.text;
};

const toConversationModel = (conversation: BackendConversation): Conversation => ({
  id: conversation.id,
  participants: conversation.participants || [],
  lastMessageText: conversation.last_message_content || '',
  lastMessageTime:
    conversation.last_message_time ||
    conversation.updated_at ||
    conversation.created_at ||
    nowIso(),
  unreadCount: conversation.unread_count || 0,
  createdAt: conversation.created_at || nowIso(),
});

const dedupeConversations = (conversations: Conversation[]): Conversation[] => {
  const uniqueMap = new Map<string, Conversation>();
  for (const conversation of conversations) {
    const key = [...(conversation.participants || [])].sort((a, b) => a.localeCompare(b)).join(',');
    const existing = uniqueMap.get(key);
    if (!existing) {
      uniqueMap.set(key, conversation);
      continue;
    }

    const existingTime = new Date(existing.lastMessageTime).getTime();
    const newTime = new Date(conversation.lastMessageTime).getTime();
    if (
      newTime > existingTime ||
      (newTime === existingTime && conversation.lastMessageText && !existing.lastMessageText)
    ) {
      uniqueMap.set(key, conversation);
    }
  }
  return Array.from(uniqueMap.values());
};

const sortConversationsByLastMessage = (conversations: Conversation[]): Conversation[] =>
  [...conversations].sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

const sortMessagesByTimestamp = (messages: Message[]): Message[] =>
  [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

const toMessageModel = (message: BackendMessage): Message => {
  const model: Message = {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    text: message.content || '',
    timestamp: message.created_at,
    read: false,
    type: (message.message_type || 'text') as Message['type'],
    status: 'sent',
    replyTo: message.reply_to_id || undefined,
    edited: message.is_edited || false,
    editedAt: message.edited_at || undefined,
    deleted: message.is_deleted || false,
    deletedAt: message.deleted_at || undefined,
  };

  if (message.file_url) {
    model.fileData = {
      id: message.id,
      name: message.file_name || 'file',
      uri: message.file_url,
      type: ((message.file_type || message.message_type || 'file') as 'image' | 'video' | 'file' | 'voice'),
      size: message.file_size || undefined,
      mimeType: message.file_type || undefined,
    };

    if (message.metadata) {
      try {
        const metadata =
          typeof message.metadata === 'string'
            ? JSON.parse(message.metadata)
            : (message.metadata as {
                thumbnail?: string;
                duration?: number;
                dimensions?: { width: number; height: number };
              });
        if (metadata.thumbnail) model.fileData.thumbnail = metadata.thumbnail;
        if (metadata.duration) model.fileData.duration = metadata.duration;
        if (metadata.dimensions) model.fileData.dimensions = metadata.dimensions;
      } catch (error) {
        logger.warn(CHAT_SCOPE, 'Failed to parse message metadata', { error: toError(error).message });
      }
    }
  }

  return model;
};

const messageListeners: Map<string, Set<MessageListener>> = new Map();
const conversationListeners: Map<string, Set<ConversationListener>> = new Map();
const messagePollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
const conversationPollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

export const createConversation = async (participants: string[]): Promise<string> => {
  try {
    const normalizedParticipants = sanitizeParticipants(participants);
    if (normalizedParticipants.length < 2) {
      throw new Error('Conversation requires at least two participants');
    }

    let conversationId: string;

    if (USE_BACKEND) {
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

    const newConversation: Conversation = {
      id: conversationId,
      participants: normalizedParticipants,
      lastMessageText: '',
      lastMessageTime: nowIso(),
      unreadCount: 0,
      createdAt: nowIso(),
    };

    await Promise.all(
      normalizedParticipants.map((participantId) =>
        db.createChat(participantId, conversationId, { ...newConversation, unreadCount: 0 })
      )
    );
    await Promise.all(normalizedParticipants.map((participantId) => notifyConversationListeners(participantId)));

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
    logger.debug(CHAT_SCOPE, 'Loaded conversations from local store', { userId, count: conversations.length });
    return sortConversationsByLastMessage(conversations);
  };

  try {
    logger.info(CHAT_SCOPE, 'Getting conversations for user', { userId });

    if (USE_BACKEND) {
      const response = await apiService.getUserConversations(userId);

      if (response.success && response.data && Array.isArray(response.data)) {
        const backendConversations = response.data as BackendConversation[];
        const mappedConversations = backendConversations.map(toConversationModel);
        const uniqueConversations = sortConversationsByLastMessage(
          dedupeConversations(mappedConversations)
        );

        await Promise.all(uniqueConversations.map((conversation) => db.createChat(userId, conversation.id, conversation)));

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
    logger.error(CHAT_SCOPE, 'Get conversations error', {
      userId,
      error: resolvedError.message,
    });

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

export const getConversationById = async (conversationId: string, userId: string): Promise<Conversation | null> => {
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

export const sendMessage = async (
  message: Omit<Message, 'id'>,
  fallbackParticipants?: string[]
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

    if (participants.length === 0 && USE_BACKEND) {
      try {
        const convResponse = await apiService.getUserConversations(message.senderId);
        if (convResponse.success && Array.isArray(convResponse.data)) {
          const backendConversations = convResponse.data as BackendConversation[];
          const backendConv = backendConversations.find(
            (conversation) =>
              conversation.id === activeConversationId ||
              conversation.metadata?.legacy_id === activeConversationId
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
      const fallbackConversation: Conversation = {
        id: activeConversationId,
        participants,
        lastMessageText: '',
        lastMessageTime: timestamp,
        unreadCount: 0,
        createdAt: timestamp,
      };
      await Promise.all(
        participants.map((participantId) =>
          db.createChat(participantId, activeConversationId, fallbackConversation)
        )
      );
    }

    if (USE_BACKEND) {
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
              (conversation) => conversation.id === activeConversationId
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
                })
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
      participants.map((participantId) => db.createMessage(participantId, messageId, newMessage))
    );

    const displayText = toMessagePreviewText(newMessage);
    await Promise.all(
      participants.map(async (participantId) => {
        const existing = await db.getChat(participantId, activeConversationId);
        const baseConversation: Conversation = (existing as Conversation) || {
          id: activeConversationId,
          participants,
          lastMessageText: '',
          lastMessageTime: timestamp,
          unreadCount: 0,
          createdAt: timestamp,
        };
        const unreadCount =
          participantId === message.senderId ? 0 : (baseConversation.unreadCount || 0) + 1;
        const updatedConversation: Conversation = {
          ...baseConversation,
          participants,
          lastMessageText: displayText,
          lastMessageTime: timestamp,
          unreadCount,
        };
        await db.createChat(participantId, activeConversationId, updatedConversation);
      })
    );

    await Promise.all(participants.map((participantId) => notifyMessageListeners(activeConversationId, participantId)));
    await Promise.all(participants.map((participantId) => notifyConversationListeners(participantId)));

    participants.forEach((participantId) => {
      if (participantId !== message.senderId) {
        sendMessageNotification('משתמש', message.text, activeConversationId, participantId);
      }
    });

    if (USE_BACKEND && backendMessage) {
      setTimeout(() => {
        participants.forEach((participantId) => {
          notifyConversationListeners(participantId).catch((notifyError) => {
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
    if (USE_BACKEND) {
      try {
        // Get messages from backend
        const response = await apiService.getConversationMessages(conversationId, 100, 0);

        if (response.success && response.data && Array.isArray(response.data)) {
          const messages = sortMessagesByTimestamp(
            (response.data as BackendMessage[]).map(toMessageModel)
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

    if (USE_BACKEND) {
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
          DatabaseService.update(DB_COLLECTIONS.MESSAGES, userId, message.id, { read: true })
        )
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

// Real-time listener for messages (improved with centralized polling lifecycle)
export const subscribeToMessages = (
  conversationId: string,
  userId: string,
  callback: (messages: Message[]) => void,
) => {
  const key = buildMessageListenerKey(conversationId, userId);
  if (!messageListeners.has(key)) {
    messageListeners.set(key, new Set());
  }
  messageListeners.get(key)!.add(callback);

  if (USE_FIRESTORE) {
    const { db } = getFirebase();
    const col = fsCollection(db, DB_COLLECTIONS.MESSAGES);
    const q = fsQuery(col, fsWhere('_userId', '==', userId), fsWhere('conversationId', '==', conversationId));
    const unsub = onSnapshot(q, async (snap) => {
      const items = sortMessagesByTimestamp(snap.docs.map((d) => d.data() as Message));
      callback(items);
    });

    return () => {
      unsub();
      const listeners = messageListeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          messageListeners.delete(key);
        }
      }
    };
  }

  if (!messagePollingIntervals.has(key)) {
    const poll = async () => {
      const listeners = messageListeners.get(key);
      if (!listeners || listeners.size === 0) {
        const interval = messagePollingIntervals.get(key);
        if (interval) {
          clearInterval(interval);
          messagePollingIntervals.delete(key);
        }
        return;
      }

      try {
        const messages = await getMessages(conversationId, userId);
        listeners.forEach((listener) => listener(messages));
      } catch (error) {
        logError('Message polling failed', error, { conversationId, userId });
      }
    };

    void poll();
    const interval = setInterval(poll, MESSAGE_POLL_INTERVAL_MS);
    messagePollingIntervals.set(key, interval);
  } else {
    void getMessages(conversationId, userId).then((messages) => callback(messages));
  }

  return () => {
    const listeners = messageListeners.get(key);
    if (!listeners) {
      return;
    }
    listeners.delete(callback);
    if (listeners.size === 0) {
      messageListeners.delete(key);
      const interval = messagePollingIntervals.get(key);
      if (interval) {
        clearInterval(interval);
        messagePollingIntervals.delete(key);
      }
    }
  };
};

// Real-time listener for conversations
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void,
) => {
  if (!conversationListeners.has(userId)) {
    conversationListeners.set(userId, new Set());
  }
  conversationListeners.get(userId)!.add(callback);

  if (USE_FIRESTORE) {
    const { db } = getFirebase();
    const col = fsCollection(db, DB_COLLECTIONS.CHATS);
    const q = fsQuery(col, fsWhere('_userId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      const items = sortConversationsByLastMessage(
        snap.docs.map((d) => d.data() as Conversation),
      );
      callback(items);
    });

    return () => {
      unsub();
      const listeners = conversationListeners.get(userId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          conversationListeners.delete(userId);
        }
      }
    };
  }

  if (!conversationPollingIntervals.has(userId)) {
    const poll = async () => {
      const listeners = conversationListeners.get(userId);
      if (!listeners || listeners.size === 0) {
        const interval = conversationPollingIntervals.get(userId);
        if (interval) {
          clearInterval(interval);
          conversationPollingIntervals.delete(userId);
        }
        return;
      }

      try {
        const conversations = await getConversations(userId);
        listeners.forEach((listener) => listener(conversations));
      } catch (error) {
        logError('Conversation polling failed', error, { userId });
      }
    };

    void poll();
    const interval = setInterval(poll, CONVERSATION_POLL_INTERVAL_MS);
    conversationPollingIntervals.set(userId, interval);
  } else {
    void getConversations(userId).then((conversations) => callback(conversations));
  }

  return () => {
    const listeners = conversationListeners.get(userId);
    if (!listeners) {
      return;
    }
    listeners.delete(callback);
    if (listeners.size === 0) {
      conversationListeners.delete(userId);
      const interval = conversationPollingIntervals.get(userId);
      if (interval) {
        clearInterval(interval);
        conversationPollingIntervals.delete(userId);
      }
    }
  };
};

// Notify listeners when data changes
const notifyMessageListeners = async (conversationId: string, userId: string) => {
  const key = buildMessageListenerKey(conversationId, userId);
  const listeners = messageListeners.get(key);
  if (!listeners || listeners.size === 0) return;
  const messages = await getMessages(conversationId, userId);
  listeners.forEach(callback => {
    if (typeof callback === 'function') callback(messages);
  });
};

const notifyConversationListeners = async (userId: string) => {
  const listeners = conversationListeners.get(userId);
  logger.debug(CHAT_SCOPE, 'Notifying conversation listeners for user', { userId, hasListeners: !!listeners });
  if (listeners && listeners.size > 0) {
    const conversations = await getConversations(userId);
    logger.debug(CHAT_SCOPE, 'Found conversations for user', { userId, count: conversations.length });
    listeners.forEach(callback => {
      if (typeof callback === 'function') {
        callback(conversations);
      }
    });
  }
};

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

    const sampleMessages: Message[] = [
      {
        id: 'msg_sample_1',
        conversationId: 'conv_sample_1',
        senderId: 'char2',
        text: 'היי! איך אתה?',
        timestamp,
        read: false,
        type: 'text',
        status: 'sent',
      },
      {
        id: 'msg_sample_2',
        conversationId: 'conv_sample_1',
        senderId: userId,
        text: 'מעולה, תודה! איך אתה?',
        timestamp,
        read: true,
        type: 'text',
        status: 'sent',
      },
      {
        id: 'msg_sample_3',
        conversationId: 'conv_sample_2',
        senderId: 'char3',
        text: 'תודה על העזרה!',
        timestamp,
        read: true,
        type: 'text',
        status: 'sent',
      },
    ];

    // Guard: do not create sample data for real-auth sessions
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
      await db.createChat(userId, conversation.id, conversation);
    }

    for (const message of sampleMessages) {
      await db.createMessage(userId, message.id, message);
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

// Advanced Chat Functions

// Edit message
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

    // Note: We would need the conversationId to notify listeners properly
    // For now, we'll skip notification as we don't have access to conversationId from messageId alone

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

// Delete message
export const deleteMessage = async (
  userId: string,
  messageId: string,
  deleteForEveryone: boolean = false
): Promise<void> => {
  try {
    if (deleteForEveryone) {
      // Mark as deleted instead of removing
      await db.updateMessage(userId, messageId, {
        deleted: true,
        deletedAt: nowIso(),
        text: 'הודעה זו נמחקה',
      });
    } else {
      // Remove only for current user
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

// Add reaction to message
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

// Remove reaction from message
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

// Send voice message
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

    // Save voice data
    await db.saveVoiceMessage(senderId, voiceId, {
      id: voiceId,
      uri: voiceData.uri,
      duration: voiceData.duration,
      mimeType: voiceData.mimeType,
      timestamp,
    });

    // Create message with voice reference
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

// Search messages
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

// Get message reactions
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

// Set typing status
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

// Get all conversations including empty ones
export const getAllConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    // Use getConversations which already handles backend/local
    return await getConversations(userId);
  } catch (error) {
    logError('Get all conversations error', error, { userId });
    return [];
  }
};

// Check if conversation exists
export const conversationExists = async (
  userId: string,
  otherUserId: string
): Promise<string | null> => {
  try {
    // Use getAllConversations which already handles backend/local
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

// Debug function to check database content
export const debugDatabaseContent = async (userId: string) => {
  try {
    logger.debug(CHAT_SCOPE, '=== DATABASE DEBUG ===');
    logger.debug(CHAT_SCOPE, 'User ID', { userId });

    // Get all chats
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

    // Get all messages
    const messages = await DatabaseService.list(DB_COLLECTIONS.MESSAGES, userId);
    logger.debug(CHAT_SCOPE, 'Total Messages', { count: messages.length });

    logger.debug(CHAT_SCOPE, '=== END DEBUG ===');
  } catch (error) {
    logError('Debug error', error, { userId });
  }
}; 