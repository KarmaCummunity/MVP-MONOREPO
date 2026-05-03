import React, { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FeedItem } from '../../types/feed';
import { usePostInteractions } from '../../hooks/usePostInteractions';
import { useProfileNavigation } from '../../hooks/useProfileNavigation';
import { useUser } from '../../stores/userStore';
import ItemFeedCard from './PostCard/ItemFeedCard';
import RideCard from './PostCard/RideCard';
import TaskFeedCard from './PostCard/TaskFeedCard';
import CommunityChallengeFeedCard from './PostCard/CommunityChallengeFeedCard';
import QuickMessageModal from './QuickMessageModal';
import { closeOwnerPostFromFeedItem } from '../../utils/feedPostOwnerClose';
import {
  canOwnerClosePostFromDetail,
  getQuickMessageModalPostType,
  isQuickMessageAvailableToViewer,
} from '../../utils/feedPostQuickMessageEligibility';

interface PostReelItemProps {
    item: FeedItem;
    cardWidth?: number;
    numColumns?: number;
    onPress?: (item: FeedItem) => void;
    onCommentPress?: (item: FeedItem) => void;
    onMorePress?: (item: FeedItem, measurements?: { x: number, y: number }) => void; // Added prop
    onPostClosed?: (postId: string) => void; // Callback when post is successfully closed
}

const PostReelItem: React.FC<PostReelItemProps> = ({
    item,
    cardWidth: cardWidthProp,
    numColumns = 1,
    onPress,
    onCommentPress,
    onMorePress,
    onPostClosed
}) => {
    const { width: windowWidth } = useWindowDimensions();
    /** On web, initial Dimensions can be 0 before layout — avoid negative/zero card widths. */
    const cardWidth = cardWidthProp ?? Math.max(1, windowWidth);

    const {
        isLiked,
        likesCount,
        commentsCount,
        isBookmarked,
        handleLike,
        handleBookmark,
        handleShare
    } = usePostInteractions(item);

    const { navigateToProfile } = useProfileNavigation();
    const { selectedUser } = useUser();
    const { t } = useTranslation();
    const [quickMessageModalVisible, setQuickMessageModalVisible] = useState(false);

    // Determine layout mode
    const isGrid = numColumns > 1;

    // Common Handlers
    const handleProfilePressInternal = useCallback(() => {
        if (item.user && item.user.id) {
            navigateToProfile(item.user.id, item.user.name || 'User');
        }
    }, [item.user, navigateToProfile]);

    const handleItemPress = useCallback(() => {
        if (onPress) onPress(item);
    }, [onPress, item]);

    const handleCommentPressInternal = useCallback(() => {
        if (onCommentPress) onCommentPress(item);
    }, [onCommentPress, item]);

    const handleMorePressInternal = useCallback((itemOrMeasure?: any, _measure?: any) => {
        // Handle both (item) and (item, measure) signatures if cards call differently
        // But since we control call sites, we expect cards to call onMorePress(item, measure)?
        // Wait, BaseCardProps says onMorePress: (measure) => void.
        // So cards call onMorePress({x,y}).
        // So this function receives measurements as first arg?
        // No, PostReelItem renders cards. The cards receive `onMorePress` as a prop.
        // `commonProps` passes user of `onMorePress: handleMorePressInternal`.
        // So `handleMorePressInternal` is what the card calls.
        // The card calls it like: `onMorePress(measurements)`.
        const measurements = itemOrMeasure;
        if (onMorePress) onMorePress(item, measurements);
    }, [onMorePress, item]);

    const isPostOpen = useMemo(
        () => isQuickMessageAvailableToViewer(item, selectedUser?.id),
        [item, selectedUser?.id],
    );

    const handleQuickMessage = useCallback(() => {
        if (isPostOpen && item.user && item.user.id) {
            setQuickMessageModalVisible(true);
        }
    }, [isPostOpen, item.user]);

    // Check if current user is the post owner
    const isPostOwner = useMemo(() => {
        return selectedUser && item.user && selectedUser.id === item.user.id;
    }, [selectedUser, item.user]);

    const handleClosePost = useCallback(async () => {
        if (!selectedUser || !isPostOwner) return;

        try {
            const { toastService } = await import('../../utils/toastService');
            const result = await closeOwnerPostFromFeedItem(item);

            if (result.success) {
                toastService.showSuccess(t('post:closedSuccess', { defaultValue: 'הפוסט נסגר בהצלחה' }));
                if (onPostClosed) {
                    onPostClosed(item.id);
                }
            } else {
                toastService.showError(result.error || t('post:closeError', { defaultValue: 'שגיאה בסגירת הפוסט' }));
            }
        } catch (error) {
            console.error('❌ Close post error:', error);
            const { toastService } = await import('../../utils/toastService');
            toastService.showError(t('post:closeError', { defaultValue: 'שגיאה בסגירת הפוסט' }));
        }
    }, [selectedUser, isPostOwner, item, t, onPostClosed]);


    // Format timestamp logic (reused)
    const formattedTime = useMemo(() => {
        try {
            if (!item.timestamp) return 'עכשיו';
            const date = new Date(item.timestamp);
            if (isNaN(date.getTime())) return 'עכשיו';
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            if (diff < 60 * 1000) return 'עכשיו';
            if (diff < 60 * 60 * 1000) return `לפני ${Math.floor(diff / (60 * 1000))} דקות`;
            if (diff < 24 * 60 * 60 * 1000) return `לפני ${Math.floor(diff / (60 * 60 * 1000))} שעות`;
            return date.toLocaleDateString('he-IL');
        } catch (_e) {
            return 'עכשיו';
        }
    }, [item.timestamp]);

    // Props for child components
    const commonProps = {
        item,
        cardWidth,
        isGrid,
        onPress: handleItemPress,
        onProfilePress: handleProfilePressInternal,
        onLike: handleLike,
        onComment: handleCommentPressInternal,
        onBookmark: handleBookmark,
        onShare: handleShare,
        onMorePress: handleMorePressInternal, // Pass down
        onQuickMessage: isPostOpen ? handleQuickMessage : undefined,
        onClosePost: isPostOwner && canOwnerClosePostFromDetail(item, selectedUser?.id) ? handleClosePost : undefined,
        isLiked,
        isBookmarked,
        likesCount,
        commentsCount,
        formattedTime
    };

    // --- Dispatcher Logic ---

    // Render modal component (shared across all card types)
    const renderModal = () => {
        if (isPostOpen && item.user) {
            return (
                <QuickMessageModal
                    visible={quickMessageModalVisible}
                    onClose={() => setQuickMessageModalVisible(false)}
                    postType={getQuickMessageModalPostType(item)}
                    recipientId={item.user.id}
                    recipientName={item.user.name || 'משתמש'}
                />
            );
        }
        return null;
    };

    // 1. Task Completion
    if (item.type === 'task_post' && item.subtype === 'task_completion') {
        return (
            <>
                <TaskFeedCard {...commonProps} variant="completion" />
                {renderModal()}
            </>
        );
    }

    // 2. Task Assignment (New Task)
    if (item.type === 'task_post' || item.subtype === 'task_assignment') {
        return (
            <>
                <TaskFeedCard {...commonProps} variant="assignment" />
                {renderModal()}
            </>
        );
    }

    // 3. Donation - open vs delivered (give/request via item.intent on card)
    if (item.subtype === 'donation') {
        const isDonationDelivered =
            item.status && ['delivered', 'completed', 'expired', 'cancelled'].includes(item.status);
        return (
            <>
                <ItemFeedCard {...commonProps} cardKind="donation" isDelivered={!!isDonationDelivered} />
                {renderModal()}
            </>
        );
    }

    // 4. Community challenge (distinct from items — metadata may include category)
    if (item.subtype === 'community_challenge') {
        return (
            <>
                <CommunityChallengeFeedCard {...commonProps} />
                {renderModal()}
            </>
        );
    }

    // 5. Ride (active vs completed inside RideCard)
    if (item.subtype === 'ride') {
        return (
            <>
                <RideCard {...commonProps} />
                {renderModal()}
            </>
        );
    }

    // 6. Item — open vs delivered; give vs request via item.intent
    if (item.subtype === 'item' || item.price !== undefined || item.itemId || item.category) {
        const isItemDelivered =
            item.status && ['delivered', 'completed', 'expired', 'cancelled'].includes(item.status);
        return (
            <>
                <ItemFeedCard {...commonProps} cardKind="item" isDelivered={!!isItemDelivered} />
                {renderModal()}
            </>
        );
    }

    // 7. Generic/Unknown Post Type
    return (
        <>
            <ItemFeedCard {...commonProps} cardKind="item" isDelivered={false} />
            {renderModal()}
        </>
    );
};

export default React.memo(PostReelItem);
