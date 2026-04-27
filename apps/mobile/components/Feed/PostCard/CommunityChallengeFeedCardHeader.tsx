import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import colors from '../../../globals/colors';
import type { FeedItem } from '../../../types/feed';
import { styles } from './communityChallengeFeedCard.styles';

type Props = {
    item: FeedItem;
    isRTL: boolean;
    formattedTime: string;
    t: TFunction;
    onProfilePress: () => void;
    onMorePress: (measurements?: { x: number; y: number }) => void;
};

export function CommunityChallengeFeedCardHeader({
    item,
    isRTL,
    formattedTime,
    t,
    onProfilePress,
    onMorePress,
}: Props) {
    const userName = item.user?.name || 'common.unknownUser';
    const displayName =
        userName === 'common.unknownUser' ? t('common:unknownUser') : userName;

    return (
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
                    <Image
                        source={{ uri: item.user.avatar }}
                        style={styles.avatar}
                    />
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
                        onMorePress?.({
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
    );
}
