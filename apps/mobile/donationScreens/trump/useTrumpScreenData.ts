import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { TFunction } from 'i18next';

import { db } from '../../utils/databaseService';
import { postsService } from '../../utils/postsService';
import type { FeedItem } from '../../types/feed';
import { mapPostToFeedItemForTrumpScreen } from './mapPostToFeedItemForTrumpScreen';
import {
  getFilteredPostsForTrumpMode,
  getFilteredRidesForListMode,
} from './getFilteredRidesForTrumpScreen';

type UseTrumpScreenDataArgs = {
  mode: boolean;
  selectedUserId: string | undefined;
  t: TFunction;
};

export function useTrumpScreenData({ mode, selectedUserId, t }: UseTrumpScreenDataArgs) {
  const [allRides, setAllRides] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<FeedItem[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<FeedItem[]>([]);
  const [recentPosts, setRecentPosts] = useState<FeedItem[]>([]);
  const [openRequestPosts, setOpenRequestPosts] = useState<FeedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const loadRidesRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const loadRides = useCallback(
    async (includePastOverride?: boolean) => {
      try {
        const uid = selectedUserId || 'guest';

        if (mode) {
          try {
            const postsResponse = await postsService.getPosts(100, 0, uid, 'ride');
            if (postsResponse.success && Array.isArray(postsResponse.data)) {
              const mappedPosts = postsResponse.data.map(mapPostToFeedItemForTrumpScreen);
              setAllPosts(mappedPosts);
              setFilteredPosts(mappedPosts);
            } else {
              setAllPosts([]);
              setFilteredPosts([]);
            }
          } catch {
            setAllPosts([]);
            setFilteredPosts([]);
          }
          return;
        }

        try {
          const { apiService } = await import('../../utils/apiService');
          const postsResponse = await apiService.getUserPosts(uid, 50, uid);

          if (postsResponse.success && Array.isArray(postsResponse.data)) {
            const ridePosts = postsResponse.data.filter(
              (post: any) =>
                post.post_type === 'ride' || post.post_type === 'ride_offered' || post.ride_id
            );
            const mappedPosts = ridePosts
              .map(mapPostToFeedItemForTrumpScreen)
              .filter(
                (post: FeedItem | null): post is FeedItem =>
                  post != null && Boolean(post.user?.id && post.user?.name)
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
              .map(mapPostToFeedItemForTrumpScreen)
              .filter(
                (post: FeedItem | null): post is FeedItem =>
                  post != null && Boolean(post.user?.id && post.user?.name)
              )
              .filter((post) => {
                if (post.intent !== 'request') return false;
                const t = post.type as string;
                return Boolean(
                  post.rideId ||
                    t === 'ride' ||
                    t === 'ride_offered' ||
                    post.subtype === 'ride' ||
                    post.category === 'trump'
                );
              });
            setOpenRequestPosts(requestPosts);
          } else {
            setOpenRequestPosts([]);
          }
        } catch {
          setOpenRequestPosts([]);
        }

        const shouldIncludePast = includePastOverride ?? selectedFilters.includes('includePast');

        const activeRides = await db.listRides(uid, { includePast: shouldIncludePast });

        const enrichedRides = await Promise.all(
          (activeRides || []).map(async (ride: any) => {
            const driverId = ride.driverId;
            const needsFetch =
              !ride.driverName || ride.driverName === driverId || ride.driverName === 'Driver';
            if (needsFetch && driverId) {
              try {
                const user = (await db.getUser(driverId)) as any;
                if (user?.name && user.name !== driverId) {
                  return { ...ride, driverName: user.name };
                }
              } catch {
                // ignore
              }
            }
            return ride;
          })
        );

        setAllRides(enrichedRides);
      } catch (e) {
        console.error('Failed to load rides', e);
        setAllRides([]);
      }
    },
    [selectedUserId, mode, selectedFilters]
  );

  useEffect(() => {
    loadRidesRef.current = loadRides;
  });

  const handlePostClosed = useCallback((postId: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId));
    setFilteredPosts((prev) => prev.filter((p) => p.id !== postId));
    setRecentPosts((prev) => prev.filter((p) => p.id !== postId));
    setOpenRequestPosts((prev) => prev.filter((p) => p.id !== postId));
    setTimeout(() => {
      const runner = loadRidesRef.current;
      if (runner) {
        runner().catch((err: unknown) => {
          console.error('Error reloading rides after close:', err);
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
      const reloader = loadRidesRef.current;
      if (reloader) {
        reloader().catch((err: unknown) => {
          console.error('Error reloading rides after reopen:', err);
        });
      }
    } else {
      toastService.showError(
        result.error ||
          i18n.t('post.reopenError', { ns: 'common', defaultValue: 'שגיאה בפתיחה מחדש' }),
      );
    }
  }, []);

  useEffect(() => {
    if (!mode) {
      loadRides().catch((err: unknown) => {
        console.error('Error loading rides:', err);
      });
      return;
    }
    const shouldIncludePast = selectedFilters.includes('includePast');
    loadRides(shouldIncludePast).catch((err: unknown) => {
      console.error('Error loading rides:', err);
    });
  }, [mode, selectedFilters, loadRides]);

  useFocusEffect(
    useCallback(() => {
      loadRides().catch((err: unknown) => {
        console.error('Error loading rides on focus:', err);
      });
    }, [loadRides])
  );

  const getFilteredRides = useCallback(() => {
    if (mode) {
      return getFilteredPostsForTrumpMode(
        allPosts,
        searchQuery,
        selectedFilters,
        selectedSorts,
        t
      );
    }
    return getFilteredRidesForListMode(allRides, searchQuery, selectedFilters, selectedSorts, t);
  }, [mode, allPosts, allRides, searchQuery, selectedFilters, selectedSorts, t]);

  useEffect(() => {
    if (mode) {
      setFilteredPosts(getFilteredRides() as FeedItem[]);
    }
  }, [getFilteredRides, mode]);

  return {
    allRides,
    allPosts,
    filteredPosts,
    recentPosts,
    openRequestPosts,
    searchQuery,
    setSearchQuery,
    selectedFilters,
    setSelectedFilters,
    selectedSorts,
    setSelectedSorts,
    loadRides,
    handlePostClosed,
    handlePostReopen,
  };
}
