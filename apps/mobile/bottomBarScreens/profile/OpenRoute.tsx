// Extracted from ProfileScreen — Open tab.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import colors from '../../globals/colors';
import { useUser } from '../../stores/userStore';
import PostReelItem from '../../components/Feed/PostReelItem';
import type { FeedItem } from '../../types/feed';
import { navigateToPostDetail } from '../../utils/navigateToPostDetail';
import { usePostMenu } from '../../hooks/usePostMenu';
import OptionsModal from '../../components/Feed/OptionsModal';
import ReportPostModal from '../../components/Feed/ReportPostModal';
import { styles } from './profileScreen.styles';
import {
  loadProfileOpenClosedTabContent,
  type ProfileTabBucketState,
} from './profileTabContentLoader';

type OpenRouteProps = {
  userId?: string;
  user?: any;
  onHeightChange?: (height: number) => void;
  /** Parent loads once and passes both tabs (avoids duplicate API work). */
  sharedTabBuckets?: ProfileTabBucketState;
};

export const OpenRoute = ({
  userId,
  user,
  onHeightChange,
  sharedTabBuckets,
}: OpenRouteProps) => {
  const { t } = useTranslation(['profile']);
  const navigation = useNavigation();
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = require('../../utils/databaseService');

  const {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    selectedPostForReport,
    setSelectedPostForReport,
  } = usePostMenu();

  const handlePostPress = useCallback(
    (feedItem: FeedItem) => {
      navigateToPostDetail(navigation as never, { postId: feedItem.id, initialItem: feedItem });
    },
    [navigation],
  );

  const handleReportSubmit = async (_reason: string) => {
    if (!selectedPostForReport) return;
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  const targetUserId = userId || selectedUser?.id;

  useEffect(() => {
    if (sharedTabBuckets !== undefined) {
      if (sharedTabBuckets === 'idle' || sharedTabBuckets === 'loading') {
        setLoading(true);
        setPosts([]);
        return;
      }
      setPosts(sharedTabBuckets.open as any[]);
      setLoading(false);
      return;
    }

    const loadOpenContent = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { openItems } = await loadProfileOpenClosedTabContent({
          targetUserId,
          viewerId: selectedUser?.id,
          user: user ?? null,
          db,
        });
        setPosts(openItems as any[]);
      } catch (error) {
        console.error('Error loading open content:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadOpenContent();
  }, [targetUserId, user, selectedUser?.id, db, sharedTabBuckets]);

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
        onLayout={(e) =>
          onHeightChange && onHeightChange(Math.max(400, e.nativeEvent.layout.height))
        }
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
        keyExtractor={(item) => String(item.id)}
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
        onContentSizeChange={(w, h) => {
          if (onHeightChange) onHeightChange(h);
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
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
