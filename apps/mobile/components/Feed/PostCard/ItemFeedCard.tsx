import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { FeedItem } from '../../../types/feed';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';
import { buildItemCardDescription, resolveItemDisplayTitle } from './postCardUtils';

export interface ItemFeedCardProps extends BaseCardProps {
    /** Donation vs generic item — drives badge colors and placeholder copy. */
    cardKind: 'donation' | 'item';
    /** Delivered / closed item — muted card matching legacy ItemDeliveredCard. */
    isDelivered: boolean;
}

const isMobile = isMobileWeb();

/**
 * Item + donation feed posts (open/closed × give/request).
 * Replaces RegularItemCard, ItemDeliveredCard, DonationItemCard.
 */
const ItemFeedCard: React.FC<ItemFeedCardProps> = ({
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
    formattedTime,
    cardKind,
    isDelivered
}) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'he';
    const isRequest = item.intent === 'request';
    const { title, description } = item;

    const displayTitle = resolveItemDisplayTitle(item, t);
    const fullItemDescription = React.useMemo(
        () =>
            buildItemCardDescription({ title, description } as FeedItem, t, cardKind, isDelivered),
        [title, description, t, cardKind, isDelivered]
    );

    const userName = item.user?.name || 'common.unknownUser';
    const displayName = userName === 'common.unknownUser' ? t('common.unknownUser') : userName;

    const showFullActions = !isDelivered;
    const hasThumbnail = !!item.thumbnail;

    const renderHeader = (overlay = false) => (
        <View
            style={[
                styles.header,
                isDelivered && styles.headerDelivered,
                overlay && styles.headerOverlay,
                { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
        >
            <TouchableOpacity
                style={[styles.userInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={onProfilePress}
            >
                {item.user?.avatar ? (
                    <Image source={{ uri: item.user.avatar }} style={[styles.avatar, isDelivered && styles.avatarMuted, overlay && styles.avatarOverlay]} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, isDelivered && styles.avatarPlaceholderMuted, overlay && styles.avatarOverlay]}>
                        <Ionicons name="person" size={20} color={colors.white} />
                    </View>
                )}
                <View style={[styles.userTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.userName, isDelivered && styles.userNameMuted, overlay && styles.overlayText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {displayName}
                    </Text>
                    <Text style={[styles.timestamp, isDelivered && styles.timestampMuted, overlay && styles.overlaySubText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {formattedTime}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {isDelivered ? (
                    <View style={styles.deliveredBadge}>
                        <Ionicons name="checkmark-done-circle" size={16} color={colors.white} />
                    </View>
                ) : cardKind === 'donation' ? (
                    <View style={[styles.donationBadge, isRequest && styles.requestBadge]}>
                        <Ionicons name={isRequest ? 'help-circle' : 'gift'} size={16} color={colors.white} />
                    </View>
                ) : (
                    <View style={[styles.itemBadge, isRequest && styles.requestBadge]}>
                        <Ionicons name={isRequest ? 'help-circle' : 'cube'} size={16} color={colors.white} />
                    </View>
                )}
                <TouchableOpacity
                    onPress={(e) => onMorePress && onMorePress({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                    style={[styles.moreButton, overlay && styles.overlayIconButton]}
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color={overlay ? colors.white : colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderActions = (overlay = false) => (
        <View
            style={[
                styles.actionsBar,
                isDelivered && styles.actionsBarDelivered,
                overlay && styles.actionsBarOverlay,
                { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
        >
            <View style={[styles.actionsLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        overlay && styles.overlayIconButton,
                        { marginRight: isRTL ? 0 : isMobile ? 12 : 16, marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }
                    ]}
                    onPress={onLike}
                >
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={isMobile ? 20 : 24}
                        color={isLiked ? colors.error : overlay ? colors.white : colors.textSecondary}
                    />
                    {likesCount > 0 && (
                        <Text style={[styles.actionCount, isLiked && styles.likedCount, overlay && styles.overlayActionCount]}>{likesCount}</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        overlay && styles.overlayIconButton,
                        { marginRight: isRTL ? 0 : isMobile ? 12 : 16, marginLeft: isRTL ? (isMobile ? 12 : 16) : 0 }
                    ]}
                    onPress={onComment}
                >
                    <Ionicons name="chatbubble-outline" size={isMobile ? 20 : 24} color={overlay ? colors.white : colors.textSecondary} />
                    {commentsCount > 0 && <Text style={[styles.actionCount, overlay && styles.overlayActionCount]}>{commentsCount}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, overlay && styles.overlayIconButton]} onPress={onShare}>
                    <Ionicons name="share-outline" size={isMobile ? 20 : 24} color={overlay ? colors.white : colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={[styles.actionsRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {showFullActions && onQuickMessage && (
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            overlay && styles.overlayIconButton,
                            { marginRight: isRTL ? 0 : isMobile ? 6 : 8, marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }
                        ]}
                        onPress={onQuickMessage}
                    >
                        <Ionicons name="chatbubble-ellipses" size={isMobile ? 20 : 24} color={overlay ? colors.white : colors.primary} />
                    </TouchableOpacity>
                )}
                {showFullActions && onClosePost && (
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            overlay && styles.overlayIconButton,
                            { marginRight: isRTL ? 0 : isMobile ? 6 : 8, marginLeft: isRTL ? (isMobile ? 6 : 8) : 0 }
                        ]}
                        onPress={onClosePost}
                    >
                        <Ionicons name="checkmark-circle-outline" size={isMobile ? 20 : 24} color={overlay ? colors.white : colors.success} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionButton, overlay && styles.overlayIconButton]} onPress={onBookmark}>
                    <Ionicons
                        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={isMobile ? 20 : 24}
                        color={isBookmarked ? colors.primary : overlay ? colors.white : colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View
            style={[
                styles.container,
                isGrid && styles.gridContainer,
                hasThumbnail && styles.mediaContainer,
                isDelivered && styles.containerDelivered,
                { width: cardWidth }
            ]}
        >
            {!hasThumbnail && renderHeader(false)}

            {hasThumbnail ? (
                <>
                    <View style={[styles.mediaStage, isGrid && styles.mediaStageGrid, isDelivered && styles.imageContainerDelivered]}>
                        <Image
                            source={{ uri: item.thumbnail }}
                            style={styles.mediaBackdrop}
                            resizeMode="cover"
                            blurRadius={Platform.OS === 'web' ? 0 : 18}
                        />
                        <View style={styles.mediaScrim} />
                        <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.mediaPressLayer}>
                            <Image
                                source={{ uri: item.thumbnail }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        {renderHeader(true)}
                        <View style={[styles.overlayContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]} pointerEvents="box-none">
                            <Text style={[styles.itemTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                                {displayTitle}
                            </Text>
                            {fullItemDescription && !isGrid && (
                                <Text style={[styles.itemDescription, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                                    {fullItemDescription}
                                </Text>
                            )}
                            <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                {item.category && (
                                    <View style={styles.detailBadge}>
                                        <Ionicons name="pricetag" size={14} color={colors.white} />
                                        <Text style={styles.detailText}>{item.category}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                    {renderActions(false)}
                </>
            ) : (
                <>
                    <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.cardContent}>
                    <View
                        style={[
                            styles.placeholderContainer,
                            cardKind === 'donation' && !isDelivered && styles.placeholderDonation,
                            isGrid && styles.imageGrid,
                            isDelivered && styles.placeholderDelivered
                        ]}
                    >
                        <Ionicons
                            name={cardKind === 'donation' && !isDelivered ? 'gift-outline' : 'cube-outline'}
                            size={48}
                            color={isDelivered ? colors.textTertiary : cardKind === 'donation' ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.placeholderTitle, isDelivered && styles.placeholderTitleMuted]}>{displayTitle}</Text>
                        {fullItemDescription && !isGrid && (
                            <Text style={[styles.placeholderDescription, isDelivered && styles.placeholderDescriptionMuted]} numberOfLines={3}>
                                {fullItemDescription}
                            </Text>
                        )}
                        <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {item.category && (
                                <View style={[styles.detailBadge, styles.detailBadgeDark, isDelivered && styles.detailBadgeDelivered]}>
                                    <Ionicons name="pricetag" size={14} color={isDelivered ? colors.textTertiary : colors.textSecondary} />
                                    <Text style={[styles.detailText, styles.detailTextDark, isDelivered && styles.detailTextMuted]}>
                                        {item.category}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    </TouchableOpacity>
                    {renderActions(false)}
                </>
            )}
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
    containerDelivered: {
        borderWidth: 1,
        borderColor: colors.backgroundSecondary
    },
    gridContainer: {
        minHeight: isMobile ? 180 : 250
    },
    mediaContainer: {
        backgroundColor: colors.backgroundSecondary
    },
    header: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary
    },
    headerDelivered: {
        backgroundColor: colors.surfaceElevated
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        backgroundColor: 'transparent',
        paddingHorizontal: isMobile ? 12 : 18,
        paddingTop: isMobile ? 12 : 18,
        paddingBottom: isMobile ? 8 : 12
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
    avatarOverlay: {
        borderWidth: 2,
        borderColor: colors.overlayWhite80
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
    overlayText: {
        color: colors.white,
        ...Platform.select({
            web: { textShadow: `0 2px 5px ${colors.feedTextShadow}` },
            default: {
                textShadowColor: colors.feedTextShadow,
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 5,
            },
        }),
    },
    overlaySubText: {
        color: colors.overlayWhite92,
        ...Platform.select({
            web: { textShadow: `0 1px 4px ${colors.feedTextShadow}` },
            default: {
                textShadowColor: colors.feedTextShadow,
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
            },
        }),
    },
    itemBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.textSecondary,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20
    },
    donationBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.success,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20
    },
    requestBadge: {
        backgroundColor: colors.warning
    },
    deliveredBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.success,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20,
        opacity: 0.9
    },
    cardContent: {
        flex: 1
    },
    imageContainer: {
        position: 'relative',
        height: isMobile ? 180 : 280
    },
    imageContainerDelivered: {
        opacity: 0.7
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent'
    },
    mediaStage: {
        position: 'relative',
        height: isMobile ? 224 : 356,
        overflow: 'hidden',
        backgroundColor: colors.backgroundSecondary
    },
    mediaStageGrid: {
        height: isMobile ? 156 : 256
    },
    mediaBackdrop: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.55,
        transform: [{ scale: 1.04 }]
    },
    mediaScrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlayWhite25
    },
    mediaPressLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1
    },
    imageGrid: {
        height: isMobile ? 120 : 180
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.feedDimOverlay,
        justifyContent: 'flex-end',
        padding: isMobile ? 12 : 20
    },
    overlayContent: {
        position: 'absolute',
        left: isMobile ? 12 : 20,
        right: isMobile ? 12 : 20,
        bottom: isMobile ? 12 : 18,
        zIndex: 4,
        gap: isMobile ? 4 : 8
    },
    itemTitle: {
        fontSize: isMobile ? 18 : 24,
        fontWeight: '800',
        color: colors.white,
        ...Platform.select({
            web: {
                textShadow: `0 2px 4px ${colors.feedTextShadow}`,
            },
            default: {
                textShadowColor: colors.feedTextShadow,
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
            },
        }),
    },
    itemDescription: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.white,
        lineHeight: isMobile ? 16 : 22,
        ...Platform.select({
            web: {
                textShadow: `0 1px 3px ${colors.feedTextShadow}`,
            },
            default: {
                textShadowColor: colors.feedTextShadow,
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
            },
        }),
    },
    detailsRow: {
        gap: isMobile ? 4 : 8,
        marginTop: isMobile ? 2 : 4
    },
    detailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.overlayWhite25,
        paddingHorizontal: isMobile ? 8 : 12,
        paddingVertical: isMobile ? 4 : 6,
        borderRadius: isMobile ? 12 : 16,
        gap: isMobile ? 4 : 6
    },
    detailBadgeDark: {
        backgroundColor: colors.backgroundSecondary
    },
    detailBadgeDelivered: {
        backgroundColor: colors.backgroundSecondary
    },
    detailText: {
        fontSize: isMobile ? 10 : FontSizes.small,
        fontWeight: '600',
        color: colors.white
    },
    detailTextDark: {
        color: colors.textPrimary
    },
    detailTextMuted: {
        color: colors.textTertiary
    },
    placeholderContainer: {
        height: isMobile ? 180 : 280,
        backgroundColor: colors.surfaceCanvas,
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? 16 : 24,
        gap: isMobile ? 8 : 12
    },
    placeholderDonation: {
        backgroundColor: colors.surfaceGreenTint
    },
    placeholderDelivered: {
        opacity: 0.7
    },
    placeholderTitle: {
        fontSize: isMobile ? 16 : 20,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center'
    },
    placeholderTitleMuted: {
        color: colors.textSecondary
    },
    placeholderDescription: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: isMobile ? 16 : 22
    },
    placeholderDescriptionMuted: {
        color: colors.textTertiary
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary
    },
    actionsBarDelivered: {
        backgroundColor: colors.surfaceElevated
    },
    actionsBarOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 5,
        borderTopWidth: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: isMobile ? 12 : 18,
        paddingTop: isMobile ? 8 : 12,
        paddingBottom: isMobile ? 12 : 18
    },
    actionsLeft: {
        alignItems: 'center'
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    overlayIconButton: {
        minWidth: isMobile ? 32 : 38,
        minHeight: isMobile ? 32 : 38,
        justifyContent: 'center'
    },
    actionCount: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600',
        color: colors.textSecondary
    },
    overlayActionCount: {
        color: colors.white,
        ...Platform.select({
            web: { textShadow: `0 1px 3px ${colors.feedTextShadow}` },
            default: {
                textShadowColor: colors.feedTextShadow,
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
            },
        }),
    },
    likedCount: {
        color: colors.error
    },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});

export default React.memo(ItemFeedCard);
