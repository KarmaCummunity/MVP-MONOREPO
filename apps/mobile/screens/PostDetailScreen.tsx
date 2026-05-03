import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import colors from '../globals/colors';
import { FeedItem } from '../types/feed';
import { postsService } from '../utils/postsService';
import { mapApiPostToFeedItem } from '../utils/mapApiPostToFeedItem';
import { useUser } from '../stores/userStore';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { useProfileNavigation } from '../hooks/useProfileNavigation';
import CommentsModal from '../components/CommentsModal';
import QuickMessageModal from '../components/Feed/QuickMessageModal';
import { logger } from '../utils/loggerService';
import { closeOwnerPostFromFeedItem } from '../utils/feedPostOwnerClose';
import {
  canOwnerClosePostFromDetail,
  getQuickMessageModalPostType,
  isQuickMessageAvailableToViewer,
} from '../utils/feedPostQuickMessageEligibility';
import { toastService } from '../utils/toastService';

type RouteParams = { postId: string; initialItem?: FeedItem };

function formatPostedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale === 'he' ? 'he-IL' : undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const GALLERY_MIN_H = 220;
const GALLERY_MAX_H = 420;

function PostDetailBody({
  item,
  onRefreshCounts,
  onPostClosedLocally,
}: {
  item: FeedItem;
  onRefreshCounts: () => void;
  onPostClosedLocally: (next: FeedItem) => void;
}): React.ReactElement {
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
    const tabNav = navigation.getParent?.() as { navigate?: (name: string, p?: object) => void } | undefined;
    const tabState =
      tabNav && typeof (tabNav as { getState?: () => { routeNames?: string[] } }).getState === 'function'
        ? (tabNav as { getState: () => { routeNames?: string[] } }).getState()
        : undefined;
    if (tabState?.routeNames?.includes('DonationsTab') && tabNav?.navigate) {
      tabNav.navigate('DonationsTab', {
        screen: 'ChallengeDetailsScreen',
        params: { challengeId: item.challengeId },
      });
      return;
    }
    navigation.dispatch(
      CommonActions.navigate({
        name: 'HomeStack',
        params: {
          screen: 'DonationsTab',
          params: {
            screen: 'ChallengeDetailsScreen',
            params: { challengeId: item.challengeId },
          },
        },
      } as never),
    );
  }, [item.challengeId, navigation]);

  const confirmClosePost = useCallback(() => {
    Alert.alert(
      t('postDetail:closePostConfirmTitle'),
      t('postDetail:closePostConfirmMessage'),
      [
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
                let next: FeedItem = { ...item };
                if (item.subtype === 'task_assignment' || item.type === 'task_post') {
                  next = item.taskData
                    ? { ...item, taskData: { ...item.taskData, status: 'done' } }
                    : { ...item, status: 'done' };
                } else if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
                  next = { ...item, status: 'completed' };
                } else if (item.subtype === 'item' || item.subtype === 'donation') {
                  next = { ...item, status: 'delivered' };
                }
                onPostClosedLocally(next);
                onRefreshCounts();
              } else {
                toastService.showError(result.error || t('common:post.closeError'));
              }
            } finally {
              setClosingPost(false);
            }
          },
        },
      ],
    );
  }, [item, onPostClosedLocally, onRefreshCounts, t]);

  return (
    <>
      {galleryUris.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={[styles.galleryScroll, { maxHeight: galleryTileH }]}
          contentContainerStyle={styles.galleryContent}
        >
          {galleryUris.map((uri) => (
            <View key={uri} style={[styles.galleryTile, { width: screenW, height: galleryTileH }]}>
              <Image source={{ uri }} style={styles.galleryImage} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.heroPlaceholder, { minHeight: galleryTileH * 0.55 }]}>
          <Ionicons name="image-outline" size={56} color={colors.textSecondary} />
        </View>
      )}

      <View style={styles.card}>
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
                  {item.user?.name || t('common:unknownUser')}
                </Text>
                {item.user?.emailVerified ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.verified} />
                ) : null}
              </View>
              <Text style={styles.sellerHint}>{t('postDetail:sellerHint')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={onOpenProfile}>
            <Text style={styles.profileBtnText}>{t('postDetail:viewProfile')}</Text>
          </TouchableOpacity>
        </View>

        {(showQuickMessage || showClosePost) && (
          <View style={styles.ctaRow}>
            {showQuickMessage && item.user?.id ? (
              <TouchableOpacity
                style={styles.ctaPrimary}
                onPress={() => setQuickMessageOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.white} />
                <Text style={styles.ctaPrimaryText}>{t('postDetail:quickMessage')}</Text>
              </TouchableOpacity>
            ) : null}
            {showClosePost ? (
              <TouchableOpacity
                style={styles.ctaSecondary}
                onPress={confirmClosePost}
                disabled={closingPost}
                activeOpacity={0.85}
              >
                {closingPost ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={20} color={colors.error} />
                    <Text style={styles.ctaSecondaryText}>{t('postDetail:closePost')}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <Text style={styles.title}>{item.title}</Text>
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        <View style={styles.metaRow}>
          {typeLabel ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{typeLabel}</Text>
            </View>
          ) : null}
          {item.intent ? (
            <View style={[styles.chip, item.intent === 'request' ? styles.chipRequest : styles.chipGive]}>
              <Text style={styles.chipText}>
                {item.intent === 'request' ? t('postDetail:intent.request') : t('postDetail:intent.give')}
              </Text>
            </View>
          ) : null}
          {item.category ? (
            <View style={styles.chipMuted}>
              <Text style={styles.chipMutedText}>{item.category}</Text>
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

        {item.challengeData?.category || item.challengeData?.goal_value != null ? (
          <View style={styles.detailBlock}>
            <Text style={styles.blockTitle}>{t('postDetail:challengeSection')}</Text>
            {item.challengeData?.category ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:challengeCategory')} </Text>
                {item.challengeData.category}
              </Text>
            ) : null}
            {item.challengeData?.goal_value != null && item.challengeData.goal_value !== '' ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:challengeGoal')} </Text>
                {String(item.challengeData.goal_value)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {item.from || item.to ? (
          <View style={styles.detailBlock}>
            <Text style={styles.blockTitle}>{t('postDetail:rideSection')}</Text>
            {item.from ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:from')} </Text>
                {item.from}
              </Text>
            ) : null}
            {item.to ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:to')} </Text>
                {item.to}
              </Text>
            ) : null}
            {item.date || item.time ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:when')} </Text>
                {[item.date, item.time].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {item.seats != null && item.seats > 0 ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:seats')} </Text>
                {item.seats}
              </Text>
            ) : null}
            {item.price != null && item.price > 0 ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:price')} </Text>
                {item.price}
              </Text>
            ) : null}
          </View>
        ) : null}

        {item.taskData ? (
          <View style={styles.detailBlock}>
            <Text style={styles.blockTitle}>{t('postDetail:taskSection')}</Text>
            <Text style={styles.blockLine}>{item.taskData.title}</Text>
            {item.taskData.description ? <Text style={styles.blockLine}>{item.taskData.description}</Text> : null}
            {item.taskData.status ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:status')} </Text>
                {statusLabel || item.taskData.status}
              </Text>
            ) : null}
          </View>
        ) : null}

        {item.challengeId ? (
          <TouchableOpacity style={styles.challengeBtn} onPress={openChallenge}>
            <Text style={styles.challengeBtnText}>{t('postDetail:openChallenge')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? colors.error : colors.textPrimary} />
            <Text style={styles.actionLabel}>{likesCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentsOpen(true)}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.textPrimary} />
            <Text style={styles.actionLabel}>{commentsCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
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

export default function PostDetailScreen(): React.ReactElement {
  const { t } = useTranslation(['postDetail', 'common']);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const postId = (route.params as RouteParams | undefined)?.postId;
  const initialItem = (route.params as RouteParams | undefined)?.initialItem;
  const { selectedUser } = useUser();

  const [item, setItem] = useState<FeedItem | null>(initialItem ?? null);
  const [loading, setLoading] = useState(!initialItem);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!postId) return;
      if (isRefresh) setRefreshing(true);
      else if (!(initialItem && initialItem.id === postId)) setLoading(true);
      setFetchError(null);
      try {
        const res = await postsService.getPostById(postId, selectedUser?.id);
        if (res.success && res.data) {
          setItem(mapApiPostToFeedItem(res.data));
        } else {
          setFetchError(res.error || t('postDetail:loadError'));
          if (initialItem && initialItem.id === postId) {
            setItem((prev) => prev ?? initialItem);
          }
        }
      } catch (e) {
        logger.error('PostDetailScreen', 'load failed', { e, postId });
        setFetchError(t('postDetail:loadError'));
        if (initialItem && initialItem.id === postId) {
          setItem((prev) => prev ?? initialItem);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [postId, selectedUser?.id, initialItem, t],
  );

  useEffect(() => {
    if (initialItem && initialItem.id === postId) {
      setItem(initialItem);
      setLoading(false);
    } else if (postId) {
      setItem(null);
      setLoading(true);
    }
    load(false);
  }, [postId, selectedUser?.id, initialItem, load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('postDetail:title'),
      headerBackTitleVisible: false,
    });
  }, [navigation, t]);

  const onRefreshCounts = useCallback(() => {
    load(true);
  }, [load]);

  const onPostClosedLocally = useCallback((next: FeedItem) => {
    setItem(next);
  }, []);

  if (!postId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('postDetail:notFound')}</Text>
      </View>
    );
  }

  if (loading && !item) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>{t('postDetail:loading')}</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorText}>{fetchError || t('postDetail:notFound')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(false)}>
          <Text style={styles.retryBtnText}>{t('postDetail:retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
      >
        {fetchError ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{fetchError}</Text>
          </View>
        ) : null}
        <PostDetailBody item={item} onRefreshCounts={onRefreshCounts} onPostClosedLocally={onPostClosedLocally} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  muted: { marginTop: 12, color: colors.textSecondary, fontSize: 15 },
  errorText: { marginTop: 12, color: colors.textPrimary, fontSize: 16, textAlign: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryBtnText: { color: colors.white, fontWeight: '600' },
  banner: { backgroundColor: colors.surfaceAlice, padding: 10 },
  bannerText: { color: colors.textPrimary, textAlign: 'center', fontSize: 13 },
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
