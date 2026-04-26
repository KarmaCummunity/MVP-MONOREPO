// Maps API post JSON (home feed) to FeedItem — extracted from useFeedData for Sonar complexity.
import type { FeedItem } from '../types/feed';

function formatRideTime(dateIso: string): { time: string; date: string } {
  if (!dateIso) return { time: '', date: '' };
  const dep = new Date(dateIso);
  if (Number.isNaN(dep.getTime())) return { time: '', date: '' };

  const hours = dep.getHours().toString().padStart(2, '0');
  const minutes = dep.getMinutes().toString().padStart(2, '0');
  const day = dep.getDate().toString().padStart(2, '0');
  const month = (dep.getMonth() + 1).toString().padStart(2, '0');
  const year = dep.getFullYear();

  return {
    time: `${hours}:${minutes}`,
    date: `${day}.${month}.${year}`,
  };
}

function locationLabel(loc: unknown): string {
  if (typeof loc === 'string') return loc;
  if (loc && typeof loc === 'object') {
    const o = loc as { name?: string; city?: string };
    return o.name || o.city || '';
  }
  return '';
}

function rideFieldsFromJoin(post: {
  ride_data?: {
    departure_time?: string;
    from_location?: unknown;
    to_location?: unknown;
    available_seats?: number;
    price_per_seat?: number;
    status?: string;
  };
}): Record<string, string | number | undefined> {
  const rd = post.ride_data;
  if (!rd) return {};
  const { time, date } = formatRideTime(rd.departure_time ?? '');
  return {
    from: locationLabel(rd.from_location),
    to: locationLabel(rd.to_location),
    seats: rd.available_seats ?? 0,
    price: rd.price_per_seat ?? 0,
    time,
    date,
    status: rd.status,
  };
}

function rideFieldsFromMetadata(post: {
  post_type?: string;
  metadata?: unknown;
}): Record<string, string | number | undefined> {
  const isRideType =
    post.post_type === 'ride' || post.post_type === 'ride_offered';
  if (!isRideType || post.metadata == null) return {};

  let meta: Record<string, unknown>;
  try {
    meta =
      typeof post.metadata === 'string'
        ? (JSON.parse(post.metadata) as Record<string, unknown>)
        : (post.metadata as Record<string, unknown>);
  } catch {
    return {};
  }

  const r = (meta.ride as Record<string, unknown>) || meta;
  let timeStr = typeof r.time === 'string' ? r.time : '';
  let dateStr = typeof r.date === 'string' ? r.date : '';

  if (r.departure_time) {
    const formatted = formatRideTime(String(r.departure_time));
    if (formatted.time) timeStr = formatted.time;
    if (formatted.date) dateStr = formatted.date;
  }

  return {
    from: locationLabel(r.from_location) || (typeof r.from === 'string' ? r.from : ''),
    to: locationLabel(r.to_location) || (typeof r.to === 'string' ? r.to : ''),
    seats: Number(r.available_seats ?? r.seats ?? 0),
    price: Number(r.price_per_seat ?? r.price ?? 0),
    time: timeStr,
    date: dateStr,
  };
}

function parsePostMetadata(post: { metadata?: unknown }): {
  parsed: Record<string, unknown> | null;
  metadataItemId: string | undefined;
} {
  if (post.metadata == null) {
    return { parsed: null, metadataItemId: undefined };
  }
  try {
    const parsed =
      typeof post.metadata === 'string'
        ? (JSON.parse(post.metadata) as Record<string, unknown>)
        : (post.metadata as Record<string, unknown>);
    const rawId = parsed.item_id;
    const metadataItemId = typeof rawId === 'string' ? rawId : undefined;
    return { parsed, metadataItemId };
  } catch {
    return { parsed: null, metadataItemId: undefined };
  }
}

function challengeFieldsFromParsed(
  isChallenge: boolean,
  parsed: Record<string, unknown> | null,
): Pick<
  FeedItem,
  'challengeId' | 'challengeFrequency' | 'challengeDifficulty' | 'challengeCategoryLabel'
> {
  if (!isChallenge || !parsed) {
    return {};
  }
  const mid = parsed.challenge_id ?? parsed.personal_challenge_id;
  return {
    challengeId: typeof mid === 'string' ? mid : undefined,
    challengeFrequency:
      typeof parsed.frequency === 'string' ? parsed.frequency : undefined,
    challengeDifficulty:
      typeof parsed.difficulty === 'string' ? parsed.difficulty : undefined,
    challengeCategoryLabel:
      typeof parsed.category === 'string' ? parsed.category : undefined,
  };
}

function resolveFinalItemId(post: {
  item_data?: { id?: string };
  item_id?: string;
  post_type?: string;
  id?: string;
  metadata?: unknown;
}, metadataItemId: string | undefined): string | undefined {
  if (post.item_data?.id) return post.item_data.id;
  if (metadataItemId && !/^\d{10,13}$/.test(metadataItemId)) {
    return metadataItemId;
  }
  const col = post.item_id;
  if (typeof col === 'string' && !/^\d{10,13}$/.test(col)) {
    return col;
  }
  return undefined;
}

function warnInvalidItemPost(
  post: { id?: string; post_type?: string; item_id?: string; item_data?: { id?: string } },
  finalItemId: string | undefined,
  metadataItemId: string | undefined,
): void {
  if (post.post_type !== 'item' && post.post_type !== 'donation') return;
  if (!finalItemId || /^\d{10,13}$/.test(finalItemId)) {
    console.warn('⚠️ Invalid item ID for post:', {
      postId: post.id,
      postType: post.post_type,
      finalItemId,
      item_id_column: post.item_id,
      item_data_id: post.item_data?.id,
      metadata_item_id: metadataItemId,
      hasItemData: !!post.item_data,
    });
  }
}

type FeedApiPost = {
  id: string;
  author?: {
    id?: string;
    name?: string;
    avatar_url?: string;
    email_verified?: boolean;
    emailVerified?: boolean;
  };
  author_id?: string;
  post_type?: string;
  title?: string;
  description?: string;
  images?: string[];
  likes?: string | number;
  comments?: string | number;
  is_liked?: boolean;
  created_at?: string;
  item_data?: { id?: string; category?: string; status?: string };
  ride_data?: {
    id?: string;
    departure_time?: string;
    from_location?: unknown;
    to_location?: unknown;
    available_seats?: number;
    price_per_seat?: number;
    status?: string;
  };
  ride_id?: string;
  item_id?: string;
  task_id?: string;
  task?: { id?: string; title?: string; status?: string };
  metadata?: unknown;
};

/**
 * Maps a home-feed API post object to FeedItem (rides, items, challenges, tasks embedded in post).
 */
export function mapApiPostToFeedItem(post: unknown): FeedItem {
  const p = post as FeedApiPost;
  const rideData = p.ride_data
    ? rideFieldsFromJoin(p)
    : rideFieldsFromMetadata(p);

  const author = p.author ?? {};
  const userId = author.id || p.author_id || 'unknown';
  const userName = author.name || 'common.unknownUser';
  const userAvatar = author.avatar_url;
  const emailVerified =
    author.email_verified === true || author.emailVerified === true;

  let itemStatus: string | undefined;
  if (p.item_data?.status != null) {
    itemStatus = p.item_data.status;
  } else if (p.ride_data?.status != null) {
    itemStatus = p.ride_data.status;
  }

  const { parsed: parsedMetadata, metadataItemId } = parsePostMetadata(p);
  const postTypeStr = String(p.post_type || '');
  const isChallengePost =
    postTypeStr === 'community_challenge' ||
    postTypeStr === 'personal_challenge';

  const challengeExtras = challengeFieldsFromParsed(
    isChallengePost,
    parsedMetadata,
  );

  const finalItemId = resolveFinalItemId(p, metadataItemId);
  warnInvalidItemPost(p, finalItemId, metadataItemId);

  const itemCategoryForFeed =
    !isChallengePost &&
    (p.post_type === 'item' || p.post_type === 'donation')
      ? p.item_data?.category ||
        (typeof parsedMetadata?.category === 'string'
          ? parsedMetadata.category
          : undefined)
      : undefined;

  const created = p.created_at;
  const timestamp =
    created && !Number.isNaN(new Date(created).getTime())
      ? new Date(created).toISOString()
      : new Date().toISOString();

  const rideId =
    typeof p.ride_id === 'string' ? p.ride_id : p.ride_data?.id;
  const taskId =
    typeof p.task_id === 'string' ? p.task_id : p.task?.id;

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
      emailVerified,
    },
    likes: Number.parseInt(String(p.likes ?? '0'), 10),
    comments: Number.parseInt(String(p.comments ?? '0'), 10),
    isLiked: Boolean(p.is_liked),
    timestamp,
    taskData:
      p.task?.id != null &&
      p.task.title != null &&
      p.task.status != null
        ? {
            id: p.task.id,
            title: p.task.title,
            status: p.task.status,
          }
        : undefined,
    status: itemStatus,
    itemId: finalItemId,
    rideId,
    taskId,
    category: itemCategoryForFeed,
    ...challengeExtras,
    ...rideData,
  };
}
