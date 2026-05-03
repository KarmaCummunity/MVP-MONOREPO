import type { UserPreview as CharacterType } from '../globals/types';
import { getFollowing, getFollowers, getFollowSuggestions } from '../utils/followService';
import {
  createConversation,
  conversationExists,
  getAllConversations,
  sendMessage,
} from '../utils/chatService';
import { logger } from '../utils/loggerService';

export const NEW_CHAT_LOG = 'NewChatScreen';

export type FilterType = 'all' | 'online' | 'highKarma' | 'recentFollowers';
export type SortType = 'name' | 'karma' | 'followers' | 'recent';

type SelectedUserShape = { id: string; email?: string | null };

export function computeWebMaxListHeight(
  platformOS: string,
  screenHeight: number | undefined,
  tabBarHeight: number,
  headerHeight: number,
  showFilters: boolean,
  filtersHeight: number,
): number | undefined {
  if (platformOS !== 'web' || screenHeight == null || headerHeight <= 0) {
    return undefined;
  }
  const filtersOffset = showFilters ? filtersHeight : 0;
  return screenHeight - tabBarHeight - headerHeight - filtersOffset;
}

export function isFriendCurrentUser(
  friend: CharacterType,
  currentUserId: string,
  currentUserEmail: string,
): boolean {
  const friendId = String(friend.id || '').trim().toLowerCase();
  const friendEmail = friend.email ? String(friend.email).trim().toLowerCase() : '';
  return (
    friendId === currentUserId ||
    (Boolean(currentUserEmail) && friendEmail === currentUserEmail) ||
    friendId === ''
  );
}

function dedupeFriendsById(friends: CharacterType[]): CharacterType[] {
  return friends.filter((friend, index, self) => index === self.findIndex(f => f.id === friend.id));
}

export async function loadNewChatFriendsFromNetwork(
  selectedUser: SelectedUserShape,
): Promise<{ friends: CharacterType[]; existingUserIds: string[] }> {
  const currentUserId = String(selectedUser.id).trim().toLowerCase();
  const currentUserEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

  const following = await getFollowing(selectedUser.id);
  const followers = await getFollowers(selectedUser.id);
  const allFriends = [...following, ...followers];

  const uniqueFriends = dedupeFriendsById(allFriends).filter(friend => {
    const isCurrent = isFriendCurrentUser(friend, currentUserId, currentUserEmail);
    if (isCurrent) {
      logger.debug(NEW_CHAT_LOG, 'Filtered out current user', {
        friendId: String(friend.id || '').trim().toLowerCase(),
        friendEmail: friend.email ? String(friend.email).trim().toLowerCase() : '',
        name: friend.name,
      });
    }
    return !isCurrent;
  });

  const conversations = await getAllConversations(selectedUser.id);
  const existingUserIds = conversations.flatMap(conv =>
    conv.participants.filter(id => id !== selectedUser.id),
  );

  if (uniqueFriends.length === 0) {
    const suggestions = await getFollowSuggestions(selectedUser.id, 10, currentUserEmail);
    const filteredSuggestions = suggestions.filter(friend => {
      const isCurrent = isFriendCurrentUser(friend, currentUserId, currentUserEmail);
      if (isCurrent) {
        logger.debug(NEW_CHAT_LOG, 'Filtered out current user from suggestions', {
          friendId: String(friend.id || '').trim().toLowerCase(),
          friendEmail: friend.email ? String(friend.email).trim().toLowerCase() : '',
          name: friend.name,
        });
      }
      return !isCurrent;
    });
    return { friends: filteredSuggestions, existingUserIds };
  }

  return { friends: uniqueFriends, existingUserIds };
}

export function applyNewChatFriendFilters(
  friendsList: CharacterType[],
  selectedUser: SelectedUserShape | null | undefined,
  activeFilter: FilterType,
  sortBy: SortType,
  searchQuery: string,
): CharacterType[] {
  if (!selectedUser) return friendsList;

  const currentUserId = String(selectedUser.id).trim().toLowerCase();
  const currentUserEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

  let filtered = friendsList.filter(friend => {
    const isCurrent = isFriendCurrentUser(friend, currentUserId, currentUserEmail);
    if (isCurrent) {
      logger.debug(NEW_CHAT_LOG, 'Filtered out current user in applyFilters', {
        friendId: String(friend.id || '').trim().toLowerCase(),
        friendEmail: friend.email ? String(friend.email).trim().toLowerCase() : '',
        name: friend.name,
      });
    }
    return !isCurrent;
  });

  switch (activeFilter) {
    case 'online':
      filtered = filtered.filter(friend => friend.isActive);
      break;
    case 'highKarma':
      filtered = filtered.filter(friend => (friend.karmaPoints ?? 0) >= 100);
      break;
    case 'recentFollowers':
      filtered = filtered.filter(friend => (friend.followersCount ?? 0) > 0);
      break;
    default:
      break;
  }

  const q = searchQuery.trim();
  if (q !== '') {
    const lower = q.toLowerCase();
    filtered = filtered.filter(
      friend =>
        (friend.name || '').toLowerCase().includes(lower) ||
        (friend.bio || '').toLowerCase().includes(lower),
    );
  }

  switch (sortBy) {
    case 'name':
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
      break;
    case 'karma':
      filtered.sort((a, b) => (b.karmaPoints ?? 0) - (a.karmaPoints ?? 0));
      break;
    case 'followers':
      filtered.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0));
      break;
    case 'recent':
      filtered.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return 0;
      });
      break;
    default:
      break;
  }

  return filtered;
}

export async function ensureConversationAndWelcome(
  selectedUser: SelectedUserShape,
  friend: CharacterType,
  welcomeText: string,
): Promise<string> {
  const existingConvId = await conversationExists(selectedUser.id, friend.id);
  if (existingConvId) {
    logger.debug(NEW_CHAT_LOG, 'Conversation already exists', { conversationId: existingConvId });
    return existingConvId;
  }

  logger.debug(NEW_CHAT_LOG, 'Creating new conversation');
  const conversationId = await createConversation([selectedUser.id, friend.id]);

  await sendMessage({
    conversationId,
    senderId: selectedUser.id,
    text: welcomeText,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'text',
    status: 'sent',
  });
  logger.debug(NEW_CHAT_LOG, 'Sent welcome message');

  return conversationId;
}
