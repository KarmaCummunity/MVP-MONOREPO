// Purpose: Client-side filter/sort state and helpers for the home posts feed.
import type { FeedItem } from '../types/feed';

export type FeedSortMode = 'date' | 'engagement' | 'relevance';

/** High-level bucket for content-type toggles (matches ProfileScreen-style grouping). */
export type FeedContentBucket =
  | 'task'
  | 'ride'
  | 'item_or_donation'
  | 'challenge'
  | 'general_post';

function isChallengeFeedPost(item: FeedItem): boolean {
  return (
    item.subtype === 'community_challenge' ||
    item.subtype === 'personal_challenge' ||
    !!item.challengeId
  );
}

export function getFeedContentBucket(item: FeedItem): FeedContentBucket {
  const st = item.subtype;
  const ty = item.type;

  if (
    st === 'task_assignment' ||
    st === 'task_completion' ||
    ty === 'task_post'
  ) {
    return 'task';
  }

  if (st === 'ride' || st === 'ride_offered' || !!item.rideId) {
    return 'ride';
  }

  if (isChallengeFeedPost(item)) {
    return 'challenge';
  }

  if (
    st === 'item' ||
    st === 'donation' ||
    !!item.itemId ||
    item.price !== undefined ||
    !!item.category
  ) {
    return 'item_or_donation';
  }

  return 'general_post';
}

export interface FeedFilterState {
  sortMode: FeedSortMode;
  /** Tasks, rides, and open items/donations that accept responses */
  onlyOpenPosts: boolean;
  /** Authors with verified email (from API when available) */
  verifiedAuthorsOnly: boolean;
  includeTasks: boolean;
  includeRides: boolean;
  includeItemsAndDonations: boolean;
  includeChallenges: boolean;
}

export const DEFAULT_FEED_FILTER_STATE: FeedFilterState = {
  sortMode: 'date',
  onlyOpenPosts: false,
  verifiedAuthorsOnly: false,
  includeTasks: true,
  includeRides: true,
  includeItemsAndDonations: true,
  includeChallenges: true,
};

function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60));
}

function isTaskFeedItemOpen(item: FeedItem): boolean {
  const s = item.taskData?.status;
  if (!s) return true;
  return s === 'open' || s === 'in_progress';
}

function isRideFeedItemOpen(item: FeedItem): boolean {
  const rs = item.status;
  if (!rs) return true;
  return rs === 'active' || rs === 'full';
}

function isItemOrDonationFeedItemOpen(item: FeedItem): boolean {
  if (item.subtype === 'donation') {
    const ds = item.status;
    if (!ds) return true;
    return ds === 'active';
  }
  const st = item.status;
  if (st && ['delivered', 'completed', 'expired', 'cancelled'].includes(st)) {
    return false;
  }
  return true;
}

const bucketOpenHandlers: Record<
  FeedContentBucket,
  (item: FeedItem) => boolean
> = {
  task: isTaskFeedItemOpen,
  ride: isRideFeedItemOpen,
  item_or_donation: isItemOrDonationFeedItemOpen,
  challenge: () => true,
  general_post: () => true,
};

/** Mirrors feed-card rules for "open" vs closed content (tasks, rides, items, donations). */
export function isFeedItemOpen(item: FeedItem): boolean {
  const bucket = getFeedContentBucket(item);
  return bucketOpenHandlers[bucket](item);
}

function passesContentType(item: FeedItem, f: FeedFilterState): boolean {
  const bucket = getFeedContentBucket(item);

  if (bucket === 'task') {
    return f.includeTasks;
  }
  if (bucket === 'ride') {
    return f.includeRides;
  }
  if (bucket === 'item_or_donation') {
    return f.includeItemsAndDonations;
  }

  if (bucket === 'challenge') {
    return f.includeChallenges;
  }

  // General posts: show only when every structured category is enabled (narrowing rides/tasks/items hides "plain" posts too).
  return (
    f.includeTasks &&
    f.includeRides &&
    f.includeItemsAndDonations &&
    f.includeChallenges
  );
}

function passesVerified(item: FeedItem, f: FeedFilterState): boolean {
  if (!f.verifiedAuthorsOnly) return true;
  return item.user?.emailVerified === true;
}

export function applyFeedFilters(items: FeedItem[], f: FeedFilterState): FeedItem[] {
  let list = items.filter((item) => passesContentType(item, f));
  list = list.filter((item) => passesVerified(item, f));
  if (f.onlyOpenPosts) {
    list = list.filter((item) => isFeedItemOpen(item));
  }

  const out = [...list];
  if (f.sortMode === 'date') {
    out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } else if (f.sortMode === 'engagement') {
    out.sort((a, b) => {
      const sa = a.likes + a.comments;
      const sb = b.likes + b.comments;
      if (sb !== sa) return sb - sa;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  } else {
    out.sort((a, b) => {
      const engA = a.likes + a.comments;
      const engB = b.likes + b.comments;
      const hA = hoursSince(a.timestamp);
      const hB = hoursSince(b.timestamp);
      const scoreA = (engA + 1) / Math.sqrt(hA + 1);
      const scoreB = (engB + 1) / Math.sqrt(hB + 1);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  return out;
}

export function feedFiltersActive(f: FeedFilterState): boolean {
  return (
    f.sortMode !== DEFAULT_FEED_FILTER_STATE.sortMode ||
    f.onlyOpenPosts !== DEFAULT_FEED_FILTER_STATE.onlyOpenPosts ||
    f.verifiedAuthorsOnly !== DEFAULT_FEED_FILTER_STATE.verifiedAuthorsOnly ||
    f.includeTasks !== DEFAULT_FEED_FILTER_STATE.includeTasks ||
    f.includeRides !== DEFAULT_FEED_FILTER_STATE.includeRides ||
    f.includeItemsAndDonations !== DEFAULT_FEED_FILTER_STATE.includeItemsAndDonations ||
    f.includeChallenges !== DEFAULT_FEED_FILTER_STATE.includeChallenges
  );
}
