import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';

const CommunityChallengeFeedCard: React.FC<BaseCardProps> = ({
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
    formattedTime,
}) => {
    const { t, i18n } = useTranslation(['challenges', 'common']);
    const isRTL = i18n.language === 'he';
    const userName = item.user?.name || 'common.unknownUser';
    const displayName =
        userName === 'common.unknownUser' ? t('common:unknownUser') : userName;
    const ch = item.challengeData;

    const typeLabel = ch?.type ? t(`challenges:types.${ch.type}`, { defaultValue: ch.type }) : null;
    const freqLabel = ch?.frequency
        ? t(`challenges:frequency.${ch.frequency}`, { defaultValue: ch.frequency })
        : null;
    const diffLabel = ch?.difficulty
        ? t(`challenges:difficulty.${ch.difficulty}`, { defaultValue: ch.difficulty })
        : null;

    return (
        <View
            style={[
                styles.container,
                isGrid && styles.gridContainer,
                { width: cardWidth },
            ]}
        >
            <View
                style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
                <TouchableOpacity
                    style={[
                        styles.userInfo,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={onProfilePress}
                >
                    {item.user?.avatar ? (
                        <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={20} color={colors.white} />
                        </View>
                    )}
                    <View
                        style={[
                            styles.userTextContainer,
                            { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                        ]}
                    >
                        <Text
                            style={[
                                styles.userName,
                                { textAlign: isRTL ? 'right' : 'left' },
                            ]}
                        >
                            {displayName}
                        </Text>
                        <Text
                            style={[
                                styles.timestamp,
                                { textAlign: isRTL ? 'right' : 'left' },
                            ]}
                        >
                            {formattedTime}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View
                    style={[
                        styles.headerRight,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                >
                    <View style={styles.challengeBadge}>
                        <Ionicons name="trophy" size={16} color={colors.white} />
                        <Text style={styles.challengeBadgeText}>
                            {t('challenges:feedCard.badge')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={(e) =>
                            onMorePress &&
                            onMorePress({
                                x: e.nativeEvent.pageX,
                                y: e.nativeEvent.pageY,
                            })
                        }
                        style={styles.moreButton}
                    >
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={20}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.cardContent}>
                {item.thumbnail ? (
                    <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                ) : null}
                <View
                    style={[
                        styles.contentInner,
                        isGrid && styles.contentInnerGrid,
                        !!item.thumbnail && styles.contentInnerWithImage,
                    ]}
                >
                    <View style={styles.iconWrap}>
                        <Ionicons
                            name="flag-outline"
                            size={isMobile ? 28 : 36}
                            color={colors.secondary}
                        />
                    </View>
                    <Text
                        style={[styles.headline, { textAlign: isRTL ? 'right' : 'center' }]}
                    >
                        {t('challenges:feedCard.headline')}
                    </Text>
                    <Text
                        style={[
                            styles.challengeTitle,
                            { textAlign: isRTL ? 'right' : 'center' },
                        ]}
                        numberOfLines={3}
                    >
                        {item.title || '—'}
                    </Text>
                    {item.description ? (
                        <Text
                            style={[
                                styles.description,
                                { textAlign: isRTL ? 'right' : 'center' },
                            ]}
                            numberOfLines={5}
                        >
                            {item.description}
                        </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                        {typeLabel ? (
                            <View style={styles.metaChip}>
                                <Ionicons
                                    name="analytics-outline"
                                    size={14}
                                    color={colors.textSecondary}
                                />
                                <Text style={styles.metaChipText}>{typeLabel}</Text>
                            </View>
                        ) : null}
                        {freqLabel ? (
                            <View style={styles.metaChip}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={14}
                                    color={colors.textSecondary}
                                />
                                <Text style={styles.metaChipText}>{freqLabel}</Text>
                            </View>
                        ) : null}
                        {diffLabel ? (
                            <View style={styles.metaChip}>
                                <Ionicons
                                    name="barbell-outline"
                                    size={14}
                                    color={colors.textSecondary}
                                />
                                <Text style={styles.metaChipText}>{diffLabel}</Text>
                            </View>
                        ) : null}
                    </View>

                    <Text style={[styles.ctaHint, { textAlign: 'center' }]}>
                        {t('challenges:feedCard.tapToJoin')}
                    </Text>
                </View>
            </TouchableOpacity>

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
                        style={[
                            styles.actionButton,
                            {
                                marginRight: isRTL ? 0 : isMobile ? 12 : 16,
                                marginLeft: isRTL ? (isMobile ? 12 : 16) : 0,
                            },
                        ]}
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
                        style={[
                            styles.actionButton,
                            {
                                marginRight: isRTL ? 0 : isMobile ? 12 : 16,
                                marginLeft: isRTL ? (isMobile ? 12 : 16) : 0,
                            },
                        ]}
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
        </View>
    );
};

const isMobile = isMobileWeb();

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: isMobile ? 12 : 16,
        marginVertical: isMobile ? 6 : 8,
        marginHorizontal: 0,
        overflow: 'hidden',
        minHeight: isMobile ? 260 : 320,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: { elevation: 4 },
            web: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' },
        }),
    },
    gridContainer: {
        minHeight: isMobile ? 200 : 260,
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
    challengeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary,
        paddingHorizontal: isMobile ? 8 : 12,
        paddingVertical: isMobile ? 3 : 6,
        borderRadius: isMobile ? 16 : 20,
        gap: isMobile ? 4 : 6,
    },
    challengeBadgeText: {
        fontSize: isMobile ? 10 : FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    cardContent: { flex: 1, backgroundColor: '#F3F4F6' },
    heroImage: {
        width: '100%',
        height: isMobile ? 140 : 180,
        backgroundColor: colors.backgroundTertiary,
    },
    contentInner: {
        padding: isMobile ? 14 : 20,
        alignItems: 'stretch',
        gap: isMobile ? 8 : 10,
    },
    contentInnerGrid: { padding: isMobile ? 10 : 14 },
    contentInnerWithImage: { paddingTop: isMobile ? 12 : 16 },
    iconWrap: {
        alignSelf: 'center',
        width: isMobile ? 56 : 72,
        height: isMobile ? 56 : 72,
        borderRadius: isMobile ? 28 : 36,
        backgroundColor: '#EDE9FE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headline: {
        fontSize: isMobile ? 16 : 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 4,
    },
    challengeTitle: {
        fontSize: isMobile ? FontSizes.body : 20,
        fontWeight: '700',
        color: colors.primary,
    },
    description: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        lineHeight: isMobile ? 18 : 22,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
    },
    metaChipText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    ctaHint: {
        fontSize: isMobile ? 12 : FontSizes.small,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 4,
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
        gap: 4,
    },
});

export default React.memo(CommunityChallengeFeedCard);
