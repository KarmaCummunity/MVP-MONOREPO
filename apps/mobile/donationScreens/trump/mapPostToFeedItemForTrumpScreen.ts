import type { FeedItem, FeedRideExtended } from '../../types/feed';
import { mergeFeedRideExtended, rideExtendedFromRideBlock, rideExtendedFromRideDataJoin } from '../../utils/rideFeedExtendedFields';

type RideDataShape = {
  from: string;
  to: string;
  seats: number;
  price: number;
  time: string;
  date: string;
};

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
    return o.name ?? o.city ?? '';
  }
  return '';
}

function rideDataFromRideDataBlock(rd: Record<string, unknown>): RideDataShape {
  const { time, date } = formatRideTime(String(rd.departure_time ?? ''));
  return {
    from: locationLabel(rd.from_location),
    to: locationLabel(rd.to_location),
    seats: Number(rd.available_seats ?? 0),
    price: Number(rd.price_per_seat ?? 0),
    time,
    date,
  };
}

function rideDataFromMetadata(post: { metadata?: unknown; post_type?: string }): RideDataShape {
  let meta: Record<string, unknown>;
  try {
    meta =
      typeof post.metadata === 'string'
        ? (JSON.parse(post.metadata) as Record<string, unknown>)
        : ((post.metadata as Record<string, unknown>) ?? {});
  } catch {
    return { from: '', to: '', seats: 0, price: 0, time: '', date: '' };
  }
  const r = (meta.ride as Record<string, unknown>) ?? meta;
  let timeStr = String(r.time ?? '');
  let dateStr = String(r.date ?? '');
  if (r.departure_time) {
    const formatted = formatRideTime(String(r.departure_time));
    if (formatted.time) timeStr = formatted.time;
    if (formatted.date) dateStr = formatted.date;
  }
  return {
    from:
      typeof r.from_location === 'string'
        ? r.from_location
        : locationLabel(r.from_location) || String(r.from ?? ''),
    to:
      typeof r.to_location === 'string'
        ? r.to_location
        : locationLabel(r.to_location) || String(r.to ?? ''),
    seats: Number(r.available_seats ?? r.seats ?? 0),
    price: Number(r.price_per_seat ?? r.price ?? 0),
    time: timeStr,
    date: dateStr,
  };
}

function buildRideData(post: {
  ride_data?: Record<string, unknown>;
  post_type?: string;
  metadata?: unknown;
}): RideDataShape {
  if (post.ride_data) {
    return rideDataFromRideDataBlock(post.ride_data);
  }
  // Dedicated-item ride requests use post_type `donation` with structured `metadata.ride`
  if (post.metadata) {
    const fromMeta = rideDataFromMetadata(post);
    if (fromMeta.from || fromMeta.to || fromMeta.time || fromMeta.date) {
      return fromMeta;
    }
  }
  return { from: '', to: '', seats: 0, price: 0, time: '', date: '' };
}

function parseCount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === 'string') return Number.parseInt(raw, 10) || 0;
  return 0;
}

function timestampFromCreatedAt(createdAt: unknown): string {
  if (typeof createdAt === 'string' && !Number.isNaN(new Date(createdAt).getTime())) {
    return new Date(createdAt).toISOString();
  }
  return new Date().toISOString();
}

function intentAndCategoryFromPost(post: Record<string, unknown>): {
  intent: 'give' | 'request';
  category?: string;
} {
  let metadata: Record<string, unknown> = {};
  try {
    metadata =
      typeof post.metadata === 'string'
        ? (JSON.parse(post.metadata) as Record<string, unknown>)
        : ((post.metadata as Record<string, unknown>) ?? {});
  } catch {
    metadata = {};
  }
  const intentRaw = (metadata as { intent?: string }).intent;
  const intent: 'give' | 'request' = intentRaw === 'request' ? 'request' : 'give';
  const rideMeta = (metadata.ride as Record<string, unknown>) ?? {};
  const category =
    (rideMeta.category as string | undefined) ||
    (metadata.category as string | undefined) ||
    (metadata.donation_category as string | undefined);
  return { intent, category };
}

/** Maps API post rows to FeedItem for Trump (rides) screen — ride_data / metadata / author. */
export function mapPostToFeedItemForTrumpScreen(post: Record<string, unknown>): FeedItem {
  const rideData = buildRideData(post);
  const { intent, category } = intentAndCategoryFromPost(post);

  const author = (post.author as Record<string, unknown>) || {};
  const userId = String(author.id ?? post.author_id ?? 'unknown');
  const userName = String(author.name ?? 'common.unknownUser');
  const userAvatar = (author.avatar_url as string | undefined) ?? undefined;

  const rideDataObj =
    post.ride_data && typeof post.ride_data === 'object' ? (post.ride_data as Record<string, unknown>) : {};
  const rideId = (post.ride_id as string | undefined) ?? (rideDataObj.id as string | undefined);
  const rideStatus = rideDataObj.status as string | undefined;
  const rawPostType = String(post.post_type ?? 'post');
  const subtype = rawPostType === 'ride_offered' ? 'ride' : rawPostType;

  let rideExtended: FeedRideExtended | undefined;
  if (post.ride_data && typeof post.ride_data === 'object') {
    rideExtended = rideExtendedFromRideDataJoin(post.ride_data as Record<string, unknown>);
  }
  let metaParsed: Record<string, unknown> = {};
  try {
    metaParsed =
      typeof post.metadata === 'string'
        ? (JSON.parse(post.metadata) as Record<string, unknown>)
        : ((post.metadata as Record<string, unknown>) ?? {});
  } catch {
    metaParsed = {};
  }
  const rideMetaBlock = (metaParsed.ride as Record<string, unknown> | undefined) ?? undefined;
  if (rideMetaBlock && typeof rideMetaBlock === 'object') {
    rideExtended = mergeFeedRideExtended(rideExtended, rideExtendedFromRideBlock(rideMetaBlock));
  }

  return {
    id: post.id as string,
    type: rawPostType,
    subtype,
    title: String(post.title ?? 'post.noTitle'),
    description: String(post.description ?? ''),
    thumbnail: Array.isArray(post.images) && post.images.length > 0 ? (post.images as string[])[0] : null,
    user: {
      id: userId,
      name: userName,
      avatar: userAvatar,
    },
    likes: parseCount(post.likes),
    comments: parseCount(post.comments),
    isLiked: Boolean(post.is_liked),
    timestamp: timestampFromCreatedAt(post.created_at),
    rideId,
    status: rideStatus,
    intent,
    category,
    rideExtended,
    ...rideData,
  } as FeedItem;
}
