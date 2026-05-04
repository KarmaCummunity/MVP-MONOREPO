import React, { type ComponentProps } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';
import type { FeedItem } from '../../types/feed';
import { styles } from './profileScreen.styles';
import { ProfileTabPostsGrid } from './ProfileTabPostsGrid';
import type { useProfileTabPostInteractions } from './useProfileTabPostInteractions';

export type ProfilePostMenuIx = ReturnType<typeof useProfileTabPostInteractions>;

type IonIconName = ComponentProps<typeof Ionicons>['name'];

export type ProfilePostsWithGridShellProps = {
  loading: boolean;
  posts: FeedItem[];
  onHeightChange?: (height: number) => void;
  loadingLabel: string;
  emptyIcon: IonIconName;
  emptyTitle: string;
  emptySubtitle: string;
  postIx: ProfilePostMenuIx;
};

/**
 * Loading / empty / grid wrapper for profile Open & Closed tabs (Sonar dedupe).
 */
export function ProfilePostsWithGridShell({
  loading,
  posts,
  onHeightChange,
  loadingLabel,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  postIx,
}: ProfilePostsWithGridShellProps): React.ReactElement {
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
  } = postIx;

  if (loading) {
    return (
      <View style={styles.tabContentPlaceholder}>
        <Text style={styles.placeholderText}>{loadingLabel}</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View
        style={[styles.tabContentPlaceholder, { height: 400 }]}
        onLayout={(e) => onHeightChange?.(Math.max(400, e.nativeEvent.layout.height))}
      >
        <Ionicons name={emptyIcon} size={60} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>{emptyTitle}</Text>
        <Text style={styles.placeholderSubtext}>{emptySubtitle}</Text>
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
}
