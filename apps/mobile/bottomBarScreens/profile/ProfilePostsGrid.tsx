/**
 * Non-virtualized post grid for profile open/closed tabs.
 * Renders a simple flex-wrap layout so the parent screen scrolls reliably (avoids
 * VirtualizedList inside ScrollView, which can trap vertical scroll on native).
 */
import React from 'react';
import { View, Dimensions } from 'react-native';
import PostReelItem from '../../components/Feed/PostReelItem';
import type { FeedItem } from '../../types/feed';
import { styles } from './profileScreen.styles';

type ProfilePostsGridProps = {
  posts: any[];
  onHeightChange?: (height: number) => void;
  onPostPress: (feedItem: FeedItem) => void;
  onMorePress: (item: FeedItem, measurements?: { x: number; y: number }) => void;
};

export function ProfilePostsGrid({
  posts,
  onHeightChange,
  onPostPress,
  onMorePress,
}: ProfilePostsGridProps) {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth / 3;

  return (
    <View
      style={styles.tabContentContainer}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <View style={styles.postsGrid} accessibilityRole="none">
        {posts.map((item) => (
          <PostReelItem
            key={String(item.id)}
            item={item}
            numColumns={3}
            cardWidth={cardWidth}
            onPress={onPostPress}
            onMorePress={onMorePress}
          />
        ))}
      </View>
    </View>
  );
}
