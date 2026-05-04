import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  type ListRenderItem,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, useFocusEffect, CommonActions } from '@react-navigation/native';

import colors from '../globals/colors';
import { FeedItem, getFeedItemChallengeId } from '../types/feed';
import { useFeedData } from '../hooks/useFeedData';
import PostReelItem from './Feed/PostReelItem';
import FeedHeader from './Feed/FeedHeader';
import FeedFilterSheet from './Feed/FeedFilterSheet';
import {
  applyFeedFilters,
  DEFAULT_FEED_FILTER_STATE,
  feedFiltersActive,
  type FeedFilterState,
} from '../utils/feedFilters';
import CommentsModal from './CommentsModal';
import OptionsModal from './Feed/OptionsModal';
import ReportPostModal from './Feed/ReportPostModal';
import EditPostModal from './Feed/EditPostModal';
import { apiService } from '../utils/apiService';
import { KC_ORGANIZATION_ROOT_EMAIL } from '../utils/org.constants';
import { postsService } from '../utils/postsService';
import { logger } from '../utils/loggerService';
import { navigateToPostDetail } from '../utils/navigateToPostDetail';
import { usePostMenu } from '../hooks/usePostMenu';
import { reopenFeedPostWithUiFeedback } from '../utils/reopenFeedPost';
import { useUser } from '../stores/userStore';
import { toastService } from '../utils/toastService';
import { isMobileWeb } from '../globals/responsive';
import { computeFeedCellWidth } from '../utils/feedLayout';

const FEED_NUM_COLUMNS = 2;
/** Horizontal gap between the two cards in a row (FlatList columnWrapper). */
const FEED_COLUMN_GAP = 8;

// Virtualized list tuning: each list row is FEED_NUM_COLUMNS items. Low batch
// sizes (meant for multi-column grids) cap visible rows ~5 until scroll — looks
// like a "only 5 posts" bug. Align with other screens (e.g. DiscoverPeopleScreen).
const FEED_INITIAL_NUM_TO_RENDER = 10;
const FEED_MAX_TO_RENDER_PER_BATCH = 8;
const FEED_WINDOW_SIZE = 10;
/** Fraction of visible list height from bottom; lower = trigger earlier (helps short feeds / web). */
const FEED_ON_END_REACHED_THRESHOLD = 0.12;
/** Backup trigger when onEndReached does not fire (e.g. content height ≈ viewport). */
const FEED_NEAR_END_PX = 400;

// Props
interface PostsReelsScreenProps {
  onScroll?: (hide: boolean) => void;
  hideTopBar?: boolean;
  showTopBar?: boolean;
}

const PostsReelsScreen: React.FC<PostsReelsScreenProps> = ({
  onScroll,
  hideTopBar = false,
  showTopBar: _showTopBar = false
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { selectedUser, isGuestMode } = useUser();
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPadding = isMobileWeb() ? 8 : 16;

  useFocusEffect(
    useCallback(() => {
      logger.logScreenOpened('PostsReelsScreen', {
        hostRoute: typeof route.name === 'string' ? route.name : String(route.name ?? ''),
      });
    }, [route.name]),
  );

  // State — guests only use public discovery feed (no friends list)
  const [feedMode, setFeedMode] = useState<'friends' | 'discovery'>(() =>
    isGuestMode ? 'discovery' : 'friends',
  );

  useEffect(() => {
    if (isGuestMode) {
      setFeedMode('discovery');
    }
  }, [isGuestMode]);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedItemForComments, setSelectedItemForComments] = useState<FeedItem | null>(null);
  // Report State
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<FeedItem | null>(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [feedFilterState, setFeedFilterState] = useState<FeedFilterState>(DEFAULT_FEED_FILTER_STATE);

  const {
    feed,
    loading,
    refreshing,
    loadingMore,
    hasMorePosts,
    initialError,
    loadMoreError,
    clearLoadMoreError,
    refresh,
    loadMore,
  } = useFeedData(feedMode);

  // Post menu hook
  const {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    selectedPostForReport,
    setSelectedPostForReport
  } = usePostMenu({
    onDelete: (_postId) => {
      refresh(); // Refresh feed on success
    },
    onReport: (item) => {
      setSelectedPostForReport(item);
      setReportModalVisible(true);
    },
    onEdit: (item) => {
      setSelectedItemForEdit(item);
      setEditModalVisible(true);
    },
    onHide: async (item) => {
      if (!selectedUser?.id) return;

      try {
        const result = await postsService.hidePost(item.id, selectedUser.id);
        if (result.success) {
          toastService.showSuccess(t('post.hideSuccess') || 'הפוסט הוסתר בהצלחה');
          refresh();
        } else {
          toastService.showError(result.error || t('post.hideError') || 'שגיאה בהסתרת הפוסט');
        }
      } catch (error) {
        console.error('Error hiding post:', error);
        toastService.showError(t('post.hideError') || 'שגיאה בהסתרת הפוסט');
      }
    },
    onReopen: async (item) => {
      const ok = await reopenFeedPostWithUiFeedback(item);
      if (ok) {
        refresh();
      }
    },
  });

  const filteredFeed = useMemo(
    () => applyFeedFilters(feed, feedFilterState),
    [feed, feedFilterState],
  );

  const filtersActive = useMemo(() => feedFiltersActive(feedFilterState), [feedFilterState]);

  const hasMorePostsRef = useRef(hasMorePosts);
  const loadingMoreRef = useRef(loadingMore);
  const loadingRef = useRef(loading);
  const loadMoreRef = useRef(loadMore);
  const listViewportHeightRef = useRef(0);
  hasMorePostsRef.current = hasMorePosts;
  loadingMoreRef.current = loadingMore;
  loadingRef.current = loading;
  loadMoreRef.current = loadMore;

  /** When the list is shorter than the viewport, onEndReached may never fire — chain loadMore until it scrolls or ends. */
  const maybeLoadMoreIfListTooShort = useCallback(() => {
    if (
      loadingRef.current ||
      !hasMorePostsRef.current ||
      loadingMoreRef.current ||
      listViewportHeightRef.current < 1
    ) {
      return;
    }
    loadMoreRef.current();
  }, []);

  useEffect(() => {
    if (loading || !hasMorePosts || loadingMore || filteredFeed.length === 0) {
      return;
    }
    const t = setTimeout(maybeLoadMoreIfListTooShort, 100);
    return () => clearTimeout(t);
  }, [loading, hasMorePosts, loadingMore, filteredFeed.length, maybeLoadMoreIfListTooShort]);

  // Scroll Handling
  const lastScrollY = useRef(0);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const currentScrollY = contentOffset.y;
    const isScrollingDown = currentScrollY > lastScrollY.current;

    if (onScroll) {
      // Simple logic: hide if scrolling down more than 50px, show if scrolling up
      if (currentScrollY > 50 && isScrollingDown) {
        onScroll(true);
      } else if (currentScrollY < lastScrollY.current - 20) {
        onScroll(false);
      }
    }
    lastScrollY.current = currentScrollY;

    // Backup infinite scroll: onEndReached sometimes does not fire when content is short or on web.
    const distanceFromEnd =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    const listFitsInViewport = contentSize.height <= layoutMeasurement.height + 4;
    if (
      distanceFromEnd < FEED_NEAR_END_PX &&
      hasMorePostsRef.current &&
      !loadingMoreRef.current &&
      !loadingRef.current &&
      (listFitsInViewport || contentSize.height > layoutMeasurement.height)
    ) {
      loadMoreRef.current();
    }
  }, [onScroll]);

  // Handlers
  const handleStatsPress = useCallback(() => {
    logger.debug('PostsReelsScreen', 'Navigating to CommunityStatsScreen');
    navigation.navigate('CommunityStatsScreen');
  }, [navigation]);

  const handleFilterPress = useCallback(() => {
    setFilterSheetVisible(true);
  }, []);

  const handlePostPress = useCallback(
    (item: FeedItem) => {
      logger.debug('PostsReelsScreen', 'Post pressed', { itemId: item.id });
      if (item.subtype === 'community_challenge') {
        const challengeId = getFeedItemChallengeId(item);
        if (challengeId) {
          const tabNav = navigation.getParent?.() as { navigate?: (name: string, p?: object) => void } | undefined;
          const tabState =
            tabNav && typeof (tabNav as { getState?: () => { routeNames?: string[] } }).getState === 'function'
              ? (tabNav as { getState: () => { routeNames?: string[] } }).getState()
              : undefined;
          if (tabState?.routeNames?.includes('DonationsTab') && tabNav?.navigate) {
            tabNav.navigate('DonationsTab', {
              screen: 'ChallengeDetailsScreen',
              params: { challengeId },
            });
            return;
          }
          navigation.dispatch(
            CommonActions.navigate({
              name: 'HomeStack',
              params: {
                screen: 'DonationsTab',
                params: {
                  screen: 'ChallengeDetailsScreen',
                  params: { challengeId },
                },
              },
            } as never),
          );
          return;
        }
      }
      navigateToPostDetail(navigation, { postId: item.id, initialItem: item });
    },
    [navigation],
  );

  const handleCommentPress = useCallback((item: FeedItem) => {
    setSelectedItemForComments(item);
    setCommentsModalVisible(true);
  }, []);

  const handleReportSubmit = async (reason: string) => {
    if (!selectedPostForReport) return;

    setIsSubmittingReport(true);
    try {
      const adminEmail = KC_ORGANIZATION_ROOT_EMAIL;
      // Resolve admin ID - try multiple methods
      let adminId: string | null = null;
      try {
        const resolveRes = await apiService.resolveUserId({ email: adminEmail });
        if (resolveRes.success && resolveRes.data?.id) {
          adminId = resolveRes.data.id;
        }
      } catch (e) { console.warn('Resolve admin failed', e); }

      if (!adminId) {
        // Fallback or better error handling needed in real app
        // For MVP we might need to assume a system user or fail gracefuly
        // Attempt search
        const searchRes = await apiService.getUsers({ search: adminEmail, limit: 1 });
        if (searchRes.success && searchRes.data?.[0]?.id) {
          adminId = searchRes.data[0].id;
        }
      }

      if (adminId && selectedUser?.id) {
        const taskData = {
          title: `Report on Post: ${selectedPostForReport.title || selectedPostForReport.id}`,
          description: `Reporter: ${selectedUser.name} (${selectedUser.email})\nPost ID: ${selectedPostForReport.id}\nReason: ${reason}\n\nLink: /post/${selectedPostForReport.id}`, // Deep-linking to be implemented
          status: 'open',
          priority: 'high',
          category: 'דיווח',
          assignees: [adminId],
          created_by: selectedUser.id,
          due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h SLA
          metadata: {
            related_post_id: selectedPostForReport.id,
            report_reason: reason
          }
        };

        const res = await apiService.createTask(taskData);
        if (res.success) {
          Alert.alert(t('common.success') || 'Success', t('common.report_sent') || 'Report sent successfully');
          setReportModalVisible(false);
          setSelectedPostForReport(null);
        } else {
          throw new Error(res.error || 'Failed to create task');
        }
      } else {
        throw new Error('Could not resolve admin or user ID');
      }

    } catch (error) {
      console.error('Report failed:', error);
      Alert.alert(t('common.error') || 'Error', t('common.report_failed') || 'Failed to send report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const feedCellWidth = useMemo(
    () =>
      computeFeedCellWidth({
        windowWidth,
        horizontalPadding,
        numColumns: FEED_NUM_COLUMNS,
        columnGap: FEED_COLUMN_GAP,
      }),
    [windowWidth, horizontalPadding],
  );

  const renderItem = useCallback<ListRenderItem<FeedItem>>(
    ({ item }) => (
      <PostReelItem
        item={item}
        cardWidth={feedCellWidth}
        numColumns={FEED_NUM_COLUMNS}
        onPress={handlePostPress}
        onCommentPress={handleCommentPress}
        onMorePress={handleMorePress}
      />
    ),
    [feedCellWidth, handlePostPress, handleCommentPress, handleMorePress],
  );

  const renderListFooter = useCallback(() => {
    if (!hasMorePosts) {
      return null;
    }
    if (loadMoreError) {
      return (
        <View style={styles.footerMessage} accessibilityRole="alert">
          <Text style={styles.footerErrorText}>{loadMoreError}</Text>
          <TouchableOpacity
            onPress={() => {
              clearLoadMoreError();
              loadMore();
            }}
            style={styles.footerRetryButton}
            accessibilityRole="button"
            accessibilityLabel={t('feed.load_more_retry') || 'Retry'}
          >
            <Text style={styles.footerRetryText}>{t('feed.load_more_retry') || 'נסה שוב'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (loadingMore) {
      return (
        <View style={styles.footerLoader} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerLoadingHint}>{t('feed.loading_more') || 'טוען…'}</Text>
        </View>
      );
    }
    return null;
  }, [hasMorePosts, loadMoreError, loadingMore, clearLoadMoreError, loadMore, t]);

  const handleEndReached = useCallback(() => {
    if (filteredFeed.length === 0) return;
    loadMore();
  }, [loadMore, filteredFeed.length]);

  const renderEmptyComponent = () => {
    const filteredOut = !loading && feed.length > 0 && filteredFeed.length === 0;
    let emptyTitle: string;
    let emptySubtext: string;
    if (filteredOut) {
      emptyTitle = t('feed.empty_filtered') || 'אין תוצאות לפי הסינון';
      emptySubtext =
        t('feed.empty_filtered_hint') || 'שנה את האפשרויות או לחץ איפוס';
    } else {
      emptyTitle = t('feed.empty_title') || 'אין פוסטים עדיין';
      if (feedMode === 'friends') {
        emptySubtext =
          t('feed.empty_friends') || 'הוסף חברים כדי לראות פוסטים!';
      } else {
        emptySubtext =
          t('feed.empty_discovery') || 'היה הראשון לפרסם!';
      }
    }
    return (
      <View style={styles.emptyContainer}>
        {!loading && (
          <>
            <Text style={styles.emptyText}>{emptyTitle}</Text>
            <Text style={styles.emptySubtext}>{emptySubtext}</Text>
          </>
        )}
      </View>
    );
  };

  const showInitialError = Boolean(initialError && !loading && feed.length === 0);
  const showInitialLoading = loading && feed.length === 0;

  let feedMainContent: React.ReactNode;
  if (showInitialError) {
    feedMainContent = (
          <View style={styles.initialErrorWrap} accessibilityRole="alert">
            <Text style={styles.initialErrorTitle}>{t('feed.load_failed_title') || 'לא ניתן לטעון את הפיד'}</Text>
            <Text style={styles.initialErrorText}>{initialError}</Text>
            <TouchableOpacity
              style={styles.initialRetryButton}
              onPress={() => refresh()}
              accessibilityRole="button"
              accessibilityLabel={t('feed.load_more_retry') || 'Retry'}
            >
              <Text style={styles.initialRetryText}>{t('feed.load_more_retry') || 'נסה שוב'}</Text>
            </TouchableOpacity>
          </View>
    );
  } else if (showInitialLoading) {
    feedMainContent = (
          <View style={styles.initialLoadingWrap} accessibilityRole="progressbar">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.initialLoadingHint}>{t('feed.loading_more') || 'טוען…'}</Text>
          </View>
    );
  } else {
    feedMainContent = (
        <FlatList
          data={filteredFeed}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={FEED_NUM_COLUMNS}
          style={Platform.OS === 'web' ? styles.listFlex : undefined}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: horizontalPadding },
            // Add padding top to account for floating header
            !hideTopBar && { paddingTop: 70 }
          ]}
          onLayout={(e) => {
            listViewportHeightRef.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_w, contentHeight) => {
            if (
              contentHeight > 0 &&
              contentHeight <= listViewportHeightRef.current + 12 &&
              hasMorePostsRef.current &&
              !loadingMoreRef.current &&
              !loadingRef.current &&
              filteredFeed.length > 0
            ) {
              loadMoreRef.current();
            }
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderListFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={FEED_ON_END_REACHED_THRESHOLD}
          columnWrapperStyle={FEED_NUM_COLUMNS > 1 ? styles.listColumnWrapper : undefined}
          // Optimization props (must render enough rows/cells off-screen)
          initialNumToRender={FEED_INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={FEED_MAX_TO_RENDER_PER_BATCH}
          windowSize={FEED_WINDOW_SIZE}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        {!hideTopBar && (
          <FeedHeader
            feedMode={feedMode}
            setFeedMode={setFeedMode}
            onStatsPress={handleStatsPress}
            onFilterPress={handleFilterPress}
            filterActive={filtersActive}
            showFeedModeToggle={!isGuestMode}
            t={t}
          />
        )}

        {/* Feed List */}
        {feedMainContent}

        <FeedFilterSheet
          visible={filterSheetVisible}
          onClose={() => setFilterSheetVisible(false)}
          value={feedFilterState}
          onChange={setFeedFilterState}
        />

        {/* Modals */}
        <OptionsModal
          visible={optionsModalVisible}
          onClose={() => setOptionsModalVisible(false)}
          options={modalOptions}
          title={t('common.options') || 'Options'}
          anchorPosition={modalPosition}
        />
        <ReportPostModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          onSubmit={handleReportSubmit}
          isLoading={isSubmittingReport}
        />
        <EditPostModal
          visible={editModalVisible}
          item={selectedItemForEdit}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedItemForEdit(null);
          }}
          onSave={async (postId, updates) => {
            if (!selectedUser?.id) return;

            const result = await postsService.updatePost(postId, selectedUser.id, updates);
            if (result.success) {
              refresh();
            } else {
              throw new Error(result.error || 'Failed to update post');
            }
          }}
        />
        {selectedItemForComments && (
          <CommentsModal
            visible={commentsModalVisible}
            onClose={() => setCommentsModalVisible(false)}
            postId={selectedItemForComments.id}
            postUser={selectedItemForComments.user ? {
              id: selectedItemForComments.user.id,
              name: selectedItemForComments.user.name || null,
              avatar: selectedItemForComments.user.avatar || 'https://picsum.photos/seed/user/100/100'
            } : undefined}
            postTitle={selectedItemForComments.title || ''}
            onCommentsCountChange={() => {
              // Update the comments count in the feed
              refresh();
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 80, // Space for bottom bar
  },
  listFlex: {
    flex: 1,
    minHeight: 0,
  },
  listColumnWrapper: {
    gap: FEED_COLUMN_GAP,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLoadingHint: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerMessage: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  footerErrorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 10,
  },
  footerRetryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  footerRetryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  initialErrorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  initialErrorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  initialErrorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  initialRetryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  initialRetryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  initialLoadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  initialLoadingHint: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});

export default React.memo(PostsReelsScreen);
