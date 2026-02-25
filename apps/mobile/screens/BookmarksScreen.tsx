// File overview:
// - Purpose: Shows user's bookmarked posts with remove and clear-all actions.
// - Reached from: Home/Profile menus and routes as 'BookmarksScreen'.
// - Provides: Loads bookmarks by user, pull-to-refresh, remove single bookmark, clear all (client-side for now).
// - Reads from context: `useUser()` -> `selectedUser`.
// - External deps/services: `bookmarksService` (get/remove), i18n translations.

// TODO: Add comprehensive error handling with user-friendly messages
// TODO: Implement proper loading states and skeleton screens
// TODO: Add bookmark synchronization with backend when available
// TODO: Implement proper pagination for large bookmark lists
// TODO: Add bookmark categories and filtering functionality
// TODO: Implement proper offline support with cache management
// TODO: Add comprehensive accessibility support
// TODO: Replace console.log with proper logging service
// TODO: Add unit tests for all bookmark operations
// TODO: Implement proper image loading and caching for bookmark thumbnails
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { getBookmarks, removeBookmark, Bookmark } from '../utils/bookmarksService';
import colors from '../globals/colors';
import { FontSizes, IconSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';

export default function BookmarksScreen() {
  // TODO: Extract state management to custom hook (useBookmarksState)
  // TODO: Add proper TypeScript interfaces for all props and state
  // TODO: Implement proper error boundaries for crash prevention
  // TODO: Add comprehensive analytics tracking for bookmark actions
  const navigation = useNavigation();
  const { selectedUser } = useUser();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation(['bookmarks','common']);

  const loadBookmarks = async () => {
    // TODO: Add proper loading state management
    // TODO: Implement retry logic for failed requests
    // TODO: Add proper error classification and handling
    // TODO: Implement caching mechanism to reduce API calls
    if (!selectedUser) {
      Alert.alert(t('common:errorTitle'), t('bookmarks:selectUserFirst'));
      return;
    }

    try {
      const userBookmarks = await getBookmarks(selectedUser.id);
      setBookmarks(userBookmarks);
    } catch (error) {
      console.error('❌ Load bookmarks error:', error);
      // TODO: Replace Alert.alert with proper toast/snackbar notification
      // TODO: Add error tracking and monitoring
      Alert.alert(t('common:errorTitle'), t('bookmarks:loadError'));
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, [selectedUser]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔖 BookmarksScreen - Screen focused, refreshing bookmarks...');
      loadBookmarks();
      // Force re-render by updating refresh key
      setRefreshKey(prev => prev + 1);
    }, [selectedUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
    setRefreshing(false);
  };

  const handleRemoveBookmark = async (bookmark: Bookmark) => {
    if (!selectedUser) return;

    Alert.alert(
      t('bookmarks:removeTitle'),
      t('bookmarks:removeMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('bookmarks:removeConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBookmark(selectedUser.id, bookmark.postId);
              setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
              console.log('✅ Bookmark removed');
            } catch (error) {
              console.error('❌ Remove bookmark error:', error);
              Alert.alert(t('common:errorTitle'), t('bookmarks:removeError'));
            }
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    if (!selectedUser) return;

    Alert.alert(
      t('bookmarks:clearTitle'),
      t('bookmarks:clearMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('bookmarks:clearConfirm'),
          style: 'destructive',
          onPress: () => {
            setBookmarks([]);
            console.log('✅ All bookmarks cleared');
          }
        }
      ]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('common:time.now');
    if (diffInHours < 24) return t('common:time.hoursAgo', { count: diffInHours });
    return date.toLocaleDateString();
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <View style={styles.bookmarkContainer}>
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
          >
            <Ionicons name="close-circle" size={IconSizes.small} color={colors.error} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.title}>{item.postData.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.postData.description}
        </Text>
      </View>
    </View>
  );

  if (!selectedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={IconSizes.xxlarge} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t('bookmarks:selectUserTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('bookmarks:selectUserSubtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('bookmarks:title')}</Text>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={IconSizes.xsmall} color={colors.error} />
            <Text style={styles.clearButtonText}>{t('bookmarks:clearConfirm')}</Text>
          </TouchableOpacity>
        )}
      </View>

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
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    //TODO: change padding to be relative to the screen size
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: FontSizes.large,
    //TODO: change font size to be relative to the screen size
    //TODO: move font to globals
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    //TODO: change padding to be relative to the screen size
    padding: 8,
  },
  clearButtonText: {
    fontSize: FontSizes.small,
    color: colors.error,
    //TODO: change margin to be relative to the screen size
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    //TODO: change padding to be relative to the screen size
    padding: 32,
  },
  emptyTitle: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: colors.textPrimary,
    //TODO: change margin to be relative to the screen size
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    //TODO: change padding to be relative to the screen size
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