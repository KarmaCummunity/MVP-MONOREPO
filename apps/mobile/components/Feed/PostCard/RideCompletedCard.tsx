import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';

const RideCompletedCard: React.FC<BaseCardProps> = ({
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
    const displayName = item.user.name === 'common.unknownUser' ? t('common.unknownUser') : item.user.name;

    // Use locations from item or fallback
    const locations = {
        from: item.from || '',
        to: item.to || ''
    };

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
                    <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-done-circle" size={16} color={colors.white} />
                        <Text style={styles.completedBadgeText}>{t('rides.completed')}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={(e) => onMorePress && onMorePress({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                        style={styles.moreButton}
                    >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content - Greyed out/Subtle for completed items */}
            <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.cardContent}>
                <View style={[styles.contentContainer, isGrid && styles.contentContainerGrid]}>
                    <View style={styles.routeContainer}>
                        <View style={styles.locationPoint}>
                            <View style={[styles.dot, styles.dotInactive]} />
                            <Text style={[styles.locationText, styles.textInactive]} numberOfLines={1}>
                                {locations.from || t('rides.origin')}
                            </Text>
                        </View>

                        <View style={styles.routeLine}>
                            <View style={[styles.dashedLine, styles.lineInactive]} />
                            <Ionicons name="arrow-down" size={isMobile ? 14 : 16} color={colors.textTertiary} />
                        </View>

                        <View style={styles.locationPoint}>
                            <View style={[styles.dot, styles.dotInactive]} />
                            <Text style={[styles.locationText, styles.textInactive]} numberOfLines={1}>
                                {locations.to || t('rides.destination')}
                            </Text>
                        </View>
                    </View>

                    {/* Completion Message */}
                    <View style={styles.completionMessage}>
                        <Text style={styles.completionText}>
                            {t('rides.thanks_message')}
                        </Text>
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

                {/* Optional: Add Delete option here as well? The more button is in header */}
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
        borderWidth: 1,
        borderColor: colors.backgroundSecondary,
        minHeight: isMobile ? 280 : 380, // Smaller height for mobile web
    },
    gridContainer: {
        // marginHorizontal removed - FlatList with justifyContent: 'space-between' handles spacing
        minHeight: isMobile ? 180 : 250,
    },
    header: {
        padding: isMobile ? 10 : 16,
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
        width: isMobile ? 36 : 44,
        height: isMobile ? 36 : 44,
        borderRadius: isMobile ? 18 : 22,
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
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    timestamp: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textTertiary,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: isMobile ? 8 : 12,
        paddingVertical: isMobile ? 3 : 6,
        borderRadius: isMobile ? 16 : 20,
        gap: isMobile ? 4 : 6,
        opacity: 0.9,
    },
    completedBadgeText: {
        fontSize: isMobile ? 10 : FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    cardContent: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    contentContainer: {
        padding: isMobile ? 16 : 24,
        flex: 1,
        justifyContent: 'center',
        gap: isMobile ? 14 : 24,
    },
    contentContainerGrid: {
        padding: isMobile ? 12 : 16,
    },
    routeContainer: {
        gap: 4,
        alignItems: 'center',
        opacity: 0.7,
    },
    locationPoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dotInactive: {
        backgroundColor: colors.textTertiary,
    },
    locationText: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600',
    },
    textInactive: {
        color: colors.textTertiary,
    },
    routeLine: {
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dashedLine: {
        width: 1,
        height: '100%',
    },
    lineInactive: {
        backgroundColor: colors.textTertiary,
    },
    completionMessage: {
        marginTop: isMobile ? 10 : 16,
        padding: isMobile ? 10 : 12,
        backgroundColor: colors.white,
        borderRadius: isMobile ? 6 : 8,
        alignItems: 'center',
    },
    completionText: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.success,
        fontWeight: '600',
        textAlign: 'center',
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
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
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    likedCount: {
        color: colors.error,
    },
});

export default React.memo(RideCompletedCard);
