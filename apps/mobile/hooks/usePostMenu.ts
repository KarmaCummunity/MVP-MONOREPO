import { useCallback, useState } from 'react';
import { Platform, ActionSheetIOS, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FeedItem } from '../types/feed';
import { usePostDeletion } from './usePostDeletion';
import { useUser } from '../stores/userStore';
import { toastService } from '../utils/toastService';
import { Option } from '../components/Feed/OptionsModal';

interface UsePostMenuOptions {
  onDelete?: (postId: string) => void;
  onReport?: (item: FeedItem) => void;
  onEdit?: (item: FeedItem) => void;
  onReopen?: (item: FeedItem) => void;
  onHide?: (item: FeedItem) => void;
}

interface UsePostMenuReturn {
  handleMorePress: (item: FeedItem, measurements?: { x: number, y: number }) => void;
  optionsModalVisible: boolean;
  setOptionsModalVisible: (visible: boolean) => void;
  modalOptions: Option[];
  modalPosition: { x: number, y: number } | undefined;
  reportModalVisible: boolean;
  setReportModalVisible: (visible: boolean) => void;
  selectedPostForReport: FeedItem | null;
  setSelectedPostForReport: (item: FeedItem | null) => void;
}

export const usePostMenu = (options: UsePostMenuOptions = {}): UsePostMenuReturn => {
  const { t } = useTranslation('common');
  const { selectedUser } = useUser();
  const { canDelete, deletePost } = usePostDeletion();
  
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [modalOptions, setModalOptions] = useState<Option[]>([]);
  const [modalPosition, setModalPosition] = useState<{ x: number, y: number } | undefined>(undefined);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<FeedItem | null>(null);

  // Check if post is closed
  const isPostClosed = useCallback((item: FeedItem): boolean => {
    const status = item.status;
    const subtype = item.subtype || item.type;

    // Tasks: done or archived
    if (subtype === 'task_assignment' || subtype === 'task_completion' || subtype === 'task_post') {
      const taskStatus = item.taskData?.status || status;
      return taskStatus === 'done' || taskStatus === 'archived';
    }

    // Rides: completed or cancelled
    if (subtype === 'ride' || subtype === 'ride_offered' || subtype === 'ride_completed') {
      return status === 'completed' || status === 'cancelled';
    }

    // Items: delivered, completed, or expired
    if (subtype === 'item' || subtype === 'donation') {
      return status === 'delivered' || status === 'completed' || status === 'expired';
    }

    return false;
  }, []);

  const handleMorePress = useCallback((item: FeedItem, measurements?: { x: number, y: number }) => {
    const isOwner = selectedUser?.id === item.user.id;
    const canDeleteThisPost = canDelete(item.user.id);
    const isClosed = isPostClosed(item);

    // Actions
    const handleDelete = () => {
      deletePost(item.id, item.subtype || 'general', () => {
        if (options.onDelete) {
          options.onDelete(item.id);
        }
      });
    };

    const handleReport = () => {
      if (options.onReport) {
        options.onReport(item);
      } else {
        setSelectedPostForReport(item);
        setReportModalVisible(true);
      }
    };

    const handleEdit = () => {
      if (options.onEdit) {
        options.onEdit(item);
      } else {
        toastService.showInfo(t('edit_coming_soon') || 'Edit functionality coming soon!');
      }
    };

    const handleReopen = () => {
      if (options.onReopen) {
        options.onReopen(item);
      } else {
        toastService.showInfo(t('reopen_coming_soon') || 'Reopen functionality coming soon!');
      }
    };

    const handleHide = () => {
      if (options.onHide) {
        options.onHide(item);
      } else {
        toastService.showInfo(t('hide_coming_soon') || 'Hide functionality coming soon!');
      }
    };

    if (Platform.OS === 'ios') {
      const iosOptions = [t('cancel') || 'Cancel'];
      const destructiveButtonIndex: number[] = [];

      // Delete (if has permission)
      if (canDeleteThisPost) {
        iosOptions.push(t('delete') || 'Delete');
        destructiveButtonIndex.push(iosOptions.length - 1);
      }

      // Reopen (if closed and is owner)
      if (isClosed && isOwner) {
        iosOptions.push(t('reopen') || 'Reopen');
      }

      // Edit (if owner)
      if (isOwner) {
        iosOptions.push(t('edit') || 'Edit');
      }

      // Hide (if owner and not closed)
      if (isOwner && !isClosed) {
        iosOptions.push(t('hide') || 'Hide');
      }

      // Report (always show)
      if (!isOwner) {
        iosOptions.push(t('report') || 'Report');
        destructiveButtonIndex.push(iosOptions.length - 1);
      }

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: iosOptions,
          cancelButtonIndex: 0,
          destructiveButtonIndex,
          title: t('options') || 'Options'
        },
        (buttonIndex) => {
          if (buttonIndex === 0) return; // Cancel
          
          const selectedOption = iosOptions[buttonIndex];
          if (selectedOption === (t('delete') || 'Delete')) {
            handleDelete();
          } else if (selectedOption === (t('report') || 'Report')) {
            handleReport();
          } else if (selectedOption === (t('edit') || 'Edit')) {
            handleEdit();
          } else if (selectedOption === (t('reopen') || 'Reopen')) {
            handleReopen();
          } else if (selectedOption === (t('hide') || 'Hide')) {
            handleHide();
          }
        }
      );
    } else {
      // Android & Web: Use Custom OptionsModal
      const androidOptions: Option[] = [];

      // Delete (if has permission)
      if (canDeleteThisPost) {
        androidOptions.push({
          label: t('delete') || 'Delete',
          onPress: handleDelete,
          isDestructive: true,
          icon: 'trash-outline'
        });
      }

      // Reopen (if closed and is owner)
      if (isClosed && isOwner) {
        androidOptions.push({
          label: t('reopen') || 'Reopen',
          onPress: handleReopen,
          icon: 'refresh-outline'
        });
      }

      // Edit (if owner)
      if (isOwner) {
        androidOptions.push({
          label: t('edit') || 'Edit',
          onPress: handleEdit,
          icon: 'create-outline'
        });
      }

      // Hide (if owner and not closed)
      if (isOwner && !isClosed) {
        androidOptions.push({
          label: t('hide') || 'Hide',
          onPress: handleHide,
          icon: 'eye-off-outline'
        });
      }

      // Always show report option
      androidOptions.push({
        label: t('report') || 'Report',
        onPress: handleReport,
        isDestructive: true,
        icon: 'flag-outline'
      });

      setModalOptions(androidOptions);
      setModalPosition(measurements);
      setOptionsModalVisible(true);
    }
  }, [selectedUser, canDelete, deletePost, isPostClosed, t, options]);

  return {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    selectedPostForReport,
    setSelectedPostForReport
  };
};

