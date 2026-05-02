import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';

export type TaskFeedVariant = 'assignment' | 'completion';

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
    const gridFixedOuter =
        isGrid && gridCardHeight != null ? ({ height: gridCardHeight, minHeight: gridCardHeight } as const) : null;

    return (
        <View
            style={[
                styles.container,
                isGrid && !gridFixedOuter && styles.gridContainer,
                isCompletion && styles.containerCompletion,
                gridFixedOuter,
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
                    isGrid && gridFixedOuter && styles.cardContentGridFill
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
                    <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="construct-outline" size={isMobile ? 24 : 32} color={colors.primary} />
                        </View>
                        {isGrid ? (
                            <View style={styles.textContainer}>
                                <Text
                                    style={[styles.description, { textAlign: 'center', fontWeight: '700' }]}
                                    numberOfLines={2}
                                >
                                    {item.taskData?.title || item.title || t('post.noTitle')}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.textContainer}>
                                    <Text style={[styles.titleAssignment, { textAlign: 'center' }]}>
                                        {t('tasks.status.new_for_you')}
                                    </Text>
                                    <Text
                                        style={[styles.description, { textAlign: 'center', fontWeight: 'bold', marginTop: 4 }]}
                                        numberOfLines={2}
                                    >
                                        {item.taskData?.title || item.title || t('post.noTitle')}
                                    </Text>
                                    {(item.description || item.taskData?.description) && (
                                        <Text style={[styles.description, { textAlign: 'center' }]} numberOfLines={3}>
                                            {item.taskData?.description || item.description}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.detailsSection}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="person-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            {t('task.opened_by', 'נוצר ע"י')}: {item.user.name}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="people-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            {t('task.performer', 'מבצע')}:{' '}
                                            {item.taskData?.assignees && item.taskData.assignees.length > 0
                                                ? item.taskData.assignees.map((a) => a.name).join(', ')
                                                : t('task.unassigned', 'טרם שובץ')}
                                        </Text>
                                    </View>
                                    {item.taskData?.estimated_hours ? (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="time-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                                            <Text style={styles.detailText}>
                                                {t('task.duration', 'משך זמן')}: {item.taskData.estimated_hours}{' '}
                                                {t('common.hours', 'שעות')}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </>
                        )}
                    </View>
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
                shadowRadius: 8
            },
            android: { elevation: 4 },
            web: { boxShadow: `0 4px 16px ${colors.feedCardShadow}` }
        })
    },
    containerCompletion: {
        borderWidth: isMobile ? 1 : 2,
        borderColor: colors.surfaceGreenTint,
        ...Platform.select({
            ios: {
                shadowColor: colors.success,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8
            },
            android: { elevation: 4 },
            web: { boxShadow: `0 4px 16px ${colors.overlayGreenAccent10}` }
        })
    },
    gridContainer: {
        minHeight: isMobile ? 180 : 250
    },
    header: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary
    },
    headerCompletion: {
        backgroundColor: colors.surfaceElevated
    },
    headerRight: {
        alignItems: 'center',
        gap: 8
    },
    moreButton: { padding: 4 },
    userInfo: {
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    avatar: {
        width: isMobile ? 36 : 44,
        height: isMobile ? 36 : 44,
        borderRadius: isMobile ? 18 : 22,
        backgroundColor: colors.backgroundTertiary
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary
    },
    userTextContainer: { gap: 2, flex: 1 },
    userName: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '700',
        color: colors.textPrimary
    },
    timestamp: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textSecondary
    },
    taskBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20
    },
    completedTaskBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.success,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20
    },
    cardContent: {
        flex: 1
    },
    cardContentGridFill: {
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0
    },
    cardContentAssignment: {
        backgroundColor: colors.surfaceGrayBlue
    },
    cardContentCompletion: {
        backgroundColor: colors.surfaceGreenPale
    },
    contentContainer: {
        padding: isMobile ? 16 : 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 10 : 16,
        flex: 1
    },
    contentContainerGrid: {
        padding: isMobile ? 12 : 16
    },
    iconContainer: {
        width: isMobile ? 60 : 80,
        height: isMobile ? 60 : 80,
        borderRadius: isMobile ? 30 : 40,
        backgroundColor: colors.surfaceGrayBlueBorder,
        justifyContent: 'center',
        alignItems: 'center'
    },
    textContainer: {
        gap: 8,
        alignItems: 'center'
    },
    titleAssignment: {
        fontSize: isMobile ? 18 : 22,
        fontWeight: '700',
        color: colors.textPrimary
    },
    description: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        lineHeight: isMobile ? 16 : 22
    },
    detailsSection: {
        width: '100%',
        marginTop: isMobile ? 10 : 16,
        paddingTop: isMobile ? 10 : 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: isMobile ? 6 : 8
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isMobile ? 6 : 8
    },
    detailText: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary
    },
    celebrationContainer: {
        position: 'relative',
        marginBottom: 10
    },
    starsContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    textContainerCompletion: {
        gap: 16,
        alignItems: 'center',
        width: '100%'
    },
    titleCompletion: {
        fontSize: isMobile ? 18 : 24,
        fontWeight: '700',
        color: colors.success
    },
    taskReference: {
        backgroundColor: colors.overlayWhite80,
        padding: isMobile ? 12 : 16,
        borderRadius: isMobile ? 10 : 12,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.overlayGreenAccent10
    },
    taskReferenceText: {
        fontSize: isMobile ? FontSizes.small : 16,
        color: colors.textPrimary,
        fontWeight: '500',
        lineHeight: isMobile ? 18 : 24
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
        backgroundColor: colors.white
    },
    actionsLeft: { alignItems: 'center' },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    actionCount: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600',
        color: colors.textSecondary
    },
    likedCount: { color: colors.error },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});

export default React.memo(TaskFeedCard);
