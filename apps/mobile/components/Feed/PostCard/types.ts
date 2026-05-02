import { FeedItem } from '../../../types/feed';

export interface BaseCardProps {
    item: FeedItem;
    cardWidth: number;
    isGrid: boolean;
    /** When set (grid mode), card uses this fixed height so all feed cells align. */
    gridCardHeight?: number;
    onPress: () => void;
    onProfilePress: () => void;
    onLike: () => void;
    onComment: () => void;
    onBookmark: () => void;
    onShare: () => void;
    onMorePress: (measurements?: { x: number, y: number }) => void;
    onQuickMessage?: () => void;
    onClosePost?: () => void;
    isLiked: boolean;
    isBookmarked: boolean;
    likesCount: number;
    commentsCount: number;
    formattedTime: string;
}
