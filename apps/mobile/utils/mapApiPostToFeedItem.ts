import type { FeedItem } from '../types/feed';
import { mapCommunityChallengeFeedFields } from './mapCommunityChallengeFeedFields';
import { parsePostMetadata } from './parsePostMetadata';

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
    const formatRideTime = (dateIso: string) => {
        if (!dateIso) return { time: '', date: '' };
        const dep = new Date(dateIso);
        if (isNaN(dep.getTime())) return { time: '', date: '' };
        const hours = dep.getHours().toString().padStart(2, '0');
        const minutes = dep.getMinutes().toString().padStart(2, '0');
        const day = dep.getDate().toString().padStart(2, '0');
        const month = (dep.getMonth() + 1).toString().padStart(2, '0');
        const year = dep.getFullYear();
        return { time: `${hours}:${minutes}`, date: `${day}.${month}.${year}` };
    };
    const { time, date } = formatRideTime(rd.departure_time || '');
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
    const formatRideTime = (dateIso: string) => {
        if (!dateIso) return { time: '', date: '' };
        const dep = new Date(dateIso);
        if (isNaN(dep.getTime())) return { time: '', date: '' };
        const hours = dep.getHours().toString().padStart(2, '0');
        const minutes = dep.getMinutes().toString().padStart(2, '0');
        const day = dep.getDate().toString().padStart(2, '0');
        const month = (dep.getMonth() + 1).toString().padStart(2, '0');
        const year = dep.getFullYear();
        return { time: `${hours}:${minutes}`, date: `${day}.${month}.${year}` };
    };
    let timeStr = (r.time as string) || '';
    let dateStr = (r.date as string) || '';
    if (r.departure_time) {
        const formatted = formatRideTime(String(r.departure_time));
        if (formatted.time) timeStr = formatted.time;
        if (formatted.date) dateStr = formatted.date;
    }
    const fromLoc = r.from_location as Record<string, unknown> | string | undefined;
    const toLoc = r.to_location as Record<string, unknown> | string | undefined;
    return {
        from:
            typeof fromLoc === 'string'
                ? fromLoc
                : String(
                      (fromLoc as { name?: string; city?: string })?.name ||
                          (fromLoc as { city?: string })?.city ||
                          r.from ||
                          '',
                  ),
        to:
            typeof toLoc === 'string'
                ? toLoc
                : String(
                      (toLoc as { name?: string; city?: string })?.name ||
                          (toLoc as { city?: string })?.city ||
                          r.to ||
                          '',
                  ),
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

/** Maps a single API post row to a FeedItem (home feed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- API row shape
export function mapApiPostToFeedItem(post: any): FeedItem {
    let rideData: Record<string, unknown> = {};
    if (post.ride_data) {
        rideData = buildRideDataFromJoin(post);
    } else if (
        (post.post_type === 'ride' || post.post_type === 'ride_offered') &&
        post.metadata
    ) {
        rideData = buildRideDataFromMetadata(post.metadata);
    }

    const author = post.author || {};
    const userId = author.id || post.author_id || 'unknown';
    const userName = author.name || 'common.unknownUser';
    const userAvatar = author.avatar_url || undefined;
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

    const firstImage = post.images?.length > 0 ? post.images[0] : null;
    const thumbnail = chMapped?.thumbnail ?? firstImage;

    const created = post.created_at && !isNaN(new Date(post.created_at).getTime())
        ? new Date(post.created_at).toISOString()
        : new Date().toISOString();

    return {
        id: post.id,
        type: post.post_type || 'post',
        subtype: post.post_type,
        title: post.title || 'post.noTitle',
        description: post.description || '',
        thumbnail,
        user: {
            id: userId,
            name: userName,
            avatar: userAvatar,
            emailVerified,
        },
        likes: parseInt(post.likes || '0', 10),
        comments: parseInt(post.comments || '0', 10),
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
    } as FeedItem;
}
