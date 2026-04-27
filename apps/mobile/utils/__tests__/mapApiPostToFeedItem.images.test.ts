import { mapApiPostToFeedItem } from '../mapApiPostToFeedItem';

describe('mapApiPostToFeedItem images', () => {
  it('maps images array and uses first for thumbnail when no challenge', () => {
    const row = {
      id: 'p1',
      post_type: 'item',
      title: 'T',
      description: 'D',
      item_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      images: ['https://a.example/a.jpg', 'https://a.example/b.jpg'],
      likes: '0',
      comments: '0',
      is_liked: false,
      created_at: '2026-01-01T12:00:00.000Z',
      author: { id: 'u1', name: 'U', avatar_url: '', email_verified: true },
    };
    const item = mapApiPostToFeedItem(row);
    expect(item.images).toEqual(['https://a.example/a.jpg', 'https://a.example/b.jpg']);
    expect(item.thumbnail).toBe('https://a.example/a.jpg');
  });

  it('leaves images null when absent', () => {
    const row = {
      id: 'p2',
      post_type: 'post',
      title: 'T',
      description: '',
      likes: '0',
      comments: '0',
      is_liked: false,
      created_at: '2026-01-01T12:00:00.000Z',
      author: { id: 'u1', name: 'U', avatar_url: '', email_verified: false },
    };
    const item = mapApiPostToFeedItem(row);
    expect(item.images).toBeNull();
    expect(item.thumbnail).toBeNull();
  });
});
