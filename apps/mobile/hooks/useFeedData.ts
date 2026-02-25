import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { postsService } from '../src/services/posts.service';
import { apiService } from '../src/api/api.service';
import { logger } from '../utils/loggerService';
import { FeedItem, PostType } from '../types/feed';
import { useUser } from '../stores/userStore';

const NUM_ITEMS = 50; // Per page/batch

/** Minimal shape of a post from the API (posts service / backend) */
interface ApiPost {
  id: string;
  post_type?: string;
  title?: string;
  description?: string;
  images?: string[];
  author?: { id?: string; name?: string; avatar_url?: string };
  author_id?: string;
  likes?: string | number;
  comments?: string | number;
  is_liked?: boolean;
  created_at?: string;
  item_id?: string;
  ride_id?: string;
  task_id?: string;
  task?: { id: string; title: string; status: string };
  metadata?: string | Record<string, unknown>;
  item_data?: { id?: string; status?: string };
  ride_data?: {
    id?: string;
    departure_time?: string;
    from_location?: string | { name?: string; city?: string };
    to_location?: string | { name?: string; city?: string };
    available_seats?: number;
    price_per_seat?: number;
    status?: string;
  };
}

interface RideDataMap {
  from?: string;
  to?: string;
  seats?: number;
  price?: number;
  time?: string;
  date?: string;
  status?: string;
}

interface ApiTask {
  id: string;
  title: string;
  description?: string;
  status?: string;
  created_at?: string;
  created_by?: string;
  creator_details?: { id?: string; name?: string; avatar_url?: string };
}

export const useFeedData = (feedMode: 'friends' | 'discovery') => {
    const { t } = useTranslation('common');
    const { selectedUser: currentUser } = useUser();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Helper to map API post to FeedItem
    const mapPostToItem = (post: ApiPost): FeedItem => {
        // For ride posts, extract ride-specific data
        // Helper to format date/time safely
        let rideData: RideDataMap = {};
        const formatRideTime = (dateIso: string) => {
            if (!dateIso) return { time: '', date: '' };
            const dep = new Date(dateIso);
            if (isNaN(dep.getTime())) return { time: '', date: '' };

            const hours = dep.getHours().toString().padStart(2, '0');
            const minutes = dep.getMinutes().toString().padStart(2, '0');

            const day = dep.getDate().toString().padStart(2, '0');
            const month = (dep.getMonth() + 1).toString().padStart(2, '0');
            const year = dep.getFullYear();

            return {
                time: `${hours}:${minutes}`,
                date: `${day}.${month}.${year}`
            };
        };

        // 1. Try ride_data from DB Join
        if (post.ride_data) {
            const rd = post.ride_data;
            const { time, date } = formatRideTime(rd.departure_time ?? '');

            rideData = {
                from: typeof rd.from_location === 'string' ? rd.from_location : (rd.from_location?.name || rd.from_location?.city || ''),
                to: typeof rd.to_location === 'string' ? rd.to_location : (rd.to_location?.name || rd.to_location?.city || ''),
                seats: rd.available_seats || 0,
                price: rd.price_per_seat || 0,
                time,
                date,
                status: rd.status // Add status for ride
            };
        }
        // 2. Fallback to metadata
        else if ((post.post_type === 'ride' || post.post_type === 'ride_offered') && post.metadata) {
            const meta = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;
            const r = meta.ride || meta;

            // Check departure_time (schema) or time/date (legacy/manual)
            let timeStr = r.time || '';
            let dateStr = r.date || '';

            if (r.departure_time) {
                const formatted = formatRideTime(r.departure_time);
                if (formatted.time) timeStr = formatted.time;
                if (formatted.date) dateStr = formatted.date;
            }

            rideData = {
                from: typeof r.from_location === 'string' ? r.from_location : (r.from_location?.name || r.from_location?.city || r.from || ''),
                to: typeof r.to_location === 'string' ? r.to_location : (r.to_location?.name || r.to_location?.city || r.to || ''),
                seats: r.available_seats || r.seats || 0,
                price: r.price_per_seat || r.price || 0,
                time: timeStr,
                date: dateStr
            };
        }

        // Ensure user is always defined
        const author = post.author || {};
        const userId = author.id || post.author_id || 'unknown';
        const userName = author.name || 'common.unknownUser';
        const userAvatar = author.avatar_url || undefined;

        // Get status from item_data or ride_data or default
        let itemStatus: string | undefined;
        if (post.item_data) {
            itemStatus = post.item_data.status;
        } else if (post.ride_data) {
            itemStatus = post.ride_data.status;
        }

        // Parse metadata to get item_id if needed
        let metadataItemId: string | undefined;
        try {
            if (post.metadata) {
                const metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) as Record<string, unknown> : post.metadata;
                metadataItemId = metadata?.item_id as string | undefined;
            }
        } catch (_e) {
            // Ignore parse errors
        }

        // For items: ALWAYS prefer item_data.id (from JOIN with items table) - this is the most reliable source
        // Then try metadata.item_id, then item_id column (if not timestamp)
        // This is a workaround for cases where item_id column was stored incorrectly as timestamp
        let finalItemId: string | undefined;
        if (post.item_data?.id) {
            // item_data.id comes from JOIN with items table - this is the most reliable
            finalItemId = post.item_data.id;
        } else if (metadataItemId && !/^\d{10,13}$/.test(metadataItemId)) {
            // metadata.item_id is valid (not timestamp) - this is stored when post is created
            finalItemId = metadataItemId;
        } else if (post.item_id && !/^\d{10,13}$/.test(post.item_id)) {
            // item_id column is valid (not timestamp)
            finalItemId = post.item_id;
        } else {
            // If all else fails and we have a timestamp, we can't use it
            // But we'll log it for debugging
            finalItemId = undefined;
        }

        // Debug log for item/donation posts to help diagnose issues
        if ((post.post_type === 'item' || post.post_type === 'donation')) {
            if (!finalItemId || /^\d{10,13}$/.test(finalItemId || '')) {
                logger.warn('useFeedData', 'Invalid item ID for post', {
                    postId: post.id,
                    postType: post.post_type,
                    finalItemId,
                    item_id_column: post.item_id,
                    item_data_id: post.item_data?.id,
                    metadata_item_id: metadataItemId,
                    hasItemData: !!post.item_data
                });
            }
        }

        const postType: PostType = (post.post_type === 'reel' || post.post_type === 'task_post' ? post.post_type : 'post');
        return {
            id: post.id,
            type: postType,
            subtype: post.post_type, // e.g. 'task_assignment', 'ride'
            title: post.title || 'post.noTitle', // Use key or default in UI
            description: post.description || '',
            thumbnail: post.images && post.images.length > 0 ? post.images[0] : null,
            user: {
                id: userId,
                name: userName,
                avatar: userAvatar,
            },
            likes: parseInt(String(post.likes ?? '0'), 10),
            comments: parseInt(String(post.comments ?? '0'), 10),
            isLiked: post.is_liked || false,
            timestamp: (post.created_at && !isNaN(new Date(post.created_at).getTime()))
                ? new Date(post.created_at).toISOString()
                : new Date().toISOString(),
            taskData: post.task ? {
                id: post.task.id,
                title: post.task.title,
                status: post.task.status
            } : undefined,
            // Add status for items and donations
            status: itemStatus,
            // Add IDs for updating posts
            itemId: finalItemId,
            rideId: post.ride_id || post.ride_data?.id,
            taskId: post.task_id || post.task?.id,
            // Add ride-specific fields if this is a ride post
            ...rideData
        };
    };

    const loadFeed = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            logger.debug('useFeedData', 'Loading feed', { feedMode, userId: currentUser?.id });

            // 1. Fetch Posts from Backend
            const postsResponse = await postsService.getPosts(NUM_ITEMS, 0, feedMode === 'friends' ? currentUser?.id : undefined);
            const rawPosts: ApiPost[] = postsResponse.success && Array.isArray(postsResponse.data) ? (postsResponse.data as ApiPost[]) : [];
            const mappedPosts = rawPosts.map(mapPostToItem);

            const allContent: FeedItem[] = [...mappedPosts];
            const existingIds = new Set(allContent.map(item => item.id));

            // Track IDs of tasks that already have a post to avoid duplicates
            const postedTaskIds = new Set(
                rawPosts
                    .filter((p) => p.task_id || p.task?.id)
                    .map((p) => p.task_id || p.task?.id)
            );

            // Note: Rides are now included in posts with post_type='ride', so no need to fetch separately
            // Note: Items are now included in posts with post_type='item' or 'donation', so no need to fetch separately
            // When an item is created, a post is automatically created for it in the backend

            // 4. Fetch Tasks (Match ProfileScreen logic - independent tasks)
            try {
                const [openTasksRes, progressTasksRes] = await Promise.all([
                    apiService.getTasks({ status: 'open', limit: 20 }),
                    apiService.getTasks({ status: 'in_progress', limit: 20 })
                ]);

                const rawTasks: ApiTask[] = [
                    ...(openTasksRes.success && Array.isArray(openTasksRes.data) ? (openTasksRes.data as ApiTask[]) : []),
                    ...(progressTasksRes.success && Array.isArray(progressTasksRes.data) ? (progressTasksRes.data as ApiTask[]) : [])
                ];

                // Map tasks to FeedItems
                rawTasks.forEach((task) => {
                    // Check if this task is already in a post
                    if (postedTaskIds.has(task.id)) {
                        return;
                    }

                    // Use actual task ID (UUID) without prefix
                    if (!existingIds.has(task.id)) {
                        const creator = task.creator_details || {};

                        const taskItem: FeedItem = {
                            id: task.id, // Use actual task ID
                            type: 'post', // Show as post
                            subtype: 'task_assignment',
                            title: t('feed.taskCreated', { title: task.title }),
                            description: task.description || '',
                            thumbnail: null,
                            user: {
                                id: creator.id || task.created_by || 'unknown',
                                name: creator.name || 'Unknown User',
                                avatar: creator.avatar_url || undefined
                            },
                            likes: 0,
                            comments: 0,
                            isLiked: false,
                            timestamp: task.created_at || new Date().toISOString(),
                            taskData: {
                                id: task.id,
                                title: task.title,
                                status: task.status ?? ''
                            }
                        };
                        allContent.push(taskItem);
                        existingIds.add(task.id);
                    }
                });
            } catch (e) {
                logger.warn('useFeedData', 'Failed to load tasks', { error: e });
            }

            // Sort by timestamp
            allContent.sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });

            setFeed(allContent);

        } catch (error) {
            logger.error('useFeedData', 'Error loading feed', { error });
            // Don't clear feed on error, maybe show toast
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [feedMode, currentUser?.id, t]);

    useEffect(() => {
        loadFeed();
    }, [loadFeed]);

    return {
        feed,
        loading,
        refreshing,
        refresh: () => loadFeed(true),
        loadMore: () => { } // Implement pagination later
    };
};
