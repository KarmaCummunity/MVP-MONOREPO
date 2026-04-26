import type { FeedItem, PostType } from '../../types/feed';

/** Maps API post payload to FeedItem for items donation screen (aligned with useFeedData shape). */
export function mapPostToFeedItemForItemsScreen(post: unknown): FeedItem | null {
  const p = post as Record<string, unknown> | null | undefined;
  if (!p || !p.id) {
    console.warn('⚠️ mapPostToFeedItemForItemsScreen: post is null or missing id', post);
    return null;
  }

  const itemData = (p.item_data as Record<string, unknown>) || {};
  let metadata: Record<string, unknown> = {};
  try {
    metadata =
      typeof p.metadata === 'string'
        ? (JSON.parse(p.metadata as string) as Record<string, unknown>)
        : ((p.metadata as Record<string, unknown>) || {});
  } catch (e) {
    console.warn('⚠️ Failed to parse metadata:', e);
  }

  type AuthorShape = { id?: string; name?: string | null; avatar_url?: string | null };
  let author: AuthorShape | null = null;
  if (p.author) {
    author = p.author as AuthorShape;
  } else if (p.author_id) {
    author = { id: p.author_id as string, name: null, avatar_url: null };
  }

  const userId = author?.id || (p.author_id as string) || 'unknown';
  const userName = author?.name || 'common:unknownUser';
  const userAvatar = author?.avatar_url || undefined;

  if (!userId || userId === 'unknown') {
    console.warn('⚠️ mapPostToFeedItemForItemsScreen: post without valid user', {
      postId: p.id,
      author,
      author_id: p.author_id,
    });
  }

  let itemStatus: string | undefined;
  if (p.item_data) {
    itemStatus = (itemData as { status?: string }).status;
  } else if (p.ride_data) {
    itemStatus = ((p.ride_data as Record<string, unknown>)?.status as string) || undefined;
  }

  const createdAt = p.created_at as string | undefined;
  const ts =
    createdAt && !Number.isNaN(new Date(createdAt).getTime())
      ? new Date(createdAt).toISOString()
      : new Date().toISOString();

  const itemIdRaw = (p.item_id as string) || undefined;
  const itemDataId = (itemData as { id?: string }).id;
  const itemId =
    itemDataId ||
    (itemIdRaw && !/^\d{10,13}$/.test(itemIdRaw) ? itemIdRaw : undefined);

  const rawType = String(p.post_type || 'post');
  const type: PostType = ['post', 'reel', 'task_post'].includes(rawType) ? (rawType as PostType) : 'post';

  return {
    id: p.id as string,
    type,
    subtype: p.post_type as string,
    title: (p.title as string) || 'post:noTitle',
    description: (p.description as string) || '',
    thumbnail: Array.isArray(p.images) && (p.images as unknown[]).length > 0 ? (p.images as string[])[0] : null,
    user: {
      id: userId,
      name: userName,
      avatar: userAvatar,
    },
    likes: parseInt(String(p.likes || '0'), 10),
    comments: parseInt(String(p.comments || '0'), 10),
    isLiked: Boolean(p.is_liked),
    timestamp: ts,
    category: (itemData?.category as string) || (metadata as { category?: string }).category,
    status: itemStatus,
    itemId,
    rideId: (p.ride_id as string) || ((p.ride_data as { id?: string })?.id),
    taskId: (p.task_id as string) || ((p.task as { id?: string })?.id),
  };
}
