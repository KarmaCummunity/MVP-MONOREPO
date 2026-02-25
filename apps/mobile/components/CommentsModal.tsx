import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../stores/userStore';
import { postsService, Comment as ApiComment } from '../utils/postsService';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/loggerService';
import { toastService } from '../utils/toastService';

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  isOwner: boolean;
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  postUser?: {
    id: string;
    name: string | null; // Can be null if name is not available (never use ID as name)
    avatar?: string;
  };
  onCommentsCountChange?: (count: number) => void;
}

export default function CommentsModal({ 
  visible, 
  onClose, 
  postId, 
  postTitle, 
  postUser,
  onCommentsCountChange 
}: CommentsModalProps) {
  const { selectedUser } = useUser();
  const { t } = useTranslation(['common','comments']);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.debug('CommentsModal', 'Loading comments', { postId, viewerId: selectedUser?.id });
      
      const response = await postsService.getPostComments(postId, selectedUser?.id);
      
      console.log('🔄 CommentsModal - getPostComments response:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        total: response.total,
        error: response.error
      });
      
      if (response.success && response.data) {
        const commentsData: Comment[] = response.data.map((apiComment: ApiComment) => ({
          id: apiComment.id,
          text: apiComment.text,
          userId: apiComment.user_id,
          userName: apiComment.user?.name || 'משתמש',
          userAvatar: apiComment.user?.avatar_url || 'https://picsum.photos/seed/user/100/100',
          timestamp: apiComment.created_at,
          likes: apiComment.likes_count || 0,
          isLiked: apiComment.is_liked || false,
          isOwner: apiComment.user_id === selectedUser?.id,
        }));
        
        console.log('✅ CommentsModal - Setting comments:', commentsData.length);
        setComments(commentsData);
        logger.debug('CommentsModal', 'Comments loaded', { count: commentsData.length });
      } else {
        console.warn('⚠️ CommentsModal - Failed to load comments:', response.error);
        logger.warn('CommentsModal', 'Failed to load comments', { error: response.error });
        // Don't show error if it's just empty
        if (response.error && response.error !== 'No comments found') {
          Alert.alert(t('common:errorTitle'), response.error || t('comments:loadError'));
        }
      }
    } catch (error) {
      logger.error('CommentsModal', 'Load comments error', { error });
      Alert.alert(t('common:errorTitle'), t('comments:loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [postId, selectedUser?.id, t]);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, loadComments]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedUser) {
      if (!selectedUser) {
        toastService.warning('יש להתחבר כדי להגיב');
      }
      return;
    }

    const commentText = newComment.trim();
    if (commentText.length > 2000) {
      Alert.alert(t('common:errorTitle'), 'התגובה ארוכה מדי (מקסימום 2000 תווים)');
      return;
    }

    setIsSending(true);
    logger.logUserAction('add-comment', 'CommentsModal', { postId, userId: selectedUser.id });

    try {
      const response = await postsService.addComment(postId, selectedUser.id, commentText);
      
      console.log('🔄 CommentsModal - addComment response:', {
        success: response.success,
        hasData: !!response.data,
        data: response.data,
        error: response.error
      });
      
      if (response.success && response.data) {
        // Add new comment to the list
        const newCommentData: Comment = {
          id: response.data.id,
          text: response.data.text,
          userId: response.data.user_id,
          userName: response.data.user?.name || selectedUser.name || 'משתמש',
          userAvatar: response.data.user?.avatar_url || selectedUser.avatar || 'https://picsum.photos/seed/user/100/100',
          timestamp: response.data.created_at,
          likes: response.data.likes_count || 0,
          isLiked: false,
          isOwner: true,
        };
        
        console.log('✅ CommentsModal - Adding comment to list:', newCommentData);
        setComments(prev => [...prev, newCommentData]);
        setNewComment('');
        
        // Notify parent about comment count change
        if (onCommentsCountChange && response.data.comments_count !== undefined) {
          console.log('📊 CommentsModal - Updating comment count:', response.data.comments_count);
          onCommentsCountChange(response.data.comments_count);
        }
        
        logger.debug('CommentsModal', 'Comment added', { commentId: response.data.id });
      } else {
        console.error('❌ CommentsModal - Failed to add comment:', response.error);
        logger.error('CommentsModal', 'Failed to add comment', { error: response.error });
        Alert.alert(t('common:errorTitle'), response.error || t('comments:sendError'));
      }
    } catch (error) {
      console.error('❌ CommentsModal - Exception in addComment:', error);
      logger.error('CommentsModal', 'Send comment error', { error });
      Alert.alert(t('common:errorTitle'), t('comments:sendError'));
    } finally {
      setIsSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!selectedUser?.id) {
      toastService.warning('יש להתחבר כדי לעשות לייק');
      return;
    }

    // Find comment and save previous state for revert
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    const previousIsLiked = comment.isLiked;
    const previousLikes = comment.likes;

    // Optimistic UI update
    setComments(prev => prev.map(c =>
      c.id === commentId 
        ? { 
            ...c, 
            isLiked: !c.isLiked,
            likes: c.isLiked ? c.likes - 1 : c.likes + 1
          }
        : c
    ));

    try {
      const response = await postsService.toggleCommentLike(postId, commentId, selectedUser.id);
      
      if (response.success && response.data) {
        // Sync with server
        setComments(prev => prev.map(c =>
          c.id === commentId 
            ? { 
                ...c, 
                isLiked: response.data!.is_liked,
                likes: response.data!.likes_count
              }
            : c
        ));
      } else {
        // Revert on error
        setComments(prev => prev.map(c =>
          c.id === commentId 
            ? { 
                ...c, 
                isLiked: previousIsLiked,
                likes: previousLikes
              }
            : c
        ));
        logger.error('CommentsModal', 'Failed to toggle comment like', { error: response.error });
      }
    } catch (error) {
      // Revert on error
      setComments(prev => prev.map(c =>
        c.id === commentId 
          ? { 
              ...c, 
              isLiked: previousIsLiked,
              likes: previousLikes
            }
          : c
      ));
      logger.error('CommentsModal', 'Error toggling comment like', { error });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedUser?.id) return;

    Alert.alert(
      'מחיקת תגובה',
      'האם אתה בטוח שברצונך למחוק את התגובה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await postsService.deleteComment(postId, commentId, selectedUser.id);
              
              if (response.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                
                // Notify parent about comment count change
                if (onCommentsCountChange && response.data?.comments_count !== undefined) {
                  onCommentsCountChange(response.data.comments_count);
                }
                
                toastService.success('התגובה נמחקה');
                logger.debug('CommentsModal', 'Comment deleted', { commentId });
              } else {
                logger.error('CommentsModal', 'Failed to delete comment', { error: response.error });
                Alert.alert(t('common:errorTitle'), 'לא הצלחנו למחוק את התגובה');
              }
            } catch (error) {
              logger.error('CommentsModal', 'Error deleting comment', { error });
              Alert.alert(t('common:errorTitle'), 'לא הצלחנו למחוק את התגובה');
            }
          }
        }
      ]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return t('common:time.now');
      if (diffInHours < 24) return t('common:time.hoursAgo', { count: diffInHours });
      return date.toLocaleDateString('he-IL');
    } catch {
      return '';
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.userName}</Text>
          <Text style={styles.commentTimestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={styles.commentAction} 
            onPress={() => handleLikeComment(item.id)}
          >
            <Ionicons 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={item.isLiked ? colors.error : colors.textSecondary} 
            />
            <Text style={[styles.commentActionText, item.isLiked && styles.likedText]}>
              {item.likes}
            </Text>
          </TouchableOpacity>
          {item.isOwner && (
            <TouchableOpacity 
              style={styles.commentAction}
              onPress={() => handleDeleteComment(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.commentActionText}>{t('common:delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyStateText}>{t('comments:empty')}</Text>
      <Text style={styles.emptyStateSubtext}>{t('comments:beFirst')}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('comments:title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Post Info */}
        <View style={styles.postInfo}>
          <Image 
            source={{ uri: postUser?.avatar || 'https://picsum.photos/seed/user/100/100' }} 
            style={styles.postUserAvatar} 
          />
          <View style={styles.postInfoContent}>
            <Text style={styles.postUserName}>{postUser?.name || 'משתמש'}</Text>
            <Text style={styles.postTitle} numberOfLines={1}>{postTitle || ''}</Text>
          </View>
        </View>

        {/* Comments List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={comments.length === 0 ? styles.emptyListContainer : styles.commentsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={t('comments:placeholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            editable={!isSending}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!newComment.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendComment}
            disabled={!newComment.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={newComment.trim() ? colors.primary : colors.textSecondary} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  postInfo: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  postUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postInfoContent: {
    flex: 1,
  },
  postUserName: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  postTitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  commentTimestamp: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  commentText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'right',
  },
  commentActions: {
    flexDirection: 'row',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentActionText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  likedText: {
    color: colors.error,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    maxHeight: 100,
    textAlign: 'right',
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
