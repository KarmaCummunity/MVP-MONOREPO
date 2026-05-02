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
import type { TFunction } from 'i18next';
import { useSafeBottomTabBarHeight } from '../hooks/useSafeBottomTabBarHeight';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useLogScreenOpened } from '../hooks/useLogScreenOpened';
import { useUser } from '../stores/userStore';
import { UserPreview as CharacterType } from '../globals/types';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { Ionicons as Icon } from '@expo/vector-icons';
import { logger } from '../utils/loggerService';
import { navigateToChatDetail } from '../navigations/chatDetailNavigation';
import {
  NEW_CHAT_LOG,
  applyNewChatFriendFilters,
  computeWebMaxListHeight,
  ensureConversationAndWelcome,
  isFriendCurrentUser,
  loadNewChatFriendsFromNetwork,
  type FilterType,
  type SortType,
} from './newChatScreenHelpers';

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

type NewChatFiltersPanelProps = Readonly<{
  activeFilter: FilterType;
  sortBy: SortType;
  setActiveFilter: (f: FilterType) => void;
  setSortBy: (s: SortType) => void;
  onWebFiltersLayoutHeight: (height: number) => void;
  t: TFunction;
}>;

const FILTER_CHIPS: { filter: FilterType; labelNsKey: string }[] = [
  { filter: 'all', labelNsKey: 'all' },
  { filter: 'online', labelNsKey: 'online' },
  { filter: 'highKarma', labelNsKey: 'highKarma' },
  { filter: 'recentFollowers', labelNsKey: 'newFollowers' },
];

const SORT_CHIPS: { sort: SortType; labelNsKey: string }[] = [
  { sort: 'name', labelNsKey: 'sortName' },
  { sort: 'karma', labelNsKey: 'sortKarma' },
  { sort: 'followers', labelNsKey: 'sortFollowers' },
  { sort: 'recent', labelNsKey: 'sortActivity' },
];

function NewChatFiltersPanel(props: NewChatFiltersPanelProps) {
  const { activeFilter, sortBy, setActiveFilter, setSortBy, onWebFiltersLayoutHeight, t } = props;
  return (
    <View
      style={styles.filtersContainer}
      onLayout={event => {
        if (Platform.OS === 'web') {
          onWebFiltersLayoutHeight(event.nativeEvent.layout.height);
        }
      }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
        {FILTER_CHIPS.map(({ filter, labelNsKey }) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
              {t(labelNsKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>{t('sortLabel')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScrollView}>
          {SORT_CHIPS.map(({ sort, labelNsKey }) => (
            <TouchableOpacity
              key={sort}
              style={[styles.sortChip, sortBy === sort && styles.sortChipActive]}
              onPress={() => setSortBy(sort)}
            >
              <Text style={[styles.sortChipText, sortBy === sort && styles.sortChipTextActive]}>
                {t(labelNsKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

type NewChatFriendRowProps = Readonly<{
  item: CharacterType;
  selectedUser: { id: string; email?: string | null };
  existingConversations: string[];
  onPress: (friend: CharacterType) => void;
  t: TFunction;
}>;

function NewChatFriendRow(props: NewChatFriendRowProps) {
  const { item, selectedUser, existingConversations, onPress, t } = props;
  const currentUserId = String(selectedUser.id).trim().toLowerCase();
  const currentUserEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

  if (isFriendCurrentUser(item, currentUserId, currentUserEmail)) {
    logger.debug(NEW_CHAT_LOG, 'renderFriend: Skipping current user', {
      itemId: String(item.id || '').trim().toLowerCase(),
      itemEmail: item.email ? String(item.email).trim().toLowerCase() : '',
      name: item.name,
    });
    return null;
  }

  const hasExistingChat = existingConversations.includes(item.id);
  const avatarUri = item.avatar || 'https://i.pravatar.cc/150?img=1';

  return (
    <TouchableOpacity
      style={[styles.friendItem, hasExistingChat && styles.friendItemWithChat]}
      onPress={() => onPress(item)}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
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
          <Text style={styles.karmaPoints}>
            ⭐ {item.karmaPoints ?? 0} {t('karmaPoints')}
          </Text>
          <Text style={styles.followersCount}>
            👥 {item.followersCount ?? 0} {t('followers')}
          </Text>
        </View>
      </View>
      <Icon
        name={hasExistingChat ? 'chatbubble' : 'chatbubble-outline'}
        size={24}
        color={hasExistingChat ? colors.success : colors.primary}
      />
    </TouchableOpacity>
  );
}

type NewChatListBodyProps = Readonly<{
  isLoading: boolean;
  filteredFriends: CharacterType[];
  refreshing: boolean;
  onRefresh: () => void;
  selectedUser: { id: string; email?: string | null } | null;
  existingConversations: string[];
  onOpenChat: (friend: CharacterType) => void;
  renderEmpty: () => React.ReactElement;
  t: TFunction;
}>;

function NewChatListBody(props: NewChatListBodyProps) {
  const {
    isLoading,
    filteredFriends,
    refreshing,
    onRefresh,
    selectedUser,
    existingConversations,
    onOpenChat,
    renderEmpty,
    t,
  } = props;
  if (isLoading && filteredFriends.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('loadingFriends')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredFriends}
      keyExtractor={item => item.id}
      renderItem={({ item }) =>
        selectedUser ? (
          <NewChatFriendRow
            item={item}
            selectedUser={selectedUser}
            existingConversations={existingConversations}
            onPress={onOpenChat}
            t={t}
          />
        ) : null
      }
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      scrollEnabled
      nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    />
  );
}

export default function NewChatScreen() {
  useLogScreenOpened('NewChatScreen');
  const { t } = useTranslation(['newChatScreen']);
  const navigation = useNavigation();
  const { selectedUser } = useUser();
  const tabBarHeight = useSafeBottomTabBarHeight();
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
  const maxListHeight = computeWebMaxListHeight(
    Platform.OS,
    screenHeight,
    tabBarHeight,
    headerHeight,
    showFilters,
    filtersHeight,
  );

  const loadFriends = useCallback(async () => {
    if (!selectedUser) {
      Alert.alert(t('error'), t('selectUserFirst'));
      return;
    }

    try {
      setIsLoading(true);
      const { friends: nextFriends, existingUserIds } = await loadNewChatFriendsFromNetwork(selectedUser);
      setFriends(nextFriends);
      setExistingConversations(existingUserIds);
    } catch (error) {
      console.error('❌ Load friends error:', error);
      Alert.alert(t('error'), t('errorLoadingFriends'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedUser, t]);

  const applyFilters = useCallback(
    (friendsList: CharacterType[]) =>
      applyNewChatFriendFilters(friendsList, selectedUser, activeFilter, sortBy, searchQuery),
    [activeFilter, sortBy, searchQuery, selectedUser],
  );

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
      const welcomeText = t('welcomeMessage', { name: friend.name });
      const conversationId = await ensureConversationAndWelcome(selectedUser, friend, welcomeText);

      navigateToChatDetail(navigation, {
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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="people-outline" size={80} color={colors.textSecondary} />
      <Icon name="people-outline" size={80} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>{t('noFriendsYet')}</Text>
      <Text style={styles.emptyStateSubtitle}>{t('startFollowingToChat')}</Text>
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
        onLayout={event => {
          if (Platform.OS === 'web') {
            setHeaderHeight(event.nativeEvent.layout.height);
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

        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
          <Icon name="funnel-outline" size={20} color={colors.primary} />
          <Text style={styles.filterButtonText}>{t('filter')}</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <NewChatFiltersPanel
          activeFilter={activeFilter}
          sortBy={sortBy}
          setActiveFilter={setActiveFilter}
          setSortBy={setSortBy}
          onWebFiltersLayoutHeight={setFiltersHeight}
          t={t}
        />
      )}

      <View
        style={[
          styles.listWrapper,
          Platform.OS === 'web' && maxListHeight != null ? { maxHeight: maxListHeight } : undefined,
        ]}
      >
        <NewChatListBody
          isLoading={isLoading}
          filteredFriends={filteredFriends}
          refreshing={refreshing}
          onRefresh={onRefresh}
          selectedUser={selectedUser}
          existingConversations={existingConversations}
          onOpenChat={handleCreateChat}
          renderEmpty={renderEmptyState}
          t={t}
        />
      </View>
    </SafeAreaView>
  );
}
