import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { apiService } from '../utils/apiService';
import { useUser } from '../stores/userStore';
import { toastService } from '../utils/toastService';
import { useTranslation } from 'react-i18next';

export const usePostDeletion = () => {
    const { selectedUser } = useUser();
    const { t } = useTranslation();
    const [isDeleting, setIsDeleting] = useState(false);

    const canDelete = (postAuthorId: string): boolean => {
        if (!selectedUser) return false;

        // User can delete their own posts
        if (postAuthorId === selectedUser.id) return true;

        // Super admin can delete any post
        if (selectedUser.roles?.includes('super_admin')) return true;

        return false;
    };

    const showDeleteConfirmation = (postType: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const messages = {
                ride: {
                    title: 'מחיקת פוסט טרמפ',
                    message: 'מחיקת הפוסט תמחק גם את הנסיעה ואת כל ההזמנות. האם להמשיך?'
                },
                item: {
                    title: 'מחיקת פוסט פריט',
                    message: 'מחיקת הפוסט תמחק גם את הפריט ואת כל הבקשות. האם להמשיך?'
                },
                donation: {
                    title: 'מחיקת פוסט תרומה',
                    message: 'מחיקת הפוסט תמחק גם את התרומה. האם להמשיך?'
                },
                task_completion: {
                    title: 'מחיקת פוסט משימה',
                    message: 'האם למחוק את הפוסט? (המשימה תישאר)'
                },
                task_assignment: {
                    title: 'מחיקת פוסט משימה',
                    message: 'האם למחוק את הפוסט? (המשימה תישאר)'
                },
                default: {
                    title: 'מחיקת פוסט',
                    message: 'האם למחוק את הפוסט?'
                }
            };

            const config = messages[postType as keyof typeof messages] || messages.default;

            if (Platform.OS === 'web') {
                const confirmed = window.confirm(`${config.title}\n\n${config.message}`);
                resolve(confirmed);
            } else {
                Alert.alert(
                    config.title,
                    config.message,
                    [
                        {
                            text: 'ביטול',
                            style: 'cancel',
                            onPress: () => resolve(false)
                        },
                        {
                            text: 'מחק',
                            style: 'destructive',
                            onPress: () => resolve(true)
                        }
                    ],
                    { cancelable: true }
                );
            }
        });
    };

    const deletePost = async (
        postId: string,
        postType: string,
        onSuccess?: () => void
    ): Promise<boolean> => {
        if (!selectedUser) {
            toastService.showError('יש להתחבר כדי למחוק פוסט');
            return false;
        }

        // Show confirmation dialog
        const confirmed = await showDeleteConfirmation(postType);
        if (!confirmed) return false;

        setIsDeleting(true);

        try {
            const result = await apiService.deletePost(postId, selectedUser.id);

            if (result.success) {
                toastService.showSuccess(
                    result.data?.message || 'הפוסט נמחק בהצלחה'
                );

                // Call success callback
                if (onSuccess) {
                    onSuccess();
                }

                return true;
            } else {
                toastService.showError(
                    result.error || 'שגיאה במחיקת הפוסט'
                );
                return false;
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            toastService.showError('שגיאה במחיקת הפוסט');
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        canDelete,
        deletePost,
        isDeleting
    };
};
