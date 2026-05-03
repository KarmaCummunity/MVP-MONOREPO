import type { FeedItem } from '../types/feed';
import { logger } from './loggerService';

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

/**
 * Owner-only: marks task done, ride completed, or item/donation delivered via API.
 * Used from feed cards and post detail; keep behavior aligned across surfaces.
 */
export async function closeOwnerPostFromFeedItem(item: FeedItem): Promise<CloseOwnerPostResult> {
  const { apiService } = await import('./apiService');

  let updateResult: { success: boolean; error?: string } = { success: false };

  if (item.subtype === 'task_assignment' || item.type === 'task_post') {
    const taskId = item.taskId || item.taskData?.id;
    if (taskId && isValidUUID(taskId)) {
      updateResult = await apiService.updateTask(taskId, { status: 'done' });
    } else {
      logger.warn('feedPostOwnerClose', 'Invalid or missing task ID', { taskId, postId: item.id });
      updateResult = { success: false, error: 'Task ID not found or invalid' };
    }
  } else if (item.subtype === 'ride' || item.subtype === 'ride_offered') {
    const rideId = item.rideId;
    if (rideId && isValidUUID(rideId)) {
      updateResult = await apiService.updateRide(rideId, { status: 'completed' });
    } else {
      logger.warn('feedPostOwnerClose', 'Invalid or missing ride ID', { rideId, postId: item.id });
      updateResult = { success: false, error: 'Ride ID not found or invalid' };
    }
  } else if (item.subtype === 'item' || item.subtype === 'donation') {
    const itemId = item.itemId;
    if (!itemId) {
      logger.error('feedPostOwnerClose', 'Cannot close post — item ID missing', { postId: item.id });
      updateResult = {
        success: false,
        error:
          'לא ניתן לסגור את הפוסט - ID של הפריט לא נמצא. אנא רענן את הפיד ונסה שוב.',
      };
    } else if (/^\d{10,13}$/.test(itemId)) {
      logger.error('feedPostOwnerClose', 'Item ID is timestamp (legacy post)', { itemId, postId: item.id });
      updateResult = {
        success: false,
        error: 'לא ניתן לסגור את הפוסט - זה פוסט ישן שנוצר לפני התיקון. אנא צור פריט חדש.',
      };
    } else if (isValidItemId(itemId)) {
      logger.debug('feedPostOwnerClose', 'updateItem delivered', { itemId });
      updateResult = await apiService.updateItem(itemId, { status: 'delivered' });
    } else {
      logger.warn('feedPostOwnerClose', 'Invalid item ID format', { itemId });
      updateResult = {
        success: false,
        error: 'ID של הפריט לא תקין. אנא רענן את הפיד ונסה שוב.',
      };
    }
  } else {
    updateResult = { success: false, error: 'סגירת פוסט לא נתמכת לסוג זה' };
  }

  if (updateResult.success) {
    return { success: true };
  }
  return { success: false, error: updateResult.error || 'Close failed' };
}
