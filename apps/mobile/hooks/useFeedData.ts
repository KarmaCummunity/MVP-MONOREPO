import { useState, useCallback, useEffect } from 'react';
import { postsService } from '../utils/postsService';
import { logger } from '../utils/loggerService';
import { FeedItem } from '../types/feed';
import { mapApiPostToFeedItem } from '../utils/mapApiPostToFeedItem';
import { useUser } from '../stores/userStore';

const NUM_ITEMS = 50; // Per page/batch

export const useFeedData = (feedMode: 'friends' | 'discovery') => {
    const { selectedUser: currentUser } = useUser();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
            const rawPosts = postsResponse.success ? (postsResponse.data || []) : [];
            const mappedPosts = rawPosts.map(mapApiPostToFeedItem);

            const allContent: FeedItem[] = [...mappedPosts];
            const existingIds = new Set(allContent.map(item => item.id));

            // Track IDs of tasks that already have a post to avoid duplicates
            const postedTaskIds = new Set(
                rawPosts
                    .filter((p: any) => p.task_id || p.task?.id)
                    .map((p: any) => p.task_id || p.task?.id)
            );

            // Note: Rides are now included in posts with post_type='ride', so no need to fetch separately
            // Note: Items are now included in posts with post_type='item' or 'donation', so no need to fetch separately
            // When an item is created, a post is automatically created for it in the backend

            // 4. Fetch Tasks (Match ProfileScreen logic - independent tasks)
            try {
                const { apiService } = require('../utils/apiService');
                const [openTasksRes, progressTasksRes] = await Promise.all([
                    apiService.getTasks({ status: 'open', limit: 20 }),
                    apiService.getTasks({ status: 'in_progress', limit: 20 })
                ]);

                const rawTasks = [
                    ...(openTasksRes.success ? (openTasksRes.data || []) : []),
                    ...(progressTasksRes.success ? (progressTasksRes.data || []) : [])
                ];

                // Map tasks to FeedItems
                rawTasks.forEach((task: any) => {
                    // Check if this task is already in a post
                    if (postedTaskIds.has(task.id)) {
                        return;
                    }

                    // Use actual task ID (UUID) without prefix
                    if (!existingIds.has(task.id)) {
                        const creator = task.creator_details || {};

                        const creatorVerified =
                            creator.email_verified === true ||
                            creator.emailVerified === true;

                        const taskItem: FeedItem = {
                            id: task.id, // Use actual task ID
                            type: 'post', // Show as post
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
                                status: task.status
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
    }, [feedMode, currentUser?.id]);

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
