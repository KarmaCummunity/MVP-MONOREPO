import { useState, useEffect } from 'react';
import { Share, Alert, Platform } from 'react-native';
import { postsService } from '../utils/postsService';
import { isBookmarked, addBookmark, removeBookmark } from '../utils/bookmarksService';
import { toastService } from '../utils/toastService';
import { logger } from '../utils/loggerService';
import { FeedItem } from '../types/feed';
import { useUser } from '../stores/userStore';

export const usePostInteractions = (item: FeedItem) => {
    // Correct destructuring for useUser
    const { selectedUser: user } = useUser();

    // Local state for optimistic updates
    const [isLiked, setIsLiked] = useState(item.isLiked);
    const [likesCount, setLikesCount] = useState(item.likes);
    const [commentsCount, setCommentsCount] = useState(item.comments);
    const [isBookmarkedState, setIsBookmarkedState] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    // Sync state if item prop changes (e.g. after refresh)
    useEffect(() => {
        setIsLiked(item.isLiked);
        setLikesCount(item.likes);
        setCommentsCount(item.comments);
    }, [item.isLiked, item.likes, item.comments]);

    // Check bookmark status on mount
    useEffect(() => {
        const checkBookmark = async () => {
            if (item.id && user?.id) {
                const bookmarked = await isBookmarked(user.id, item.id);
                setIsBookmarkedState(bookmarked);
            }
        };
        checkBookmark();
    }, [item.id, user?.id]);

    const handleLike = async () => {
        if (!user || !user.id) {
            toastService.show('Please login to like posts');
            return;
        }

        if (isLikeLoading) return;

        // Optimistic update
        const previousIsLiked = isLiked;
        const previousLikesCount = likesCount;
        const newIsLiked = !isLiked;

        setIsLiked(newIsLiked);
        setLikesCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));
        setIsLikeLoading(true);

        try {
            logger.debug('usePostInteractions', 'Toggling like', { postId: item.id, newIsLiked });
            // Correct method name: togglePostLike
            const response = await postsService.togglePostLike(item.id, user.id);

            if (!response.success) {
                throw new Error('Failed to toggle like');
            }
        } catch (error) {
            logger.error('usePostInteractions', 'Error toggling like', { error });
            // Revert on error
            setIsLiked(previousIsLiked);
            setLikesCount(previousLikesCount);
            toastService.showError('Failed to update like');
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleBookmark = async () => {
        if (!user || !user.id) {
            toastService.show('Please login to bookmark posts');
            return;
        }

        try {
            if (isBookmarkedState) {
                await removeBookmark(user.id, item.id);
                setIsBookmarkedState(false);
                toastService.show('Removed from bookmarks');
            } else {
                await addBookmark(user.id, item);
                setIsBookmarkedState(true);
                toastService.show('Added to bookmarks');
            }
        } catch (error) {
            logger.error('usePostInteractions', 'Error toggling bookmark', { error });
            toastService.showError('Failed to update bookmark');
        }
    };

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: `Check out this post on Karma Community: ${item.title}`,
                // url: `https://karma-community.com/post/${item.id}`, // TODO: Deep linking
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    logger.debug('usePostInteractions', 'Shared with activity type', { type: result.activityType });
                } else {
                    logger.debug('usePostInteractions', 'Shared successfully');
                }
            } else if (result.action === Share.dismissedAction) {
                logger.debug('usePostInteractions', 'Share dismissed');
            }
        } catch (error) {
            logger.error('usePostInteractions', 'Error sharing', { error });
            toastService.showError('Failed to share post');
        }
    };

    return {
        isLiked,
        likesCount,
        commentsCount,
        isBookmarked: isBookmarkedState,
        isLikeLoading,
        handleLike,
        handleBookmark,
        handleShare,
        setCommentsCount
    };
};
