import type { FeedItem } from '../../types/feed';
import { createLogger } from '../../utils/loggerService';

const log = createLogger('mapPostToFeedItemForItemsScreen');

type AuthorShape = { id?: string; name?: string | null; avatar_url?: string | null };

function parseMetadata(metadata: unknown): Record<string, unknown> {
  try {
    if (typeof metadata === 'string') {
      return JSON.parse(metadata) as Record<string, unknown>;
    }
    return (metadata as Record<string, unknown>) || {};
  } catch (e) {
    log.warn('Failed to parse metadata', {
      error: e instanceof Error ? e.message : String(e),
    });
    return {};
  }
}

function countFromUnknown(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === 'string') return Number.parseInt(raw, 10) || 0;
  return 0;
}

function resolveAuthor(p: Record<string, unknown>): AuthorShape | null {
  if (p.author) {
    return p.author as AuthorShape;
  }
  if (p.author_id) {
    return { id: p.author_id as string, name: null, avatar_url: null };
  }
  return null;
}

function resolveItemStatus(
  p: Record<string, unknown>,
  itemData: Record<string, unknown>,
): string | undefined {
  if (p.item_data) {
    return (itemData as { status?: string }).status;
  }
  if (p.ride_data) {
    return ((p.ride_data as Record<string, unknown>)?.status as string) || undefined;
  }
  return undefined;
}

function isoTimestampFromCreated(createdAt: unknown): string {
  if (typeof createdAt !== 'string' || createdAt.length === 0) {
    return new Date().toISOString();
  }
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) {
    return new Date().toISOString();
  }
  return new Date(createdAt).toISOString();
}

/** Safe string for logs when API fields may be non-primitive (avoids `[object Object]`). */
function valueForLog(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function optionalValueForLog(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return valueForLog(value);
}

function resolveNumericItemId(
  itemData: Record<string, unknown>,
  itemIdRaw: string | undefined,
): string | undefined {
  const itemDataId = (itemData as { id?: string }).id;
  if (itemDataId) {
    return itemDataId;
  }
  if (itemIdRaw && !/^\d{10,13}$/.test(itemIdRaw)) {
    return itemIdRaw;
  }
  return undefined;
}

function splitPostType(postType: unknown): { subtype: string | undefined; type: FeedItem['type'] } {
  const subtype = typeof postType === 'string' && postType.length > 0 ? postType : undefined;
  const rawType = subtype ?? 'post';
  const type: FeedItem['type'] = ['post', 'reel', 'task_post'].includes(rawType)
    ? (rawType as FeedItem['type'])
    : 'post';
  return { subtype, type };
}

function thumbnailFromImages(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }
  return (images as string[])[0];
}

/** Maps API post payload to FeedItem for items donation screen (aligned with useFeedData shape). */
export function mapPostToFeedItemForItemsScreen(post: unknown): FeedItem | null {
  const p = post as Record<string, unknown> | null | undefined;
  if (!p?.id) {
    let receivedType: string;
    if (post === null) {
      receivedType = 'null';
    } else if (post === undefined) {
      receivedType = 'undefined';
    } else {
      receivedType = typeof post;
    }
    log.warn('post is null or missing id', { receivedType });
    return null;
  }

  const itemData = (p.item_data as Record<string, unknown>) || {};
  const metadata = parseMetadata(p.metadata);

  const author = resolveAuthor(p);
  const userId = author?.id || (p.author_id as string) || 'unknown';
  const userName = author?.name || 'common:unknownUser';
  const userAvatar = author?.avatar_url || undefined;

  if (!userId || userId === 'unknown') {
    log.warn('post without valid user', {
      postId: valueForLog(p.id),
      hasAuthorObject: Boolean(p.author),
      author_id: optionalValueForLog(p.author_id),
    });
  }

  const itemStatus = resolveItemStatus(p, itemData);
  const ts = isoTimestampFromCreated(p.created_at);
  const itemId = resolveNumericItemId(itemData, (p.item_id as string) || undefined);
  const { subtype, type } = splitPostType(p.post_type);

  return {
    id: p.id as string,
    type,
    subtype,
    title: (p.title as string) || 'post:noTitle',
    description: (p.description as string) || '',
    thumbnail: thumbnailFromImages(p.images),
    user: {
      id: userId,
      name: userName,
      avatar: userAvatar,
    },
    likes: countFromUnknown(p.likes),
    comments: countFromUnknown(p.comments),
    isLiked: Boolean(p.is_liked),
    timestamp: ts,
    category: (itemData?.category as string) || (metadata as { category?: string }).category,
    intent: (metadata as { intent?: 'give' | 'request' }).intent || 'give',
    status: itemStatus,
    itemId,
    rideId: (p.ride_id as string) || (p.ride_data as { id?: string })?.id,
    taskId: (p.task_id as string) || (p.task as { id?: string })?.id,
  };
}
