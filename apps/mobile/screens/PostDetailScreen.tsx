import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import colors from '../globals/colors';
import { FeedItem } from '../types/feed';
import { postsService } from '../utils/postsService';
import { mapApiPostToFeedItem } from '../utils/mapApiPostToFeedItem';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { PostDetailBody } from './postDetail/PostDetailBody';

type RouteParams = { postId: string; initialItem?: FeedItem };

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
  banner: { backgroundColor: colors.surfaceAliceBlue, padding: 10 },
  bannerText: { color: colors.textPrimary, textAlign: 'center', fontSize: 13 },
});
