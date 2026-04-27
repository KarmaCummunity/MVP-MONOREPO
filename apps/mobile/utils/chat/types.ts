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
    duration?: number;
    dimensions?: { width: number; height: number };
  };
  replyTo?: string;
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

export interface BackendConversation {
  id: string;
  participants?: string[];
  last_message_content?: string | null;
  last_message_time?: string | null;
  unread_count?: number | null;
  created_at?: string;
  updated_at?: string;
  metadata?: { legacy_id?: string };
}

export interface BackendMessage {
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
  message_id?: string;
}

export type MessageListener = (messages: Message[]) => void;
export type ConversationListener = (conversations: Conversation[]) => void;
export type ChatSendResult = string | { messageId: string; newConversationId?: string };
