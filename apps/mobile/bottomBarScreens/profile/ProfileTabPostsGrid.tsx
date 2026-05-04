import React from 'react';
import { View, FlatList, Dimensions } from 'react-native';
import type { FeedItem } from '../../types/feed';
import PostReelItem from '../../components/Feed/PostReelItem';
import OptionsModal, { type Option } from '../../components/Feed/OptionsModal';
import ReportPostModal from '../../components/Feed/ReportPostModal';
import { styles } from './profileScreen.styles';

export type ProfileTabPostsGridProps = {
  posts: FeedItem[];
  onHeightChange?: (height: number) => void;
  handlePostPress: (item: FeedItem) => void;
  handleMorePress: (item: FeedItem, measurements?: { x: number; y: number }) => void;
  optionsModalVisible: boolean;
  setOptionsModalVisible: (visible: boolean) => void;
  modalOptions: Option[];
  modalPosition: { x: number; y: number } | undefined;
  reportModalVisible: boolean;
  setReportModalVisible: (visible: boolean) => void;
  handleReportSubmit: (reason: string) => void | Promise<void>;
  optionsTitle: string;
};

/**
 * Shared 3-column grid + post menu modals for profile Open / Closed tabs (Sonar dedupe).
 */
export function ProfileTabPostsGrid({
  posts,
  onHeightChange,
  handlePostPress,
  handleMorePress,
  optionsModalVisible,
  setOptionsModalVisible,
  modalOptions,
  modalPosition,
  reportModalVisible,
  setReportModalVisible,
  handleReportSubmit,
  optionsTitle,
}: ProfileTabPostsGridProps): React.ReactElement {
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
      <OptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        options={modalOptions}
        title={optionsTitle}
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
}
