// Purpose: Pure helpers for appending paginated feed rows without duplicate ids.
import type { FeedItem } from '../types/feed';

export function appendUniqueFeedItems(existing: FeedItem[], incoming: FeedItem[]): FeedItem[] {
  const seen = new Set(existing.map((i) => i.id));
  const out = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export function sortFeedByTimestampDesc(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/**
 * After a paginated fetch, whether the client should assume another page may exist.
 * A short page means end of list. A full page means keep paginating even if every row
 * was a duplicate client-side (offset must still advance).
 */
export function feedHasLikelyMorePages(rawPageLength: number, pageSize: number): boolean {
  return rawPageLength >= pageSize;
}
