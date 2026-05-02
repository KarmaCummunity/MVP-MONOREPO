import { mapCommunityChallengeFeedFields } from './mapCommunityChallengeFeedFields';

function formatRideTime(dateIso: string) {
    if (!dateIso) return { time: '', date: '' };
    const dep = new Date(dateIso);
    if (isNaN(dep.getTime())) return { time: '', date: '' };
    const hours = dep.getHours().toString().padStart(2, '0');
    const minutes = dep.getMinutes().toString().padStart(2, '0');
    const day = dep.getDate().toString().padStart(2, '0');
    const month = (dep.getMonth() + 1).toString().padStart(2, '0');
    const year = dep.getFullYear();
    return { time: `${hours}:${minutes}`, date: `${day}.${month}.${year}` };
}

function rideLocationsFromPost(p: {
    ride_data?: {
        from_location?: { city?: string; name?: string; address?: string };
        to_location?: { city?: string; name?: string; address?: string };
        available_seats?: number;
        price_per_seat?: number;
        departure_time?: string;
    };
}) {
    let fromLocation = '';
    let toLocation = '';
    let seats = 0;
    let price = 0;
    let time = '';
    let date = '';
    const rData = p.ride_data;
    if (rData) {
        fromLocation =
            rData.from_location?.city ||
            rData.from_location?.name ||
            rData.from_location?.address ||
            '';
        toLocation =
            rData.to_location?.city ||
            rData.to_location?.name ||
            rData.to_location?.address ||
            '';
        seats = rData.available_seats || 0;
        price = rData.price_per_seat || 0;
        if (rData.departure_time) {
            const formatted = formatRideTime(rData.departure_time);
            time = formatted.time;
            date = formatted.date;
        }
    }
    return { fromLocation, toLocation, seats, price, time, date };
}

export type ProfileOpenTabUser = {
    id: string;
    name?: string;
    avatar?: string;
    karmaPoints?: number;
} | null;

/** Classifies an API post for the profile "open" tab; returns null if it should not appear. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function classifyOpenProfilePost(p: any): {
    shouldInclude: boolean;
    status: string;
    type: string;
} | null {
    if (p.post_type === 'task_assignment' || p.post_type === 'task_completion') {
        const taskStatus = p.task?.status;
        const shouldInclude =
            taskStatus === 'open' || taskStatus === 'in_progress';
        return {
            shouldInclude,
            status: taskStatus || 'open',
            type: 'task',
        };
    }
    if (p.ride_data || p.post_type === 'ride') {
        const rideStatus = p.ride_data?.status || 'active';
        const shouldInclude = rideStatus === 'active' || rideStatus === 'full';
        return { shouldInclude, status: rideStatus, type: 'ride' };
    }
    if (p.post_type === 'community_challenge') {
        return { shouldInclude: true, status: 'active', type: 'post' };
    }
    if ((p.item_data || p.post_type === 'item') || p.post_type === 'donation') {
        const itemStatus = p.item_data?.status || 'available';
        const shouldInclude =
            itemStatus === 'available' ||
            itemStatus === 'reserved' ||
            itemStatus === 'active';
        return {
            shouldInclude,
            status: itemStatus,
            type: p.post_type === 'donation' ? 'donation' : 'item',
        };
    }
    return { shouldInclude: true, status: 'active', type: 'post' };
}

/** Builds the feed-like object pushed to the profile open-tab list. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildOpenTabEntryFromPost(
    p: any,
    user: ProfileOpenTabUser,
    row: { type: string; status: string },
) {
    const { type, status } = row;
    const { fromLocation, toLocation, seats, price, time, date } =
        type === 'ride' ? rideLocationsFromPost(p) : { fromLocation: '', toLocation: '', seats: 0, price: 0, time: '', date: '' };

    const chMapped =
        p.post_type === 'community_challenge'
            ? mapCommunityChallengeFeedFields(p)
            : null;

    const firstPostImage = p.images?.length > 0 ? p.images[0] : null;
    const thumbnail = chMapped?.thumbnail ?? firstPostImage;

    return {
        id: p.id,
        title: p.title || '',
        thumbnail,
        likes: p.likes || 0,
        comments: p.comments || 0,
        isLiked: p.is_liked || false,
        type: type as 'post' | 'task' | 'ride' | 'item' | 'donation',
        subtype: p.post_type,
        description: p.description || '',
        timestamp: p.created_at,
        status,
        user: user
            ? {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  karmaPoints: user.karmaPoints,
              }
            : { id: 'unknown' },
        taskData: p.task,
        rideData: p.ride_data,
        itemData: p.item_data,
        from: fromLocation,
        to: toLocation,
        seats,
        price,
        time,
        date,
        rawData: p,
        rideId: p.ride_id || p.ride_data?.id,
        itemId:
            p.item_data?.id ||
            (p.item_id && !/^\d{10,13}$/.test(p.item_id) ? p.item_id : undefined),
        taskId: p.task_id || p.task?.id,
        challengeId: chMapped?.challengeId,
        challengeData: chMapped?.challengeData,
    };
}
