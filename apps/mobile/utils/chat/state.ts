import type { Conversation, Message } from './types';

export type MessageListener = (messages: Message[]) => void;
export type ConversationListener = (conversations: Conversation[]) => void;

export const messageListeners: Map<string, Set<MessageListener>> = new Map();
export const conversationListeners: Map<string, Set<ConversationListener>> = new Map();
export const messagePollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
export const conversationPollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
