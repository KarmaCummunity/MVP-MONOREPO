import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
  Text,
  Alert,
  Platform,
  ActionSheetIOS
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import colors from '../globals/colors';
import { FeedItem } from '../types/feed';
import { useFeedData } from '../hooks/useFeedData';
import PostReelItem from './Feed/PostReelItem';
import FeedHeader from './Feed/FeedHeader';
import CommentsModal from './CommentsModal';
import OptionsModal, { Option } from './Feed/OptionsModal';
import ReportPostModal from './Feed/ReportPostModal';
import EditPostModal from './Feed/EditPostModal';
import { apiService } from '../utils/apiService';
import { postsService } from '../utils/postsService';
import VerticalGridSlider from './VerticalGridSlider';
import { logger } from '../utils/loggerService';
import { usePostDeletion } from '../hooks/usePostDeletion';
import { usePostMenu } from '../hooks/usePostMenu';
import { useUser } from '../stores/userStore';
import { toastService } from '../utils/toastService';
import { isMobileWeb } from '../globals/responsive';

const { width } = Dimensions.get('window');
const isMobile = isMobileWeb();
const HORIZONTAL_PADDING = isMobile ? 8 : 16; // Padding from screen edges
const COLUMN_GAP = isMobile ? 8 : 16; // Gap between columns in grid view

// Props
interface PostsReelsScreenProps {
  onScroll?: (hide: boolean) => void;
  hideTopBar?: boolean;
  showTopBar?: boolean;
}

const PostsReelsScreen: React.FC<PostsReelsScreenProps> = ({
  onScroll,
  hideTopBar = false,
  showTopBar = false
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { selectedUser } = useUser();

  // State
  const [feedMode, setFeedMode] = useState<'friends' | 'discovery'>('friends');
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedItemForComments, setSelectedItemForComments] = useState<FeedItem | null>(null);
  const [numColumns, setNumColumns] = useState(1); // Default to list view
  const [sliderValue, setSliderValue] = useState(0); // 0 = 1 col, 1 = 2 cols, 2 = 3 cols

  // Report State
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<FeedItem | null>(null);

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
    onDelete: (postId) => {
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
    }
  });

  // Custom Hook for Data
  const { feed, loading, refreshing, refresh } = useFeedData(feedMode);

  // Scroll Handling
  const lastScrollY = useRef(0);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
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
  }, [onScroll]);

  // Handlers
  const handleStatsPress = useCallback(() => {
    logger.debug('PostsReelsScreen', 'Navigating to CommunityStatsScreen');
    navigation.navigate('CommunityStatsScreen');
  }, [navigation]);

  const handlePostPress = useCallback((item: FeedItem) => {
    logger.debug('PostsReelsScreen', 'Post pressed', { itemId: item.id });
    // TODO: Implement navigation to individual post screen if exists
  }, []);

  const handleCommentPress = useCallback((item: FeedItem) => {
    setSelectedItemForComments(item);
    setCommentsModalVisible(true);
  }, []);

  const handleReportSubmit = async (reason: string) => {
    if (!selectedPostForReport) return;

    setIsSubmittingReport(true);
    try {
      const adminEmail = 'navesarussi@gmail.com';
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
          status: 'reports',
          priority: 'high',
          category: 'moderation',
          assignee_id: adminId,
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


  const handleSliderChange = useCallback((value: number) => {
    // Round to nearest integer standardizing step behavior
    const step = Math.round(value);
    setSliderValue(step);

    // Map slider value (0-2) to columns (1-3)
    setNumColumns(step + 1);
  }, []);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    // Calculate available width: screen width minus horizontal padding on both sides
    const availableWidth = width - (HORIZONTAL_PADDING * 2);

    // For grid view: calculate width with gaps between columns
    // Using space-between in columnWrapper, so we need to account for gaps
    const totalGaps = (numColumns - 1) * COLUMN_GAP;
    const itemWidth = (availableWidth - totalGaps) / numColumns;

    return (
      <PostReelItem
        item={item}
        cardWidth={itemWidth}
        numColumns={numColumns}
        onPress={handlePostPress}
        onCommentPress={handleCommentPress}
        onMorePress={handleMorePress}
      />
    );
  }, [handlePostPress, handleCommentPress, handleMorePress, numColumns]);

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {!loading && (
        <>
          <Text style={styles.emptyText}>{t('feed.empty_title') || 'אין פוסטים עדיין'}</Text>
          <Text style={styles.emptySubtext}>
            {feedMode === 'friends'
              ? (t('feed.empty_friends') || 'הוסף חברים כדי לראות פוסטים!')
              : (t('feed.empty_discovery') || 'היה הראשון לפרסם!')
            }
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        {!hideTopBar && (
          <FeedHeader
            feedMode={feedMode}
            setFeedMode={setFeedMode}
            onStatsPress={handleStatsPress}
            t={t}
          />
        )}

        {/* Floating Slider Control - Rendered independently to respect its absolute positioning */}
        {!loading && feed.length > 0 && !hideTopBar && (
          <VerticalGridSlider
            numColumns={numColumns}
            onNumColumnsChange={(cols) => {
              setSliderValue(cols - 1);
              setNumColumns(cols);
            }}
          />
        )}

        {/* Feed List */}
        <FlatList
          data={feed}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          key={numColumns} // Force re-render on column change
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={[
            styles.listContent,
            // Add padding top to account for floating header
            !hideTopBar && { paddingTop: 70 }
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={renderEmptyComponent}
          // Optimization props
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
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
            onCommentsCountChange={(count) => {
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
    paddingBottom: 80, // Space for bottom bar
    paddingHorizontal: HORIZONTAL_PADDING, // Padding from screen edges
  },
  columnWrapper: {
    // Gap will be handled by marginHorizontal on individual items
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
  }
});

export default React.memo(PostsReelsScreen);
