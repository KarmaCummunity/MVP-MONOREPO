import type { FeedItem } from '../types/feed';
import type { ApiResponse } from './apiService';
import { apiService } from './apiService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: string | undefined): boolean {
  return !!id && UUID_RE.test(id);
}

function isLegacyTimestampItemId(id: string | undefined): boolean {
  return !!id && /^\d{10,13}$/.test(id);
}

/** Closed tab uses `donation_<uuid>` when the row is not a linked post. */
function donationIdFromSyntheticFeedId(feedId: string | undefined): string | undefined {
  if (!feedId || !feedId.startsWith('donation_')) return undefined;
  const rest = feedId.slice('donation_'.length);
  return isUuid(rest) ? rest : undefined;
}

type ApiLike = {
  updateTask: (id: string, body: { status: string }) => Promise<ApiResponse>;
  updateRide: (id: string, body: { status: string }) => Promise<ApiResponse>;
  updateItem: (id: string, body: { status: string }) => Promise<ApiResponse>;
  updateDonation: (id: string, body: { status: string }) => Promise<ApiResponse>;
};

function toResult(res: ApiResponse): { success: boolean; error?: string } {
  return { success: Boolean(res.success), error: res.error || res.message };
}

function isTaskSubtype(subtype: string): boolean {
  return (
    subtype === 'task_assignment' ||
    subtype === 'task_completion' ||
    subtype === 'task_post'
  );
}

function isRideSubtype(subtype: string): boolean {
  return subtype === 'ride' || subtype === 'ride_offered' || subtype === 'ride_completed';
}

/**
 * Reopens a closed task / ride / item / donation via backend (owner flows).
 * Align status transitions with `feedPostOwnerClose` (inverse).
 */
export async function reopenFeedPost(item: FeedItem): Promise<{ success: boolean; error?: string }> {
  const api = apiService as ApiLike;

  const subtype = String(item.subtype || item.type || '');

  if (isTaskSubtype(subtype)) {
    const taskId = item.taskId || item.taskData?.id;
    if (!isUuid(taskId)) {
      return { success: false, error: 'Task ID missing or invalid' };
    }
    return toResult(await api.updateTask(taskId!, { status: 'open' }));
  }

  if (isRideSubtype(subtype)) {
    const rideId = item.rideId;
    if (!isUuid(rideId)) {
      return { success: false, error: 'Ride ID missing or invalid' };
    }
    return toResult(await api.updateRide(rideId!, { status: 'active' }));
  }

  const itemId = item.itemId;
  const hasDedicatedItem =
    subtype === 'item' ||
    subtype === 'donation' ||
    (typeof itemId === 'string' && itemId.length > 0 && !isLegacyTimestampItemId(itemId));

  if (hasDedicatedItem && itemId && !isLegacyTimestampItemId(itemId)) {
    return toResult(await api.updateItem(itemId, { status: 'available' }));
  }

  if (subtype === 'donation') {
    const raw = (item as FeedItem & { rawData?: { id?: string } }).rawData;
    const donationFromRaw = raw?.id && isUuid(raw.id) ? raw.id : undefined;
    const donationId = donationFromRaw ?? donationIdFromSyntheticFeedId(item.id);
    if (donationId) {
      return toResult(await api.updateDonation(donationId, { status: 'active' }));
    }
    return { success: false, error: 'Donation ID missing or invalid' };
  }

  return { success: false, error: 'Unsupported post type' };
}

/**
 * Calls {@link reopenFeedPost} and shows success/error toasts (i18n `common:post.*`).
 * @returns whether the API reported success
 */
export async function reopenFeedPostWithUiFeedback(item: FeedItem): Promise<boolean> {
  try {
    const result = await reopenFeedPost(item);
    const { toastService } = await import('./toastService');
    const { default: i18n } = await import('../app/i18n');
    if (result.success) {
      toastService.showSuccess(
        i18n.t('post.reopenSuccess', { ns: 'common', defaultValue: 'Post reopened successfully' }),
      );
      return true;
    }
    toastService.showError(
      result.error ||
        i18n.t('post.reopenError', { ns: 'common', defaultValue: 'Error reopening post' }),
    );
    return false;
  } catch (e) {
    const { toastService } = await import('./toastService');
    const { default: i18n } = await import('../app/i18n');
    console.error('reopenFeedPostWithUiFeedback', e);
    toastService.showError(
      i18n.t('post.reopenError', { ns: 'common', defaultValue: 'Error reopening post' }),
    );
    return false;
  }
}
