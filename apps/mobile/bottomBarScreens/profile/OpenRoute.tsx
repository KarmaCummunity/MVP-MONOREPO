// Extracted from ProfileScreen — Open tab.
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { useUser } from '../../stores/userStore';
import { collectOpenTabFeed } from './openRouteLoadOpenContent';
import type { FeedItem } from '../../types/feed';
import { styles } from './profileScreen.styles';
import { ProfileTabPostsGrid } from './ProfileTabPostsGrid';
import { useProfileTabPostInteractions } from './useProfileTabPostInteractions';

export const OpenRoute = ({
  userId,
  user,
  onHeightChange,
  onLoadedContentCount,
  reloadSignal,
  onReopenSuccess,
}: {
  userId?: string;
  user?: any;
  onHeightChange?: (height: number) => void;
  /** Fires after each load attempt with the number of items shown in this tab (0 on failure / empty). */
  onLoadedContentCount?: (count: number) => void;
  /** Increment to refetch tab content (e.g. after reopening a closed post). */
  reloadSignal?: number;
  /** Called after a successful reopen so the parent can bump `reloadSignal`. */
  onReopenSuccess?: () => void;
}) => {
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = require('../../utils/databaseService');
  const onCountRef = React.useRef(onLoadedContentCount);
  onCountRef.current = onLoadedContentCount;

  const {
    handleMorePress,
    handlePostPress,
    handleReportSubmit,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    optionsTitle,
  } = useProfileTabPostInteractions(onReopenSuccess);

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
        setPosts(allContent as FeedItem[]);
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
  }, [targetUserId, user, selectedUser?.id, db, reloadSignal]);

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

  return (
    <ProfileTabPostsGrid
      posts={posts}
      onHeightChange={onHeightChange}
      handlePostPress={handlePostPress}
      handleMorePress={handleMorePress}
      optionsModalVisible={optionsModalVisible}
      setOptionsModalVisible={setOptionsModalVisible}
      modalOptions={modalOptions}
      modalPosition={modalPosition}
      reportModalVisible={reportModalVisible}
      setReportModalVisible={setReportModalVisible}
      handleReportSubmit={handleReportSubmit}
      optionsTitle={optionsTitle}
    />
  );
};
