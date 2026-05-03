import type { FeedItem } from '../../types/feed';

const mockUpdateTask = jest.fn();
const mockUpdateRide = jest.fn();
const mockUpdateItem = jest.fn();
const mockUpdateDonation = jest.fn();

jest.mock('../apiService', () => ({
  apiService: {
    updateTask: (...args: unknown[]) => mockUpdateTask(...args),
    updateRide: (...args: unknown[]) => mockUpdateRide(...args),
    updateItem: (...args: unknown[]) => mockUpdateItem(...args),
    updateDonation: (...args: unknown[]) => mockUpdateDonation(...args),
  },
}));

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

describe('reopenFeedPost', () => {
  beforeEach(() => {
    jest.resetModules();
    mockUpdateTask.mockReset();
    mockUpdateRide.mockReset();
    mockUpdateItem.mockReset();
    mockUpdateDonation.mockReset();
  });

  it('reopens a closed task via updateTask(open)', async () => {
    mockUpdateTask.mockResolvedValue({ success: true });
    const { reopenFeedPost } = await import('../reopenFeedPost');
    const taskId = '11111111-1111-1111-1111-111111111111';
    const result = await reopenFeedPost(
      baseItem({
        subtype: 'task_assignment',
        taskId: taskId,
        taskData: { id: taskId, title: 'T', status: 'done' },
      }),
    );
    expect(result.success).toBe(true);
    expect(mockUpdateTask).toHaveBeenCalledWith(taskId, { status: 'open' });
    expect(mockUpdateRide).not.toHaveBeenCalled();
  });

  it('reopens ride via updateRide(active)', async () => {
    mockUpdateRide.mockResolvedValue({ success: true });
    const { reopenFeedPost } = await import('../reopenFeedPost');
    const rideId = '22222222-2222-2222-2222-222222222222';
    const result = await reopenFeedPost(
      baseItem({
        subtype: 'ride',
        rideId,
        status: 'completed',
      }),
    );
    expect(result.success).toBe(true);
    expect(mockUpdateRide).toHaveBeenCalledWith(rideId, { status: 'active' });
  });

  it('reopens item via updateItem(available)', async () => {
    mockUpdateItem.mockResolvedValue({ success: true });
    const { reopenFeedPost } = await import('../reopenFeedPost');
    const itemId = '33333333-3333-3333-3333-333333333333';
    const result = await reopenFeedPost(
      baseItem({
        subtype: 'item',
        itemId: itemId,
        status: 'delivered',
      }),
    );
    expect(result.success).toBe(true);
    expect(mockUpdateItem).toHaveBeenCalledWith(itemId, { status: 'available' });
  });

  it('reopens donation from synthetic id donation_<uuid> when itemId missing', async () => {
    mockUpdateDonation.mockResolvedValue({ success: true });
    const { reopenFeedPost } = await import('../reopenFeedPost');
    const donationId = '44444444-4444-4444-4444-444444444444';
    const result = await reopenFeedPost(
      baseItem({
        id: `donation_${donationId}`,
        subtype: 'donation',
        status: 'completed',
      }),
    );
    expect(result.success).toBe(true);
    expect(mockUpdateDonation).toHaveBeenCalledWith(donationId, { status: 'active' });
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });
});
