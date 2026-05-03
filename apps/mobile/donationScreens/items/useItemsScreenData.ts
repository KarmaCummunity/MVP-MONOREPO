import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { db } from '../../utils/databaseService';
import { postsService } from '../../utils/postsService';
import { useUser } from '../../stores/userStore';
import type { FeedItem } from '../../types/feed';
import { mapPostToFeedItemForItemsScreen } from './mapPostToFeedItemForItemsScreen';
import { mapServerRowToDonationItem } from './mapServerRowToDonationItem';
import type { DonationItem, ItemType } from './itemsScreen.types';
import { logger } from '../../utils/loggerService';

type RouteParams = { mode?: string } | undefined;

export function useItemsScreenData(
  navigation: NavigationProp<ParamListBase>,
  route: { params?: Record<string, unknown> } | undefined,
  itemType: ItemType,
) {
  const { t } = useTranslation('items');
  const tRef = useRef(t);
  tRef.current = t;
  const routeParams = route?.params as RouteParams;
  const initialMode = routeParams?.mode === 'offer' ? false : true;
  const [mode, setMode] = useState(initialMode);
  const [isModeLoaded, setIsModeLoaded] = useState(false);

  const [allItems, setAllItems] = useState<DonationItem[]>([]);
  const [allPosts, setAllPosts] = useState<FeedItem[]>([]);
  const [recentPosts, setRecentPosts] = useState<FeedItem[]>([]);
  const [openRequestPosts, setOpenRequestPosts] = useState<FeedItem[]>([]);
  const [, setRecentMine] = useState<DonationItem[]>([]);
  const [, setIsRefreshing] = useState(false);
  const loadItemsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const { selectedUser } = useUser();

  // Sync local mode from URL only when the route param changes — do NOT depend on `mode`.
  // Otherwise: user taps "offer" → setMode(false) while URL is still "search" → this effect
  // runs (because `mode` changed), reads stale URL, setMode(true) → fight / max update depth.
  useEffect(() => {
    const loadMode = async () => {
      if (routeParams?.mode && routeParams.mode !== 'undefined' && routeParams.mode !== 'null') {
        const wantsSearch = routeParams.mode === 'search';
        setMode((prev) => (prev !== wantsSearch ? wantsSearch : prev));
        setIsModeLoaded(true);
        return;
      }

      try {
        const savedMode = await AsyncStorage.getItem('items_screen_mode');
        if (savedMode === 'offer') {
          setMode(false);
        } else if (savedMode === 'search') {
          setMode(true);
        }
      } catch (e) {
        console.error('Failed to load items screen mode', e);
      } finally {
        setIsModeLoaded(true);
      }
    };
    loadMode();
  }, [routeParams?.mode]);

  useEffect(() => {
    if (isModeLoaded) {
      AsyncStorage.setItem('items_screen_mode', mode ? 'search' : 'offer').catch(e => 
        console.error('Failed to save items screen mode', e)
      );
    }
  }, [mode, isModeLoaded]);

  useEffect(() => {
    const newMode = mode ? 'search' : 'offer';
    const currentMode = routeParams?.mode;

    if (!currentMode || currentMode === 'undefined' || currentMode === 'null') {
      (navigation as { setParams: (p: Record<string, string>) => void }).setParams({ mode: 'search' });
      return;
    }

    if (newMode !== currentMode) {
      (navigation as { setParams: (p: Record<string, string>) => void }).setParams({ mode: newMode });
    }
  }, [mode, navigation, routeParams?.mode]);

  const loadItems = useCallback(async () => {
    try {
      const uid = selectedUser?.id || 'guest';

      if (mode) {
        try {
          const postsResponse = await postsService.getPosts(200, 0, uid);
          if (postsResponse.success && Array.isArray(postsResponse.data)) {
            const itemPosts = postsResponse.data.filter(
              (post: { post_type?: string; item_id?: string }) =>
                post.post_type === 'item' || post.post_type === 'donation' || post.item_id,
            );

            const mappedPosts = itemPosts
              .map(mapPostToFeedItemForItemsScreen)
              .filter(
                (post: FeedItem | null): post is FeedItem =>
                  post !== null &&
                  post !== undefined &&
                  !!post.user &&
                  !!post.user.id &&
                  !!post.user.name,
              );

            setAllPosts(mappedPosts);
          } else {
            setAllPosts([]);
          }
        } catch {
          setAllPosts([]);
        }
        return;
      }

      try {
        const { apiService } = await import('../../utils/apiService');
        const uidInner = selectedUser?.id || 'guest';
        const postsResponse = await apiService.getUserPosts(uidInner, 50, uidInner);

        if (postsResponse.success && Array.isArray(postsResponse.data)) {
          const itemPosts = postsResponse.data.filter(
            (post: { post_type?: string; item_id?: string }) =>
              post.post_type === 'item' || post.post_type === 'donation' || post.item_id,
          );

          const mappedPosts = itemPosts
            .map(mapPostToFeedItemForItemsScreen)
            .filter(
              (post: FeedItem | null): post is FeedItem =>
                post !== null && post !== undefined && !!post.user && !!post.user.id && !!post.user.name,
            );

          setRecentPosts(mappedPosts);
        } else {
          setRecentPosts([]);
        }
      } catch {
        setRecentPosts([]);
      }

      try {
        const openPostsResponse = await postsService.getPosts(300, 0, uid);
        if (openPostsResponse.success && Array.isArray(openPostsResponse.data)) {
          const requestPosts = openPostsResponse.data
            .map(mapPostToFeedItemForItemsScreen)
            .filter((post: FeedItem | null): post is FeedItem => Boolean(post))
            .filter((post) => post.intent === 'request' && (itemType === 'general' || post.category === itemType));
          setOpenRequestPosts(requestPosts);
        } else {
          setOpenRequestPosts([]);
        }
      } catch {
        setOpenRequestPosts([]);
      }

      const serverItems = await db.getDedicatedItemsByOwner(uid);
      const displayItems: DonationItem[] = (serverItems || [])
        .filter((item: Record<string, unknown>) => {
          const isDeleted = item.is_deleted || item.isDeleted;
          return !isDeleted;
        })
        .map((item: Record<string, unknown>) => mapServerRowToDonationItem(item));

      const forType = displayItems.filter((i) => (itemType === 'general' ? true : i.category === itemType));
      setAllItems(forType);
      setRecentMine(forType);
    } catch {
      Alert.alert(
        tRef.current('donationScreen.alerts.loadErrorTitle'),
        tRef.current('donationScreen.alerts.loadErrorMessage'),
      );
      setAllItems([]);
      setRecentMine([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [mode, itemType, selectedUser?.id]);

  useEffect(() => {
    loadItemsRef.current = loadItems;
  });

  useEffect(() => {
    loadItems().catch((err: unknown) => {
      console.error('Error loading items:', err);
    });
  }, [loadItems]);

  const handlePostClosed = useCallback((postId: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId));
    setRecentPosts((prev) => prev.filter((p) => p.id !== postId));

    setTimeout(() => {
      const reloader = loadItemsRef.current;
      if (reloader) {
        reloader().catch((err: unknown) => {
          logger.error('useItemsScreenData', 'Error reloading items after close', { error: String(err) });
        });
      }
    }, 100);
  }, []);

  /** After server delete: drop from all local lists and refetch (same pattern as close). */
  const handlePostDeleted = useCallback((postId: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId));
    setRecentPosts((prev) => prev.filter((p) => p.id !== postId));
    setOpenRequestPosts((prev) => prev.filter((p) => p.id !== postId));
    setTimeout(() => {
      const reloader = loadItemsRef.current;
      if (reloader) {
        reloader().catch((err: unknown) => {
          logger.error('useItemsScreenData', 'Error reloading items after delete', { error: String(err) });
        });
      }
    }, 100);
  }, []);

  const handlePostReopen = useCallback(async (item: FeedItem) => {
    const { reopenFeedPost } = await import('../../utils/reopenFeedPost');
    const { toastService } = await import('../../utils/toastService');
    const { default: i18n } = await import('../../app/i18n');

    const result = await reopenFeedPost(item);
    if (result.success) {
      toastService.showSuccess(
        i18n.t('post.reopenSuccess', { ns: 'common', defaultValue: 'הפוסט נפתח מחדש' }),
      );
      if (loadItemsRef.current) {
        loadItemsRef.current().catch((err: unknown) => {
          console.error('Error reloading items after reopen:', err);
        });
      }
    } else {
      toastService.showError(
        result.error ||
          i18n.t('post.reopenError', { ns: 'common', defaultValue: 'שגיאה בפתיחה מחדש' }),
      );
    }
  }, []);

  const filterDataSlice = useMemo(
    () => ({
      mode,
      allPosts,
      allItems,
    }),
    [mode, allPosts, allItems],
  );

  return {
    mode,
    setMode,
    allItems,
    setAllItems,
    allPosts,
    setAllPosts,
    recentPosts,
    openRequestPosts,
    setRecentPosts,
    setRecentMine,
    loadItemsRef,
    loadItems,
    handlePostClosed,
    handlePostDeleted,
    handlePostReopen,
    selectedUser,
    filterDataSlice,
  };
}
