import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';

const ItemDeliveredCard: React.FC<BaseCardProps> = ({
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
    
    // Build full description for delivered items
    const fullItemDescription = React.useMemo(() => {
        if (!item.title && !item.description) return '';
        
        const titlePart = item.title && item.title.trim() !== '' 
            ? (isTranslationKey(item.title) ? t(normalizeTranslationKey(item.title)) : item.title)
            : '';
        const descPart = item.description && item.description.trim() !== '' ? item.description : '';
        
        // Build full text: "פריט [שם] שנמסר - [תיאור]"
        if (titlePart && descPart) {
            return `פריט ${titlePart} שנמסר - ${descPart}`;
        } else if (titlePart) {
            return `פריט ${titlePart} שנמסר`;
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
                    {/* Item Delivered Badge */}
                    <View style={styles.deliveredBadge}>
                        <Ionicons name="checkmark-done-circle" size={16} color={colors.white} />
                        <Text style={styles.deliveredBadgeText}>{t('items.delivered')}</Text>
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

            {/* Image with overlay - Greyed out/Subtle for delivered items */}
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
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.placeholderContainer, isGrid && styles.imageGrid]}>
                        <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
                        <Text style={styles.placeholderTitle}>{displayTitle}</Text>
                        {fullItemDescription && !isGrid && (
                            <Text style={styles.placeholderDescription} numberOfLines={3}>
                                {fullItemDescription}
                            </Text>
                        )}
                        <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {item.category && (
                                <View style={[styles.detailBadge, styles.detailBadgeDark]}>
                                    <Ionicons name="pricetag" size={14} color={colors.textTertiary} />
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
                        style={[styles.actionButton, { marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}
                        onPress={onLike}
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={24}
                            color={isLiked ? colors.error : colors.textSecondary}
                        />
                        {likesCount > 0 && (
                            <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
                                {likesCount}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}
                        onPress={onComment}
                    >
                        <Ionicons name="chatbubble-outline" size={24} color={colors.textSecondary} />
                        {commentsCount > 0 && (
                            <Text style={styles.actionCount}>{commentsCount}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                        <Ionicons name="share-outline" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionsRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
                        <Ionicons
                            name={isBookmarked ? "bookmark" : "bookmark-outline"}
                            size={24}
                            color={isBookmarked ? colors.primary : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 16,
        marginVertical: 8,
        marginHorizontal: 0, // Padding is handled by parent listContent
        overflow: 'hidden',
        minHeight: 380,
        borderWidth: 1,
        borderColor: colors.backgroundSecondary,
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
        minHeight: 250,
    },
    header: {
        padding: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.backgroundTertiary,
        opacity: 0.8,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.textTertiary,
    },
    userTextContainer: {
        gap: 2,
        flex: 1,
    },
    userName: {
        fontSize: FontSizes.body,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    timestamp: {
        fontSize: FontSizes.small,
        color: colors.textTertiary,
    },
    deliveredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
        opacity: 0.9,
    },
    deliveredBadgeText: {
        fontSize: FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    cardContent: {
        flex: 1,
    },
    imageContainer: {
        position: 'relative',
        height: 280,
        opacity: 0.7,
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.backgroundTertiary,
    },
    imageGrid: {
        height: 180,
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'flex-end',
        padding: 20,
    },
    overlayContent: {
        gap: 8,
    },
    itemTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.white,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    itemDescription: {
        fontSize: FontSizes.body,
        color: colors.white,
        lineHeight: 22,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    detailsRow: {
        gap: 8,
        marginTop: 4,
    },
    detailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    detailBadgeDark: {
        backgroundColor: colors.backgroundSecondary,
    },
    detailText: {
        fontSize: FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    detailTextDark: {
        color: colors.textTertiary,
    },
    placeholderContainer: {
        height: 280,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 12,
        opacity: 0.7,
    },
    placeholderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textSecondary,
        textAlign: 'center',
    },
    placeholderDescription: {
        fontSize: FontSizes.body,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 22,
    },
    actionsBar: {
        padding: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
        backgroundColor: '#FAFAFA',
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
        fontSize: FontSizes.body,
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

export default React.memo(ItemDeliveredCard);

