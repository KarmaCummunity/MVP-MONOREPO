import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { styles } from './communityChallengeFeedCard.styles';
import { isMobileWeb } from '../../../globals/responsive';

const isMobile = isMobileWeb();

function actionSideMargin(isRTL: boolean): { marginRight: number; marginLeft: number } {
    const gap = isMobile ? 12 : 16;
    if (isRTL) {
        return { marginRight: 0, marginLeft: gap };
    }
    return { marginRight: gap, marginLeft: 0 };
}

type Props = {
    isRTL: boolean;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    onBookmark: () => void;
    isLiked: boolean;
    isBookmarked: boolean;
    likesCount: number;
    commentsCount: number;
};

export function CommunityChallengeFeedCardActions({
    isRTL,
    onLike,
    onComment,
    onShare,
    onBookmark,
    isLiked,
    isBookmarked,
    likesCount,
    commentsCount,
}: Props) {
    const likeMargin = actionSideMargin(isRTL);
    const commentMargin = actionSideMargin(isRTL);

    return (
        <View
            style={[styles.actionsBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
            <View
                style={[
                    styles.actionsLeft,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
            >
                <TouchableOpacity
                    style={[styles.actionButton, likeMargin]}
                    onPress={onLike}
                >
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={isMobile ? 20 : 24}
                        color={isLiked ? colors.error : colors.textSecondary}
                    />
                    {likesCount > 0 && (
                        <Text
                            style={[styles.actionCount, isLiked && styles.likedCount]}
                        >
                            {likesCount}
                        </Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, commentMargin]}
                    onPress={onComment}
                >
                    <Ionicons
                        name="chatbubble-outline"
                        size={isMobile ? 20 : 24}
                        color={colors.textSecondary}
                    />
                    {commentsCount > 0 && (
                        <Text style={styles.actionCount}>{commentsCount}</Text>
                    )}
                </TouchableOpacity>
            </View>
            <View
                style={[
                    styles.actionsRight,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
            >
                <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                    <Ionicons
                        name="share-outline"
                        size={isMobile ? 20 : 24}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
                    <Ionicons
                        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={isMobile ? 20 : 24}
                        color={isBookmarked ? colors.primary : colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}
