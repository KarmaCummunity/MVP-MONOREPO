import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import {
    composeFeedCardContainerStyle,
    getFeedGridSizing,
    withFeedGridContentFill
} from './postCardGridLayout';
import type { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';
import { styles } from './communityChallengeFeedCard.styles';
import { CommunityChallengeFeedCardHeader } from './CommunityChallengeFeedCardHeader';
import { CommunityChallengeFeedCardActions } from './CommunityChallengeFeedCardActions';

const isMobile = isMobileWeb();

const CommunityChallengeFeedCard: React.FC<BaseCardProps> = ({
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
    isLiked,
    isBookmarked,
    likesCount,
    commentsCount,
    formattedTime,
}) => {
    const { t, i18n } = useTranslation(['challenges', 'common']);
    const isRTL = i18n.language === 'he';
    const ch = item.challengeData;

    const typeLabel = ch?.type
        ? t(`challenges:types.${ch.type}`, { defaultValue: ch.type })
        : null;
    const freqLabel = ch?.frequency
        ? t(`challenges:frequency.${ch.frequency}`, { defaultValue: ch.frequency })
        : null;
    const diffLabel = ch?.difficulty
        ? t(`challenges:difficulty.${ch.difficulty}`, { defaultValue: ch.difficulty })
        : null;

    const contentInnerStyle = [
        styles.contentInner,
        ...(isGrid ? [styles.contentInnerGrid] : []),
        ...(item.thumbnail ? [styles.contentInnerWithImage] : []),
    ];

    const { gridOuterFixed, gridFixedHeight } = getFeedGridSizing(isGrid, gridCardHeight);

    return (
        <View
            style={composeFeedCardContainerStyle({
                container: styles.container,
                gridMinHeightFallback: styles.gridContainer,
                isGrid,
                gridOuterFixed,
                cardWidth,
            })}
        >
            <CommunityChallengeFeedCardHeader
                item={item}
                isRTL={isRTL}
                formattedTime={formattedTime}
                t={t}
                onProfilePress={onProfilePress}
                onMorePress={onMorePress}
            />

            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.95}
                style={withFeedGridContentFill([styles.cardContent], gridFixedHeight)}
            >
                {item.thumbnail ? (
                    <Image
                        source={{ uri: item.thumbnail }}
                        style={[
                            styles.heroImage,
                            isGrid && gridFixedHeight && styles.heroImageGridFlex,
                        ]}
                        resizeMode="cover"
                    />
                ) : null}
                <View style={contentInnerStyle}>
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
                        numberOfLines={isGrid ? 2 : 3}
                    >
                        {item.title || '—'}
                    </Text>
                    {item.description && !isGrid ? (
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

                    {!isGrid ? (
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
                    ) : null}

                    {!isGrid ? (
                        <Text style={[styles.ctaHint, { textAlign: 'center' }]}>
                            {t('challenges:feedCard.tapToJoin')}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>

            <CommunityChallengeFeedCardActions
                isRTL={isRTL}
                onLike={onLike}
                onComment={onComment}
                onShare={onShare}
                onBookmark={onBookmark}
                isLiked={isLiked}
                isBookmarked={isBookmarked}
                likesCount={likesCount}
                commentsCount={commentsCount}
            />
        </View>
    );
};

export default React.memo(CommunityChallengeFeedCard);
