import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import {
    feedCardMainAreaStyle,
    resolveFeedGridCardRoot,
} from '../../../utils/feedPostCardLayout';
import { isMobileWeb } from '../../../globals/responsive';

const isMobile = isMobileWeb();

/** Active ride vs completed — single component (replaces RideOfferedCard + RideCompletedCard). */
const RideCard: React.FC<BaseCardProps> = ({
    item,
    cardWidth,
    isGrid,
    gridCardHeight,
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
    const isCompleted = item.status === 'completed';

    const displayName = item.user.name === 'common.unknownUser' ? t('common.unknownUser') : item.user.name;
    const locations = { from: item.from || '', to: item.to || '' };
    const { rootStyle, gridFixedHeight } = resolveFeedGridCardRoot(
        { isGrid, gridCardHeight, cardWidth },
        styles,
        isCompleted && styles.containerCompleted
    );

    return (
        <View style={rootStyle}>
            <View style={[styles.header, isCompleted && styles.headerCompleted, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                    style={[styles.userInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={onProfilePress}
                >
                    {item.user.avatar ? (
                        <Image source={{ uri: item.user.avatar }} style={[styles.avatar, isCompleted && styles.avatarMuted]} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder, isCompleted && styles.avatarPlaceholderMuted]}>
                            <Ionicons name="person" size={20} color={colors.white} />
                        </View>
                    )}
                    <View style={[styles.userTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.userName, isCompleted && styles.userNameMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {displayName}
                        </Text>
                        <Text style={[styles.timestamp, isCompleted && styles.timestampMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {formattedTime}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {isCompleted ? (
                        <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-done-circle" size={16} color={colors.white} />
                        </View>
                    ) : (
                        <View style={styles.rideBadge}>
                            <Ionicons name="car-sport" size={16} color={colors.white} />
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
                style={feedCardMainAreaStyle(
                    gridFixedHeight,
                    styles.cardContent,
                    isCompleted && styles.cardContentCompleted
                )}
            >
                {isCompleted ? (
                    <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
                        <View style={styles.routeContainerCompleted}>
                            <View style={styles.locationPoint}>
                                <View style={[styles.dotInactive]} />
                                <Text style={[styles.locationTextCompact, styles.textInactive]} numberOfLines={1}>
                                    {locations.from || t('rides.origin')}
                                </Text>
                            </View>
                            <View style={styles.routeLineCompact}>
                                <View style={[styles.dashedLineInactive]} />
                                <Ionicons name="arrow-down" size={isMobile ? 14 : 16} color={colors.textTertiary} />
                            </View>
                            <View style={styles.locationPoint}>
                                <View style={[styles.dotInactive]} />
                                <Text style={[styles.locationTextCompact, styles.textInactive]} numberOfLines={1}>
                                    {locations.to || t('rides.destination')}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.completionMessage}>
                            <Text style={styles.completionText}>{t('rides.thanks_message')}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
                        <View style={styles.routeContainer}>
                            <View style={styles.locationPoint}>
                                <View style={styles.startDot} />
                                <View style={[styles.locationTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                    <Text style={styles.locationLabel}>{t('rides.from')}</Text>
                                    <Text style={styles.locationText} numberOfLines={1}>
                                        {locations.from || t('rides.origin')}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.routeLine}>
                                <View style={styles.dashedLine} />
                                <Ionicons name="arrow-down" size={isMobile ? 16 : 20} color={colors.primary} />
                            </View>
                            <View style={styles.locationPoint}>
                                <View style={styles.endDot} />
                                <View style={[styles.locationTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                    <Text style={styles.locationLabel}>{t('rides.to')}</Text>
                                    <Text style={styles.locationText} numberOfLines={1}>
                                        {locations.to || t('rides.destination')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.detailsContainer, isGrid && styles.detailsContainerGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {item.seats ? (
                                <View style={[styles.detailCard, isGrid && styles.detailCardGrid]}>
                                    <Ionicons name="people" size={isMobile ? (isGrid ? 14 : 16) : isGrid ? 16 : 20} color={colors.primary} />
                                    <Text style={[styles.detailValue, isGrid && styles.detailValueGrid]}>{item.seats}</Text>
                                    {!isGrid && <Text style={styles.detailLabel}>{t('rides.seats')}</Text>}
                                </View>
                            ) : null}
                            <View style={[styles.detailCard, isGrid && styles.detailCardGrid]}>
                                <Ionicons
                                    name={item.price && item.price > 0 ? 'cash-outline' : 'gift-outline'}
                                    size={isMobile ? (isGrid ? 14 : 18) : isGrid ? 16 : 24}
                                    color={item.price && item.price > 0 ? colors.textPrimary : colors.success}
                                />
                                <Text
                                    style={[
                                        styles.detailValue,
                                        isGrid && styles.detailValueGrid,
                                        item.price && item.price > 0 ? { color: colors.textPrimary } : { color: colors.success }
                                    ]}
                                >
                                    {item.price && item.price > 0 ? `₪${item.price}` : t('rides.free')}
                                </Text>
                                {!isGrid && (
                                    <Text style={styles.detailLabel}>
                                        {item.price && item.price > 0 ? t('rides.fuelShare') : t('rides.noCharge')}
                                    </Text>
                                )}
                            </View>
                            {(item.time || item.date) && (
                                <View style={[styles.detailCard, isGrid && styles.detailCardGrid]}>
                                    <Ionicons name="time" size={isMobile ? (isGrid ? 14 : 16) : isGrid ? 16 : 20} color={colors.info} />
                                    <Text style={[styles.detailValue, isGrid && styles.detailValueGrid]}>
                                        {item.time} {item.date && `• ${item.date}`}
                                    </Text>
                                    {!isGrid && <Text style={styles.detailLabel}>{t('rides.departure')}</Text>}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>

            <View style={[styles.actionsBar, isCompleted && styles.actionsBarCompleted, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.actionsLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                        style={[styles.actionButton, { marginRight: isRTL ? 0 : isMobile ? 12 : 16, marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }]}
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
                        style={[styles.actionButton, { marginRight: isRTL ? 0 : isMobile ? 12 : 16, marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }]}
                        onPress={onComment}
                    >
                        <Ionicons name="chatbubble-outline" size={isMobile ? 20 : 24} color={colors.textSecondary} />
                        {commentsCount > 0 && <Text style={styles.actionCount}>{commentsCount}</Text>}
                    </TouchableOpacity>
                    {!isCompleted && (
                        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                            <Ionicons name="share-outline" size={isMobile ? 20 : 24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                {!isCompleted && (
                    <View style={[styles.actionsRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        {onQuickMessage && (
                            <TouchableOpacity
                                style={[styles.actionButton, { marginRight: isRTL ? 0 : isMobile ? 6 : 8, marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }]}
                                onPress={onQuickMessage}
                            >
                                <Ionicons name="chatbubble-ellipses" size={isMobile ? 20 : 24} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                        {onClosePost && (
                            <TouchableOpacity
                                style={[styles.actionButton, { marginRight: isRTL ? 0 : isMobile ? 6 : 8, marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }]}
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
    containerCompleted: {
        borderWidth: 1,
        borderColor: colors.backgroundSecondary
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
    headerCompleted: {
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
    avatarMuted: { opacity: 0.8 },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary
    },
    avatarPlaceholderMuted: {
        backgroundColor: colors.textTertiary
    },
    userTextContainer: { gap: 2, flex: 1 },
    userName: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '700',
        color: colors.textPrimary
    },
    userNameMuted: { color: colors.textSecondary },
    timestamp: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textSecondary
    },
    timestampMuted: { color: colors.textTertiary },
    rideBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.info,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20
    },
    completedBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.success,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20,
        opacity: 0.9
    },
    cardContent: {
        flex: 1,
        backgroundColor: colors.surfaceBlueTint
    },
    cardContentCompleted: {
        backgroundColor: colors.surfaceCanvas
    },
    contentContainer: {
        padding: isMobile ? 16 : 24,
        flex: 1,
        justifyContent: 'center',
        gap: isMobile ? 14 : 24
    },
    contentContainerGrid: {
        padding: isMobile ? 12 : 16
    },
    routeContainer: { gap: 8 },
    routeContainerCompleted: {
        gap: 4,
        alignItems: 'center',
        opacity: 0.7
    },
    locationPoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    startDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.success,
        borderWidth: 3,
        borderColor: colors.white
    },
    endDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.error,
        borderWidth: 3,
        borderColor: colors.white
    },
    dotInactive: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.textTertiary
    },
    locationTextContainer: { flex: 1, gap: 2 },
    locationLabel: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textSecondary,
        fontWeight: '500'
    },
    locationText: {
        fontSize: isMobile ? FontSizes.small : FontSizes.medium,
        color: colors.textPrimary,
        fontWeight: '700'
    },
    locationTextCompact: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600'
    },
    textInactive: { color: colors.textTertiary },
    routeLine: {
        alignItems: 'center',
        paddingVertical: 4,
        marginLeft: 7
    },
    routeLineCompact: {
        height: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dashedLine: {
        width: 2,
        height: 32,
        backgroundColor: colors.primary,
        opacity: 0.3
    },
    dashedLineInactive: {
        width: 1,
        height: '100%',
        backgroundColor: colors.textTertiary
    },
    detailsContainer: {
        gap: 12,
        justifyContent: 'space-around'
    },
    detailsContainerGrid: {
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    detailCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: isMobile ? 10 : 12,
        padding: isMobile ? 10 : 16,
        alignItems: 'center',
        gap: isMobile ? 4 : 6,
        minWidth: isMobile ? 70 : 90,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4
            },
            android: { elevation: 2 },
            web: { boxShadow: `0 2px 8px ${colors.rideCardShadowSoft}` }
        })
    },
    detailCardGrid: {
        padding: isMobile ? 6 : 8,
        minWidth: isMobile ? 50 : 60,
        gap: isMobile ? 3 : 4,
        flex: 0
    },
    detailValue: {
        fontSize: isMobile ? FontSizes.small : FontSizes.medium,
        fontWeight: '700',
        color: colors.textPrimary
    },
    detailValueGrid: { fontSize: FontSizes.small },
    detailLabel: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textSecondary,
        textAlign: 'center'
    },
    completionMessage: {
        marginTop: isMobile ? 10 : 16,
        padding: isMobile ? 10 : 12,
        backgroundColor: colors.white,
        borderRadius: isMobile ? 6 : 8,
        alignItems: 'center'
    },
    completionText: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.success,
        fontWeight: '600',
        textAlign: 'center'
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary
    },
    actionsBarCompleted: {
        backgroundColor: colors.surfaceElevated
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

export default React.memo(RideCard);
