import { collection as fsCollection, query as fsQuery, where as fsWhere, onSnapshot } from 'firebase/firestore';
import { USE_FIRESTORE } from '../config.constants';
import { getFirebase } from '../firebaseClient';
import { DB_COLLECTIONS } from '../databaseService';
import { CONVERSATION_POLL_INTERVAL_MS, MESSAGE_POLL_INTERVAL_MS } from './constants';
import {
  conversationListeners,
  conversationPollingIntervals,
  messageListeners,
  messagePollingIntervals,
} from './state';
import { Conversation, Message } from './types';
import { buildMessageListenerKey, logError, sortConversationsByLastMessage, sortMessagesByTimestamp } from './utils';

const stopMessagePolling = (key: string): void => {
  const interval = messagePollingIntervals.get(key);
  if (interval) {
    clearInterval(interval);
    messagePollingIntervals.delete(key);
  }
};

const stopConversationPolling = (userId: string): void => {
  const interval = conversationPollingIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    conversationPollingIntervals.delete(userId);
  }
};

export const subscribeToMessages = (
  conversationId: string,
  userId: string,
  callback: (messages: Message[]) => void,
  getMessages: (conversationId: string, userId: string) => Promise<Message[]>,
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

  if (messagePollingIntervals.has(key)) {
    void getMessages(conversationId, userId).then((messages) => callback(messages));
  } else {
    const poll = async () => {
      const listeners = messageListeners.get(key);
      if (!listeners || listeners.size === 0) {
        stopMessagePolling(key);
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
  }

  return () => {
    const listeners = messageListeners.get(key);
    if (!listeners) {
      return;
    }
    listeners.delete(callback);
    if (listeners.size === 0) {
      messageListeners.delete(key);
      stopMessagePolling(key);
    }
  };
};

export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void,
  getConversations: (userId: string) => Promise<Conversation[]>,
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

  if (conversationPollingIntervals.has(userId)) {
    void getConversations(userId).then((conversations) => callback(conversations));
  } else {
    const poll = async () => {
      const listeners = conversationListeners.get(userId);
      if (!listeners || listeners.size === 0) {
        stopConversationPolling(userId);
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
  }

  return () => {
    const listeners = conversationListeners.get(userId);
    if (!listeners) {
      return;
    }
    listeners.delete(callback);
    if (listeners.size === 0) {
      conversationListeners.delete(userId);
      stopConversationPolling(userId);
    }
  };
};

export const notifyMessageListeners = async (
  conversationId: string,
  userId: string,
  getMessages: (conversationId: string, userId: string) => Promise<Message[]>,
): Promise<void> => {
  const key = buildMessageListenerKey(conversationId, userId);
  const listeners = messageListeners.get(key);
  if (!listeners || listeners.size === 0) return;
  const messages = await getMessages(conversationId, userId);
  listeners.forEach((callback) => {
    if (typeof callback === 'function') callback(messages);
  });
};

export const notifyConversationListeners = async (
  userId: string,
  getConversations: (userId: string) => Promise<Conversation[]>,
): Promise<void> => {
  const listeners = conversationListeners.get(userId);
  if (listeners && listeners.size > 0) {
    const conversations = await getConversations(userId);
    listeners.forEach((callback) => {
      if (typeof callback === 'function') {
        callback(conversations);
      }
    });
  }
};
