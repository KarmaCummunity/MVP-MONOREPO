// File overview:
// - Purpose: List of user conversations with search, pull-to-refresh, and live updates.
// - Reached from: Top bar navigation and stacks (Home/Search/Profile/Donations) via 'ChatListScreen'.
// - Provides: Merges real conversations (via `chatService`) with demo ones in non-real auth; navigates to 'ChatDetailScreen' with params.
// - Reads from context: `useUser()` -> selectedUser, isRealAuth.
// - Params on navigate to detail: `{ conversationId, otherUserId, userName, userAvatar }`.
// - External deps/services: `chatService` (get/subscribe), i18n, Haptics, static users from `fakeData` and `characterTypes`.
// ChatListScreen – professional, concise, with in-file demo support and live updates
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, RefreshControl, Alert, TextInput, TouchableOpacity, Platform, SafeAreaView, StatusBar, Dimensions, FlatList } from 'react-native';
import { useNavigation, NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import ChatListItem from '../components/ChatListItem';
import { useUser } from '../stores/userStore';
import { getConversations, Conversation as ChatConversation, subscribeToConversations } from '../utils/chatService';
import { apiService } from '../utils/apiService';
import { USE_BACKEND } from '../utils/config.constants';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

// Demo data is now localized via i18n inside the component

export default function ChatListScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { selectedUser, isRealAuth } = useUser();
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersMap, setUsersMap] = useState<Map<string, ChatUser>>(new Map());
  const usersMapRef = useRef<Map<string, ChatUser>>(new Map());
  const { t } = useTranslation(['chat', 'common']);
  const [searchHeight, setSearchHeight] = useState(0);
  const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
  const maxListHeight = Platform.OS === 'web' && screenHeight && searchHeight > 0
    ? screenHeight - tabBarHeight - searchHeight
    : undefined;

  // Local ChatUser type for display only
  interface ChatUser {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string;
    status?: string;
  }

  // Update ref when usersMap changes
  useEffect(() => {
    usersMapRef.current = usersMap;
  }, [usersMap]);

  // Load user profiles for participants
  const loadUserProfiles = useCallback(async (participantIds: string[]): Promise<void> => {
    if (!USE_BACKEND || participantIds.length === 0) return;

    // Check which users are missing using ref to avoid setState in setState
    const currentMap = usersMapRef.current;
    const missingIds = participantIds.filter(id => !currentMap.has(id) && id !== selectedUser?.id);

    if (missingIds.length === 0) return;

    // Load user profiles in parallel
    try {
      const loadedUsers = await Promise.all(missingIds.map(async (userId) => {
        try {
          const response = await apiService.getUserById(userId);
          if (response.success && response.data) {
            const userData = response.data;
            return {
              id: userId,
              name: userData.name || t('chat:unknownUser'),
              avatar: userData.avatar_url || userData.avatar || '',
              isOnline: false,
              lastSeen: userData.last_active || new Date().toISOString(),
              status: userData.bio || '',
            } as ChatUser;
          }
        } catch (error) {
          console.warn(`Failed to load user ${userId}:`, error);
        }
        return null;
      }));

      const validUsers = loadedUsers.filter(Boolean) as ChatUser[];
      if (validUsers.length > 0) {
        setUsersMap(prev => {
          const updated = new Map(prev);
          validUsers.forEach(user => {
            updated.set(user.id, user);
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error loading user profiles:', error);
    }
  }, [selectedUser, t]);

  // Load conversations (real + demo)
  const loadConversations = useCallback(async () => {
    if (!selectedUser) {
      Alert.alert(t('common:errorTitle'), t('chat:selectUserFirst'));
      return;
    }
    setRefreshing(true);
    try {
      const realConversations = await getConversations(selectedUser.id);

      // Load user profiles for all participants BEFORE setting conversations
      const allParticipantIds = new Set<string>();
      realConversations.forEach(conv => {
        if (conv.participants && Array.isArray(conv.participants)) {
          conv.participants.forEach(id => {
            if (id !== selectedUser.id) {
              allParticipantIds.add(id);
            }
          });
        }
      });

      // Wait for user profiles to load before showing conversations
      if (allParticipantIds.size > 0) {
        await loadUserProfiles(Array.from(allParticipantIds));
      }

      // Set conversations after profiles are loaded
      setConversations(realConversations);
    } catch (error) {
      console.error('❌ Load conversations error:', error);
      Alert.alert(t('common:errorTitle'), t('chat:loadConversationsError'));
    } finally {
      setRefreshing(false);
    }
  }, [selectedUser, loadUserProfiles, t]);

  // Subscribe to live updates while screen focused
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      if (!selectedUser) return;
      const unsubscribe = subscribeToConversations(selectedUser.id, updated => {
        setConversations(updated);
      });
      return () => unsubscribe();
    }, [selectedUser, loadConversations])
  );

  const onRefresh = useCallback(() => loadConversations(), [loadConversations]);

  // Load missing user profiles when conversations change
  useEffect(() => {
    if (!USE_BACKEND || !selectedUser || conversations.length === 0) return;

    const allParticipantIds = new Set<string>();
    conversations.forEach(conv => {
      if (conv.participants && Array.isArray(conv.participants)) {
        conv.participants.forEach(id => {
          if (id !== selectedUser.id && !usersMap.has(id)) {
            allParticipantIds.add(id);
          }
        });
      }
    });

    if (allParticipantIds.size > 0) {
      loadUserProfiles(Array.from(allParticipantIds)).catch(console.error);
    }
  }, [conversations, selectedUser, usersMap, loadUserProfiles]);

  // Resolve display data for conversations (other user, last message, unread)
  const combinedUsers = useMemo(() => {
    // No demo/static users – rely on real user data from backend elsewhere if available
    return [] as ChatUser[];
  }, []);

  const filteredSortedConversations = useMemo(() => {
    if (!selectedUser) return [] as ChatConversation[];
    const sorted = [...conversations].sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.trim().toLowerCase();
    return sorted.filter(conv => {
      if (!conv.participants || !Array.isArray(conv.participants)) return false;
      const otherId = conv.participants.find(id => id !== selectedUser.id);
      if (!otherId) return false;
      const other = usersMap.get(otherId);
      return other?.name?.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, usersMap, selectedUser]);

  const handlePressChat = (conversationId: string, otherUserId: string, userName: string, userAvatar: string) => {
    navigation.navigate('ChatDetailScreen', { conversationId, otherUserId, userName, userAvatar });
  };

  // Create new chat – simple CTA next to the search bar
  const handleNewChat = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
    navigation.navigate('NewChatScreen');
  };

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
      {/* Search bar for conversations */}
      <View 
        style={styles.searchContainer}
        onLayout={(event) => {
          if (Platform.OS === 'web') {
            const { height } = event.nativeEvent.layout;
            setSearchHeight(height);
          }
        }}
      >
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('chat:searchChatsPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton} activeOpacity={0.8}>
          <Icon name="add-circle-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* List container - limited height on web to ensure scrolling works */}
      <View style={[
        styles.listWrapper,
        Platform.OS === 'web' && maxListHeight ? {
          maxHeight: maxListHeight,
        } : undefined
      ]}>
        <FlatList
          data={filteredSortedConversations.filter(item => item.participants && Array.isArray(item.participants) && item.participants.length > 0)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const otherId = item.participants!.find(id => id !== selectedUser?.id);
            if (!otherId) {
              return null;
            }

            // Get user from loaded profiles - only show if we have valid user data
            const chattingUser = usersMap.get(otherId);

            // Don't show items without valid user data
            if (!chattingUser) {
              return null;
            }

            // Check if user has valid name (not "unknown user" or empty)
            const unknownUserText = t('chat:unknownUser');
            if (!chattingUser.name ||
              chattingUser.name === unknownUserText ||
              chattingUser.name.trim() === '') {
              return null;
            }

            const chatUser: ChatUser = {
              id: chattingUser.id,
              name: chattingUser.name,
              avatar: chattingUser.avatar,
              isOnline: Boolean((chattingUser as any).isOnline),
              lastSeen: (chattingUser as any).lastActive || new Date().toISOString(),
              status: (chattingUser as any).bio || '',
            };
            const chatConversation = {
              id: item.id,
              userId: otherId || '',
              messages: [],
              lastMessageTimestamp: item.lastMessageTime,
              lastMessageText: item.lastMessageText,
              unreadCount: item.unreadCount,
              participants: item.participants || [],
            };
            return (
              <ChatListItem
                conversation={chatConversation}
                user={chatUser}
                onPress={() => handlePressChat(item.id, chatUser.id, chatUser.name, chatUser.avatar || '')}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>{t('chat:noChats')}</Text>
              <Text style={styles.emptyStateSubtitle}>{t('chat:startNewOrClearSearch')}</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          scrollEnabled={true}
          nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    textAlign: 'right',
    fontSize: FontSizes.body,
    flex: 1,
  },
  newChatButton: {
    marginLeft: 10,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
  },
});
