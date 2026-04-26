// Maps API post rows to FeedItem for donation ItemsScreen lists (items/donations only).
import type { FeedItem } from '../types/feed';

type ApiPost = Record<string, unknown> & {
  id?: string;
  author?: { id?: string; name?: string | null; avatar_url?: string | null };
  author_id?: string;
  item_data?: { id?: string; category?: string; status?: string };
  ride_data?: { id?: string; status?: string };
  metadata?: unknown;
  post_type?: string;
  title?: string;
  description?: string;
  images?: string[];
  likes?: string | number;
  comments?: string | number;
  is_liked?: boolean;
  created_at?: string;
  item_id?: string;
  ride_id?: string;
  task_id?: string;
};

function safeParseMetadata(raw: unknown): Record<string, unknown> {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function resolveAuthor(post: ApiPost): {
  userId: string;
  userName: string;
  userAvatar: string | undefined;
} {
  let author: ApiPost['author'] | { id: string; name: null; avatar_url: null } | null = null;
  if (post.author) {
    author = post.author;
  } else if (post.author_id) {
    author = { id: post.author_id, name: null, avatar_url: null };
  }
  const userId = author?.id || post.author_id || 'unknown';
  const userName = author?.name || 'common.unknownUser';
  const userAvatar = author?.avatar_url || undefined;
  return { userId, userName, userAvatar };
}

function postItemStatus(post: ApiPost): string | undefined {
  if (post.item_data?.status != null) return post.item_data.status;
  if (post.ride_data?.status != null) return post.ride_data.status;
  return undefined;
}

function isChallengePostType(pt: string | undefined): boolean {
  return pt === 'community_challenge' || pt === 'personal_challenge';
}

function challengeFieldsFromMetadata(
  metadata: Record<string, unknown>,
): Pick<
  FeedItem,
  'challengeId' | 'challengeFrequency' | 'challengeDifficulty' | 'challengeCategoryLabel'
> {
  const cid = metadata.challenge_id ?? metadata.personal_challenge_id;
  return {
    challengeId: typeof cid === 'string' ? cid : undefined,
    challengeFrequency:
      typeof metadata.frequency === 'string' ? metadata.frequency : undefined,
    challengeDifficulty:
      typeof metadata.difficulty === 'string' ? metadata.difficulty : undefined,
    challengeCategoryLabel:
      typeof metadata.category === 'string' ? metadata.category : undefined,
  };
}

function itemCategoryForFeed(
  postType: string | undefined,
  itemData: NonNullable<ApiPost['item_data']>,
  metadata: Record<string, unknown>,
): string | undefined {
  if (isChallengePostType(postType)) return undefined;
  if (postType !== 'item' && postType !== 'donation') return undefined;
  const fromItem = itemData.category;
  const fromMeta = metadata.category;
  return (
    (typeof fromItem === 'string' ? fromItem : undefined) ??
    (typeof fromMeta === 'string' ? fromMeta : undefined)
  );
}

function resolveItemIdColumn(post: ApiPost): string | undefined {
  const fromJoin = post.item_data?.id;
  if (fromJoin) return fromJoin;
  const col = post.item_id;
  if (typeof col === 'string' && col.length > 0 && !/^\d{10,13}$/.test(col)) {
    return col;
  }
  return undefined;
}

function feedTimestamp(createdAt: string | undefined): string {
  if (createdAt && !Number.isNaN(new Date(createdAt).getTime())) {
    return new Date(createdAt).toISOString();
  }
  return new Date().toISOString();
}

/** True when the post row should appear in item/donation lists (excludes challenge feed posts). */
export function isItemOrDonationPostRow(post: unknown): boolean {
  const p = post as ApiPost;
  const ptype = p.post_type;
  if (ptype === 'community_challenge' || ptype === 'personal_challenge') {
    return false;
  }
  return ptype === 'item' || ptype === 'donation' || Boolean(p.item_id);
}

/**
 * Maps a single API post to FeedItem for item/donation lists, or null if invalid.
 */
export function mapApiPostToFeedItemForItemsScreen(post: unknown): FeedItem | null {
  const p = post as ApiPost;
  if (!p?.id) {
    console.warn('⚠️ mapApiPostToFeedItemForItemsScreen: post is null or missing id', post);
    return null;
  }

  const metadata = safeParseMetadata(p.metadata);
  const itemData = p.item_data || {};
  const { userId, userName, userAvatar } = resolveAuthor(p);

  if (!userId || userId === 'unknown') {
    console.warn('⚠️ mapApiPostToFeedItemForItemsScreen: post without valid user', {
      postId: p.id,
      author_id: p.author_id,
    });
  }

  const pt = p.post_type;
  const isChallenge = isChallengePostType(pt);
  const challengeExtras = isChallenge ? challengeFieldsFromMetadata(metadata) : {};

  return {
    id: p.id,
    type: p.post_type || 'post',
    subtype: p.post_type,
    title: p.title || 'post.noTitle',
    description: p.description || '',
    thumbnail: p.images && p.images.length > 0 ? p.images[0] : null,
    user: {
      id: userId,
      name: userName,
      avatar: userAvatar,
    },
    likes: parseInt(String(p.likes ?? '0'), 10),
    comments: parseInt(String(p.comments ?? '0'), 10),
    isLiked: Boolean(p.is_liked),
    timestamp: feedTimestamp(p.created_at),
    category: itemCategoryForFeed(pt, itemData, metadata),
    ...challengeExtras,
    status: postItemStatus(p),
    itemId: resolveItemIdColumn(p),
    rideId: (p.ride_id as string | undefined) || p.ride_data?.id,
    taskId: (p.task_id as string | undefined) || undefined,
  };
}
