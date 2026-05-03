import type { FeedItem } from '../../types/feed';
import {
  canOwnerClosePostFromDetail,
  getQuickMessageModalPostType,
  isQuickMessageAvailableToViewer,
} from '../feedPostQuickMessageEligibility';

function baseItem(over: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'post-1',
    type: 'post',
    title: 't',
    description: '',
    thumbnail: null,
    timestamp: new Date().toISOString(),
    user: { id: 'u-owner', name: 'Owner' },
    likes: 0,
    comments: 0,
    isLiked: false,
    ...over,
  } as FeedItem;
}

describe('isQuickMessageAvailableToViewer', () => {
  it('returns false for same user or missing viewer', () => {
    const item = baseItem({ user: { id: 'a' }, subtype: 'donation', status: 'active' });
    expect(isQuickMessageAvailableToViewer(item, undefined)).toBe(false);
    expect(isQuickMessageAvailableToViewer(item, 'a')).toBe(false);
  });

  it('returns true for active donation viewed by other user', () => {
    const item = baseItem({ user: { id: 'owner' }, subtype: 'donation', status: 'active' });
    expect(isQuickMessageAvailableToViewer(item, 'other')).toBe(true);
  });

  it('returns false for delivered donation', () => {
    const item = baseItem({ user: { id: 'owner' }, subtype: 'donation', status: 'delivered' });
    expect(isQuickMessageAvailableToViewer(item, 'other')).toBe(false);
  });

  it('returns false for community_challenge', () => {
    const item = baseItem({ user: { id: 'owner' }, subtype: 'community_challenge' });
    expect(isQuickMessageAvailableToViewer(item, 'other')).toBe(false);
  });

  it('treats ride_offered like ride for open status', () => {
    const item = baseItem({ user: { id: 'owner' }, subtype: 'ride_offered', status: 'active' });
    expect(isQuickMessageAvailableToViewer(item, 'other')).toBe(true);
  });
});

describe('getQuickMessageModalPostType', () => {
  it('maps ride_offered to ride', () => {
    expect(getQuickMessageModalPostType(baseItem({ subtype: 'ride_offered' }))).toBe('ride');
  });
});

describe('canOwnerClosePostFromDetail', () => {
  it('returns false for non-owner', () => {
    const item = baseItem({
      user: { id: 'owner' },
      subtype: 'item',
      itemId: 'item-uuid',
      status: 'active',
    });
    expect(canOwnerClosePostFromDetail(item, 'other')).toBe(false);
  });

  it('returns true for owner item with itemId and open-ish status', () => {
    const item = baseItem({
      user: { id: 'owner' },
      subtype: 'item',
      itemId: 'item-uuid',
    });
    expect(canOwnerClosePostFromDetail(item, 'owner')).toBe(true);
  });

  it('returns false when item already delivered', () => {
    const item = baseItem({
      user: { id: 'owner' },
      subtype: 'item',
      itemId: 'item-uuid',
      status: 'delivered',
    });
    expect(canOwnerClosePostFromDetail(item, 'owner')).toBe(false);
  });
});
