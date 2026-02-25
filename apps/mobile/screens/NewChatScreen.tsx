// File overview:
// - Purpose: Start a new chat by selecting from friends/suggestions with filters and sorting; creates conversation if needed.
// - Reached from: 'ChatListScreen' quick action and other entry points via route 'NewChatScreen'.
// - Provides: Loads following/followers or suggestions; shows badges for existing chats; on select, navigates to 'ChatDetailScreen' with params.
// - Reads from context: `useUser()` -> `selectedUser`.
// - External deps/services: `followService` (suggestions/followers/following), `chatService` (create, list, exists, send first message).
// screens/NewChatScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ParamListBase } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { getFollowing, getFollowers, getFollowSuggestions } from '../utils/followService';
import { createConversation, getAllConversations, conversationExists, sendMessage } from '../utils/chatService';
import { UserPreview as CharacterType } from '../globals/types';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { Ionicons as Icon } from '@expo/vector-icons';

type FilterType = 'all' | 'online' | 'highKarma' | 'recentFollowers';
type SortType = 'name' | 'karma' | 'followers' | 'recent';

type NewChatRouteParams = Record<string, never>;

export default function NewChatScreen() {
  const { t } = useTranslation(['newChatScreen']);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, NewChatRouteParams>, string>>();
  const { selectedUser } = useUser();
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<CharacterType[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<CharacterType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [existingConversations, setExistingConversations] = useState<string[]>([]);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [filtersHeight, setFiltersHeight] = useState(0);
  const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
  const maxListHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0
    ? screenHeight - tabBarHeight - headerHeight - (showFilters ? filtersHeight : 0)
    : undefined;

  const loadFriends = useCallback(async () => {
    if (!selectedUser) {
      Alert.alert(t('error'), t('selectUserFirst'));
      return;
    }

    try {
      setIsLoading(true);

      const currentUserId = String(selectedUser.id).trim().toLowerCase();
      const currentUserEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

      const following = await getFollowing(selectedUser.id);

      const followers = await getFollowers(selectedUser.id);

      const allFriends = [...following, ...followers];

      // Filter out current user - check both ID and email (case-insensitive)
      const uniqueFriends = allFriends.filter((friend, index, self) =>
        index === self.findIndex(f => f.id === friend.id)
      ).filter(friend => {
        const friendId = String(friend.id || '').trim().toLowerCase();
        const friendEmail = friend.email ? String(friend.email).trim().toLowerCase() : '';
        const isCurrentUser = friendId === currentUserId ||
          (currentUserEmail && friendEmail === currentUserEmail) ||
          friendId === '';

        if (isCurrentUser) {
          console.log('🚫 NewChatScreen - Filtered out current user:', { friendId, friendEmail, name: friend.name });
        }

        return !isCurrentUser;
      });

      const conversations = await getAllConversations(selectedUser.id);
      const existingUserIds = conversations.flatMap(conv =>
        conv.participants.filter(id => id !== selectedUser.id)
      );
      setExistingConversations(existingUserIds);

      if (uniqueFriends.length === 0) {
        const suggestions = await getFollowSuggestions(selectedUser.id, 10, currentUserEmail);
        // Additional filter as safety measure - check both ID and email
        const filteredSuggestions = suggestions.filter(friend => {
          const friendId = String(friend.id || '').trim().toLowerCase();
          const friendEmail = friend.email ? String(friend.email).trim().toLowerCase() : '';
          const isCurrentUser = friendId === currentUserId ||
            (currentUserEmail && friendEmail === currentUserEmail) ||
            friendId === '';

          if (isCurrentUser) {
            console.log('🚫 NewChatScreen - Filtered out current user from suggestions:', { friendId, friendEmail, name: friend.name });
          }

          return !isCurrentUser;
        });
        setFriends(filteredSuggestions);
      } else {
        setFriends(uniqueFriends);
      }

    } catch (error) {
      console.error('❌ Load friends error:', error);
      Alert.alert(t('error'), t('errorLoadingFriends'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedUser]);

  const applyFilters = useCallback((friendsList: CharacterType[]) => {
    if (!selectedUser) return friendsList;

    const currentUserId = String(selectedUser.id).trim().toLowerCase();
    const currentUserEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

    // First, filter out current user (double-check to ensure current user is never shown)
    let filtered = friendsList.filter(friend => {
      const friendId = String(friend.id || '').trim().toLowerCase();
      const friendEmail = friend.email ? String(friend.email).trim().toLowerCase() : '';
      const isCurrentUser = friendId === currentUserId ||
        (currentUserEmail && friendEmail === currentUserEmail) ||
        friendId === '';

      if (isCurrentUser) {
        console.log('🚫 NewChatScreen - Filtered out current user in applyFilters:', { friendId, friendEmail, name: friend.name });
      }

      return !isCurrentUser;
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
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(friend =>
        (friend.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (friend.bio || '').toLowerCase().includes(searchQuery.toLowerCase())
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
    }

    return filtered;
  }, [activeFilter, sortBy, searchQuery, selectedUser]);

  useEffect(() => {
    const filtered = applyFilters(friends);
    setFilteredFriends(filtered);
  }, [friends, applyFilters]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriends();
  }, [loadFriends]);

  const handleCreateChat = async (friend: CharacterType) => {
    if (!selectedUser) {
      Alert.alert(t('error'), t('selectUserFirst'));
      return;
    }

    try {
      const existingConvId = await conversationExists(selectedUser.id, friend.id);
      let conversationId: string;

      if (existingConvId) {
        console.log('💬 Conversation already exists:', existingConvId);
        conversationId = existingConvId;
      } else {
        console.log('💬 Creating new conversation...');
        conversationId = await createConversation([selectedUser.id, friend.id]);

        const welcomeMessage = {
          conversationId,
          senderId: selectedUser.id,
          text: t('welcomeMessage', { name: friend.name }),
          timestamp: new Date().toISOString(),
          read: false,
          type: 'text' as const,
          status: 'sent' as const,
        };

        await sendMessage(welcomeMessage);
        console.log('💬 Sent welcome message');
      }

      (navigation as any).navigate('ChatDetailScreen', {
        conversationId,
        userName: friend.name,
        userAvatar: friend.avatar,
        otherUserId: friend.id,
      });

    } catch (error) {
      console.error('❌ Create chat error:', error);
      Alert.alert(t('error'), t('errorCreatingChat'));
    }
  };

  const renderFriend = ({ item }: { item: CharacterType }) => {
    // Double-check: if this is the current user, don't render at all
    if (!selectedUser) return null;

    const currentUserId = String(selectedUser.id).trim().toLowerCase();
    const currentUserEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';
    const itemId = String(item.id || '').trim().toLowerCase();
    const itemEmail = item.email ? String(item.email).trim().toLowerCase() : '';
    const isCurrentUser = itemId === currentUserId ||
      (currentUserEmail && itemEmail === currentUserEmail) ||
      itemId === '';

    if (isCurrentUser) {
      console.log('🚫 NewChatScreen - renderFriend: Skipping current user:', { itemId, itemEmail, name: item.name });
      return null;
    }

    const hasExistingChat = existingConversations.includes(item.id);
    const avatarUri = item.avatar || 'https://i.pravatar.cc/150?img=1';

    return (
      <TouchableOpacity
        style={[styles.friendItem, hasExistingChat && styles.friendItemWithChat]}
        onPress={() => handleCreateChat(item)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
          />
          {item.isActive && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.friendInfo}>
          <View style={styles.friendHeader}>
            <Text style={styles.friendName}>{item.name || t('noName')}</Text>
            {hasExistingChat && (
              <View style={styles.existingChatBadge}>
                <Text style={styles.existingChatText}>{t('existingChat')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.friendBio} numberOfLines={1}>
            {item.bio || t('noBio')}
          </Text>
          <View style={styles.friendStats}>
            <Text style={styles.karmaPoints}>⭐ {item.karmaPoints ?? 0} {t('karmaPoints')}</Text>
            <Text style={styles.followersCount}>
              👥 {item.followersCount ?? 0} {t('followers')}
            </Text>
          </View>
        </View>
        <Icon
          name={hasExistingChat ? "chatbubble" : "chatbubble-outline"}
          size={24}
          color={hasExistingChat ? colors.success : colors.primary}
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="people-outline" size={80} color={colors.textSecondary} />
      <Icon name="people-outline" size={80} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>{t('noFriendsYet')}</Text>
      <Text style={styles.emptyStateSubtitle}>
        {t('startFollowingToChat')}
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => (navigation as any).navigate('DiscoverPeopleScreen')}
      >
        <Text style={styles.exploreButtonText}>{t('discoverNewPeople')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
      <View
        style={styles.header}
        onLayout={(event) => {
          if (Platform.OS === 'web') {
            const { height } = event.nativeEvent.layout;
            setHeaderHeight(height);
          }
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('DiscoverPeopleScreen')}
          style={styles.headerButton}
        >
          <Icon name="people-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchFriends')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="funnel-outline" size={20} color={colors.primary} />
          <Text style={styles.filterButtonText}>{t('filter')}</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View
          style={styles.filtersContainer}
          onLayout={(event) => {
            if (Platform.OS === 'web') {
              const { height } = event.nativeEvent.layout;
              setFiltersHeight(height);
            }
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
                {t('all')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'online' && styles.filterChipActive]}
              onPress={() => setActiveFilter('online')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'online' && styles.filterChipTextActive]}>
                {t('online')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'highKarma' && styles.filterChipActive]}
              onPress={() => setActiveFilter('highKarma')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'highKarma' && styles.filterChipTextActive]}>
                {t('highKarma')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'recentFollowers' && styles.filterChipActive]}
              onPress={() => setActiveFilter('recentFollowers')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'recentFollowers' && styles.filterChipTextActive]}>
                {t('newFollowers')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>{t('sortLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScrollView}>
              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'name' && styles.sortChipActive]}
                onPress={() => setSortBy('name')}
              >
                <Text style={[styles.sortChipText, sortBy === 'name' && styles.sortChipTextActive]}>
                  {t('sortName')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'karma' && styles.sortChipActive]}
                onPress={() => setSortBy('karma')}
              >
                <Text style={[styles.sortChipText, sortBy === 'karma' && styles.sortChipTextActive]}>
                  {t('sortKarma')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'followers' && styles.sortChipActive]}
                onPress={() => setSortBy('followers')}
              >
                <Text style={[styles.sortChipText, sortBy === 'followers' && styles.sortChipTextActive]}>
                  {t('sortFollowers')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'recent' && styles.sortChipActive]}
                onPress={() => setSortBy('recent')}
              >
                <Text style={[styles.sortChipText, sortBy === 'recent' && styles.sortChipTextActive]}>
                  {t('sortActivity')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* List container - limited height on web to ensure scrolling works */}
      <View style={[
        styles.listWrapper,
        Platform.OS === 'web' && maxListHeight ? {
          maxHeight: maxListHeight,
        } : undefined
      ]}>
        {isLoading && filteredFriends.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('loadingFriends')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriend}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  clearButton: {
    marginLeft: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  friendBio: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  friendStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  karmaPoints: {
    fontSize: FontSizes.caption,
    color: colors.primary,
    marginRight: 12,
  },
  followersCount: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: 'bold',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  filterButtonText: {
    color: colors.primary,
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginLeft: 4,
  },
  filtersContainer: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollView: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.caption,
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginRight: 12,
  },
  sortScrollView: {
    flex: 1,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    fontSize: FontSizes.caption,
    color: colors.textPrimary,
  },
  sortChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  existingChatBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.success + '20',
  },
  existingChatText: {
    fontSize: FontSizes.caption - 2,
    color: colors.success,
    fontWeight: '600',
  },
  friendItemWithChat: {
    borderColor: colors.success + '30',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
}); 