import type { FeedItem } from '../types/feed';

/** Same rules as feed `PostReelItem` quick-message affordance (plus ride_offered as ride). */
export function isQuickMessageAvailableToViewer(item: FeedItem, viewerUserId: string | undefined): boolean {
  if (!viewerUserId || !item.user?.id || item.user.id === viewerUserId) {
    return false;
  }

  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    const taskStatus = item.taskData?.status;
    if (!taskStatus) return true;
    return taskStatus === 'open' || taskStatus === 'in_progress';
  }

  if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    const rideStatus = item.status;
    if (!rideStatus) return true;
    return rideStatus === 'active' || rideStatus === 'full';
  }

  if (item.subtype === 'community_challenge') {
    return false;
  }

  if (item.subtype === 'item' || item.price !== undefined || item.itemId || item.category) {
    const itemStatus = item.status;
    if (itemStatus && ['delivered', 'completed', 'expired', 'cancelled'].includes(itemStatus)) {
      return false;
    }
    return true;
  }

  if (item.subtype === 'donation') {
    const donationStatus = item.status;
    if (!donationStatus) return true;
    return donationStatus === 'active';
  }

  return false;
}

export function getQuickMessageModalPostType(item: FeedItem): 'item' | 'ride' | 'task' | 'donation' {
  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    return 'task';
  }
  if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    return 'ride';
  }
  if (item.subtype === 'donation') {
    return 'donation';
  }
  return 'item';
}

export function isPostOwner(item: FeedItem, viewerUserId: string | undefined): boolean {
  return !!(viewerUserId && item.user?.id && viewerUserId === item.user.id);
}

/** True when the owner can still close (mark done/delivered/completed) from the feed/detail pattern. */
export function canOwnerClosePostFromDetail(item: FeedItem, viewerUserId: string | undefined): boolean {
  if (!isPostOwner(item, viewerUserId)) return false;
  if (item.subtype === 'community_challenge') return false;
  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    const taskStatus = item.taskData?.status;
    if (!taskStatus) return true;
    return taskStatus === 'open' || taskStatus === 'in_progress';
  }
  if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    const rideStatus = item.status;
    if (!rideStatus) return true;
    return rideStatus === 'active' || rideStatus === 'full';
  }
  if (item.subtype === 'item' || item.subtype === 'donation') {
    const st = item.status;
    if (st && ['delivered', 'completed', 'expired', 'cancelled'].includes(st)) return false;
    return !!(item.itemId || item.subtype === 'donation');
  }
  return false;
}
