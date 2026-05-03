import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import colors from '../../globals/colors';
import type { FeedItem } from '../../types/feed';
import { usePostInteractions } from '../../hooks/usePostInteractions';
import { useProfileNavigation } from '../../hooks/useProfileNavigation';
import { useUser } from '../../stores/userStore';
import CommentsModal from '../../components/CommentsModal';
import QuickMessageModal from '../../components/Feed/QuickMessageModal';
import { closeOwnerPostFromFeedItem } from '../../utils/feedPostOwnerClose';
import {
  canOwnerClosePostFromDetail,
  getQuickMessageModalPostType,
  isQuickMessageAvailableToViewer,
} from '../../utils/feedPostQuickMessageEligibility';
import { toastService } from '../../utils/toastService';
import { applyOptimisticOwnerCloseToItem } from './applyOptimisticOwnerCloseToItem';
import { navigateToChallengeFromPost } from './navigateToChallengeFromPost';

const GALLERY_MIN_H = 220;
const GALLERY_MAX_H = 420;

export type PostDetailBodyProps = Readonly<{
  item: FeedItem;
  onRefreshCounts: () => void;
  onPostClosedLocally: (next: FeedItem) => void;
}>;

function formatPostedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale === 'he' ? 'he-IL' : undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type GalleryProps = Readonly<{
  uris: string[];
  screenW: number;
  galleryTileH: number;
}>;

function PostDetailGallery({ uris, screenW, galleryTileH }: GalleryProps): React.ReactElement {
  if (uris.length === 0) {
    return (
      <View style={[styles.heroPlaceholder, { minHeight: galleryTileH * 0.55 }]}>
        <Ionicons name="image-outline" size={56} color={colors.textSecondary} />
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={[styles.galleryScroll, { maxHeight: galleryTileH }]}
      contentContainerStyle={styles.galleryContent}
    >
      {uris.map((uri) => (
        <View key={uri} style={[styles.galleryTile, { width: screenW, height: galleryTileH }]}>
          <Image source={{ uri }} style={styles.galleryImage} resizeMode="contain" />
        </View>
      ))}
    </ScrollView>
  );
}

type PublisherProps = Readonly<{
  item: FeedItem;
  onOpenProfile: () => void;
  sellerHint: string;
  viewProfile: string;
  unknownUser: string;
}>;

function PostDetailPublisherRow({
  item,
  onOpenProfile,
  sellerHint,
  viewProfile,
  unknownUser,
}: PublisherProps): React.ReactElement {
  return (
    <View style={styles.sellerRow}>
      <TouchableOpacity style={styles.sellerLeft} onPress={onOpenProfile} activeOpacity={0.7}>
        {item.user?.avatar ? (
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={22} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.sellerText}>
          <View style={styles.nameRow}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.user?.name || unknownUser}
            </Text>
            {item.user?.emailVerified ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.verified} />
            ) : null}
          </View>
          <Text style={styles.sellerHint}>{sellerHint}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.profileBtn} onPress={onOpenProfile}>
        <Text style={styles.profileBtnText}>{viewProfile}</Text>
      </TouchableOpacity>
    </View>
  );
}

type CtaProps = Readonly<{
  showQuickMessage: boolean;
  showClosePost: boolean;
  hasRecipient: boolean;
  closingPost: boolean;
  quickMessageLabel: string;
  closePostLabel: string;
  onQuickMessage: () => void;
  onClosePost: () => void;
}>;

function PostDetailCtaBar({
  showQuickMessage,
  showClosePost,
  hasRecipient,
  closingPost,
  quickMessageLabel,
  closePostLabel,
  onQuickMessage,
  onClosePost,
}: CtaProps): React.ReactElement | null {
  if (!showQuickMessage && !showClosePost) return null;
  return (
    <View style={styles.ctaRow}>
      {showQuickMessage && hasRecipient ? (
        <TouchableOpacity style={styles.ctaPrimary} onPress={onQuickMessage} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.white} />
          <Text style={styles.ctaPrimaryText}>{quickMessageLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {showClosePost ? (
        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={onClosePost}
          disabled={closingPost}
          activeOpacity={0.85}
        >
          {closingPost ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={20} color={colors.error} />
              <Text style={styles.ctaSecondaryText}>{closePostLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

type MetaProps = Readonly<{
  typeLabel: string;
  intentGive: string;
  intentRequest: string;
  category?: string;
  statusLabel: string;
  postedLabel: string;
  intent?: 'give' | 'request';
}>;

function PostDetailMetaChips({
  typeLabel,
  intentGive,
  intentRequest,
  category,
  statusLabel,
  postedLabel,
  intent,
}: MetaProps): React.ReactElement {
  return (
    <View style={styles.metaRow}>
      {typeLabel ? (
        <View style={styles.chip}>
          <Text style={styles.chipText}>{typeLabel}</Text>
        </View>
      ) : null}
      {intent ? (
        <View style={[styles.chip, intent === 'request' ? styles.chipRequest : styles.chipGive]}>
          <Text style={styles.chipText}>{intent === 'request' ? intentRequest : intentGive}</Text>
        </View>
      ) : null}
      {category ? (
        <View style={styles.chipMuted}>
          <Text style={styles.chipMutedText}>{category}</Text>
        </View>
      ) : null}
      {statusLabel ? (
        <View style={styles.chipMuted}>
          <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.chipMutedText}>{statusLabel}</Text>
        </View>
      ) : null}
      {postedLabel ? (
        <View style={styles.chipMuted}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.chipMutedText}>{postedLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

type ChallengeSnippetProps = Readonly<{
  category?: string | null;
  goalValue?: number | string | null;
  sectionTitle: string;
  categoryLabel: string;
  goalLabel: string;
}>;

function PostDetailChallengeSnippet({
  category,
  goalValue,
  sectionTitle,
  categoryLabel,
  goalLabel,
}: ChallengeSnippetProps): React.ReactElement | null {
  const hasGoal = goalValue != null && goalValue !== '';
  if (!category && !hasGoal) return null;
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.blockTitle}>{sectionTitle}</Text>
      {category ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{categoryLabel} </Text>
          {category}
        </Text>
      ) : null}
      {hasGoal ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{goalLabel} </Text>
          {String(goalValue)}
        </Text>
      ) : null}
    </View>
  );
}

type RideBlockProps = Readonly<{
  fromLabel: string;
  toLabel: string;
  whenLabel: string;
  seatsLabel: string;
  priceLabel: string;
  sectionTitle: string;
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  seats?: number;
  price?: number;
}>;

function PostDetailRideBlock({
  fromLabel,
  toLabel,
  whenLabel,
  seatsLabel,
  priceLabel,
  sectionTitle,
  from,
  to,
  date,
  time,
  seats,
  price,
}: RideBlockProps): React.ReactElement | null {
  if (!from && !to) return null;
  const whenText = [date, time].filter(Boolean).join(' · ');
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.blockTitle}>{sectionTitle}</Text>
      {from ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{fromLabel} </Text>
          {from}
        </Text>
      ) : null}
      {to ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{toLabel} </Text>
          {to}
        </Text>
      ) : null}
      {whenText ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{whenLabel} </Text>
          {whenText}
        </Text>
      ) : null}
      {seats != null && seats > 0 ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{seatsLabel} </Text>
          {seats}
        </Text>
      ) : null}
      {price != null && price > 0 ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{priceLabel} </Text>
          {price}
        </Text>
      ) : null}
    </View>
  );
}

type TaskBlockProps = Readonly<{
  taskData: NonNullable<FeedItem['taskData']>;
  sectionTitle: string;
  statusFieldLabel: string;
  displayStatus: string;
}>;

function PostDetailTaskBlock({
  taskData,
  sectionTitle,
  statusFieldLabel,
  displayStatus,
}: TaskBlockProps): React.ReactElement {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.blockTitle}>{sectionTitle}</Text>
      <Text style={styles.blockLine}>{taskData.title}</Text>
      {taskData.description ? <Text style={styles.blockLine}>{taskData.description}</Text> : null}
      {taskData.status ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{statusFieldLabel} </Text>
          {displayStatus}
        </Text>
      ) : null}
    </View>
  );
}

type SocialProps = Readonly<{
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  isBookmarked: boolean;
  onLike: () => void;
  onOpenComments: () => void;
  onBookmark: () => void;
  onShare: () => void;
}>;

function PostDetailSocialRow({
  isLiked,
  likesCount,
  commentsCount,
  isBookmarked,
  onLike,
  onOpenComments,
  onBookmark,
  onShare,
}: SocialProps): React.ReactElement {
  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? colors.error : colors.textPrimary} />
        <Text style={styles.actionLabel}>{likesCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onOpenComments}>
        <Ionicons name="chatbubble-outline" size={22} color={colors.textPrimary} />
        <Text style={styles.actionLabel}>{commentsCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onBookmark}>
        <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
        <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

export function PostDetailBody({ item, onRefreshCounts, onPostClosedLocally }: PostDetailBodyProps): React.ReactElement {
  const { t, i18n } = useTranslation(['postDetail', 'common']);
  const navigation = useNavigation<any>();
  const { width: windowW } = useWindowDimensions();
  const screenW = Math.max(1, windowW);
  const galleryTileH = Math.min(GALLERY_MAX_H, Math.max(GALLERY_MIN_H, screenW * 0.72));

  const { navigateToProfile } = useProfileNavigation();
  const { selectedUser } = useUser();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [quickMessageOpen, setQuickMessageOpen] = useState(false);
  const [closingPost, setClosingPost] = useState(false);

  const {
    isLiked,
    likesCount,
    commentsCount,
    isBookmarked,
    handleLike,
    handleBookmark,
    handleShare,
  } = usePostInteractions(item);

  const galleryUris = useMemo(() => {
    const fromImages = item.images?.filter((u) => typeof u === 'string' && u.trim()) || [];
    if (fromImages.length) return fromImages;
    if (item.thumbnail) return [item.thumbnail];
    return [];
  }, [item]);

  const postedLabel = useMemo(() => {
    if (!item.timestamp) return '';
    return formatPostedAt(item.timestamp, i18n.language);
  }, [item.timestamp, i18n.language]);

  const typeLabel = useMemo(() => {
    if (!item.subtype) return '';
    const key = `postDetail:types.${item.subtype}`;
    const translated = t(key);
    return translated === key ? String(item.subtype) : translated;
  }, [item.subtype, t]);

  const showQuickMessage = useMemo(
    () => isQuickMessageAvailableToViewer(item, selectedUser?.id),
    [item, selectedUser?.id],
  );

  const showClosePost = useMemo(
    () => canOwnerClosePostFromDetail(item, selectedUser?.id),
    [item, selectedUser?.id],
  );

  const statusLabel = useMemo(() => {
    const st = item.status || item.taskData?.status;
    if (!st) return '';
    const key = `postDetail:statusValues.${st}`;
    const translated = t(key);
    return translated === key ? st : translated;
  }, [item.status, item.taskData?.status, t]);

  const onOpenProfile = useCallback(() => {
    if (!item.user?.id) return;
    navigateToProfile(item.user.id, item.user.name || t('common:unknownUser'));
  }, [item.user, navigateToProfile, t]);

  const openChallenge = useCallback(() => {
    if (!item.challengeId) return;
    navigateToChallengeFromPost(navigation, item.challengeId);
  }, [item.challengeId, navigation]);

  const confirmClosePost = useCallback(() => {
    Alert.alert(t('postDetail:closePostConfirmTitle'), t('postDetail:closePostConfirmMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('postDetail:closePostConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          setClosingPost(true);
          try {
            const result = await closeOwnerPostFromFeedItem(item);
            if (result.success) {
              toastService.showSuccess(t('common:post.closedSuccess'));
              onPostClosedLocally(applyOptimisticOwnerCloseToItem(item));
              onRefreshCounts();
            } else {
              toastService.showError(result.error || t('common:post.closeError'));
            }
          } finally {
            setClosingPost(false);
          }
        },
      },
    ]);
  }, [item, onPostClosedLocally, onRefreshCounts, t]);

  const taskStatusDisplay =
    item.taskData?.status && statusLabel ? statusLabel : item.taskData?.status ?? '';

  return (
    <>
      <PostDetailGallery uris={galleryUris} screenW={screenW} galleryTileH={galleryTileH} />

      <View style={styles.card}>
        <PostDetailPublisherRow
          item={item}
          onOpenProfile={onOpenProfile}
          sellerHint={t('postDetail:sellerHint')}
          viewProfile={t('postDetail:viewProfile')}
          unknownUser={t('common:unknownUser')}
        />

        <PostDetailCtaBar
          showQuickMessage={showQuickMessage}
          showClosePost={showClosePost}
          hasRecipient={!!item.user?.id}
          closingPost={closingPost}
          quickMessageLabel={t('postDetail:quickMessage')}
          closePostLabel={t('postDetail:closePost')}
          onQuickMessage={() => setQuickMessageOpen(true)}
          onClosePost={confirmClosePost}
        />

        <Text style={styles.title}>{item.title}</Text>
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        <PostDetailMetaChips
          typeLabel={typeLabel}
          intent={item.intent}
          intentGive={t('postDetail:intent.give')}
          intentRequest={t('postDetail:intent.request')}
          category={item.category}
          statusLabel={statusLabel}
          postedLabel={postedLabel}
        />

        <PostDetailChallengeSnippet
          category={item.challengeData?.category}
          goalValue={item.challengeData?.goal_value}
          sectionTitle={t('postDetail:challengeSection')}
          categoryLabel={t('postDetail:challengeCategory')}
          goalLabel={t('postDetail:challengeGoal')}
        />

        <PostDetailRideBlock
          sectionTitle={t('postDetail:rideSection')}
          fromLabel={t('postDetail:from')}
          toLabel={t('postDetail:to')}
          whenLabel={t('postDetail:when')}
          seatsLabel={t('postDetail:seats')}
          priceLabel={t('postDetail:price')}
          from={item.from}
          to={item.to}
          date={item.date}
          time={item.time}
          seats={item.seats}
          price={item.price}
        />

        {item.taskData ? (
          <PostDetailTaskBlock
            taskData={item.taskData}
            sectionTitle={t('postDetail:taskSection')}
            statusFieldLabel={t('postDetail:status')}
            displayStatus={taskStatusDisplay}
          />
        ) : null}

        {item.challengeId ? (
          <TouchableOpacity style={styles.challengeBtn} onPress={openChallenge}>
            <Text style={styles.challengeBtnText}>{t('postDetail:openChallenge')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        <PostDetailSocialRow
          isLiked={isLiked}
          likesCount={likesCount}
          commentsCount={commentsCount}
          isBookmarked={isBookmarked}
          onLike={handleLike}
          onOpenComments={() => setCommentsOpen(true)}
          onBookmark={handleBookmark}
          onShare={handleShare}
        />
      </View>

      <CommentsModal
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={item.id}
        postUser={
          item.user
            ? {
                id: item.user.id,
                name: item.user.name || null,
                avatar: item.user.avatar || 'https://picsum.photos/seed/user/100/100',
              }
            : undefined
        }
        postTitle={item.title || ''}
        onCommentsCountChange={onRefreshCounts}
      />

      {showQuickMessage && item.user?.id ? (
        <QuickMessageModal
          visible={quickMessageOpen}
          onClose={() => setQuickMessageOpen(false)}
          postType={getQuickMessageModalPostType(item)}
          recipientId={item.user.id}
          recipientName={item.user.name || t('common:unknownUser')}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  galleryScroll: { width: '100%' },
  galleryContent: { alignItems: 'stretch' },
  galleryTile: {
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 0,
    marginTop: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sellerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: colors.surfaceMuted },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  sellerText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  sellerName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  verified: { marginLeft: 4 },
  sellerHint: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  profileBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
  profileBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 10 },
  ctaPrimary: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  ctaPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  ctaSecondary: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  ctaSecondaryText: { color: colors.error, fontSize: 15, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  description: { fontSize: 16, lineHeight: 24, color: colors.textBodyNeutral, marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.surfaceGrayBlue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  chipGive: { backgroundColor: colors.surfaceGreenTint },
  chipRequest: { backgroundColor: colors.surfaceBlueTint },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  chipMuted: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  chipMutedText: { fontSize: 13, color: colors.textSecondary },
  detailBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  blockTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  blockLine: { fontSize: 15, color: colors.textBodyNeutral, marginBottom: 4 },
  blockLabel: { fontWeight: '600', color: colors.textSecondary },
  challengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceGreenPale,
    marginBottom: 12,
  },
  challengeBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary, flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: 16,
    marginTop: 12,
    paddingBottom: 8,
  },
  actionBtn: { alignItems: 'center', minWidth: 56 },
  actionLabel: { marginTop: 4, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
