import type { TFunction } from 'i18next';

import type { FeedItem } from '../../types/feed';
import {
  getFilteredPostsForTrumpMode,
  TRUMP_INCLUDE_REQUESTS_FILTER_KEY,
} from '../trump/getFilteredRidesForTrumpScreen';
import {
  buildItemsSortLabels,
  getFilteredItemsForItemsScreen,
} from '../items/itemsScreenFiltering';

function baseFeed(overrides: Partial<FeedItem>): FeedItem {
  return {
    id: '1',
    type: 'post',
    title: 'T',
    description: '',
    thumbnail: null,
    timestamp: new Date().toISOString(),
    user: { id: 'u1', name: 'User' },
    likes: 0,
    comments: 0,
    isLiked: false,
    ...overrides,
  };
}

const noopT = ((key: string) => key) as TFunction;

describe('Trump search mode: default offers only, includeRequests shows requests', () => {
  const posts: FeedItem[] = [
    baseFeed({ id: 'offer', intent: 'give' }),
    baseFeed({ id: 'req', intent: 'request' }),
  ];

  it('hides request posts unless includeRequests is selected', () => {
    const without = getFilteredPostsForTrumpMode(posts, '', [], [], noopT);
    expect(without.map((p) => p.id)).toEqual(['offer']);

    const withReq = getFilteredPostsForTrumpMode(posts, '', [TRUMP_INCLUDE_REQUESTS_FILTER_KEY], [], noopT);
    expect(withReq.map((p) => p.id).sort()).toEqual(['offer', 'req'].sort());
  });
});

describe('Items search mode: default offers only, includeRequests shows requests', () => {
  const posts: FeedItem[] = [
    baseFeed({ id: 'g', intent: 'give', category: 'general' }),
    baseFeed({ id: 'r', intent: 'request', category: 'general' }),
  ];

  const t = ((key: string, opts?: { ns?: string }) => {
    if (key === 'donationScreen.filters.includeRequests' && opts?.ns === 'items') {
      return 'SHOW_REQUESTS_LABEL';
    }
    const map: Record<string, string> = {
      'donationScreen.sorts.alphabetical': 'alphabetical',
      'donationScreen.sorts.byLocation': 'byLocation',
      'donationScreen.sorts.byDate': 'byDate',
      'donationScreen.sorts.byRating': 'byRating',
      'donationScreen.sorts.byRelevance': 'byRelevance',
      'donationScreen.filters.free': 'free',
      'donationScreen.filters.likeNew': 'likeNew',
      'donationScreen.filters.used': 'used',
      'donationScreen.filters.forParts': 'forParts',
    };
    return map[key] ?? key;
  }) as (key: string, options?: Record<string, unknown>) => string;

  const sortLabels = buildItemsSortLabels(t);
  const conditionLabels = {
    free: 'free',
    likeNew: 'likeNew',
    used: 'used',
    forParts: 'forParts',
  };

  it('hides request posts unless includeRequests label is selected', () => {
    const without = getFilteredItemsForItemsScreen({
      mode: true,
      allPosts: posts,
      allItems: [],
      searchQuery: '',
      selectedFilters: [],
      selectedSorts: [],
      sortLabels,
      conditionLabels,
      t,
    }) as FeedItem[];
    expect(without.map((p) => p.id)).toEqual(['g']);

    const withReq = getFilteredItemsForItemsScreen({
      mode: true,
      allPosts: posts,
      allItems: [],
      searchQuery: '',
      selectedFilters: ['SHOW_REQUESTS_LABEL'],
      selectedSorts: [],
      sortLabels,
      conditionLabels,
      t,
    }) as FeedItem[];
    expect(withReq.map((p) => p.id).sort()).toEqual(['g', 'r'].sort());
  });
});
