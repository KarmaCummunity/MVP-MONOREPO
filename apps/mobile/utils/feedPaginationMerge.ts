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
