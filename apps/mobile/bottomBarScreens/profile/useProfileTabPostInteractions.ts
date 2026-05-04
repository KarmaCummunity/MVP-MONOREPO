import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { FeedItem } from '../../types/feed';
import { usePostMenu } from '../../hooks/usePostMenu';
import { navigateToPostDetail } from '../../utils/navigateToPostDetail';
import { runProfileReopenPostMenuAction } from '../../utils/profileReopenPostMenuAction';

/**
 * Shared post menu, navigation to detail, and report modal wiring for profile Open/Closed tabs.
 */
export function useProfileTabPostInteractions(onReopenSuccess?: () => void) {
  const { t } = useTranslation(['profile', 'common']);
  const navigation = useNavigation();

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
  } = usePostMenu({
    onReopen: (item) => runProfileReopenPostMenuAction(item, onReopenSuccess),
  });

  const handlePostPress = useCallback(
    (feedItem: FeedItem) => {
      navigateToPostDetail(navigation as never, { postId: feedItem.id, initialItem: feedItem });
    },
    [navigation],
  );

  const handleReportSubmit = useCallback(
    async (_reason: string) => {
      if (!selectedPostForReport) return;
      setReportModalVisible(false);
      setSelectedPostForReport(null);
    },
    [selectedPostForReport, setReportModalVisible, setSelectedPostForReport],
  );

  const optionsTitle = t('common:options') || 'Options';

  return {
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
  };
}
