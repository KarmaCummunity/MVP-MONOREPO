// Extracted from ProfileScreen — Open tab.
import React, { useEffect } from 'react';
import { collectOpenTabFeed } from './openRouteLoadOpenContent';
import type { FeedItem } from '../../types/feed';
import { ProfilePostsWithGridShell } from './ProfilePostsWithGridShell';
import { useProfilePostsTabShell } from './useProfilePostsTabShell';

export const OpenRoute = ({
  userId,
  user,
  onHeightChange,
  onLoadedContentCount,
  reloadSignal,
  onReopenSuccess,
}: {
  userId?: string;
  user?: any;
  onHeightChange?: (height: number) => void;
  /** Fires after each load attempt with the number of items shown in this tab (0 on failure / empty). */
  onLoadedContentCount?: (count: number) => void;
  /** Increment to refetch tab content (e.g. after reopening a closed post). */
  reloadSignal?: number;
  /** Called after a successful reopen so the parent can bump `reloadSignal`. */
  onReopenSuccess?: () => void;
}) => {
  const {
    selectedUser,
    posts,
    setPosts,
    loading,
    setLoading,
    db,
    onCountRef,
    targetUserId,
    postIx,
  } = useProfilePostsTabShell(userId, onLoadedContentCount, onReopenSuccess);

  useEffect(() => {
    const loadOpenContent = async () => {
      if (!targetUserId) {
        setLoading(false);
        onCountRef.current?.(0);
        return;
      }

      let loadedCount = 0;
      try {
        setLoading(true);
        const allContent = await collectOpenTabFeed({
          targetUserId,
          viewerUserId: selectedUser?.id,
          user: user ?? null,
          db,
        });
        loadedCount = allContent.length;
        setPosts(allContent as FeedItem[]);
      } catch (error) {
        console.error('Error loading open content:', error);
        loadedCount = 0;
        setPosts([]);
      } finally {
        setLoading(false);
        onCountRef.current?.(loadedCount);
      }
    };

    void loadOpenContent();
  }, [targetUserId, user, selectedUser?.id, db, reloadSignal, setLoading, setPosts, onCountRef]);

  return (
    <ProfilePostsWithGridShell
      loading={loading}
      posts={posts}
      onHeightChange={onHeightChange}
      loadingLabel="טוען תוכן פתוח..."
      emptyIcon="folder-open-outline"
      emptyTitle="אין תוכן פתוח עדיין"
      emptySubtitle="התוכן הפתוח שלך יופיע כאן"
      postIx={postIx}
    />
  );
};
