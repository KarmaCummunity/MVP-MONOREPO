import { useState, useCallback, useEffect, useRef } from 'react';
import { postsService } from '../utils/postsService';
import { logger } from '../utils/loggerService';
import { FeedItem } from '../types/feed';
import { mapApiPostToFeedItem } from '../utils/mapApiPostToFeedItem';
import { useUser } from '../stores/userStore';
import { appendUniqueFeedItems, sortFeedByTimestampDesc, feedHasLikelyMorePages } from '../utils/feedPaginationMerge';

/** Server page size — small batches, load more on scroll (feed-style pagination). */
const POSTS_PAGE_SIZE = 12;

async function fetchStandaloneTasksAsFeedItems(
    postedTaskIds: Set<string>,
    existingIds: Set<string>,
): Promise<FeedItem[]> {
    const out: FeedItem[] = [];
    try {
        const { apiService } = require('../utils/apiService');
        const [openTasksRes, progressTasksRes] = await Promise.all([
            apiService.getTasks({ status: 'open', limit: 20 }),
            apiService.getTasks({ status: 'in_progress', limit: 20 }),
        ]);

        const rawTasks = [
            ...(openTasksRes.success ? (openTasksRes.data || []) : []),
            ...(progressTasksRes.success ? (progressTasksRes.data || []) : []),
        ];

        rawTasks.forEach((task: any) => {
            if (postedTaskIds.has(task.id) || existingIds.has(task.id)) {
                return;
            }

            const creator = task.creator_details || {};
            const creatorVerified =
                creator.email_verified === true || creator.emailVerified === true;

            out.push({
                id: task.id,
                type: 'post',
                subtype: 'task_assignment',
                title: `יצר/ה משימה חדשה: ${task.title}`,
                description: task.description || '',
                thumbnail: null,
                user: {
                    id: creator.id || task.created_by || 'unknown',
                    name: creator.name || 'Unknown User',
                    avatar: creator.avatar_url || undefined,
                    emailVerified: creatorVerified,
                },
                likes: 0,
                comments: 0,
                isLiked: false,
                timestamp: task.created_at || new Date().toISOString(),
                taskData: {
                    id: task.id,
                    title: task.title,
                    status: task.status,
                },
            });
            existingIds.add(task.id);
        });
    } catch (e) {
        logger.warn('useFeedData', 'Failed to load tasks', { error: e });
    }
    return out;
}

export const useFeedData = (feedMode: 'friends' | 'discovery') => {
    const { selectedUser: currentUser } = useUser();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    /** First-page fetch failed (network / HTTP). */
    const [initialError, setInitialError] = useState<string | null>(null);
    /** Paginated fetch failed; user can retry without losing the list. */
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

    const postsOffsetRef = useRef(0);
    const loadMoreInFlightRef = useRef(false);
    /** Until the first page finishes, ignore loadMore (avoids duplicate page-0). After that, never block on `loading` — onEndReached can fire early and would be dropped forever. */
    const initialLoadCompleteRef = useRef(false);

    const loadInitialOrRefresh = useCallback(
        async (isRefresh: boolean) => {
            const viewerId = feedMode === 'friends' ? currentUser?.id : undefined;
            const feedScope =
                feedMode === 'friends' && viewerId ? ('friends' as const) : undefined;
            initialLoadCompleteRef.current = false;
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setInitialError(null);
            setLoadMoreError(null);
            postsOffsetRef.current = 0;
            setHasMorePosts(true);
            loadMoreInFlightRef.current = false;

            try {
                logger.debug('useFeedData', 'Loading feed (first page)', {
                    feedMode,
                    userId: currentUser?.id,
                    pageSize: POSTS_PAGE_SIZE,
                });

                const postsResponse = await postsService.getPosts(
                    POSTS_PAGE_SIZE,
                    0,
                    viewerId,
                    undefined,
                    undefined,
                    undefined,
                    feedScope,
                );
                if (!postsResponse.success) {
                    logger.warn('useFeedData', 'First page posts request failed', {
                        error: postsResponse.error,
                    });
                    setFeed([]);
                    setHasMorePosts(false);
                    setInitialError(
                        postsResponse.error || 'Failed to load feed',
                    );
                    return;
                }
                const rawPosts = postsResponse.data || [];
                const mappedPosts = rawPosts.map(mapApiPostToFeedItem);

                const postedTaskIds = new Set(
                    rawPosts
                        .filter((p: any) => p.task_id || p.task?.id)
                        .map((p: any) => p.task_id || p.task?.id),
                );

                const existingIds = new Set(mappedPosts.map((item) => item.id));
                // Standalone tasks are global — only merge into discovery feed (friends feed is scoped server-side).
                const taskItems =
                    feedMode === 'friends'
                        ? []
                        : await fetchStandaloneTasksAsFeedItems(postedTaskIds, existingIds);

                const merged = sortFeedByTimestampDesc([...mappedPosts, ...taskItems]);
                setFeed(merged);
                postsOffsetRef.current = rawPosts.length;
                setHasMorePosts(rawPosts.length === POSTS_PAGE_SIZE);
            } catch (error) {
                logger.error('useFeedData', 'Error loading feed', { error });
                setFeed([]);
                setHasMorePosts(false);
                setInitialError(
                    error instanceof Error ? error.message : 'Failed to load feed',
                );
            } finally {
                initialLoadCompleteRef.current = true;
                setLoading(false);
                setRefreshing(false);
            }
        },
        [feedMode, currentUser?.id],
    );

    const loadMore = useCallback(async () => {
        if (!initialLoadCompleteRef.current) {
            return;
        }
        if (refreshing || !hasMorePosts || loadMoreInFlightRef.current) {
            return;
        }

        const viewerId = feedMode === 'friends' ? currentUser?.id : undefined;
        const feedScope =
            feedMode === 'friends' && viewerId ? ('friends' as const) : undefined;
        loadMoreInFlightRef.current = true;
        setLoadingMore(true);
        setLoadMoreError(null);

        try {
            const offset = postsOffsetRef.current;
            logger.debug('useFeedData', 'Loading more posts', { offset, pageSize: POSTS_PAGE_SIZE });

            const postsResponse = await postsService.getPosts(
                POSTS_PAGE_SIZE,
                offset,
                viewerId,
                undefined,
                undefined,
                undefined,
                feedScope,
            );
            if (!postsResponse.success) {
                logger.warn('useFeedData', 'Load more posts request failed', {
                    offset,
                    error: postsResponse.error,
                });
                setLoadMoreError(
                    postsResponse.error || 'Failed to load more posts',
                );
                return;
            }

            const rawPosts = postsResponse.data || [];

            if (rawPosts.length === 0) {
                setHasMorePosts(false);
                return;
            }

            const mappedPosts = rawPosts.map(mapApiPostToFeedItem);

            setFeed((prev) => {
                const merged = appendUniqueFeedItems(prev, mappedPosts);
                return sortFeedByTimestampDesc(merged);
            });

            postsOffsetRef.current = offset + rawPosts.length;
            setHasMorePosts(feedHasLikelyMorePages(rawPosts.length, POSTS_PAGE_SIZE));
        } catch (error) {
            logger.error('useFeedData', 'Error loading more feed posts', { error });
            setLoadMoreError(
                error instanceof Error ? error.message : 'Failed to load more posts',
            );
        } finally {
            setLoadingMore(false);
            loadMoreInFlightRef.current = false;
        }
    }, [refreshing, hasMorePosts, feedMode, currentUser?.id]);

    useEffect(() => {
        loadInitialOrRefresh(false);
    }, [loadInitialOrRefresh]);

    const clearLoadMoreError = useCallback(() => setLoadMoreError(null), []);

    return {
        feed,
        loading,
        refreshing,
        loadingMore,
        hasMorePosts,
        initialError,
        loadMoreError,
        clearLoadMoreError,
        refresh: () => loadInitialOrRefresh(true),
        loadMore,
    };
};
