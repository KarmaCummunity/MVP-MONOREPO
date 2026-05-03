// File overview:
// - Purpose: Shows user's bookmarked posts with remove and clear-all actions.
// - Reached from: Home/Profile menus and routes as 'BookmarksScreen'.
// - Provides: Loads bookmarks by user, pull-to-refresh, remove single bookmark, clear all (client-side for now).
// - Reads from context: `useUser()` -> `selectedUser`.
// - External deps/services: `bookmarksService` (get/remove), i18n translations.
// - Possible future work (tracked in product backlog): richer errors/toasts, skeleton loaders,
//   pagination, offline cache, categories, expanded a11y, tests.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { logger } from '../utils/loggerService';

const BookmarksScreen_LOG = 'BookmarksScreen';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import {
  getBookmarks,
  removeBookmark,
  clearAllBookmarks,
  Bookmark,
} from '../utils/bookmarksService';
import colors from '../globals/colors';
import { FontSizes, IconSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import type { FeedItem } from '../types/feed';

function bookmarkToInitialFeedItem(bookmark: Bookmark): FeedItem {
  const pd = bookmark.postData;
  return {
    id: bookmark.postId,
    type: 'post',
    title: pd.title ?? '',
    description: pd.description ?? '',
    thumbnail: pd.thumbnail?.trim() ? pd.thumbnail : null,
    timestamp: bookmark.timestamp,
    user: {
      id: pd.user?.id ?? '',
      name: pd.user?.name ?? undefined,
      avatar: pd.user?.avatar ?? undefined,
    },
    likes: 0,
    comments: 0,
    isLiked: false,
  };
}

export default function BookmarksScreen() {
  const { selectedUser } = useUser();
  const navigation = useNavigation<any>();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation(['bookmarks','common']);

  const loadBookmarks = useCallback(async () => {
    if (!selectedUser) {
      Alert.alert(t('common:errorTitle'), t('bookmarks:selectUserFirst'));
      return;
    }

    try {
      const userBookmarks = await getBookmarks(selectedUser.id);
      setBookmarks(userBookmarks);
    } catch (error) {
      console.error('❌ Load bookmarks error:', error);
      Alert.alert(t('common:errorTitle'), t('bookmarks:loadError'));
    }
  }, [selectedUser, t]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      logger.logScreenOpened('BookmarksScreen');
      logger.debug(BookmarksScreen_LOG, '🔖 BookmarksScreen - Screen focused, refreshing bookmarks...');
      loadBookmarks();
    }, [loadBookmarks])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
    setRefreshing(false);
  };

  const performRemoveBookmark = useCallback(
    async (bookmark: Bookmark) => {
      if (!selectedUser) return;
      try {
        await removeBookmark(selectedUser.id, bookmark.postId);
        setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
        logger.debug(BookmarksScreen_LOG, '✅ Bookmark removed');
      } catch (error) {
        console.error('❌ Remove bookmark error:', error);
        Alert.alert(t('common:errorTitle'), t('bookmarks:removeError'));
      }
    },
    [selectedUser, t],
  );

  const handleRemoveBookmark = (bookmark: Bookmark) => {
    if (!selectedUser) return;

    Alert.alert(t('bookmarks:removeTitle'), t('bookmarks:removeMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('bookmarks:removeConfirm'),
        style: 'destructive',
        onPress: () => {
          void performRemoveBookmark(bookmark);
        },
      },
    ]);
  };

  const performClearAllBookmarks = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await clearAllBookmarks(selectedUser.id);
      setBookmarks([]);
      logger.debug(BookmarksScreen_LOG, '✅ All bookmarks cleared');
    } catch (error) {
      console.error('❌ Clear all bookmarks error:', error);
      Alert.alert(t('common:errorTitle'), t('bookmarks:loadError'));
    }
  }, [selectedUser, t]);

  const handleClearAll = useCallback(() => {
    if (!selectedUser) return;

    Alert.alert(t('bookmarks:clearTitle'), t('bookmarks:clearMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('bookmarks:clearConfirm'),
        style: 'destructive',
        onPress: () => {
          void performClearAllBookmarks();
        },
      },
    ]);
  }, [selectedUser, t, performClearAllBookmarks]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('common:time.now');
    if (diffInHours < 24) return t('common:time.hoursAgo', { count: diffInHours });
    return date.toLocaleDateString();
  };

  const openPost = useCallback(
    (bookmark: Bookmark) => {
      navigation.navigate('PostDetailScreen', {
        postId: bookmark.postId,
        initialItem: bookmarkToInitialFeedItem(bookmark),
      });
    },
    [navigation],
  );

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity
      style={styles.bookmarkContainer}
      activeOpacity={0.75}
      onPress={() => openPost(item)}
      accessibilityRole="button"
      accessibilityLabel={item.postData.title}
    >
      <Image source={{ uri: item.postData.thumbnail }} style={styles.thumbnail} />
      
      <View style={styles.contentContainer}>
        <View style={styles.bookmarkHeader}>
          <View style={styles.userInfo}>
            <Image source={{ uri: item.postData.user.avatar }} style={styles.userAvatar} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.postData.user.name}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => handleRemoveBookmark(item)}
            accessibilityRole="button"
            accessibilityLabel={t('bookmarks:removeConfirm')}
          >
            <Ionicons name="close-circle" size={IconSizes.small} color={colors.error} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.title}>{item.postData.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.postData.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const listHeader = useCallback(
    () => (
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={IconSizes.xsmall} color={colors.error} />
          <Text style={styles.clearButtonText}>{t('bookmarks:clearConfirm')}</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleClearAll, t],
  );

  if (!selectedUser) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={IconSizes.xxlarge} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t('bookmarks:selectUserTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('bookmarks:selectUserSubtitle')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {bookmarks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={IconSizes.xxlarge} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t('bookmarks:emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('bookmarks:emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  clearButtonText: {
    fontSize: FontSizes.small,
    color: colors.error,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  bookmarkContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 4,
  },
  title: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    lineHeight: 16,
  },
}); 