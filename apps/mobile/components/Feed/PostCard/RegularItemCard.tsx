import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';

const RegularItemCard: React.FC<BaseCardProps> = ({
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

    // Helper to check if a string is a translation key
    const isTranslationKey = (str: string | undefined | null): boolean => {
        if (!str) return false;
        // Check for both dot notation and colon notation
        return (str.includes('.') || str.includes(':')) && 
               (str.startsWith('post.') || str.startsWith('post:') ||
                str.startsWith('donations.') || str.startsWith('donations:') ||
                str.startsWith('common.') || str.startsWith('common:'));
    };

    // Normalize translation key format (convert colons to dots for consistency)
    const normalizeTranslationKey = (key: string): string => {
        return key.replace(/donations:/g, 'donations.').replace(/post:/g, 'post.').replace(/common:/g, 'common.');
    };

    const displayTitle = !item.title || item.title.trim() === '' || item.title === 'donations.categories.items.title' || item.title === 'donations:categories.items.title'
        ? t('donations.categories.items.title')
        : item.title === 'post.noTitle' 
            ? t('post.noTitle')
            : isTranslationKey(item.title)
                ? t(normalizeTranslationKey(item.title))
                : item.title;
    
    // Build full description for items
    const fullItemDescription = React.useMemo(() => {
        if (!item.title && !item.description) return '';
        
        const titlePart = item.title && item.title.trim() !== '' 
            ? (isTranslationKey(item.title) ? t(normalizeTranslationKey(item.title)) : item.title)
            : '';
        const descPart = item.description && item.description.trim() !== '' ? item.description : '';
        
        // Build full text: "בפריט [שם הפריט] למסירה - [תיאור]"
        if (titlePart && descPart) {
            return `בפריט ${titlePart} למסירה - ${descPart}`;
        } else if (titlePart) {
            return `בפריט ${titlePart} למסירה`;
        } else if (descPart) {
            return descPart;
        }
        return '';
    }, [item.title, item.description, t]);
    
    // Safe access to user.name with fallback
    const userName = item.user?.name || 'common.unknownUser';
    const displayName = userName === 'common.unknownUser' ? t('common.unknownUser') : userName;

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
                    {item.user?.avatar ? (
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
                    {/* Item Badge - Shows "Available" for open items */}
                    <View style={styles.itemBadge}>
                        <Ionicons name="cube" size={16} color={colors.white} />
                        <Text style={styles.itemBadgeText}>{t('items.available')}</Text>
                    </View>

                    {/* More Options Button */}
                    <TouchableOpacity
                        onPress={(e) => onMorePress && onMorePress({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                        style={styles.moreButton}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Image with overlay */}
            <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.cardContent}>
                {item.thumbnail ? (
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: item.thumbnail }}
                            style={[styles.image, isGrid && styles.imageGrid]}
                            resizeMode="cover"
                        />
                        <View style={styles.gradientOverlay}>
                            <View style={styles.overlayContent}>
                                <Text style={styles.itemTitle} numberOfLines={2}>
                                    {displayTitle}
                                </Text>
                                {fullItemDescription && !isGrid && (
                                    <Text style={styles.itemDescription} numberOfLines={3}>
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
                                    {/* Removed Price from here to avoid "For Sale" confusion, unless explicit */}
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.placeholderContainer, isGrid && styles.imageGrid]}>
                        <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
                        <Text style={styles.placeholderTitle}>{displayTitle}</Text>
                        {fullItemDescription && !isGrid && (
                            <Text style={styles.placeholderDescription} numberOfLines={3}>
                                {fullItemDescription}
                            </Text>
                        )}
                        <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {item.category && (
                                <View style={[styles.detailBadge, styles.detailBadgeDark]}>
                                    <Ionicons name="pricetag" size={14} color={colors.textSecondary} />
                                    <Text style={[styles.detailText, styles.detailTextDark]}>
                                        {item.category}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
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

                    <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                        <Ionicons name="share-outline" size={isMobile ? 20 : 24} color={colors.textSecondary} />
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
const windowWidth = Dimensions.get('window').width;

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
        minHeight: isMobile ? 180 : 250, // Smaller min height for grid on mobile
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
        flex: 1, // Allow text to take space
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
    itemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.textSecondary, // Neutral color for generic item
        paddingHorizontal: isMobile ? 8 : 10,
        paddingVertical: isMobile ? 3 : 4,
        borderRadius: isMobile ? 16 : 20,
        gap: isMobile ? 3 : 4,
    },
    itemBadgeText: {
        fontSize: isMobile ? 10 : FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    cardContent: {
        flex: 1, // Take available height
    },
    imageContainer: {
        position: 'relative',
        height: isMobile ? 180 : 280,
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.backgroundTertiary,
    },
    imageGrid: {
        height: isMobile ? 120 : 180,
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'flex-end',
        padding: isMobile ? 12 : 20,
    },
    overlayContent: {
        gap: isMobile ? 4 : 8,
    },
    itemTitle: {
        fontSize: isMobile ? 18 : 24,
        fontWeight: '800',
        color: colors.white,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    itemDescription: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.white,
        lineHeight: isMobile ? 16 : 22,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    detailsRow: {
        gap: isMobile ? 4 : 8,
        marginTop: isMobile ? 2 : 4,
    },
    detailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: isMobile ? 8 : 12,
        paddingVertical: isMobile ? 4 : 6,
        borderRadius: isMobile ? 12 : 16,
        gap: isMobile ? 4 : 6,
    },
    detailBadgeDark: {
        backgroundColor: colors.backgroundSecondary,
    },
    detailText: {
        fontSize: isMobile ? 10 : FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    detailTextDark: {
        color: colors.textPrimary,
    },
    placeholderContainer: {
        height: isMobile ? 180 : 280,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? 16 : 24,
        gap: isMobile ? 8 : 12,
    },
    placeholderTitle: {
        fontSize: isMobile ? 16 : 20,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    placeholderDescription: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: isMobile ? 16 : 22,
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
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
});

export default React.memo(RegularItemCard);
