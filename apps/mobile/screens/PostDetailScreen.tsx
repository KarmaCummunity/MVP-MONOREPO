import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import colors from '../globals/colors';
import { FeedItem, type FeedRideExtended } from '../types/feed';
import { postsService } from '../utils/postsService';
import { mapApiPostToFeedItem } from '../utils/mapApiPostToFeedItem';
import { useUser } from '../stores/userStore';
import { usePostInteractions } from '../hooks/usePostInteractions';
import { useProfileNavigation } from '../hooks/useProfileNavigation';
import CommentsModal from '../components/CommentsModal';
import { logger } from '../utils/loggerService';

const { width: SCREEN_W } = Dimensions.get('window');

type RouteParams = { postId: string; initialItem?: FeedItem };

function formatPostedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale === 'he' ? 'he-IL' : undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function recurrenceUnitLabel(t: (k: string) => string, unit: string): string {
  if (unit === 'day') return t('postDetail:rideUnitDay');
  if (unit === 'week') return t('postDetail:rideUnitWeek');
  if (unit === 'month') return t('postDetail:rideUnitMonth');
  return unit;
}

function requirementCodeLabel(t: (k: string) => string, code: string): string {
  const key = `postDetail:rideReq.${code}`;
  const translated = t(key);
  return translated === key ? code : translated;
}

type PostDetailT = (key: string, options?: Record<string, unknown>) => string;

function rideFuelLineText(t: PostDetailT, fuel: string, fuelMaxNis: number | undefined): string {
  if (fuel === 'none') return t('postDetail:rideFuelNone');
  if (fuel === 'yes') return t('postDetail:rideFuelYes');
  if (fuel === 'up_to' && fuelMaxNis != null && fuelMaxNis > 0) {
    return t('postDetail:rideFuelUpTo', { amount: fuelMaxNis });
  }
  return t('postDetail:rideFuelUpTo', { amount: String(fuelMaxNis ?? '—') });
}

function rideSmokingLineText(t: PostDetailT, smoking: string): string {
  if (smoking === 'no_smokers') return t('postDetail:rideSmokingNoSmokers');
  if (smoking === 'smokers_ok') return t('postDetail:rideSmokingSmokersOk');
  return t('postDetail:rideSmokingAny');
}

function rideGenderLineText(t: PostDetailT, gender: string): string {
  if (gender === 'female') return t('postDetail:rideGenderFemale');
  if (gender === 'male') return t('postDetail:rideGenderMale');
  return t('postDetail:rideGenderAny');
}

type RideExtendedBlockProps = Readonly<{
  re: FeedRideExtended;
  description: string;
  t: PostDetailT;
}>;

function RideExtendedBlock({ re, description, t }: RideExtendedBlockProps): React.ReactElement {
  const descTrim = description.trim();
  const notesTrimmed = re.notes?.trim() ?? '';
  const showMetaNotes = Boolean(notesTrimmed && notesTrimmed !== descTrim);
  const fuel = re.fuelParticipation;
  const smoking = re.smokingPreference;
  const gender = re.genderPreference;
  const p = re.preferences;

  return (
    <>
      {showMetaNotes ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{t('postDetail:rideNotes')} </Text>
          {notesTrimmed}
        </Text>
      ) : null}
      {re.requirementCodes?.map((code) => (
        <Text key={code} style={styles.blockLine}>
          • {requirementCodeLabel(t, code)}
        </Text>
      ))}
      {re.isRecurring ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{t('postDetail:rideRecurring')} </Text>
          {t('postDetail:rideEvery', {
            count: re.recurrenceFrequency ?? 1,
            unit: recurrenceUnitLabel(t, re.recurrenceUnit || ''),
          })}
        </Text>
      ) : null}
      {fuel ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{t('postDetail:rideFuel')} </Text>
          {rideFuelLineText(t, fuel, re.fuelMaxNis)}
        </Text>
      ) : null}
      {smoking ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{t('postDetail:rideSmoking')} </Text>
          {rideSmokingLineText(t, smoking)}
        </Text>
      ) : null}
      {gender ? (
        <Text style={styles.blockLine}>
          <Text style={styles.blockLabel}>{t('postDetail:rideGender')} </Text>
          {rideGenderLineText(t, gender)}
        </Text>
      ) : null}
      {p?.noSmoking ? (
        <Text style={styles.blockLine}>• {t('postDetail:ridePrefNoSmoking')}</Text>
      ) : null}
      {p?.petsAllowed ? (
        <Text style={styles.blockLine}>• {t('postDetail:ridePrefPets')}</Text>
      ) : null}
      {p?.kidsFriendly ? (
        <Text style={styles.blockLine}>• {t('postDetail:ridePrefKids')}</Text>
      ) : null}
    </>
  );
}

function rideSectionHasExtended(re: FeedRideExtended | undefined): boolean {
  if (!re) return false;
  return Boolean(
    re.notes ||
      (re.requirementCodes && re.requirementCodes.length > 0) ||
      re.isRecurring ||
      re.fuelParticipation ||
      re.smokingPreference ||
      re.genderPreference ||
      (re.preferences &&
        (re.preferences.noSmoking || re.preferences.petsAllowed || re.preferences.kidsFriendly)),
  );
}

function rideSectionHasCore(item: FeedItem): boolean {
  return (
    Boolean(item.from) ||
    Boolean(item.to) ||
    Boolean(item.date || item.time) ||
    (item.seats != null && item.seats > 0) ||
    (item.price != null && item.price > 0)
  );
}

type RideDetailSectionProps = Readonly<{ item: FeedItem; t: PostDetailT }>;

function RideDetailSection({ item, t }: RideDetailSectionProps): React.ReactElement | null {
  const re = item.rideExtended;
  if (!rideSectionHasCore(item) && !rideSectionHasExtended(re)) return null;

  return (
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
      {re ? <RideExtendedBlock re={re} description={item.description} t={t} /> : null}
    </View>
  );
}

type PostDetailNavigation = {
  getParent?: () => unknown;
  dispatch: (action: unknown) => void;
};

function openChallengeFromPostDetailNavigation(
  navigation: PostDetailNavigation,
  challengeId: string,
): void {
  const tabNav = navigation.getParent?.() as
    | { navigate?: (name: string, p?: object) => void; getState?: () => { routeNames?: string[] } }
    | undefined;
  const tabState =
    typeof tabNav?.getState === 'function' ? tabNav.getState() : undefined;
  if (tabState?.routeNames?.includes('DonationsTab') && tabNav?.navigate) {
    tabNav.navigate('DonationsTab', {
      screen: 'ChallengeDetailsScreen',
      params: { challengeId },
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
          params: { challengeId },
        },
      },
    } as never),
  );
}

function PostDetailHeroGallery({ uris }: Readonly<{ uris: string[] }>): React.ReactElement {
  if (uris.length === 0) {
    return (
      <View style={styles.heroPlaceholder}>
        <Ionicons name="image-outline" size={56} color={colors.textSecondary} />
      </View>
    );
  }
  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
      {uris.map((uri) => (
        <Image key={uri} source={{ uri }} style={[styles.heroImage, { width: SCREEN_W }]} resizeMode="cover" />
      ))}
    </ScrollView>
  );
}

type PostDetailMetaRowProps = Readonly<{
  typeLabel: string;
  postedLabel: string;
  intent?: FeedItem['intent'];
  t: PostDetailT;
}>;

function PostDetailMetaRow({ typeLabel, postedLabel, intent, t }: PostDetailMetaRowProps): React.ReactElement {
  return (
    <View style={styles.metaRow}>
      {typeLabel ? (
        <View style={styles.chip}>
          <Text style={styles.chipText}>{typeLabel}</Text>
        </View>
      ) : null}
      {intent ? (
        <View style={[styles.chip, intent === 'request' ? styles.chipRequest : styles.chipGive]}>
          <Text style={styles.chipText}>
            {intent === 'request' ? t('postDetail:intent.request') : t('postDetail:intent.give')}
          </Text>
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

type PostDetailSellerBlockProps = Readonly<{ item: FeedItem; onOpenProfile: () => void; t: PostDetailT }>;

function PostDetailSellerBlock({ item, onOpenProfile, t }: PostDetailSellerBlockProps): React.ReactElement {
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
              {item.user?.name ?? t('common:unknownUser')}
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
  );
}

type PostDetailBodyProps = Readonly<{
  item: FeedItem;
  onRefreshCounts: () => void;
}>;

function PostDetailBody({ item, onRefreshCounts }: PostDetailBodyProps): React.ReactElement {
  const { t, i18n } = useTranslation(['postDetail', 'common']);
  const navigation = useNavigation<any>();
  const { navigateToProfile } = useProfileNavigation();
  const [commentsOpen, setCommentsOpen] = useState(false);

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

  const onOpenProfile = useCallback(() => {
    if (!item.user?.id) return;
    navigateToProfile(item.user.id, item.user.name || t('common:unknownUser'));
  }, [item.user, navigateToProfile, t]);

  const openChallenge = useCallback(() => {
    const id = item.challengeId;
    if (!id) return;
    openChallengeFromPostDetailNavigation(navigation as PostDetailNavigation, id);
  }, [item.challengeId, navigation]);

  return (
    <>
      <PostDetailHeroGallery uris={galleryUris} />

      <View style={styles.card}>
        <PostDetailSellerBlock item={item} onOpenProfile={onOpenProfile} t={t} />

        <Text style={styles.title}>{item.title}</Text>
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        <PostDetailMetaRow typeLabel={typeLabel} postedLabel={postedLabel} intent={item.intent} t={t} />

        <RideDetailSection item={item} t={t} />

        {item.taskData ? (
          <View style={styles.detailBlock}>
            <Text style={styles.blockTitle}>{t('postDetail:taskSection')}</Text>
            <Text style={styles.blockLine}>{item.taskData.title}</Text>
            {item.taskData.status ? (
              <Text style={styles.blockLine}>
                <Text style={styles.blockLabel}>{t('postDetail:status')} </Text>
                {item.taskData.status}
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
      else if (initialItem?.id !== postId) setLoading(true);
      setFetchError(null);
      try {
        const res = await postsService.getPostById(postId, selectedUser?.id);
        if (res.success && res.data) {
          setItem(mapApiPostToFeedItem(res.data));
        } else {
          setFetchError(res.error || t('postDetail:loadError'));
          if (initialItem?.id === postId) {
            setItem((prev) => prev ?? initialItem);
          }
        }
      } catch (e) {
        logger.error('PostDetailScreen', 'load failed', { e, postId });
        setFetchError(t('postDetail:loadError'));
        if (initialItem?.id === postId) {
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
        <PostDetailBody item={item} onRefreshCounts={onRefreshCounts} />
      </ScrollView>
    </View>
  );
}

const HERO_H = 260;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
  muted: { marginTop: 12, color: colors.textSecondary, fontSize: 15 },
  errorText: { marginTop: 12, color: colors.textPrimary, fontSize: 16, textAlign: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryBtnText: { color: colors.white, fontWeight: '600' },
  banner: { backgroundColor: colors.surfaceAliceBlue, padding: 10 },
  bannerText: { color: colors.textPrimary, textAlign: 'center', fontSize: 13 },
  gallery: { maxHeight: HERO_H },
  heroImage: { height: HERO_H, backgroundColor: colors.surfaceMutedPanel },
  heroPlaceholder: {
    height: HERO_H,
    backgroundColor: colors.surfaceMutedPanel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sellerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: colors.surfaceMutedPanel },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  sellerText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  sellerName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  verified: { marginLeft: 4 },
  sellerHint: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  profileBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutralBorderStrong,
  },
  profileBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  description: { fontSize: 16, lineHeight: 24, color: colors.neutralTextTitle, marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: colors.surfaceGrayBlue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  chipGive: { backgroundColor: colors.surfaceGreenTint },
  chipRequest: { backgroundColor: colors.surfaceBlueTint },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  chipMuted: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  chipMutedText: { fontSize: 13, color: colors.textSecondary },
  detailBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutralBorderStrong,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  blockTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  blockLine: { fontSize: 15, color: colors.neutralTextTitle, marginBottom: 4 },
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
    borderTopColor: colors.neutralBorderStrong,
    paddingTop: 14,
    marginTop: 8,
  },
  actionBtn: { alignItems: 'center', minWidth: 56 },
  actionLabel: { marginTop: 4, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
});
