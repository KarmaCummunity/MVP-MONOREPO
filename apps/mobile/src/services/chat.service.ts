import { USE_FIRESTORE, USE_BACKEND } from '../infrastructure/config';
import { getFirebase } from '../../utils/firebaseClient';
import { collection as fsCollection, query as fsQuery, where as fsWhere, onSnapshot } from 'firebase/firestore';
import { sendMessageNotification } from './notification.service';
import { db, DB_COLLECTIONS, DatabaseService } from '../infrastructure/database.service';
import { apiService } from '../api/api.service';

// TODO: CRITICAL - This file is extremely complex (735 lines). Split into specialized services:
//   - ConversationService for conversation management
//   - MessageService for message operations
//   - RealtimeService for listeners and subscriptions
//   - NotificationService integration for chat notifications
// TODO: Add comprehensive error handling and retry mechanisms for all operations
// TODO: Implement proper message queuing system for offline support
// TODO: Add comprehensive TypeScript interfaces with strict typing
// TODO: Implement proper connection management and reconnection logic
// TODO: Add comprehensive message validation and sanitization
import { logger } from '../../utils/loggerService';
import i18n from '../../app/i18n';
// Removed console.log statements - using proper logging service
// TODO: Add comprehensive unit tests for all chat operations
// TODO: Implement proper memory management for listeners and subscriptions
// TODO: Add message encryption and security measures

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

// Event listeners for real-time updates
// Messages: key is `${conversationId}_${userId}` to scope polling per-user
// TODO: Implement proper listener lifecycle management to prevent memory leaks
// TODO: Add listener cleanup on app backgrounding/foregrounding
// TODO: Implement proper error handling for failed listeners
// TODO: Add connection state management and reconnection logic
const messageListeners: Map<string, Set<(messages: Message[]) => void>> = new Map();
// Conversations: key is `userId`
const conversationListeners: Map<string, Set<(conversations: Conversation[]) => void>> = new Map();

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createConversation = async (participants: string[]): Promise<string> => {
  // TODO: Add comprehensive input validation for participants array
  // TODO: Check for duplicate conversations between same participants
  // TODO: Add proper error handling with specific error types
  // TODO: Implement rate limiting to prevent conversation spam
  // TODO: Add proper logging and monitoring for conversation creation
  try {
    let conversationId: string;

    if (USE_BACKEND && participants.length > 0) {
      // Create conversation on backend
      const response = await apiService.createConversation({
        participants,
        type: 'direct',
        created_by: participants[0], // First participant is the creator
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || i18n.t('chat:errors.createConversation'));
      }

      const data = response.data as { id?: string };
      conversationId = data?.id ?? generateId('conv');
      logger.info('ChatService', 'Conversation created on backend', { conversationId });
    } else {
      // Fallback to local storage
      conversationId = generateId('conv');
      logger.info('ChatService', 'Conversation created locally', { conversationId });
    }

    const newConversation: Conversation = {
      id: conversationId,
      participants,
      lastMessageText: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Also save locally for offline support
    for (const participantId of participants) {
      await db.createChat(participantId, conversationId, { ...newConversation, unreadCount: 0 });
    }

    // Notify conversation listeners for all participants
    participants.forEach(participantId => {
      notifyConversationListeners(participantId);
    });

    return conversationId;
  } catch (error) {
    logger.error('ChatService', 'Create conversation error', { error });
    throw error;
  }
};

export const getConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    logger.info('ChatService', 'Getting conversations for user', { userId });

    if (USE_BACKEND) {
      // Get conversations from backend
      const response = await apiService.getUserConversations(userId);

      if (response.success && response.data && Array.isArray(response.data)) {
        // Map backend format to frontend format
        const conversations: Conversation[] = response.data.map((conv: Record<string, unknown>) => ({
          id: conv.id as string,
          participants: (conv.participants as string[]) || [],
          lastMessageText: (conv.last_message_content as string) || '',
          lastMessageTime: (conv.last_message_time as string) || (conv.updated_at as string) || (conv.created_at as string),
          unreadCount: (conv.unread_count as number) || 0,
          createdAt: conv.created_at as string,
        }));

        // Deduplicate conversations: keep only one conversation per set of participants
        // Prefer the one with the most recent message
        const uniqueMap = new Map<string, Conversation>();

        conversations.forEach(conv => {
          // Sort participants to ensure consistent key
          const key = [...(conv.participants || [])].sort((a, b) => a.localeCompare(b)).join(',');

          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, conv);
          } else {
            const existing = uniqueMap.get(key)!;
            const existingTime = new Date(existing.lastMessageTime).getTime();
            const newTime = new Date(conv.lastMessageTime).getTime();

            // Should we replace?
            // 1. If new one is newer
            // 2. If timestamps are equal but new one has content and existing doesn't
            if (newTime > existingTime || (newTime === existingTime && conv.lastMessageText && !existing.lastMessageText)) {
              uniqueMap.set(key, conv);
            }
          }
        });

        const uniqueConversations = Array.from(uniqueMap.values());

        // Also save locally for offline support
        for (const conv of uniqueConversations) {
          await db.createChat(userId, conv.id, conv as unknown as Record<string, unknown>);
        }

        logger.debug('ChatService', 'Got conversations from backend', { count: uniqueConversations.length, originalCount: conversations.length });
        return uniqueConversations;
      } else {
        logger.warn('ChatService', 'Backend returned invalid response, falling back to local', { response });
      }
    }

    // Fallback to local storage
    const conversations = await db.getUserChats(userId);
    logger.debug('ChatService', 'Raw conversations from DB', { count: conversations.length, conversations });

    // Don't filter empty conversations - show all
    const sorted = (conversations as Conversation[]).sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    logger.debug('ChatService', 'Sorted conversations', { count: sorted.length, conversations: sorted.map(c => ({ id: c.id, lastMessage: c.lastMessageText || 'New conversation' })) });
    return sorted;
  } catch (error) {
    logger.error('ChatService', 'Get conversations error', { error });
    // Fallback to local storage on error
    try {
      const conversations = await db.getUserChats(userId);
      return (conversations as Conversation[]).sort((a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
    } catch (fallbackError) {
      logger.error('ChatService', 'Fallback to local storage also failed', { error: fallbackError });
      return [];
    }
  }
};

export const getConversationById = async (conversationId: string, userId: string): Promise<Conversation | null> => {
  try {
    const conversation = await db.getChat(userId, conversationId);
    return conversation as Conversation | null;
  } catch (error) {
    logger.error('ChatService', 'Get conversation error', { error });
    return null;
  }
};

export const sendMessage = async (
  message: Omit<Message, 'id'>,
  fallbackParticipants?: string[]
): Promise<string | { messageId: string; newConversationId?: string }> => {
  try {
    let messageId: string;
    let backendMessage: Record<string, unknown> | null = null;

    // Get conversation to find participants
    let senderView = await getConversationById(message.conversationId, message.senderId);
    let participants = senderView?.participants || [];

    // If conversation not found locally, try to get from backend
    if (participants.length === 0 && USE_BACKEND) {
      try {
        // Try to get conversation from backend
        const convResponse = await apiService.getUserConversations(message.senderId);
        if (convResponse.success && convResponse.data && Array.isArray(convResponse.data)) {
          const backendConv = convResponse.data.find((c: Record<string, unknown>) => (c.id as string) === message.conversationId);
          if (backendConv && backendConv.participants) {
            participants = backendConv.participants;
            // Save locally for future use
            senderView = {
              id: backendConv.id as string,
              participants: backendConv.participants as string[],
              lastMessageText: backendConv.last_message_content || '',
              lastMessageTime: backendConv.last_message_time || backendConv.created_at,
              unreadCount: backendConv.unread_count || 0,
              createdAt: backendConv.created_at,
            };
            await db.createChat(message.senderId, message.conversationId, senderView as unknown as Record<string, unknown>);
          }
        }
      } catch (error) {
        logger.warn('ChatService', 'Failed to get conversation from backend', { error });
      }
    }

    // If still no participants, try to get from backend or reconstruct
    if (participants.length === 0) {
      logger.warn('ChatService', 'No participants found for conversation, attempting to recover', {
        conversationId: message.conversationId,
        senderId: message.senderId
      });

      // Try to get conversation from backend by checking all user conversations
      if (USE_BACKEND) {
        try {
          const allConvsResponse = await apiService.getUserConversations(message.senderId);
          if (allConvsResponse.success && allConvsResponse.data && Array.isArray(allConvsResponse.data)) {
            // Look for conversation by ID or by legacy_id in metadata
            const foundConv = allConvsResponse.data.find((c: Record<string, unknown>) =>
              (c.id as string) === message.conversationId ||
              ((c.metadata as Record<string, unknown>)?.legacy_id === message.conversationId)
            );

            if (foundConv && (foundConv.participants as string[])?.length > 0) {
              participants = foundConv.participants as string[];
              logger.info('ChatService', 'Recovered participants from backend', { participants });
            }
          }
        } catch (error) {
          logger.warn('ChatService', 'Failed to recover participants from backend', { error });
        }
      }

      // If still no participants, try to use fallback participants if provided
      if (participants.length === 0 && fallbackParticipants && fallbackParticipants.length > 0) {
        participants = fallbackParticipants;
        logger.info('ChatService', 'Using fallback participants', { participants });

        // Save conversation locally with fallback participants
        const fallbackConversation: Conversation = {
          id: message.conversationId,
          participants: fallbackParticipants,
          lastMessageText: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          createdAt: new Date().toISOString(),
        };

        for (const participantId of fallbackParticipants) {
          await db.createChat(participantId, message.conversationId, fallbackConversation as unknown as Record<string, unknown>);
        }
      }

      // If still no participants, we can't send the message
      if (participants.length === 0) {
        throw new Error(i18n.t('chat:errors.conversationNotFound'));
      }
    }

    // Send to backend if enabled
    if (USE_BACKEND) {
      try {
        // Convert frontend format to backend format
        const backendMessageData: Record<string, unknown> = {
          conversation_id: message.conversationId,
          sender_id: message.senderId,
          content: message.text || '',
          message_type: message.type || 'text',
          reply_to_id: message.replyTo || null,
          participants: participants, // Include participants so backend can create conversation if needed
        };

        // Handle file data if present
        if (message.fileData) {
          backendMessageData.file_url = message.fileData.uri;
          backendMessageData.file_name = message.fileData.name;
          backendMessageData.file_size = message.fileData.size || null;
          backendMessageData.file_type = message.fileData.mimeType || message.fileData.type;

          // Store additional metadata in metadata field
          if (message.fileData.thumbnail || message.fileData.duration || message.fileData.dimensions) {
            backendMessageData.metadata = JSON.stringify({
              thumbnail: message.fileData.thumbnail,
              duration: message.fileData.duration,
              dimensions: message.fileData.dimensions,
            });
          }
        }

        const response = await apiService.sendMessage(backendMessageData);

        if (response.success && response.data) {
          const respData = response.data as { id?: string; conversation_created?: boolean; conversation_id?: string };
          backendMessage = response.data as Record<string, unknown>;
          messageId = respData?.id ?? generateId('msg');

          // If backend created a new conversation (with new UUID), update local storage
          if (respData?.conversation_created && respData?.conversation_id) {
            const newConversationId = respData.conversation_id;
            logger.info('ChatService', 'Backend created new conversation', {
              oldId: message.conversationId,
              newId: newConversationId
            });

            // Get the conversation details from backend to save locally
            try {
              const convResponse = await apiService.getUserConversations(message.senderId);
              if (convResponse.success && convResponse.data && Array.isArray(convResponse.data)) {
                const newConv = convResponse.data.find((c: Record<string, unknown>) => (c.id as string) === newConversationId);
                if (newConv) {
                  // Map backend format to frontend format
                  const updatedConversation: Conversation = {
                    id: newConversationId,
                    participants: (newConv.participants as string[]) || participants,
                    lastMessageText: message.text || '',
                    lastMessageTime: message.timestamp,
                    unreadCount: (newConv.unread_count as number) || 0,
                    createdAt: (newConv.created_at as string) || new Date().toISOString(),
                  };

                  // Save new conversation for all participants
                  const finalParticipants = (newConv.participants as string[]) || participants;
                  for (const participantId of finalParticipants) {
                    await db.createChat(participantId, newConversationId, updatedConversation as unknown as Record<string, unknown>);
                    // Also delete old conversation if it exists
                    try {
                      await DatabaseService.delete(DB_COLLECTIONS.CHATS, participantId, message.conversationId);
                    } catch (_e) {
                      // Ignore if doesn't exist
                    }
                  }

                  // Update message conversationId to new UUID - IMPORTANT: This updates the conversation ID for the rest of the function
                  message.conversationId = newConversationId;

                  logger.info('ChatService', 'Updated local storage with new conversation UUID', {
                    newConversationId,
                    participants: finalParticipants
                  });

                  // Notify listeners about the new conversation - this will refresh ChatListScreen
                  finalParticipants.forEach((participantId: string) => {
                    notifyConversationListeners(participantId);
                  });
                } else {
                  logger.warn('ChatService', 'New conversation not found in backend response', { newConversationId });
                }
              }
            } catch (error) {
              logger.error('ChatService', 'Failed to get new conversation from backend', { error });
              // Still update with basic info
              const updatedConversation: Conversation = {
                id: newConversationId,
                participants: participants,
                lastMessageText: message.text || '',
                lastMessageTime: message.timestamp,
                unreadCount: 0,
                createdAt: new Date().toISOString(),
              };

              for (const participantId of participants) {
                await db.createChat(participantId, newConversationId, updatedConversation as unknown as Record<string, unknown>);
              }

              message.conversationId = newConversationId;
              participants.forEach(participantId => {
                notifyConversationListeners(participantId);
              });
            }
          }

          logger.info('ChatService', 'Message sent to backend', { messageId });
        } else {
          throw new Error(response.error || i18n.t('chat:errors.sendMessage'));
        }
      } catch (backendError) {
        logger.error('ChatService', 'Backend send message error', { error: backendError });
        // Fall through to local storage fallback
        messageId = generateId('msg');
      }
    } else {
      messageId = generateId('msg');
    }

    // Create message object
    const newMessage: Message = {
      ...message,
      id: messageId,
      status: backendMessage ? 'sent' : 'sending', // If sent to backend, mark as sent
    };

    // Save locally for all participants (for offline support and real-time updates)
    for (const participantId of participants) {
      await db.createMessage(participantId, messageId, newMessage as unknown as Record<string, unknown>);
    }

    let displayText = message.text;
    if (message.type === 'image') displayText = `📷 ${i18n.t('chat:image')}`;
    else if (message.type === 'video') displayText = `🎥 ${i18n.t('chat:video')}`;
    else if (message.type === 'file') displayText = `📎 ${i18n.t('chat:file')}`;

    // Update conversation for all participants
    for (const participantId of participants) {
      const existing = await db.getChat(participantId, message.conversationId);
      const existingConv = existing as Record<string, unknown> | null;
      const baseConv: Conversation = (existingConv?.id && existingConv?.participants)
        ? (existingConv as unknown as Conversation)
        : {
            id: message.conversationId,
            participants,
            lastMessageText: '',
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
            createdAt: new Date().toISOString(),
          };

      const isRecipient = participantId !== message.senderId;
      const unreadCount = isRecipient ? (baseConv.unreadCount || 0) + 1 : 0;

      const updatedConversation: Conversation = {
        ...baseConv,
        lastMessageText: displayText,
        lastMessageTime: message.timestamp,
        unreadCount,
      };

      await db.createChat(participantId, message.conversationId, updatedConversation as unknown as Record<string, unknown>);
      logger.debug('ChatService', 'Updated conversation for participant', { participantId });
    }

    logger.info('ChatService', 'Message sent', { messageId });
    logger.debug('ChatService', 'Conversation participants', { participants });

    // Notify listeners about the new message for each participant
    for (const participantId of participants) {
      notifyMessageListeners(message.conversationId, participantId);
    }

    // Notify conversation listeners for all participants
    // This will trigger ChatListScreen to refresh and show the new conversation
    logger.debug('ChatService', 'Notifying conversation listeners', { participants });
    participants.forEach(participantId => {
      logger.debug('ChatService', 'Notifying participant', { participantId });
      notifyConversationListeners(participantId);

      // Send notification to other participants (not the sender)
      if (participantId !== message.senderId) {
        const senderName = 'משתמש'; // TODO: Get actual sender name
        sendMessageNotification(senderName, message.text, message.conversationId, participantId);
      }
    });

    // Force refresh conversations from backend to ensure new conversation appears
    if (USE_BACKEND && backendMessage) {
      // Trigger a refresh of conversations for all participants
      setTimeout(async () => {
        for (const participantId of participants) {
          try {
            await getConversations(participantId);
            notifyConversationListeners(participantId);
          } catch (error) {
            logger.warn('ChatService', 'Failed to refresh conversations after message', { error });
          }
        }
      }, 500); // Small delay to ensure backend has processed the message
    }

    return messageId;
  } catch (error) {
    logger.error('ChatService', 'Send message error', { error });
    throw error;
  }
};

export const getMessages = async (conversationId: string, userId: string): Promise<Message[]> => {
  try {
    if (USE_BACKEND) {
      try {
        // Get messages from backend
        const response = await apiService.getConversationMessages(conversationId, 100, 0);

        if (response.success && response.data && Array.isArray(response.data)) {
          // Map backend format to frontend format
          const messages: Message[] = response.data.map((msg: Record<string, unknown>) => {
            const frontendMessage: Message = {
              id: msg.id as string,
              conversationId: msg.conversation_id as string,
              senderId: msg.sender_id as string,
              text: (msg.content as string) || '',
              timestamp: msg.created_at as string,
              read: false, // TODO: Check read receipts
              type: (msg.message_type || 'text') as Message['type'],
              status: 'sent',
              replyTo: (msg.reply_to_id as string) || undefined,
              edited: (msg.is_edited as boolean) || false,
              editedAt: (msg.edited_at as string) || undefined,
              deleted: (msg.is_deleted as boolean) || false,
              deletedAt: (msg.deleted_at as string) || undefined,
            };

            // Handle file data if present
            if (msg.file_url) {
              frontendMessage.fileData = {
                id: msg.id as string,
                name: (msg.file_name as string) || 'file',
                uri: msg.file_url as string,
                type: (msg.file_type || msg.message_type || 'file') as 'image' | 'video' | 'file' | 'voice',
                size: typeof msg.file_size === 'number' ? msg.file_size : undefined,
                mimeType: typeof msg.file_type === 'string' ? msg.file_type : undefined,
              };

              // Parse metadata if present
              if (msg.metadata && frontendMessage.fileData) {
                try {
                  const metadata = (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) as Record<string, unknown>;
                  if (metadata.thumbnail != null && typeof metadata.thumbnail === 'string') {
                    frontendMessage.fileData!.thumbnail = metadata.thumbnail;
                  }
                  if (metadata.duration != null && typeof metadata.duration === 'number') {
                    frontendMessage.fileData!.duration = metadata.duration;
                  }
                  if (metadata.dimensions && typeof metadata.dimensions === 'object' && metadata.dimensions !== null && 'width' in metadata.dimensions && 'height' in metadata.dimensions) {
                    frontendMessage.fileData!.dimensions = metadata.dimensions as { width: number; height: number };
                  }
                } catch (e) {
                  logger.warn('ChatService', 'Failed to parse message metadata', { error: e });
                }
              }
            }

            return frontendMessage;
          });

          // Save messages locally for offline support
          for (const msg of messages) {
            await db.createMessage(userId, msg.id, msg as unknown as Record<string, unknown>);
          }

          logger.debug('ChatService', 'Got messages from backend', { count: messages.length });
          return messages;
        } else {
          logger.warn('ChatService', 'Backend returned invalid response, falling back to local', { response });
        }
      } catch (backendError) {
        logger.error('ChatService', 'Backend get messages error', { error: backendError });
        // Fall through to local storage
      }
    }

    // Fallback to local storage
    const messages = await db.getChatMessages(userId, conversationId);
    return (messages as unknown as Message[]).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  } catch (error) {
    logger.error('ChatService', 'Get messages error', { error });
    return [];
  }
};

export const markMessagesAsRead = async (conversationId: string, userId: string): Promise<void> => {
  try {
    logger.info('ChatService', 'Marking messages as read', { conversationId, userId });

    // If backend is enabled, use backend API for read receipts
    if (USE_BACKEND) {
      try {
        const response = await apiService.markAllMessagesAsRead(conversationId, userId);

        if (response.success) {
          const markData = response.data as { marked_read?: number } | undefined;
          logger.info('ChatService', 'Messages marked as read on backend', {
            conversationId,
            markedCount: markData?.marked_read ?? 0
          });

          // Update local cache - mark all messages as read
          const messages = await getMessages(conversationId, userId);
          for (const msg of messages) {
            if (msg.conversationId === conversationId && msg.senderId !== userId && !msg.read) {
              await DatabaseService.update(DB_COLLECTIONS.MESSAGES, userId, msg.id, { read: true });
            }
          }

          // Update conversation unread count locally
          const conversation = await getConversationById(conversationId, userId);
          if (conversation) {
            const updatedConversation = { ...conversation, unreadCount: 0 };
            await db.createChat(userId, conversationId, updatedConversation);
            logger.debug('ChatService', 'Conversation unread count reset to 0');
          }

          return;
        } else {
          logger.warn('ChatService', 'Backend mark as read failed, falling back to local', {
            error: response.error
          });
          // Fall through to local-only mode
        }
      } catch (backendError) {
        logger.error('ChatService', 'Backend mark as read error, falling back to local', { error: backendError });
        // Fall through to local-only mode
      }
    }

    // Local-only mode or backend failed
    const messages = await getMessages(conversationId, userId);
    logger.debug('ChatService', 'Found total messages', { count: messages.length });

    for (const msg of messages) {
      if (msg.conversationId === conversationId && msg.senderId !== userId && !msg.read) {
        logger.debug('ChatService', 'Marking message as read locally', { messageId: msg.id });
        await DatabaseService.update(DB_COLLECTIONS.MESSAGES, userId, msg.id, { read: true });
      }
    }

    const conversation = await getConversationById(conversationId, userId);
    if (conversation) {
      const updatedConversation = { ...conversation, unreadCount: 0 };
      await db.createChat(userId, conversationId, updatedConversation);
      logger.debug('ChatService', 'Conversation unread count reset to 0');
    } else {
      logger.warn('ChatService', 'Conversation not found', { conversationId });
    }

    logger.info('ChatService', 'Messages marked as read');
  } catch (error) {
    logger.error('ChatService', 'Mark as read error', { error });
    throw error;
  }
};

// Real-time listener for messages (improved with event system)
export const subscribeToMessages = (conversationId: string, userId: string, callback: (messages: Message[]) => void) => {
  const key = `${conversationId}_${userId}`;
  if (!messageListeners.has(key)) {
    messageListeners.set(key, new Set());
  }
  messageListeners.get(key)!.add(callback);

  if (USE_FIRESTORE) {
    const { db } = getFirebase();
    const col = fsCollection(db, DB_COLLECTIONS.MESSAGES);
    const q = fsQuery(col, fsWhere('_userId', '==', userId), fsWhere('conversationId', '==', conversationId));
    const unsub = onSnapshot(q, async (snap) => {
      const items = snap.docs.map((d) => d.data() as Message).sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
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
  } else {
    getMessages(conversationId, userId).then(callback);
    const interval = setInterval(async () => {
      const messages = await getMessages(conversationId, userId);
      callback(messages);
    }, 2000);
    return () => {
      clearInterval(interval);
      const listeners = messageListeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          messageListeners.delete(key);
        }
      }
    };
  }
};

// Real-time listener for conversations
export const subscribeToConversations = (userId: string, callback: (conversations: Conversation[]) => void) => {
  if (!conversationListeners.has(userId)) {
    conversationListeners.set(userId, new Set());
  }
  conversationListeners.get(userId)!.add(callback);

  if (USE_FIRESTORE) {
    const { db } = getFirebase();
    const col = fsCollection(db, DB_COLLECTIONS.CHATS);
    const q = fsQuery(col, fsWhere('_userId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => d.data() as Conversation)
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
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
  } else {
    getConversations(userId).then((conversations) => {
      callback(conversations);
    });
    const interval = setInterval(async () => {
      const conversations = await getConversations(userId);
      callback(conversations);
    }, 5000);
    return () => {
      clearInterval(interval);
      const listeners = conversationListeners.get(userId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          conversationListeners.delete(userId);
        }
      }
    };
  }
};

// Notify listeners when data changes
const notifyMessageListeners = async (conversationId: string, userId: string) => {
  const key = `${conversationId}_${userId}`;
  const listeners = messageListeners.get(key);
  if (!listeners || listeners.size === 0) return;
  const messages = await getMessages(conversationId, userId);
  listeners.forEach(callback => {
    if (typeof callback === 'function') callback(messages);
  });
};

const notifyConversationListeners = async (userId: string) => {
  const listeners = conversationListeners.get(userId);
  logger.debug('ChatService', 'Notifying conversation listeners for user', { userId, hasListeners: !!listeners });
  if (listeners && listeners.size > 0) {
    const conversations = await getConversations(userId);
    logger.debug('ChatService', 'Found conversations for user', { userId, count: conversations.length });
    // Conversations are already sorted by getConversations
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

    logger.info('ChatService', 'Conversation deleted');
  } catch (error) {
    logger.error('ChatService', 'Delete conversation error', { error });
    throw error;
  }
};

export const clearAllData = async (userId?: string): Promise<void> => {
  try {
    if (userId) {
      await DatabaseService.deleteUserData(userId);
      logger.info('ChatService', 'All chat data cleared for user', { userId });
    } else {
      await DatabaseService.clearAllData();
      logger.info('ChatService', 'All chat data cleared');
    }
  } catch (error) {
    logger.error('ChatService', 'Clear data error', { error });
    throw error;
  }
};

export const createSampleData = async (): Promise<void> => {
  try {
    logger.info('ChatService', 'Sample data creation disabled to prevent overwriting real conversations');
  } catch (error) {
    logger.error('ChatService', 'Create sample data error', { error });
  }
};

export const createSampleChatData = async (userId: string): Promise<void> => {
  try {
    logger.info('ChatService', 'Creating sample chat data for user', { userId });

    const sampleConversations: Conversation[] = [
      {
        id: 'conv_sample_1',
        participants: [userId, 'char2'],
        lastMessageText: 'היי! איך אתה?',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'conv_sample_2',
        participants: [userId, 'char3'],
        lastMessageText: 'תודה על העזרה!',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    const sampleMessages: Message[] = [
      {
        id: 'msg_sample_1',
        conversationId: 'conv_sample_1',
        senderId: 'char2',
        text: 'היי! איך אתה?',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'text',
        status: 'sent',
      },
      {
        id: 'msg_sample_2',
        conversationId: 'conv_sample_1',
        senderId: userId,
        text: 'מעולה, תודה! איך אתה?',
        timestamp: new Date().toISOString(),
        read: true,
        type: 'text',
        status: 'sent',
      },
      {
        id: 'msg_sample_3',
        conversationId: 'conv_sample_2',
        senderId: 'char3',
        text: 'תודה על העזרה!',
        timestamp: new Date().toISOString(),
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
      } catch (_e) {
        return null;
      }
    })();
    if (mode === 'real') {
      logger.info('ChatService', 'Skipping sample chat data creation in real auth mode');
      return;
    }

    for (const conversation of sampleConversations) {
      await db.createChat(userId, conversation.id, conversation as unknown as Record<string, unknown>);
    }

    for (const message of sampleMessages) {
      await db.createMessage(userId, message.id, message as unknown as Record<string, unknown>);
    }

    logger.info('ChatService', 'Sample chat data created for user', { userId, conversationCount: sampleConversations.length, messageCount: sampleMessages.length });
  } catch (error) {
    logger.error('ChatService', 'Create sample chat data error', { error });
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
    await db.updateMessage(userId, messageId, {
      text: newText,
      edited: true,
      editedAt: new Date().toISOString(),
    });

    // Note: We would need the conversationId to notify listeners properly
    // For now, we'll skip notification as we don't have access to conversationId from messageId alone

    logger.info('ChatService', 'Message edited', { messageId });
  } catch (error) {
    logger.error('ChatService', 'Edit message error', { error });
    throw error;
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
        deletedAt: new Date().toISOString(),
        text: 'הודעה זו נמחקה',
      });
    } else {
      // Remove only for current user
      await db.deleteMessage(userId, messageId);
    }

    logger.info('ChatService', 'Message deleted', { messageId });
  } catch (error) {
    logger.error('ChatService', 'Delete message error', { error });
    throw error;
  }
};

// Add reaction to message
export const addMessageReaction = async (
  userId: string,
  messageId: string,
  emoji: string
): Promise<void> => {
  try {
    const reactionId = generateId('reaction');
    await db.addReaction(userId, reactionId, {
      id: reactionId,
      messageId,
      userId,
      emoji,
      timestamp: new Date().toISOString(),
    });

    logger.info('ChatService', 'Reaction added', { reactionId });
  } catch (error) {
    logger.error('ChatService', 'Add reaction error', { error });
    throw error;
  }
};

// Remove reaction from message
export const removeMessageReaction = async (
  userId: string,
  reactionId: string
): Promise<void> => {
  try {
    await db.removeReaction(userId, reactionId);
    logger.info('ChatService', 'Reaction removed', { reactionId });
  } catch (error) {
    logger.error('ChatService', 'Remove reaction error', { error });
    throw error;
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
    const voiceId = generateId('voice');
    const messageId = generateId('msg');

    // Save voice data
    await db.saveVoiceMessage(senderId, voiceId, {
      id: voiceId,
      uri: voiceData.uri,
      duration: voiceData.duration,
      mimeType: voiceData.mimeType,
      timestamp: new Date().toISOString(),
    });

    // Create message with voice reference
    const message: Message = {
      id: messageId,
      conversationId,
      senderId,
      text: '🎤 הודעה קולית',
      timestamp: new Date().toISOString(),
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
    logger.error('ChatService', 'Send voice message error', { error });
    throw error;
  }
};

// Search messages
export const searchMessages = async (
  userId: string,
  searchQuery: string
): Promise<Message[]> => {
  try {
    const results = await db.searchMessages(userId, searchQuery);
    return results as unknown as Message[];
  } catch (error) {
    logger.error('ChatService', 'Search messages error', { error });
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
    return reactions as Array<{ userId: string; emoji: string; timestamp: string }>;
  } catch (error) {
    logger.error('ChatService', 'Get reactions error', { error });
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
        timestamp: new Date().toISOString(),
      });
    } else {
      await db.clearTypingStatus(userId, conversationId);
    }
  } catch (error) {
    logger.error('ChatService', 'Set typing status error', { error });
  }
};

// Get all conversations including empty ones
export const getAllConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    // Use getConversations which already handles backend/local
    return await getConversations(userId);
  } catch (error) {
    logger.error('ChatService', 'Get all conversations error', { error });
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
    logger.error('ChatService', 'Check conversation exists error', { error });
    return null;
  }
};

// Debug function to check database content
export const debugDatabaseContent = async (userId: string) => {
  try {
    logger.debug('ChatService', '=== DATABASE DEBUG ===');
    logger.debug('ChatService', 'User ID', { userId });

    // Get all chats
    const chats = await db.getUserChats(userId);
    logger.debug('ChatService', 'Total Chats', { count: chats.length });
    (chats as unknown[]).forEach((chat: unknown) => {
      const c = chat as Record<string, unknown>;
      logger.debug('ChatService', 'Chat', {
        id: c.id,
        participants: c.participants,
        lastMessage: c.lastMessageText,
        lastTime: c.lastMessageTime,
      });
    });

    // Get all messages
    const messages = await DatabaseService.list(DB_COLLECTIONS.MESSAGES, userId);
    logger.debug('ChatService', 'Total Messages', { count: messages.length });

    logger.debug('ChatService', '=== END DEBUG ===');
  } catch (error) {
    logger.error('ChatService', 'Debug error', { error });
  }
}; 