import type { FeedItem } from '../types/feed';
import { logger } from './loggerService';
import type { ApiResponse } from './apiService';

export type CloseOwnerPostResult =
  | { success: true }
  | { success: false; error: string };

function isValidUUID(id: string | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function isValidItemId(id: string | undefined): boolean {
  if (!id) return false;
  const isTimestamp = /^\d{10,13}$/.test(id);
  return !isTimestamp && id.length > 0;
}

type ApiLike = {
  updateTask: (id: string, body: { status: string }) => Promise<ApiResponse>;
  updateRide: (id: string, body: { status: string }) => Promise<ApiResponse>;
  updateItem: (id: string, body: { status: string }) => Promise<ApiResponse>;
};

function toCloseResult(res: ApiResponse): CloseOwnerPostResult {
  if (res.success) return { success: true };
  return { success: false, error: res.error || 'Close failed' };
}

async function closeTaskOwnerPost(item: FeedItem, api: ApiLike): Promise<CloseOwnerPostResult> {
  const taskId = item.taskId || item.taskData?.id;
  if (taskId && isValidUUID(taskId)) {
    return toCloseResult(await api.updateTask(taskId, { status: 'done' }));
  }
  logger.warn('feedPostOwnerClose', 'Invalid or missing task ID', { taskId, postId: item.id });
  return { success: false, error: 'Task ID not found or invalid' };
}

async function closeRideOwnerPost(item: FeedItem, api: ApiLike): Promise<CloseOwnerPostResult> {
  const rideId = item.rideId;
  if (rideId && isValidUUID(rideId)) {
    return toCloseResult(await api.updateRide(rideId, { status: 'completed' }));
  }
  logger.warn('feedPostOwnerClose', 'Invalid or missing ride ID', { rideId, postId: item.id });
  return { success: false, error: 'Ride ID not found or invalid' };
}

async function closeItemOrDonationOwnerPost(item: FeedItem, api: ApiLike): Promise<CloseOwnerPostResult> {
  const itemId = item.itemId;
  if (!itemId) {
    logger.error('feedPostOwnerClose', 'Cannot close post — item ID missing', { postId: item.id });
    return {
      success: false,
      error: 'לא ניתן לסגור את הפוסט - ID של הפריט לא נמצא. אנא רענן את הפיד ונסה שוב.',
    };
  }
  if (/^\d{10,13}$/.test(itemId)) {
    logger.error('feedPostOwnerClose', 'Item ID is timestamp (legacy post)', { itemId, postId: item.id });
    return {
      success: false,
      error: 'לא ניתן לסגור את הפוסט - זה פוסט ישן שנוצר לפני התיקון. אנא צור פריט חדש.',
    };
  }
  if (isValidItemId(itemId)) {
    logger.debug('feedPostOwnerClose', 'updateItem delivered', { itemId });
    return toCloseResult(await api.updateItem(itemId, { status: 'delivered' }));
  }
  logger.warn('feedPostOwnerClose', 'Invalid item ID format', { itemId });
  return {
    success: false,
    error: 'ID של הפריט לא תקין. אנא רענן את הפיד ונסה שוב.',
  };
}

/**
 * Owner-only: marks task done, ride completed, or item/donation delivered via API.
 * Used from feed cards and post detail; keep behavior aligned across surfaces.
 */
export async function closeOwnerPostFromFeedItem(item: FeedItem): Promise<CloseOwnerPostResult> {
  const { apiService } = await import('./apiService');
  const api = apiService as ApiLike;

  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    return closeTaskOwnerPost(item, api);
  }
  if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    return closeRideOwnerPost(item, api);
  }
  if (item.subtype === 'item' || item.subtype === 'donation') {
    return closeItemOrDonationOwnerPost(item, api);
  }
  return { success: false, error: 'סגירת פוסט לא נתמכת לסוג זה' };
}
