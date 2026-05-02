/**
 * Typed navigation to ChatDetailScreen with canonical params (`ChatDetailScreenParams`).
 * Centralizes legacy alias `chatId` → `conversationId` for duplicate-route safety work (SRS §4.4).
 */

import type { ChatDetailScreenParams } from '../globals/types';
import { logger } from '../utils/loggerService';

const LOG = 'nav:ChatDetail';

export type LooseChatDetailParams = Partial<ChatDetailScreenParams> & {
  /** @deprecated use conversationId */
  chatId?: string;
};

/**
 * Normalize loose payloads (including legacy `chatId`) into canonical params.
 * Returns null if no conversation id can be resolved.
 */
export function normalizeChatDetailParams(raw: LooseChatDetailParams): ChatDetailScreenParams | null {
  const fromConversation =
    typeof raw.conversationId === 'string' ? raw.conversationId.trim() : '';
  const fromLegacyChat = typeof raw.chatId === 'string' ? raw.chatId.trim() : '';
  const conversationId = fromConversation || fromLegacyChat;

  if (!conversationId) return null;

  return {
    conversationId,
    userName: typeof raw.userName === 'string' ? raw.userName : undefined,
    userAvatar: typeof raw.userAvatar === 'string' ? raw.userAvatar : undefined,
    otherUserId: typeof raw.otherUserId === 'string' ? raw.otherUserId : undefined,
  };
}

/**
 * Navigate to ChatDetailScreen on the nearest navigator that owns the route (root or tab stack).
 */
export function navigateToChatDetail(
  navigation: {
    navigate(screen: string, params?: ChatDetailScreenParams): void;
  },
  raw: LooseChatDetailParams,
): void {
  const params = normalizeChatDetailParams(raw);
  if (!params) {
    logger.warn(LOG, 'Skipped navigate — missing conversationId (and no legacy chatId)', {
      hasConversationIdKey: raw.conversationId !== undefined,
      hasChatIdKey: raw.chatId !== undefined,
    });
    return;
  }

  navigation.navigate('ChatDetailScreen', params);
}
