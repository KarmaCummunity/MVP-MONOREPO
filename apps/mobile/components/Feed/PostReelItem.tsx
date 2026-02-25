import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FeedItem } from '../../types/feed';
import { usePostInteractions } from '../../hooks/usePostInteractions';
import { useProfileNavigation } from '../../hooks/useProfileNavigation';
import { useUser } from '../../stores/userStore';
import DonationItemCard from './PostCard/DonationItemCard';
import RegularItemCard from './PostCard/RegularItemCard';
import ItemDeliveredCard from './PostCard/ItemDeliveredCard';
import RideOfferedCard from './PostCard/RideOfferedCard';
import RideCompletedCard from './PostCard/RideCompletedCard';
import TaskAssignmentCard from './PostCard/TaskAssignmentCard';
import TaskCompletionCard from './PostCard/TaskCompletionCard';
import QuickMessageModal from './QuickMessageModal';

const { width } = Dimensions.get('window');

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
    cardWidth = width,
    numColumns = 1,
    onPress,
    onCommentPress,
    onMorePress,
    onPostClosed
}) => {
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

    const handleMorePressInternal = useCallback((itemOrMeasure?: any, measure?: any) => {
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

    // Check if post is open (relevant for quick message feature)
    const isPostOpen = useMemo(() => {
        // Don't show quick message if user is viewing their own post
        if (!item.user || !selectedUser || item.user.id === selectedUser.id) {
            return false;
        }

        // Tasks: open or in_progress
        if (item.subtype === 'task_assignment' || item.type === 'task_post') {
            const taskStatus = item.taskData?.status;
            // If no status, assume it's open (new tasks are usually open)
            if (!taskStatus) return true;
            return taskStatus === 'open' || taskStatus === 'in_progress';
        }

        // Rides: active or full (not completed or cancelled)
        if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
            const rideStatus = item.status;
            // If no status, assume it's active (new rides are usually active)
            if (!rideStatus) return true;
            return rideStatus === 'active' || rideStatus === 'full';
        }

        // Items: always open unless explicitly closed by owner
        // Items are considered open until owner marks them as closed (delivered/completed/expired)
        // Check both subtype === 'item' OR if item has a price (matching dispatch logic)
        // Also check if item has itemId (meaning it's an item post) or category (another indicator)
        if (item.subtype === 'item' || item.price !== undefined || item.itemId || item.category) {
            const itemStatus = item.status;
            // If status is explicitly closed, don't show quick message
            if (itemStatus && ['delivered', 'completed', 'expired', 'cancelled'].includes(itemStatus)) {
                return false;
            }
            // Otherwise, always show (even if no status - new items are open)
            return true;
        }

        // Donations: active (not delivered, completed, or expired)
        if (item.subtype === 'donation') {
            const donationStatus = item.status;
            // If no status, assume it's active (new donations are usually active)
            if (!donationStatus) return true;
            return donationStatus === 'active';
        }

        return false;
    }, [item, selectedUser]);

    // Determine post type for quick message modal
    const getPostType = (): 'item' | 'ride' | 'task' | 'donation' => {
        if (item.subtype === 'task_assignment' || item.type === 'task_post') {
            return 'task';
        }
        if (item.subtype === 'ride') {
            return 'ride';
        }
        if (item.subtype === 'donation') {
            return 'donation';
        }
        return 'item';
    };

    const handleQuickMessage = useCallback(() => {
        if (isPostOpen && item.user && item.user.id) {
            setQuickMessageModalVisible(true);
        }
    }, [isPostOpen, item.user]);

    // Check if current user is the post owner
    const isPostOwner = useMemo(() => {
        return selectedUser && item.user && selectedUser.id === item.user.id;
    }, [selectedUser, item.user]);

    // Handle closing post (marking as completed/delivered)
    const handleClosePost = useCallback(async () => {
        if (!selectedUser || !isPostOwner) return;

        try {
            const { apiService } = await import('../../utils/apiService');
            const { toastService } = await import('../../utils/toastService');

            let updateResult: any = { success: false };

            // Helper to validate UUID format (for tasks and rides)
            const isValidUUID = (id: string | undefined): boolean => {
                if (!id) return false;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return uuidRegex.test(id);
            };

            // Helper to validate item ID (can be UUID or TEXT)
            const isValidItemId = (id: string | undefined): boolean => {
                if (!id) return false;
                // Items can have UUID or TEXT IDs, so just check it's not empty and not a timestamp
                // Timestamps are usually 13 digits (milliseconds) or 10 digits (seconds)
                const isTimestamp = /^\d{10,13}$/.test(id);
                return !isTimestamp && id.length > 0;
            };

            // Determine the appropriate status and endpoint based on post type
            if (item.subtype === 'task_assignment' || item.type === 'task_post') {
                // For tasks, mark as done
                const taskId = item.taskId || item.taskData?.id;
                if (taskId && isValidUUID(taskId)) {
                    updateResult = await apiService.updateTask(taskId, { status: 'done' });
                } else {
                    console.warn('❌ Invalid or missing task ID:', taskId, 'Item:', item);
                    updateResult = { success: false, error: 'Task ID not found or invalid' };
                }
            } else if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
                // For rides, mark as completed
                const rideId = item.rideId;
                if (rideId && isValidUUID(rideId)) {
                    updateResult = await apiService.updateRide(rideId, { status: 'completed' });
                } else {
                    console.warn('❌ Invalid or missing ride ID:', rideId, 'Item:', item);
                    updateResult = { success: false, error: 'Ride ID not found or invalid' };
                }
            } else if (item.subtype === 'item' || item.subtype === 'donation') {
                // For items/donations, mark as delivered
                // CRITICAL: item.itemId should come from item_data.id (from JOIN) or metadata.item_id
                // If both are missing or are timestamps, we can't update the item
                const itemId = item.itemId;
                
                if (!itemId) {
                    console.error('❌ Cannot close post - item ID is missing:', {
                        postId: item.id,
                        subtype: item.subtype,
                        fullItem: JSON.stringify(item, null, 2)
                    });
                    updateResult = { 
                        success: false, 
                        error: 'לא ניתן לסגור את הפוסט - ID של הפריט לא נמצא. אנא רענן את הפיד ונסה שוב.' 
                    };
                } else if (/^\d{10,13}$/.test(itemId)) {
                    // itemId is a timestamp - this means the post was created incorrectly
                    // This happens when old posts have timestamp in item_id column
                    console.error('❌ Cannot close post - item ID is a timestamp (old post format):', {
                        itemId,
                        postId: item.id,
                        subtype: item.subtype,
                        message: 'This post was created before the fix. Please create a new item.'
                    });
                    updateResult = { 
                        success: false, 
                        error: 'לא ניתן לסגור את הפוסט - זה פוסט ישן שנוצר לפני התיקון. אנא צור פריט חדש.' 
                    };
                } else if (isValidItemId(itemId)) {
                    console.log('✅ Valid item ID, calling updateItem:', itemId);
                    updateResult = await apiService.updateItem(itemId, { status: 'delivered' });
                } else {
                    console.warn('❌ Invalid item ID format:', itemId);
                    updateResult = { 
                        success: false, 
                        error: 'ID של הפריט לא תקין. אנא רענן את הפיד ונסה שוב.' 
                    };
                }
            }

            if (updateResult?.success) {
                toastService.showSuccess(t('post:closedSuccess', { defaultValue: 'הפוסט נסגר בהצלחה' }));
                // Immediately notify parent to update UI
                if (onPostClosed) {
                    onPostClosed(item.id);
                }
            } else {
                toastService.showError(updateResult?.error || t('post:closeError', { defaultValue: 'שגיאה בסגירת הפוסט' }));
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
        } catch (e) {
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
        onClosePost: isPostOwner ? handleClosePost : undefined,
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
                    postType={getPostType()}
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
                <TaskCompletionCard {...commonProps} />
                {renderModal()}
            </>
        );
    }

    // 2. Task Assignment (New Task)
    if (item.type === 'task_post' || item.subtype === 'task_assignment') {
        return (
            <>
                <TaskAssignmentCard {...commonProps} />
                {renderModal()}
            </>
        );
    }

    // 3. Donation - Distinguish available vs delivered (same logic as items)
    if (item.subtype === 'donation') {
        // Check if donation is delivered/completed/expired/cancelled
        const isDonationDelivered = item.status && ['delivered', 'completed', 'expired', 'cancelled'].includes(item.status);
        
        if (isDonationDelivered) {
            return (
                <>
                    <ItemDeliveredCard {...commonProps} />
                    {renderModal()}
                </>
            );
        }
        
        return (
            <>
                <DonationItemCard {...commonProps} />
                {renderModal()}
            </>
        );
    }

    // 4. Ride
    if (item.subtype === 'ride') {
        // Distinguish completed vs offered
        if (item.status === 'completed') {
            return (
                <>
                    <RideCompletedCard {...commonProps} />
                    {renderModal()}
                </>
            );
        }
        return (
            <>
                <RideOfferedCard {...commonProps} />
                {renderModal()}
            </>
        );
    }

    // 5. Item (Regular) - Distinguish available vs delivered
    // Check both subtype === 'item' OR if item has a price OR itemId or category (matching isPostOpen logic)
    if (item.subtype === 'item' || item.price !== undefined || item.itemId || item.category) {
        // Check if item is delivered/completed/expired/cancelled
        const isItemDelivered = item.status && ['delivered', 'completed', 'expired', 'cancelled'].includes(item.status);
        
        if (isItemDelivered) {
            return (
                <>
                    <ItemDeliveredCard {...commonProps} />
                    {renderModal()}
                </>
            );
        }
        
        return (
            <>
                <RegularItemCard {...commonProps} />
                {renderModal()}
            </>
        );
    }

    // 6. Generic/Unknown Post Type
    return (
        <>
            <RegularItemCard {...commonProps} />
            {renderModal()}
        </>
    );
};

const styles = StyleSheet.create({});

export default React.memo(PostReelItem);
