import { db, DB_COLLECTIONS, DatabaseService } from '../databaseService';
import { logger } from '../loggerService';
import { CHAT_SCOPE } from './constants';
import type { BackendConversation, BackendMessage, Conversation, Message } from './types';

export const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const nowIso = (): string => new Date().toISOString();

export const sanitizeParticipants = (participants: string[]): string[] =>
  [...new Set((participants || []).map((id) => id.trim()).filter(Boolean))];

export const logError = (action: string, error: unknown, context?: Record<string, unknown>): void => {
  const normalizedError = toError(error);
  logger.error(CHAT_SCOPE, action, {
    ...context,
    error: normalizedError.message,
  });
};

export const buildMessageListenerKey = (conversationId: string, userId: string): string =>
  `${conversationId}_${userId}`;

export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export const toMessagePreviewText = (message: Pick<Message, 'type' | 'text'>): string => {
  if (message.type === 'image') return '📷 תמונה';
  if (message.type === 'video') return '🎥 סרטון';
  if (message.type === 'file') return '📎 קובץ';
  return message.text;
};

export const toConversationModel = (conversation: BackendConversation): Conversation => ({
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

export const dedupeConversations = (conversations: Conversation[]): Conversation[] => {
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

export const sortConversationsByLastMessage = (conversations: Conversation[]): Conversation[] =>
  [...conversations].sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

export const sortMessagesByTimestamp = (messages: Message[]): Message[] =>
  [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

const isMessageType = (value: unknown): value is Message['type'] =>
  value === 'text' ||
  value === 'image' ||
  value === 'video' ||
  value === 'file' ||
  value === 'voice' ||
  value === 'location';

const parseMessageMetadata = (
  metadata: BackendMessage['metadata'],
): { thumbnail?: string; duration?: number; dimensions?: { width: number; height: number } } | null => {
  if (!metadata) {
    return null;
  }

  try {
    const parsed =
      typeof metadata === 'string'
        ? JSON.parse(metadata)
        : metadata;
    return parsed as { thumbnail?: string; duration?: number; dimensions?: { width: number; height: number } };
  } catch (error) {
    logger.warn(CHAT_SCOPE, 'Failed to parse message metadata', { error: toError(error).message });
    return null;
  }
};

const buildMessageFileData = (message: BackendMessage): Message['fileData'] | undefined => {
  if (!message.file_url) {
    return undefined;
  }

  const fileData: NonNullable<Message['fileData']> = {
    id: message.id,
    name: message.file_name || 'file',
    uri: message.file_url,
    type: ((message.file_type || message.message_type || 'file') as 'image' | 'video' | 'file' | 'voice'),
    size: message.file_size || undefined,
    mimeType: message.file_type || undefined,
  };

  const parsedMetadata = parseMessageMetadata(message.metadata);
  if (parsedMetadata?.thumbnail) {
    fileData.thumbnail = parsedMetadata.thumbnail;
  }
  if (parsedMetadata?.duration) {
    fileData.duration = parsedMetadata.duration;
  }
  if (parsedMetadata?.dimensions) {
    fileData.dimensions = parsedMetadata.dimensions;
  }

  return fileData;
};

export const toMessageModel = (message: BackendMessage): Message => {
  const messageType: Message['type'] = isMessageType(message.message_type)
    ? message.message_type
    : 'text';
  const model: Message = {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    text: message.content || '',
    timestamp: message.created_at,
    read: false,
    type: messageType,
    status: 'sent',
    replyTo: message.reply_to_id || undefined,
    edited: message.is_edited || false,
    editedAt: message.edited_at || undefined,
    deleted: message.is_deleted || false,
    deletedAt: message.deleted_at || undefined,
  };

  const fileData = buildMessageFileData(message);
  if (fileData) {
    model.fileData = fileData;
  }

  return model;
};

export const persistConversationForParticipants = async (
  participants: string[],
  conversationId: string,
  conversation: Conversation,
): Promise<void> => {
  await Promise.all(participants.map((participantId) => db.createChat(participantId, conversationId, conversation)));
};

export const deleteLegacyConversationForParticipants = async (
  participants: string[],
  legacyConversationId: string,
): Promise<void> => {
  await Promise.all(
    participants.map(async (participantId) => {
      try {
        await DatabaseService.delete(DB_COLLECTIONS.CHATS, participantId, legacyConversationId);
      } catch {
        // ignore missing legacy conversation
      }
    })
  );
};
