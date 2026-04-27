/**
 * Shared modals + state for profile Open/Closed post grids (Sonar: avoid duplicate blocks).
 */
import React, { useCallback, useState } from 'react';
import CommentsModal from '../../components/CommentsModal';
import OptionsModal from '../../components/Feed/OptionsModal';
import type { Option } from '../../components/Feed/OptionsModal';
import ReportPostModal from '../../components/Feed/ReportPostModal';
import { usePostMenu } from '../../hooks/usePostMenu';
import type { FeedItem } from '../../types/feed';

const FALLBACK_COMMENT_AVATAR = 'https://picsum.photos/seed/user/100/100';

export interface ProfilePostGridOverlayModel {
  listRefreshKey: number;
  handleMorePress: (item: FeedItem, measurements?: { x: number; y: number }) => void;
  handleCommentPress: (item: FeedItem) => void;
  handleReportSubmit: (_reason: string) => Promise<void>;
  optionsModalVisible: boolean;
  setOptionsModalVisible: (v: boolean) => void;
  modalOptions: Option[];
  modalPosition: { x: number; y: number } | undefined;
  reportModalVisible: boolean;
  setReportModalVisible: (v: boolean) => void;
  commentsModalVisible: boolean;
  selectedItemForComments: FeedItem | null;
  closeCommentsModal: () => void;
  bumpCommentsListRefresh: () => void;
}

export function useProfilePostGridOverlays(): ProfilePostGridOverlayModel {
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

  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedItemForComments, setSelectedItemForComments] = useState<FeedItem | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const handleCommentPress = useCallback((item: FeedItem) => {
    setSelectedItemForComments(item);
    setCommentsModalVisible(true);
  }, []);

  const closeCommentsModal = useCallback(() => {
    setCommentsModalVisible(false);
    setSelectedItemForComments(null);
  }, []);

  const bumpCommentsListRefresh = useCallback(() => {
    setListRefreshKey((k) => k + 1);
  }, []);

  const handleReportSubmit = useCallback(
    async (_reason: string) => {
      if (!selectedPostForReport) return;
      setReportModalVisible(false);
      setSelectedPostForReport(null);
    },
    [selectedPostForReport, setReportModalVisible, setSelectedPostForReport],
  );

  return {
    listRefreshKey,
    handleMorePress,
    handleCommentPress,
    handleReportSubmit,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    commentsModalVisible,
    selectedItemForComments,
    closeCommentsModal,
    bumpCommentsListRefresh,
  };
}

export function ProfilePostGridOverlays({
  optionsModalTitle,
  model,
}: {
  optionsModalTitle: string;
  model: ProfilePostGridOverlayModel;
}) {
  const {
    handleReportSubmit,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    commentsModalVisible,
    selectedItemForComments,
    closeCommentsModal,
    bumpCommentsListRefresh,
  } = model;

  return (
    <>
      <OptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        options={modalOptions}
        title={optionsModalTitle}
        anchorPosition={modalPosition}
      />
      <ReportPostModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        isLoading={false}
      />
      {selectedItemForComments ? (
        <CommentsModal
          visible={commentsModalVisible}
          onClose={closeCommentsModal}
          postId={selectedItemForComments.id}
          postUser={
            selectedItemForComments.user
              ? {
                  id: selectedItemForComments.user.id,
                  name: selectedItemForComments.user.name || null,
                  avatar: selectedItemForComments.user.avatar || FALLBACK_COMMENT_AVATAR,
                }
              : undefined
          }
          postTitle={selectedItemForComments.title || ''}
          onCommentsCountChange={bumpCommentsListRefresh}
        />
      ) : null}
    </>
  );
}
