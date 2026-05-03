import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiService } from '../utils/apiService';
import { useUser } from '../stores/userStore';
import { toastService } from '../utils/toastService';
import { logger } from '../utils/loggerService';

const LOG = 'usePostDeletion';

export const usePostDeletion = () => {
  const { t } = useTranslation('common');
  const { selectedUser } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = useCallback(
    (postAuthorId: string): boolean => {
      if (!selectedUser) return false;
      if (postAuthorId === selectedUser.id) return true;
      if (selectedUser.roles?.includes('super_admin')) return true;
      return false;
    },
    [selectedUser],
  );

  const showDeleteConfirmation = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const title = t('post.deleteConfirmTitle');
      const message = t('post.deleteConfirmMessage');

      if (Platform.OS === 'web') {
        const confirmed =
          typeof globalThis.confirm === 'function'
            ? globalThis.confirm(`${title}\n\n${message}`)
            : false;
        resolve(confirmed);
        return;
      }

      Alert.alert(
        title,
        message,
        [
          { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true },
      );
    });
  }, [t]);

  const deletePost = useCallback(
    async (postId: string, onSuccess?: () => void): Promise<boolean> => {
      if (!selectedUser) {
        toastService.showError(t('post.deleteLoginRequired'));
        return false;
      }

      const confirmed = await showDeleteConfirmation();
      if (!confirmed) return false;

      setIsDeleting(true);

      try {
        const result = await apiService.deletePost(postId, selectedUser.id);

        if (result.success) {
          toastService.showSuccess(t('post.deleteSuccess'));
          onSuccess?.();
          return true;
        }

        toastService.showError(result.error || t('post.deleteError'));
        return false;
      } catch (error) {
        logger.error(LOG, 'deletePost failed', { error: String(error) });
        toastService.showError(t('post.deleteError'));
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [selectedUser, showDeleteConfirmation, t],
  );

  return {
    canDelete,
    deletePost,
    isDeleting,
  };
};
