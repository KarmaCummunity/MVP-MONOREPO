import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { TaskAssignmentFeedCardBody } from './TaskAssignmentFeedCardBody';
import { TaskFeedVariant } from './TaskFeedCard.types';
import { styles } from './taskFeedCard.styles';
import { isGridFixedHeight, resolveGridFixedOuterStyle } from './postCardGridLayout';
import { isMobileWeb } from '../../../globals/responsive';
import type { BaseCardProps } from './types';

export type { TaskFeedVariant } from './TaskFeedCard.types';

export interface TaskFeedCardProps extends BaseCardProps {
    variant: TaskFeedVariant;
}

const isMobile = isMobileWeb();

/** Open task vs completed task — single component (replaces TaskAssignmentCard + TaskCompletionCard). */
const TaskFeedCard: React.FC<TaskFeedCardProps> = ({
    item,
    cardWidth,
    isGrid,
    gridCardHeight,
    onPress,
    onProfilePress,
    onLike,
    onComment,
    onBookmark,
    onShare: _onShare,
    onMorePress,
    onQuickMessage,
    onClosePost,
    isLiked,
    isBookmarked,
    likesCount,
    commentsCount,
    formattedTime,
    variant
}) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'he';
    const isCompletion = variant === 'completion';
    const displayName = item.user.name === 'common.unknownUser' ? t('common.unknownUser') : item.user.name;
    const gridOuterFixed = resolveGridFixedOuterStyle(isGrid, gridCardHeight);

    return (
        <View
            style={[
                styles.container,
                isGrid && !isGridFixedHeight(gridOuterFixed) && styles.gridContainer,
                isCompletion && styles.containerCompletion,
                gridOuterFixed,
                { width: cardWidth }
            ]}
        >
            <View style={[styles.header, isCompletion && styles.headerCompletion, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                    style={[styles.userInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={onProfilePress}
                >
                    {item.user.avatar ? (
                        <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={20} color={colors.white} />
                        </View>
                    )}
                    <View style={[styles.userTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.userName, { textAlign: isRTL ? 'right' : 'left' }]}>{displayName}</Text>
                        <Text style={[styles.timestamp, { textAlign: isRTL ? 'right' : 'left' }]}>{formattedTime}</Text>
                    </View>
                </TouchableOpacity>

                <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {isCompletion ? (
                        <View style={styles.completedTaskBadge}>
                            <Ionicons name="checkmark-done" size={16} color={colors.white} />
                        </View>
                    ) : (
                        <View style={styles.taskBadge}>
                            <Ionicons name="clipboard" size={16} color={colors.white} />
                        </View>
                    )}
                    <TouchableOpacity
                        onPress={(e) => onMorePress && onMorePress({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                        style={styles.moreButton}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.95}
                style={[
                    styles.cardContent,
                    isCompletion ? styles.cardContentCompletion : styles.cardContentAssignment,
                    isGridFixedHeight(gridOuterFixed) && styles.cardContentGridFill
                ]}
            >
                {isCompletion ? (
                    <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
                        <View style={styles.celebrationContainer}>
                            <Ionicons name="trophy" size={isMobile ? 40 : 56} color={colors.warning} />
                            <View style={styles.starsContainer}>
                                <Ionicons
                                    name="star"
                                    size={isMobile ? 18 : 24}
                                    color={colors.warning}
                                    style={{
                                        position: 'absolute',
                                        top: isMobile ? -8 : -10,
                                        left: isMobile ? -22 : -30,
                                        transform: [{ rotate: '-20deg' }]
                                    }}
                                />
                                <Ionicons
                                    name="star"
                                    size={isMobile ? 24 : 32}
                                    color={colors.warning}
                                    style={{
                                        position: 'absolute',
                                        top: isMobile ? -18 : -25,
                                        right: isMobile ? -18 : -25,
                                        transform: [{ rotate: '15deg' }]
                                    }}
                                />
                            </View>
                        </View>
                        <View style={styles.textContainerCompletion}>
                            <Text style={[styles.titleCompletion, { textAlign: 'center' }]}>{t('tasks.task_completed')}</Text>
                            <View style={styles.taskReference}>
                                <Text style={[styles.taskReferenceText, { textAlign: 'center' }]} numberOfLines={2}>
                                    {item.taskData?.title || item.title || t('post.noTitle')}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <TaskAssignmentFeedCardBody item={item} isGrid={isGrid} />
                )}
            </TouchableOpacity>

            <View style={[styles.actionsBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.actionsLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { marginRight: isRTL ? 0 : isMobile ? 12 : 16, marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }
                        ]}
                        onPress={onLike}
                    >
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={isMobile ? 20 : 24}
                            color={isLiked ? colors.error : colors.textSecondary}
                        />
                        {likesCount > 0 && (
                            <Text style={[styles.actionCount, isLiked && styles.likedCount]}>{likesCount}</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { marginRight: isRTL ? 0 : isMobile ? 12 : 16, marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }
                        ]}
                        onPress={onComment}
                    >
                        <Ionicons name="chatbubble-outline" size={isMobile ? 20 : 24} color={colors.textSecondary} />
                        {commentsCount > 0 && <Text style={styles.actionCount}>{commentsCount}</Text>}
                    </TouchableOpacity>
                </View>
                {!isCompletion && (
                    <View style={[styles.actionsRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        {onQuickMessage && (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { marginRight: isRTL ? 0 : isMobile ? 6 : 8, marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }
                                ]}
                                onPress={onQuickMessage}
                            >
                                <Ionicons name="chatbubble-ellipses" size={isMobile ? 20 : 24} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                        {onClosePost && (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { marginRight: isRTL ? 0 : isMobile ? 6 : 8, marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }
                                ]}
                                onPress={onClosePost}
                            >
                                <Ionicons name="checkmark-circle-outline" size={isMobile ? 20 : 24} color={colors.success} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
                            <Ionicons
                                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                                size={isMobile ? 20 : 24}
                                color={isBookmarked ? colors.primary : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

export default React.memo(TaskFeedCard);
