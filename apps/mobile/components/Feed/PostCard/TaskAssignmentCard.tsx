import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';

const TaskAssignmentCard: React.FC<BaseCardProps> = ({
    item,
    cardWidth,
    isGrid,
    onPress,
    onProfilePress,
    onLike,
    onComment,
    onBookmark,
    onShare,
    onMorePress,
    onQuickMessage,
    onClosePost,
    isLiked,
    isBookmarked,
    likesCount,
    commentsCount,
    formattedTime
}) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'he';
    const displayName = item.user.name === 'common.unknownUser' ? t('common.unknownUser') : item.user.name;

    return (
        <View style={[
            styles.container,
            isGrid && styles.gridContainer,
            { width: cardWidth }
        ]}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                        <Text style={[styles.userName, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {displayName}
                        </Text>
                        <Text style={[styles.timestamp, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {formattedTime}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.taskBadge}>
                        <Ionicons name="clipboard" size={16} color={colors.white} />
                        <Text style={styles.taskBadgeText}>
                            {item.taskData?.status === 'open' || item.taskData?.status === 'in_progress' 
                                ? t('tasks.status.open') 
                                : t('tasks.status.new')}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={(e) => onMorePress && onMorePress({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                        style={styles.moreButton}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.cardContent}>
                <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="construct-outline" size={isMobile ? 24 : 32} color={colors.primary} />
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { textAlign: 'center' }]}>
                            {t('tasks.status.new_for_you')}
                        </Text>

                        <Text style={[styles.description, { textAlign: 'center', fontWeight: 'bold', marginTop: 4 }]} numberOfLines={2}>
                            {item.taskData?.title || item.title || t('post.noTitle')}
                        </Text>

                        {(item.description || item.taskData?.description) && (
                            <Text style={[styles.description, { textAlign: 'center' }]} numberOfLines={3}>
                                {item.taskData?.description || item.description}
                            </Text>
                        )}
                    </View>

                    {/* Action Button CTA */}
                    {/* Task Details Section */}
                    <View style={styles.detailsSection}>
                        {/* Creator */}
                        <View style={styles.detailRow}>
                            <Ionicons name="person-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                            <Text style={styles.detailText}>
                                {t('task.opened_by', 'נוצר ע"י')}: {item.user.name}
                            </Text>
                        </View>

                        {/* Assignee */}
                        <View style={styles.detailRow}>
                            <Ionicons name="people-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                            <Text style={styles.detailText}>
                                {t('task.performer', 'מבצע')}: {
                                    item.taskData?.assignees && item.taskData.assignees.length > 0
                                        ? item.taskData.assignees.map((a: any) => a.name).join(', ')
                                        : t('task.unassigned', 'טרם שובץ')
                                }
                            </Text>
                        </View>

                        {/* Duration */}
                        {item.taskData?.estimated_hours ? (
                            <View style={styles.detailRow}>
                                <Ionicons name="time-outline" size={isMobile ? 14 : 16} color={colors.textSecondary} />
                                <Text style={styles.detailText}>
                                    {t('task.duration', 'משך זמן')}: {item.taskData.estimated_hours} {t('common.hours', 'שעות')}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>

            {/* Actions Bar */}
            <View style={[styles.actionsBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.actionsLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                        style={[styles.actionButton, { marginRight: isRTL ? 0 : (isMobile ? 12 : 16), marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }]}
                        onPress={onLike}
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={isMobile ? 20 : 24}
                            color={isLiked ? colors.error : colors.textSecondary}
                        />
                        {likesCount > 0 && (
                            <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
                                {likesCount}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { marginRight: isRTL ? 0 : (isMobile ? 12 : 16), marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }]}
                        onPress={onComment}
                    >
                        <Ionicons name="chatbubble-outline" size={isMobile ? 20 : 24} color={colors.textSecondary} />
                        {commentsCount > 0 && (
                            <Text style={styles.actionCount}>{commentsCount}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionsRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {onQuickMessage && (
                        <TouchableOpacity
                            style={[styles.actionButton, { marginRight: isRTL ? 0 : (isMobile ? 6 : 8), marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }]}
                            onPress={onQuickMessage}
                        >
                            <Ionicons name="chatbubble-ellipses" size={isMobile ? 20 : 24} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    {onClosePost && (
                        <TouchableOpacity
                            style={[styles.actionButton, { marginRight: isRTL ? 0 : (isMobile ? 6 : 8), marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }]}
                            onPress={onClosePost}
                        >
                            <Ionicons name="checkmark-circle-outline" size={isMobile ? 20 : 24} color={colors.success} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
                        <Ionicons
                            name={isBookmarked ? "bookmark" : "bookmark-outline"}
                            size={isMobile ? 20 : 24}
                            color={isBookmarked ? colors.primary : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const isMobile = isMobileWeb();

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: isMobile ? 12 : 16,
        marginVertical: isMobile ? 6 : 8,
        marginHorizontal: 0, // Padding is handled by parent listContent
        overflow: 'hidden',
        minHeight: isMobile ? 280 : 380, // Smaller height for mobile web
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
            }
        }),
    },
    gridContainer: {
        // marginHorizontal removed - FlatList with justifyContent: 'space-between' handles spacing
        minHeight: isMobile ? 180 : 250,
    },
    header: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    headerRight: {
        alignItems: 'center',
        gap: 8,
    },
    moreButton: {
        padding: 4,
    },
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
    userTextContainer: {
        gap: 2,
        flex: 1,
    },
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: isMobile ? 8 : 12,
        paddingVertical: isMobile ? 3 : 6,
        borderRadius: isMobile ? 16 : 20,
        gap: isMobile ? 4 : 6,
    },
    taskBadgeText: {
        fontSize: isMobile ? 10 : FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    cardContent: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    contentContainer: {
        padding: isMobile ? 16 : 24,
        alignItems: 'center',
        justifyContent: 'center', // Center content vertically
        gap: isMobile ? 10 : 16,
        flex: 1, // Take full height
    },
    contentContainerGrid: {
        padding: isMobile ? 12 : 16,
    },
    iconContainer: {
        width: isMobile ? 60 : 80,
        height: isMobile ? 60 : 80,
        borderRadius: isMobile ? 30 : 40,
        backgroundColor: '#E6E8EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        gap: 8,
        alignItems: 'center',
    },
    title: {
        fontSize: isMobile ? 18 : 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    description: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        lineHeight: isMobile ? 16 : 22,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
        marginTop: 16,
    },
    ctaText: {
        fontSize: FontSizes.body,
        fontWeight: '600',
        color: colors.white,
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
        backgroundColor: colors.white,
    },
    actionsLeft: {
        alignItems: 'center',
    },
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
    likedCount: {
        color: colors.error,
    },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
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
    }
});

export default React.memo(TaskAssignmentCard);
