// Extracted from ProfileScreen — Open tab.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import colors from '../../globals/colors';
import { useUser } from '../../stores/userStore';
import { collectOpenTabFeed } from './openRouteLoadOpenContent';
import PostReelItem from '../../components/Feed/PostReelItem';
import type { FeedItem } from '../../types/feed';
import { navigateToPostDetail } from '../../utils/navigateToPostDetail';
import { usePostMenu } from '../../hooks/usePostMenu';
import OptionsModal from '../../components/Feed/OptionsModal';
import ReportPostModal from '../../components/Feed/ReportPostModal';
import { styles } from './profileScreen.styles';
export const OpenRoute = ({
  userId,
  user,
  onHeightChange,
  onLoadedContentCount,
}: {
  userId?: string;
  user?: any;
  onHeightChange?: (height: number) => void;
  /** Fires after each load attempt with the number of items shown in this tab (0 on failure / empty). */
  onLoadedContentCount?: (count: number) => void;
}) => {
  const { t } = useTranslation(['profile']);
  const navigation = useNavigation();
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = require('../../utils/databaseService');
  const onCountRef = React.useRef(onLoadedContentCount);
  onCountRef.current = onLoadedContentCount;

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
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
    },
  });

  const handlePostPress = useCallback(
    (feedItem: FeedItem) => {
      navigateToPostDetail(navigation as never, { postId: feedItem.id, initialItem: feedItem });
    },
    [navigation],
  );

  // Report submit handler
  const handleReportSubmit = async (_reason: string) => {
    if (!selectedPostForReport) return;
    // Report functionality can be implemented here if needed
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  // Use provided userId or fallback to selectedUser.id
  const targetUserId = userId || selectedUser?.id;

  useEffect(() => {
    const loadOpenContent = async () => {
      if (!targetUserId) {
        setLoading(false);
        onCountRef.current?.(0);
        return;
      }

      let loadedCount = 0;
      try {
        setLoading(true);
        const allContent = await collectOpenTabFeed({
          targetUserId,
          viewerUserId: selectedUser?.id,
          user: user ?? null,
          db,
        });
        loadedCount = allContent.length;
        setPosts(allContent as any[]);
      } catch (error) {
        console.error('Error loading open content:', error);
        loadedCount = 0;
        setPosts([]);
      } finally {
        setLoading(false);
        onCountRef.current?.(loadedCount);
      }
    };

    void loadOpenContent();
  }, [targetUserId, user, selectedUser?.id, db]);

  if (loading) {
    return (
      <View style={styles.tabContentPlaceholder}>
        <Text style={styles.placeholderText}>טוען תוכן פתוח...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View
        style={[styles.tabContentPlaceholder, { height: 400 }]}
        onLayout={(e) => onHeightChange?.(Math.max(400, e.nativeEvent.layout.height))}
      >
        <Ionicons name="folder-open-outline" size={60} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>אין תוכן פתוח עדיין</Text>
        <Text style={styles.placeholderSubtext}>התוכן הפתוח שלך יופיע כאן</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth / 3;

  return (
    <View style={styles.tabContentContainer}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        key={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <PostReelItem
            item={item}
            numColumns={3}
            cardWidth={cardWidth}
            onPress={handlePostPress}
            onMorePress={handleMorePress}
          />
        )}
        onContentSizeChange={(_w, h) => onHeightChange?.(h)}
        contentContainerStyle={{ paddingBottom: 20 }}
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
        isLoading={false}
      />
    </View>
  );
};
