import type { FeedItem } from '../../../types/feed';
import { applyOptimisticOwnerCloseToItem } from '../applyOptimisticOwnerCloseToItem';

function base(over: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'p1',
    type: 'post',
    title: 't',
    description: '',
    thumbnail: null,
    timestamp: new Date().toISOString(),
    user: { id: 'u1' },
    likes: 0,
    comments: 0,
    isLiked: false,
    ...over,
  } as FeedItem;
}

describe('applyOptimisticOwnerCloseToItem', () => {
  it('marks task assignment as done on taskData', () => {
    const item = base({
      subtype: 'task_assignment',
      taskData: { id: 'tid', title: 'T', status: 'open' },
    });
    const next = applyOptimisticOwnerCloseToItem(item);
    expect(next.taskData?.status).toBe('done');
  });

  it('sets ride to completed', () => {
    const item = base({ subtype: 'ride', status: 'active' });
    expect(applyOptimisticOwnerCloseToItem(item).status).toBe('completed');
  });

  it('sets item to delivered', () => {
    const item = base({ subtype: 'item', status: 'active' });
    expect(applyOptimisticOwnerCloseToItem(item).status).toBe('delivered');
  });
});
