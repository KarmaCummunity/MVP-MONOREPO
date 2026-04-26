import type { FeedItem } from '../types/feed';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: string | undefined): boolean {
  return !!id && UUID_RE.test(id);
}

/**
 * Reopens a closed ride/item post via backend (owner flows from donation screens).
 */
export async function reopenFeedPost(item: FeedItem): Promise<{ success: boolean; error?: string }> {
  const { apiService } = await import('./apiService');
  const subtype = String(item.subtype || item.type || '');

  if (subtype === 'ride' || subtype === 'ride_offered' || subtype === 'ride_completed') {
    const rideId = item.rideId;
    if (!isUuid(rideId)) {
      return { success: false, error: 'Ride ID missing or invalid' };
    }
    const res = await apiService.updateRide(rideId!, { status: 'active' });
    return { success: Boolean(res.success), error: res.error || res.message };
  }

  if (subtype === 'item' || subtype === 'donation' || item.itemId) {
    const itemId = item.itemId;
    if (!itemId || /^\d{10,13}$/.test(itemId)) {
      return { success: false, error: 'Item ID missing or invalid' };
    }
    const res = await apiService.updateItem(itemId, { status: 'available' });
    return { success: Boolean(res.success), error: res.error || res.message };
  }

  return { success: false, error: 'Unsupported post type' };
}
