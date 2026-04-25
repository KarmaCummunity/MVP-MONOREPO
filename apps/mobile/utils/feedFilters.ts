// Purpose: Client-side filter/sort state and helpers for the home posts feed.
import type { FeedItem } from '../types/feed';

export type FeedSortMode = 'date' | 'engagement' | 'relevance';

export interface FeedFilterState {
  sortMode: FeedSortMode;
  /** Tasks, rides, and open items/donations that accept responses */
  onlyOpenPosts: boolean;
  /** Authors with verified email (from API when available) */
  verifiedAuthorsOnly: boolean;
  includeTasks: boolean;
  includeRides: boolean;
  includeItemsAndDonations: boolean;
}

export const DEFAULT_FEED_FILTER_STATE: FeedFilterState = {
  sortMode: 'date',
  onlyOpenPosts: false,
  verifiedAuthorsOnly: false,
  includeTasks: true,
  includeRides: true,
  includeItemsAndDonations: true,
};

function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60));
}

/** Mirrors feed-card rules for "open" vs closed content (tasks, rides, items, donations). */
export function isFeedItemOpen(item: FeedItem): boolean {
  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    const s = item.taskData?.status;
    if (!s) return true;
    return s === 'open' || s === 'in_progress';
  }

  if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    const rs = item.status;
    if (!rs) return true;
    return rs === 'active' || rs === 'full';
  }

  if (item.subtype === 'item' || item.price !== undefined || item.itemId || item.category) {
    const st = item.status;
    if (st && ['delivered', 'completed', 'expired', 'cancelled'].includes(st)) {
      return false;
    }
    return true;
  }

  if (item.subtype === 'donation') {
    const ds = item.status;
    if (!ds) return true;
    return ds === 'active';
  }

  return true;
}

function passesContentType(item: FeedItem, f: FeedFilterState): boolean {
  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    return f.includeTasks;
  }
  if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    return f.includeRides;
  }
  if (item.subtype === 'item' || item.subtype === 'donation') {
    return f.includeItemsAndDonations;
  }
  return true;
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
    f.includeItemsAndDonations !== DEFAULT_FEED_FILTER_STATE.includeItemsAndDonations
  );
}
