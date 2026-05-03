import { mapPostToFeedItemForItemsScreen } from '../mapPostToFeedItemForItemsScreen';

describe('mapPostToFeedItemForItemsScreen', () => {
  it('returns null when id is missing', () => {
    expect(mapPostToFeedItemForItemsScreen(null)).toBeNull();
    expect(mapPostToFeedItemForItemsScreen({})).toBeNull();
  });

  it('maps a minimal post with defaults', () => {
    const item = mapPostToFeedItemForItemsScreen({
      id: 'p1',
      title: 'T',
      author: { id: 'u1', name: 'Alice' },
      created_at: '2026-01-01T10:00:00.000Z',
    });
    expect(item).not.toBeNull();
    if (item === null) {
      throw new Error('expected item');
    }
    expect(item.id).toBe('p1');
    expect(item.type).toBe('post');
    expect(item.user.id).toBe('u1');
    expect(item.intent).toBe('give');
    expect(item.thumbnail).toBeNull();
  });

  it('narrows FeedItem type for reel / task_post', () => {
    const reel = mapPostToFeedItemForItemsScreen({
      id: 'r1',
      post_type: 'reel',
      author: { id: 'u1', name: 'A' },
      created_at: '2026-01-01T10:00:00.000Z',
    });
    if (reel === null) {
      throw new Error('expected reel');
    }
    expect(reel.type).toBe('reel');

    const taskPost = mapPostToFeedItemForItemsScreen({
      id: 't1',
      post_type: 'task_post',
      author: { id: 'u1', name: 'A' },
      created_at: '2026-01-01T10:00:00.000Z',
    });
    if (taskPost === null) {
      throw new Error('expected taskPost');
    }
    expect(taskPost.type).toBe('task_post');
  });

  it('parses string metadata and reads intent', () => {
    const item = mapPostToFeedItemForItemsScreen({
      id: 'p2',
      author: { id: 'u1', name: 'A' },
      created_at: '2026-01-01T10:00:00.000Z',
      metadata: JSON.stringify({ intent: 'request', category: 'furniture' }),
      item_data: { category: 'books' },
    });
    if (item === null) {
      throw new Error('expected item');
    }
    expect(item.intent).toBe('request');
    expect(item.category).toBe('books');
  });
});
