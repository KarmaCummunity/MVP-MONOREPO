import type { FeedItem } from '../../types/feed';

/** Maps API post rows to FeedItem for Trump (rides) screen — ride_data / metadata / author. */
export function mapPostToFeedItemForTrumpScreen(post: any): FeedItem {
  let rideData: Record<string, unknown> = {};
  const formatRideTime = (dateIso: string) => {
    if (!dateIso) return { time: '', date: '' };
    const dep = new Date(dateIso);
    if (isNaN(dep.getTime())) return { time: '', date: '' };

    const hours = dep.getHours().toString().padStart(2, '0');
    const minutes = dep.getMinutes().toString().padStart(2, '0');
    const day = dep.getDate().toString().padStart(2, '0');
    const month = (dep.getMonth() + 1).toString().padStart(2, '0');
    const year = dep.getFullYear();

    return {
      time: `${hours}:${minutes}`,
      date: `${day}.${month}.${year}`,
    };
  };

  if (post.ride_data) {
    const rd = post.ride_data;
    const { time, date } = formatRideTime(rd.departure_time);
    rideData = {
      from:
        typeof rd.from_location === 'string'
          ? rd.from_location
          : rd.from_location?.name || rd.from_location?.city || '',
      to:
        typeof rd.to_location === 'string'
          ? rd.to_location
          : rd.to_location?.name || rd.to_location?.city || '',
      seats: rd.available_seats || 0,
      price: rd.price_per_seat || 0,
      time,
      date,
    };
  } else if ((post.post_type === 'ride' || post.post_type === 'ride_offered') && post.metadata) {
    const meta = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;
    const r = meta.ride || meta;
    let timeStr = r.time || '';
    let dateStr = r.date || '';
    if (r.departure_time) {
      const formatted = formatRideTime(r.departure_time);
      if (formatted.time) timeStr = formatted.time;
      if (formatted.date) dateStr = formatted.date;
    }
    rideData = {
      from:
        typeof r.from_location === 'string'
          ? r.from_location
          : r.from_location?.name || r.from_location?.city || r.from || '',
      to:
        typeof r.to_location === 'string'
          ? r.to_location
          : r.to_location?.name || r.to_location?.city || r.to || '',
      seats: r.available_seats || r.seats || 0,
      price: r.price_per_seat || r.price || 0,
      time: timeStr,
      date: dateStr,
    };
  }

  const author = post.author || {};
  const userId = author.id || post.author_id || 'unknown';
  const userName = author.name || 'common.unknownUser';
  const userAvatar = author.avatar_url || undefined;

  const rideDataObj =
    post.ride_data && typeof post.ride_data === 'object'
      ? (post.ride_data as Record<string, unknown>)
      : {};
  const rideId = (post.ride_id as string | undefined) || (rideDataObj.id as string | undefined);
  const rideStatus = (rideDataObj.status as string | undefined) || undefined;
  const rawPostType = post.post_type || 'post';
  /** PostReelItem ride branch expects subtype `ride` (API may send ride_offered). */
  const subtype = rawPostType === 'ride_offered' ? 'ride' : rawPostType;

  return {
    id: post.id,
    type: post.post_type || 'post',
    subtype,
    title: post.title || 'post.noTitle',
    description: post.description || '',
    thumbnail: post.images && post.images.length > 0 ? post.images[0] : null,
    user: {
      id: userId,
      name: userName,
      avatar: userAvatar,
    },
    likes: parseInt(post.likes || '0', 10),
    comments: parseInt(post.comments || '0', 10),
    isLiked: post.is_liked || false,
    timestamp:
      post.created_at && !isNaN(new Date(post.created_at).getTime())
        ? new Date(post.created_at).toISOString()
        : new Date().toISOString(),
    rideId,
    status: rideStatus,
    ...rideData,
  } as FeedItem;
}
