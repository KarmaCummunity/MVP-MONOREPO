import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';
import type { FeedItem } from '../../../types/feed';

export type TaskFeedVariant = 'assignment' | 'completion';

export interface TaskFeedCardProps extends BaseCardProps {
    variant: TaskFeedVariant;
}

const isMobile = isMobileWeb();

function actionButtonSideMargins(
    isRTL: boolean,
    compact: boolean,
): { marginRight: number; marginLeft: number } {
    let gap: number;
    if (compact) {
        gap = isMobile ? 6 : 8;
    } else {
        gap = isMobile ? 12 : 16;
    }
    return isRTL ? { marginRight: 0, marginLeft: gap } : { marginRight: gap, marginLeft: 0 };
}

function TaskFeedCardHeader({
    item,
    isRTL,
    isCompletion,
    displayName,
    formattedTime,
    onProfilePress,
    onMorePress,
}: Readonly<{
    item: FeedItem;
    isRTL: boolean;
    isCompletion: boolean;
    displayName: string;
    formattedTime: string;
    onProfilePress: () => void;
    onMorePress: (measurements?: { x: number; y: number }) => void;
}>) {
    return (
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
                    onPress={(e) =>
                        onMorePress?.({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })
                    }
                    style={styles.moreButton}
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function TaskFeedCompletionBody({
    item,
    isGrid,
    t,
}: Readonly<{ item: FeedItem; isGrid: boolean; t: (k: string) => string }>) {
    return (
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
                            transform: [{ rotate: '-20deg' }],
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
                            transform: [{ rotate: '15deg' }],
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
    );
}

function TaskFeedAssignmentBody({
    item,
    isGrid,
    assignmentBodyText,
    openedByDisplay,
    performerLine,
    t,
}: Readonly<{
    item: FeedItem;
    isGrid: boolean;
    assignmentBodyText: string;
    openedByDisplay: string;
    performerLine: string;
    t: (k: string, o?: Record<string, string>) => string;
}>) {
    return (
        <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
            <View style={styles.iconContainer}>
                <Ionicons name="construct-outline" size={isMobile ? 24 : 32} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.titleAssignment, { textAlign: 'center' }]}>{t('tasks.status.new_for_you')}</Text>
                <Text
                    style={[styles.description, { textAlign: 'center', fontWeight: 'bold', marginTop: 4 }]}
                    numberOfLines={2}
                >
                    {item.taskData?.title || item.title || t('post.noTitle')}
                </Text>
                {assignmentBodyText.trim().length > 0 && (
                    <Text style={[styles.description, { textAlign: 'center' }]} numberOfLines={3}>
                        {assignmentBodyText}
                    </Text>
                )}
            </View>
            <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                        {t('task.opened_by')}: {openedByDisplay}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                        {t('task.performer')}: {performerLine}
                    </Text>
                </View>
                {item.taskData?.estimated_hours ? (
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>
                            {t('task.duration')}: {item.taskData.estimated_hours}{' '}
                            {t('common.hours', 'שעות')}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

type TaskFeedCardActionsBarProps = Readonly<{
    isRTL: boolean;
    isCompletion: boolean;
    isLiked: boolean;
    isBookmarked: boolean;
    likesCount: number;
    commentsCount: number;
    onLike: () => void;
    onComment: () => void;
    onBookmark: () => void;
    onQuickMessage?: () => void;
    onClosePost?: () => void;
}>;

function TaskFeedCardActionsBar(props: TaskFeedCardActionsBarProps) {
    const {
        isRTL,
        isCompletion,
        isLiked,
        isBookmarked,
        likesCount,
        commentsCount,
        onLike,
        onComment,
        onBookmark,
        onQuickMessage,
        onClosePost,
    } = props;
    const marginStandard = actionButtonSideMargins(isRTL, false);
    const marginCompact = actionButtonSideMargins(isRTL, true);

    return (
        <View style={[styles.actionsBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.actionsLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity style={[styles.actionButton, marginStandard]} onPress={onLike}>
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={isMobile ? 20 : 24}
                        color={isLiked ? colors.error : colors.textSecondary}
                    />
                    {likesCount > 0 && (
                        <Text style={[styles.actionCount, isLiked && styles.likedCount]}>{likesCount}</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, marginStandard]} onPress={onComment}>
                    <Ionicons name="chatbubble-outline" size={isMobile ? 20 : 24} color={colors.textSecondary} />
                    {commentsCount > 0 && <Text style={styles.actionCount}>{commentsCount}</Text>}
                </TouchableOpacity>
            </View>
            {!isCompletion && (
                <View style={[styles.actionsRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {onQuickMessage && (
                        <TouchableOpacity style={[styles.actionButton, marginCompact]} onPress={onQuickMessage}>
                            <Ionicons name="chatbubble-ellipses" size={isMobile ? 20 : 24} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    {onClosePost && (
                        <TouchableOpacity style={[styles.actionButton, marginCompact]} onPress={onClosePost}>
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
    );
}

/** Open task vs completed task — single component (replaces TaskAssignmentCard + TaskCompletionCard). */
const TaskFeedCard: React.FC<Readonly<TaskFeedCardProps>> = ({
    item,
    cardWidth,
    isGrid,
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
    variant,
}) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'he';
    const isCompletion = variant === 'completion';
    const displayName = item.user.name === 'common.unknownUser' ? t('common.unknownUser') : item.user.name;
    const openedByRaw = item.taskData?.creator?.name ?? item.user.name;
    const openedByDisplay =
        openedByRaw === 'common.unknownUser' ? t('common.unknownUser') : openedByRaw || displayName;

    const creatorIdNorm = item.taskData?.creator?.id?.trim().toLowerCase() ?? '';
    const assigneesList = item.taskData?.assignees ?? [];
    let performersForDisplay = assigneesList;
    if (creatorIdNorm.length > 0) {
        const filtered = assigneesList.filter((a) => (a.id?.trim().toLowerCase() ?? '') !== creatorIdNorm);
        if (filtered.length > 0) {
            performersForDisplay = filtered;
        }
    }
    const performerLine =
        performersForDisplay.length > 0 ? performersForDisplay.map((a) => a.name).join(', ') : t('task.unassigned');

    const assignmentIntro =
        !isCompletion && Boolean(item.taskData?.creator?.name)
            ? t('task.delegation_intro', { manager: openedByDisplay })
            : '';
    const assignmentBodyText =
        assignmentIntro || item.taskData?.description || item.description || '';

    return (
        <View
            style={[
                styles.container,
                isGrid && styles.gridContainer,
                isCompletion && styles.containerCompletion,
                { width: cardWidth },
            ]}
        >
            <TaskFeedCardHeader
                item={item}
                isRTL={isRTL}
                isCompletion={isCompletion}
                displayName={displayName}
                formattedTime={formattedTime}
                onProfilePress={onProfilePress}
                onMorePress={onMorePress}
            />

            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.95}
                style={[styles.cardContent, isCompletion ? styles.cardContentCompletion : styles.cardContentAssignment]}
            >
                {isCompletion ? (
                    <TaskFeedCompletionBody item={item} isGrid={isGrid} t={t} />
                ) : (
                    <TaskFeedAssignmentBody
                        item={item}
                        isGrid={isGrid}
                        assignmentBodyText={assignmentBodyText}
                        openedByDisplay={openedByDisplay}
                        performerLine={performerLine}
                        t={t}
                    />
                )}
            </TouchableOpacity>

            <TaskFeedCardActionsBar
                isRTL={isRTL}
                isCompletion={isCompletion}
                isLiked={isLiked}
                isBookmarked={isBookmarked}
                likesCount={likesCount}
                commentsCount={commentsCount}
                onLike={onLike}
                onComment={onComment}
                onBookmark={onBookmark}
                onQuickMessage={onQuickMessage}
                onClosePost={onClosePost}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: isMobile ? 12 : 16,
        marginVertical: isMobile ? 6 : 8,
        marginHorizontal: 0,
        overflow: 'hidden',
        minHeight: isMobile ? 280 : 380,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: { elevation: 4 },
            web: { boxShadow: `0 4px 16px ${colors.feedCardShadow}` },
        }),
    },
    containerCompletion: {
        borderWidth: isMobile ? 1 : 2,
        borderColor: colors.surfaceGreenTint,
        ...Platform.select({
            ios: {
                shadowColor: colors.success,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: { elevation: 4 },
            web: { boxShadow: `0 4px 16px ${colors.overlayGreenAccent10}` },
        }),
    },
    gridContainer: {
        minHeight: isMobile ? 180 : 250,
    },
    header: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    headerCompletion: {
        backgroundColor: colors.surfaceElevated,
    },
    headerRight: {
        alignItems: 'center',
        gap: 8,
    },
    moreButton: { padding: 4 },
    userInfo: {
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: isMobile ? 36 : 44,
        height: isMobile ? 36 : 44,
        borderRadius: isMobile ? 18 : 22,
        backgroundColor: colors.backgroundTertiary,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
    },
    userTextContainer: { gap: 2, flex: 1 },
    userName: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    timestamp: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textSecondary,
    },
    taskBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20,
    },
    completedTaskBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.success,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20,
    },
    cardContent: {
        flex: 1,
    },
    cardContentAssignment: {
        backgroundColor: colors.surfaceGrayBlue,
    },
    cardContentCompletion: {
        backgroundColor: colors.surfaceGreenPale,
    },
    contentContainer: {
        padding: isMobile ? 16 : 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 10 : 16,
        flex: 1,
    },
    contentContainerGrid: {
        padding: isMobile ? 12 : 16,
    },
    iconContainer: {
        width: isMobile ? 60 : 80,
        height: isMobile ? 60 : 80,
        borderRadius: isMobile ? 30 : 40,
        backgroundColor: colors.surfaceGrayBlueBorder,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        gap: 8,
        alignItems: 'center',
    },
    titleAssignment: {
        fontSize: isMobile ? 18 : 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    description: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        lineHeight: isMobile ? 16 : 22,
    },
    detailsSection: {
        width: '100%',
        marginTop: isMobile ? 10 : 16,
        paddingTop: isMobile ? 10 : 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: isMobile ? 6 : 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isMobile ? 6 : 8,
    },
    detailText: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
    },
    celebrationContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    starsContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainerCompletion: {
        gap: 16,
        alignItems: 'center',
        width: '100%',
    },
    titleCompletion: {
        fontSize: isMobile ? 18 : 24,
        fontWeight: '700',
        color: colors.success,
    },
    taskReference: {
        backgroundColor: colors.overlayWhite80,
        padding: isMobile ? 12 : 16,
        borderRadius: isMobile ? 10 : 12,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.overlayGreenAccent10,
    },
    taskReferenceText: {
        fontSize: isMobile ? FontSizes.small : 16,
        color: colors.textPrimary,
        fontWeight: '500',
        lineHeight: isMobile ? 18 : 24,
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
        backgroundColor: colors.white,
    },
    actionsLeft: { alignItems: 'center' },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionCount: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    likedCount: { color: colors.error },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default React.memo(TaskFeedCard);
