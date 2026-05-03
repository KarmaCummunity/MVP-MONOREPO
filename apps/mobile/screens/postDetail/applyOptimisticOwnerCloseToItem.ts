import type { FeedItem } from '../../types/feed';

/** Local feed snapshot after a successful owner close (matches API outcome). */
export function applyOptimisticOwnerCloseToItem(item: FeedItem): FeedItem {
  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    return item.taskData
      ? { ...item, taskData: { ...item.taskData, status: 'done' } }
      : { ...item, status: 'done' };
  }
  if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    return { ...item, status: 'completed' };
  }
  if (item.subtype === 'item' || item.subtype === 'donation') {
    return { ...item, status: 'delivered' };
  }
  return { ...item };
}
