import type { FeedItem } from '../../types/feed';
import { appendUniqueFeedItems, sortFeedByTimestampDesc } from '../feedPaginationMerge';

function item(id: string, ts: string): FeedItem {
  return {
    id,
    type: 'post',
    subtype: 'general',
    title: id,
    description: '',
    thumbnail: null,
    user: { id: 'u1', name: 'U' },
    likes: 0,
    comments: 0,
    isLiked: false,
    timestamp: ts,
  };
}

describe('feedPaginationMerge', () => {
  it('appendUniqueFeedItems skips duplicate ids', () => {
    const a = item('1', '2026-01-02T00:00:00Z');
    const b = item('2', '2026-01-01T00:00:00Z');
    const dup = item('1', '2026-01-03T00:00:00Z');
    const merged = appendUniqueFeedItems([a], [b, dup]);
    expect(merged.map((x) => x.id)).toEqual(['1', '2']);
  });

  it('sortFeedByTimestampDesc orders newest first', () => {
    const old = item('a', '2026-01-01T00:00:00Z');
    const mid = item('b', '2026-01-02T00:00:00Z');
    const neu = item('c', '2026-01-03T00:00:00Z');
    const sorted = sortFeedByTimestampDesc([old, neu, mid]);
    expect(sorted.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
});
