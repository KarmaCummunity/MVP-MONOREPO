import type { FeedItem, FeedRideExtended } from '../types/feed';
import { mapCommunityChallengeFeedFields } from './mapCommunityChallengeFeedFields';
import { parsePostMetadata } from './parsePostMetadata';
import { mergeFeedRideExtended, rideExtendedFromRideBlock, rideExtendedFromRideDataJoin } from './rideFeedExtendedFields';

type RideMetadataLocation = Record<string, unknown> | string | undefined;

function formatRideTimeFromIso(dateIso: string): { time: string; date: string } {
    if (!dateIso) return { time: '', date: '' };
    const dep = new Date(dateIso);
    if (Number.isNaN(dep.getTime())) return { time: '', date: '' };
    const hours = dep.getHours().toString().padStart(2, '0');
    const minutes = dep.getMinutes().toString().padStart(2, '0');
    const day = dep.getDate().toString().padStart(2, '0');
    const month = (dep.getMonth() + 1).toString().padStart(2, '0');
    const year = dep.getFullYear();
    return { time: `${hours}:${minutes}`, date: `${day}.${month}.${year}` };
}

function unknownDepartureTimeToIsoString(v: unknown): string {
    if (v == null || v === '') return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
    if (v instanceof Date) return v.toISOString();
    return '';
}

function locationLabelFromRideFields(
    loc: RideMetadataLocation,
    fallback: unknown,
): string {
    if (typeof loc === 'string') return loc;
    if (loc && typeof loc === 'object') {
        const name = (loc as { name?: unknown }).name;
        const city = (loc as { city?: unknown }).city;
        if (typeof name === 'string' && name.length > 0) return name;
        if (typeof city === 'string' && city.length > 0) return city;
    }
    if (typeof fallback === 'string') return fallback;
    return '';
}

function buildRideDataFromJoin(post: {
    ride_data?: {
        departure_time?: string;
        from_location?: unknown;
        to_location?: unknown;
        available_seats?: number;
        price_per_seat?: number;
        status?: string;
    };
}): Record<string, unknown> {
    const rd = post.ride_data!;
    const { time, date } = formatRideTimeFromIso(rd.departure_time || '');
    return {
        from:
            typeof rd.from_location === 'string'
                ? rd.from_location
                : ((rd.from_location as { name?: string; city?: string })?.name ||
                      (rd.from_location as { city?: string })?.city ||
                      ''),
        to:
            typeof rd.to_location === 'string'
                ? rd.to_location
                : ((rd.to_location as { name?: string; city?: string })?.name ||
                      (rd.to_location as { city?: string })?.city ||
                      ''),
        seats: rd.available_seats || 0,
        price: rd.price_per_seat || 0,
        time,
        date,
        status: rd.status,
    };
}

function buildRideDataFromMetadata(metadata: unknown): Record<string, unknown> {
    const meta = parsePostMetadata(metadata);
    const r = (meta?.ride as Record<string, unknown> | undefined) || meta || {};
    let timeStr = (r.time as string) || '';
    let dateStr = (r.date as string) || '';
    if (r.departure_time != null && r.departure_time !== '') {
        const iso = unknownDepartureTimeToIsoString(r.departure_time);
        const formatted = formatRideTimeFromIso(iso);
        if (formatted.time) timeStr = formatted.time;
        if (formatted.date) dateStr = formatted.date;
    }
    const fromLoc = r.from_location as RideMetadataLocation;
    const toLoc = r.to_location as RideMetadataLocation;
    return {
        from: locationLabelFromRideFields(fromLoc, r.from),
        to: locationLabelFromRideFields(toLoc, r.to),
        seats: Number(r.available_seats || r.seats || 0),
        price: Number(r.price_per_seat || r.price || 0),
        time: timeStr,
        date: dateStr,
    };
}

function resolveItemId(
    post: { item_data?: { id?: string }; item_id?: string },
    meta: Record<string, unknown> | null,
): string | undefined {
    if (post.item_data?.id) {
        return post.item_data.id;
    }
    const metadataItemId = typeof meta?.item_id === 'string' ? meta.item_id : undefined;
    if (metadataItemId && !/^\d{10,13}$/.test(metadataItemId)) {
        return metadataItemId;
    }
    if (post.item_id && !/^\d{10,13}$/.test(post.item_id)) {
        return post.item_id;
    }
    return undefined;
}

function warnInvalidItemPost(post: {
    id?: string;
    post_type?: string;
    item_id?: string;
    item_data?: { id?: string };
    metadata?: unknown;
}, finalItemId: string | undefined): void {
    if (post.post_type !== 'item' && post.post_type !== 'donation') {
        return;
    }
    if (!finalItemId || /^\d{10,13}$/.test(finalItemId)) {
        const meta = parsePostMetadata(post.metadata);
        console.warn('⚠️ Invalid item ID for post:', {
            postId: post.id,
            postType: post.post_type,
            finalItemId,
            item_id_column: post.item_id,
            item_data_id: post.item_data?.id,
            metadata_item_id: meta?.item_id,
            hasItemData: !!post.item_data,
        });
    }
}

function resolveRideDataAndExtended(post: {
    ride_data?: Record<string, unknown>;
    post_type?: string;
    metadata?: unknown;
}): {
    rideData: Record<string, unknown>;
    rideExtended: FeedRideExtended | undefined;
} {
    let rideData: Record<string, unknown> = {};
    let rideExtended: FeedRideExtended | undefined;

    if (post.ride_data) {
        rideData = buildRideDataFromJoin(post);
        rideExtended = rideExtendedFromRideDataJoin(post.ride_data);
        const metaEarly = parsePostMetadata(post.metadata);
        if (metaEarly) {
            const rideBlockForExtras =
                (metaEarly.ride as Record<string, unknown> | undefined) ?? metaEarly;
            rideExtended = mergeFeedRideExtended(
                rideExtended,
                rideExtendedFromRideBlock(rideBlockForExtras),
            );
        }
        return { rideData, rideExtended };
    }

    const isRidePost = post.post_type === 'ride' || post.post_type === 'ride_offered';
    if (isRidePost && post.metadata) {
        rideData = buildRideDataFromMetadata(post.metadata);
        const metaR = parsePostMetadata(post.metadata)?.ride as Record<string, unknown> | undefined;
        if (metaR && typeof metaR === 'object') {
            rideExtended = rideExtendedFromRideBlock(metaR);
        }
        return { rideData, rideExtended };
    }

    if (!post.metadata) {
        return { rideData, rideExtended };
    }

    const meta0 = parsePostMetadata(post.metadata);
    const rideBlock = meta0?.ride as Record<string, unknown> | undefined;
    const cat = (meta0?.category as string) || (rideBlock?.category as string);
    const hasRideShape =
        rideBlock &&
        typeof rideBlock === 'object' &&
        (cat === 'trump' ||
            rideBlock.from_location != null ||
            rideBlock.to_location != null ||
            rideBlock.departure_time != null);
    if (hasRideShape) {
        rideData = buildRideDataFromMetadata(post.metadata);
        rideExtended = rideExtendedFromRideBlock(rideBlock);
    }

    return { rideData, rideExtended };
}

/** API may return `author` as object (pg) or occasionally as JSON string. */
function normalizePostAuthor(raw: unknown): Record<string, unknown> {
    if (raw == null || raw === '') {
        return {};
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return {};
        }
        return {};
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Record<string, unknown>;
    }
    return {};
}

/** Maps a single API post row to a FeedItem (home feed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- API row shape
export function mapApiPostToFeedItem(post: any): FeedItem {
    const { rideData, rideExtended } = resolveRideDataAndExtended(post);

    const author = normalizePostAuthor(post.author);
    const userId =
        (typeof author.id === 'string' && author.id) ||
        (typeof author.id === 'number' && String(author.id)) ||
        post.author_id ||
        'unknown';
    const nameRaw = author.name;
    const userName =
        (typeof nameRaw === 'string' && nameRaw.trim() !== '') || typeof nameRaw === 'number'
            ? String(nameRaw)
            : 'common.unknownUser';
    const userAvatar =
        typeof author.avatar_url === 'string' && author.avatar_url.trim() !== ''
            ? author.avatar_url
            : undefined;
    const emailVerified =
        author.email_verified === true || author.emailVerified === true;

    let itemStatus: string | undefined;
    if (post.item_data) {
        itemStatus = post.item_data.status;
    } else if (post.ride_data) {
        itemStatus = post.ride_data.status;
    }

    const meta = parsePostMetadata(post.metadata);
    let postIntent: 'give' | 'request' = 'give';
    if (meta?.intent === 'request') {
        postIntent = 'request';
    }

    const finalItemId = resolveItemId(post, meta);
    warnInvalidItemPost(post, finalItemId);

    const chMapped =
        post.post_type === 'community_challenge'
            ? mapCommunityChallengeFeedFields(post)
            : null;

    const postImages = Array.isArray(post.images) ? post.images : null;
    const firstImage = postImages?.length ? postImages[0] : null;
    const thumbnail = chMapped?.thumbnail ?? firstImage;

    const created =
        post.created_at && !Number.isNaN(new Date(post.created_at).getTime())
            ? new Date(post.created_at).toISOString()
            : new Date().toISOString();

    return {
        id: post.id,
        type: post.post_type || 'post',
        subtype: post.post_type,
        title: post.title || 'post.noTitle',
        description: post.description || '',
        thumbnail,
        images: postImages,
        user: {
            id: userId,
            name: userName,
            avatar: userAvatar,
            emailVerified,
        },
        likes: Number.parseInt(post.likes || '0', 10),
        comments: Number.parseInt(post.comments || '0', 10),
        isLiked: post.is_liked || false,
        timestamp: created,
        taskData: post.task
            ? {
                  id: post.task.id,
                  title: post.task.title,
                  status: post.task.status,
              }
            : undefined,
        status: itemStatus,
        itemId: finalItemId,
        rideId: post.ride_id || post.ride_data?.id,
        taskId: post.task_id || post.task?.id,
        challengeId: chMapped?.challengeId,
        challengeData: chMapped?.challengeData,
        intent: postIntent,
        ...rideData,
        rideExtended,
    } as FeedItem;
}
