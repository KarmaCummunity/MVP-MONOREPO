import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { BaseCardProps } from './types';
import { isMobileWeb } from '../../../globals/responsive';
import type { FeedItem } from '../../../types/feed';

type RtlLayout = { isRTL: boolean };

function rowDirection(isRTL: boolean): 'row' | 'row-reverse' {
  return isRTL ? 'row-reverse' : 'row';
}

function textAlign(isRTL: boolean): 'right' | 'left' {
  return isRTL ? 'right' : 'left';
}

function ChallengePostHeader({
  item,
  isRTL,
  formattedTime,
  onProfilePress,
  onMorePress,
}: Pick<BaseCardProps, 'item' | 'onProfilePress' | 'onMorePress' | 'formattedTime'> &
  RtlLayout) {
  const { t } = useTranslation();
  const displayName =
    item.user?.name === 'common.unknownUser'
      ? t('common.unknownUser')
      : item.user?.name ?? '';

  const isCommunity = item.subtype === 'community_challenge';

  const handleMore = (e: GestureResponderEvent) => {
    onMorePress?.({
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
    });
  };

  return (
    <View style={[styles.header, { flexDirection: rowDirection(isRTL) }]}>
      <TouchableOpacity
        style={[styles.userInfo, { flexDirection: rowDirection(isRTL) }]}
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
            style={[styles.userName, { textAlign: textAlign(isRTL) }]}
          >
            {displayName}
          </Text>
          <Text
            style={[styles.timestamp, { textAlign: textAlign(isRTL) }]}
          >
            {formattedTime}
          </Text>
        </View>
      </TouchableOpacity>

      <View
        style={[styles.headerRight, { flexDirection: rowDirection(isRTL) }]}
      >
        <View style={styles.challengeBadge}>
          <Ionicons name="trophy" size={16} color={colors.white} />
          <Text style={styles.challengeBadgeText}>
            {isCommunity
              ? t('feed.challengePost.badgeCommunity')
              : t('feed.challengePost.badgePersonal')}
          </Text>
        </View>
        <TouchableOpacity onPress={handleMore} style={styles.moreButton}>
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

function ChallengeMetaChips({ item, isRTL }: { item: FeedItem } & RtlLayout) {
  const hasMeta =
    item.challengeFrequency ||
    item.challengeDifficulty ||
    item.challengeCategoryLabel;
  if (!hasMeta) return null;

  return (
    <View
      style={[styles.metaRow, { flexDirection: rowDirection(isRTL) }]}
    >
      {item.challengeFrequency ? (
        <View style={styles.metaChip}>
          <Text style={styles.metaChipText}>{item.challengeFrequency}</Text>
        </View>
      ) : null}
      {item.challengeDifficulty ? (
        <View style={styles.metaChip}>
          <Text style={styles.metaChipText}>{item.challengeDifficulty}</Text>
        </View>
      ) : null}
      {item.challengeCategoryLabel ? (
        <View style={styles.metaChip}>
          <Text style={styles.metaChipText}>{item.challengeCategoryLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ChallengePostBody({
  item,
  isGrid,
  isRTL,
  onPress,
}: Pick<BaseCardProps, 'item' | 'isGrid' | 'onPress'> & RtlLayout) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={styles.cardContent}
    >
      <View style={[styles.body, isGrid && styles.bodyGrid]}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={[styles.heroImage, isGrid && styles.heroImageGrid]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.heroPlaceholder, isGrid && styles.heroImageGrid]}
          >
            <Ionicons name="ribbon-outline" size={48} color={colors.primary} />
          </View>
        )}
        <Text
          style={[styles.title, { textAlign: textAlign(isRTL) }]}
          numberOfLines={2}
        >
          {item.title || t('post.noTitle')}
        </Text>
        {item.description ? (
          <Text
            style={[styles.description, { textAlign: textAlign(isRTL) }]}
            numberOfLines={4}
          >
            {item.description}
          </Text>
        ) : null}
        <ChallengeMetaChips item={item} isRTL={isRTL} />
      </View>
    </TouchableOpacity>
  );
}

function ChallengePostActions({
  isRTL,
  onLike,
  onComment,
  onShare,
  onBookmark,
  isLiked,
  isBookmarked,
  likesCount,
  commentsCount,
}: Pick<
  BaseCardProps,
  | 'onLike'
  | 'onComment'
  | 'onShare'
  | 'onBookmark'
  | 'isLiked'
  | 'isBookmarked'
  | 'likesCount'
  | 'commentsCount'
> &
  RtlLayout) {
  return (
    <View
      style={[styles.actionsBar, { flexDirection: rowDirection(isRTL) }]}
    >
      <View
        style={[styles.actionsLeft, { flexDirection: rowDirection(isRTL) }]}
      >
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={isMobile ? 20 : 24}
            color={isLiked ? colors.error : colors.textSecondary}
          />
          {likesCount > 0 ? (
            <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
              {likesCount}
            </Text>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Ionicons
            name="chatbubble-outline"
            size={isMobile ? 20 : 24}
            color={colors.textSecondary}
          />
          {commentsCount > 0 ? (
            <Text style={styles.actionCount}>{commentsCount}</Text>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Ionicons
            name="share-outline"
            size={isMobile ? 20 : 24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.actionButton} onPress={onBookmark}>
        <Ionicons
          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={isMobile ? 20 : 24}
          color={isBookmarked ? colors.primary : colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const ChallengePostCard: React.FC<BaseCardProps> = ({
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
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  return (
    <View
      style={[
        styles.container,
        isGrid && styles.gridContainer,
        { width: cardWidth },
      ]}
    >
      <ChallengePostHeader
        item={item}
        isRTL={isRTL}
        formattedTime={formattedTime}
        onProfilePress={onProfilePress}
        onMorePress={onMorePress}
      />
      <ChallengePostBody
        item={item}
        isGrid={isGrid}
        isRTL={isRTL}
        onPress={onPress}
      />
      <ChallengePostActions
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

const isMobile = isMobileWeb();

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: isMobile ? 12 : 16,
    marginVertical: isMobile ? 6 : 8,
    overflow: 'hidden',
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
    fontSize: 10,
    color: colors.textSecondary,
  },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  challengeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  moreButton: {
    padding: 4,
  },
  cardContent: {
    width: '100%',
  },
  body: {
    paddingHorizontal: isMobile ? 12 : 16,
    paddingBottom: isMobile ? 12 : 16,
  },
  bodyGrid: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  heroImage: {
    width: '100%',
    height: isMobile ? 160 : 200,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: colors.backgroundTertiary,
  },
  heroImageGrid: {
    height: isMobile ? 120 : 140,
  },
  heroPlaceholder: {
    width: '100%',
    height: isMobile ? 140 : 180,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: isMobile ? FontSizes.body : 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  description: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  metaRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionsBar: {
    paddingHorizontal: isMobile ? 10 : 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsLeft: {
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    gap: 4,
  },
  actionCount: {
    marginLeft: 4,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  likedCount: {
    color: colors.error,
  },
});

export default React.memo(ChallengePostCard);
