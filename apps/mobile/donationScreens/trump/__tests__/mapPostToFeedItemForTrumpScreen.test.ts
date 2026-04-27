import { mapPostToFeedItemForTrumpScreen } from '../mapPostToFeedItemForTrumpScreen';

describe('mapPostToFeedItemForTrumpScreen', () => {
  const basePost = {
    id: 'p1',
    title: 'Test',
    description: '',
    post_type: 'ride',
    author: { id: 'u1', name: 'User' },
    likes: 0,
    comments: 0,
    created_at: '2026-01-01T10:00:00.000Z',
    ride_data: {
      from_location: 'A',
      to_location: 'B',
      available_seats: 2,
      price_per_seat: 0,
      departure_time: '2026-01-01T12:00:00.000Z',
    },
  };

  it('defaults intent to give when metadata absent', () => {
    const item = mapPostToFeedItemForTrumpScreen(basePost as Record<string, unknown>);
    expect(item.intent).toBe('give');
  });

  it('reads intent request from string metadata', () => {
    const item = mapPostToFeedItemForTrumpScreen({
      ...basePost,
      metadata: JSON.stringify({ intent: 'request' }),
    } as Record<string, unknown>);
    expect(item.intent).toBe('request');
  });

  it('reads intent request from object metadata', () => {
    const item = mapPostToFeedItemForTrumpScreen({
      ...basePost,
      metadata: { intent: 'request', category: 'trump' },
    } as Record<string, unknown>);
    expect(item.intent).toBe('request');
    expect(item.category).toBe('trump');
  });

  it('maps dedicated ride request (donation post) from metadata.ride', () => {
    const item = mapPostToFeedItemForTrumpScreen({
      id: 'p2',
      title: 'בקשת טרמפ',
      description: 'פרטים',
      post_type: 'donation',
      author: { id: 'u1', name: 'User' },
      likes: 0,
      comments: 0,
      created_at: '2026-01-15T08:00:00.000Z',
      metadata: {
        intent: 'request',
        category: 'trump',
        ride: {
          from_location: 'תל אביב',
          to_location: 'ירושלים',
          departure_time: '2026-01-15T14:30:00.000Z',
          category: 'trump',
        },
      },
    } as Record<string, unknown>);
    expect(item.intent).toBe('request');
    expect(item.category).toBe('trump');
    expect(item.from).toBe('תל אביב');
    expect(item.to).toBe('ירושלים');
    expect(item.time).toMatch(/^\d{2}:\d{2}$/);
  });
});
