import React, { useState, useRef } from 'react';
import { useUser } from '../../stores/userStore';
import type { FeedItem } from '../../types/feed';
import { useProfileTabPostInteractions } from './useProfileTabPostInteractions';

export type ProfilePostsTabShell = {
  selectedUser: ReturnType<typeof useUser>['selectedUser'];
  posts: FeedItem[];
  setPosts: React.Dispatch<React.SetStateAction<FeedItem[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy DB handle from databaseService
  db: any;
  onCountRef: React.MutableRefObject<((count: number) => void) | undefined>;
  targetUserId: string | undefined;
  postIx: ReturnType<typeof useProfileTabPostInteractions>;
};

/**
 * Shared state, DB handle, count ref, and post-menu wiring for profile Open/Closed tabs (Sonar dedupe).
 */
export function useProfilePostsTabShell(
  userId: string | undefined,
  onLoadedContentCount: ((count: number) => void) | undefined,
  onReopenSuccess: (() => void) | undefined,
): ProfilePostsTabShell {
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = require('../../utils/databaseService');
  const onCountRef = useRef(onLoadedContentCount);
  onCountRef.current = onLoadedContentCount;

  const postIx = useProfileTabPostInteractions(onReopenSuccess);
  const targetUserId = userId || selectedUser?.id;

  return {
    selectedUser,
    posts,
    setPosts,
    loading,
    setLoading,
    db,
    onCountRef,
    targetUserId,
    postIx,
  };
}
