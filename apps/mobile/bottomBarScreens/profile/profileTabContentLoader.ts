/**
 * Shared loader for profile Open / Closed tabs (single fetch, consistent counts).
 */
import { apiService } from '../../utils/apiService';
import { enhancedDB } from '../../utils/enhancedDatabaseService';
import {
  buildOpenTabEntryFromPost,
  classifyOpenProfilePost,
  type ProfileOpenTabUser,
} from '../../utils/profileOpenTabPostEntry';
import { formatRideTime } from './profileScreenHelpers';
import { logger } from '../../utils/loggerService';

export type ProfileTabFeedItem = Record<string, unknown>;

export type ProfileTabBuckets = {
  openItems: ProfileTabFeedItem[];
  closedItems: ProfileTabFeedItem[];
};

/** Parent-driven tab data: idle before load, loading in flight, then both buckets. */
export type ProfileTabBucketState =
  | 'idle'
  | 'loading'
  | { open: ProfileTabFeedItem[]; closed: ProfileTabFeedItem[] };

type DbModule = { getDedicatedItemsByOwner: (userId: string) => Promise<any[]> };

/**
 * Loads open-tab and closed-tab feed items for a user using the same rules as
 * OpenRoute / ClosedRoute (deduped by ride/item ids from posts first).
 */
export async function loadProfileOpenClosedTabContent(params: {
  targetUserId: string;
  viewerId?: string;
  user: ProfileOpenTabUser;
  db: DbModule;
}): Promise<ProfileTabBuckets> {
  const { targetUserId, viewerId, user, db } = params;
  const openItems: ProfileTabFeedItem[] = [];
  const closedItems: ProfileTabFeedItem[] = [];

  const { USE_BACKEND, API_BASE_URL } = await import('../../utils/dbConfig');

  const openExistingRideIds = new Set<string>();
  const openExistingItemIds = new Set<string>();
  const closedExistingRideIds = new Set<string>();
  const closedExistingItemIds = new Set<string>();

  try {
    const res = await apiService.getUserPosts(targetUserId, 50, viewerId);
    if (res.success && Array.isArray(res.data)) {
      (res.data as any[]).forEach((p: any) => {
        const openRow = classifyOpenProfilePost(p);
        if (openRow?.shouldInclude) {
          if (openRow.type === 'ride' && p.ride_data?.id) {
            openExistingRideIds.add(p.ride_data.id);
          }
          if ((openRow.type === 'item' || openRow.type === 'donation') && p.item_data?.id) {
            openExistingItemIds.add(p.item_data.id);
          }
          openItems.push(buildOpenTabEntryFromPost(p, user, openRow) as ProfileTabFeedItem);
        }

        let closedInclude = false;
        let closedStatus = 'closed';
        let closedType = 'post';
        const subtype = p.post_type;

        if (p.post_type === 'task_assignment' || p.post_type === 'task_completion') {
          const taskStatus = p.task?.status;
          closedInclude = taskStatus === 'done' || taskStatus === 'archived';
          closedStatus = taskStatus || 'done';
          closedType = 'task';
        } else if (p.ride_data || p.post_type === 'ride') {
          const rideStatus = p.ride_data?.status;
          closedInclude = rideStatus === 'completed' || rideStatus === 'cancelled';
          closedStatus = rideStatus || 'completed';
          closedType = 'ride';
          if (closedInclude && p.ride_data?.id) {
            closedExistingRideIds.add(p.ride_data.id);
          }
        } else if (p.item_data || p.post_type === 'item' || p.post_type === 'donation') {
          const itemStatus = p.item_data?.status;
          closedInclude =
            itemStatus === 'delivered' || itemStatus === 'completed' || itemStatus === 'expired';
          closedStatus = itemStatus || 'completed';
          closedType = p.post_type === 'donation' ? 'donation' : 'item';
          if (closedInclude && p.item_data?.id) {
            closedExistingItemIds.add(p.item_data.id);
          }
        } else {
          closedInclude = false;
        }

        if (closedInclude) {
          let fromLocation = '';
          let toLocation = '';
          let seats = 0;
          let price = 0;
          let time = '';
          let date = '';

          if (closedType === 'ride') {
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
          }

          closedItems.push({
            id: p.id,
            title: p.title || '',
            thumbnail: p.images?.length > 0 ? p.images[0] : null,
            likes: p.likes || 0,
            comments: p.comments || 0,
            isLiked: p.is_liked || false,
            type: closedType,
            subtype,
            description: p.description || '',
            timestamp: p.created_at,
            status: closedStatus,
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
          });
        }
      });
    }
  } catch (error) {
    console.error('[profileTabContentLoader] Error loading posts from API:', error);
  }

  let openUserItems: any[] = [];
  let closedUserItems: any[] = [];

  if (USE_BACKEND && API_BASE_URL) {
    try {
      const axios = (await import('axios')).default;
      const [availableResponse, reservedResponse, deliveredResponse, completedResponse] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
            params: { owner_id: targetUserId, status: 'available', limit: 50 },
          }),
          axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
            params: { owner_id: targetUserId, status: 'reserved', limit: 50 },
          }),
          axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
            params: { owner_id: targetUserId, status: 'delivered', limit: 50 },
          }),
          axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
            params: { owner_id: targetUserId, status: 'completed', limit: 50 },
          }),
        ]);

      if (availableResponse.data?.success && Array.isArray(availableResponse.data.data)) {
        openUserItems.push(...availableResponse.data.data);
      }
      if (reservedResponse.data?.success && Array.isArray(reservedResponse.data.data)) {
        openUserItems.push(...reservedResponse.data.data);
      }
      if (deliveredResponse.data?.success && Array.isArray(deliveredResponse.data.data)) {
        closedUserItems.push(...deliveredResponse.data.data);
      }
      if (completedResponse.data?.success && Array.isArray(completedResponse.data.data)) {
        closedUserItems.push(...completedResponse.data.data);
      }
    } catch (error) {
      console.error('[profileTabContentLoader] Error loading items from API:', error);
    }
  } else {
    try {
      const allItems = (await db.getDedicatedItemsByOwner(targetUserId)) || [];
      openUserItems = allItems.filter(
        (item: any) => item.status === 'available' || item.status === 'reserved',
      );
      closedUserItems = allItems.filter(
        (item: any) => item.status === 'delivered' || item.status === 'completed',
      );
    } catch (error) {
      console.error('[profileTabContentLoader] Error loading items from local DB:', error);
    }
  }

  const pushOpenItemRow = (item: any) => {
    if (openExistingItemIds.has(item.id)) {
      return;
    }
    let thumbnail = '';
    if (item.image_base64) {
      const imageData = item.image_base64;
      if (imageData.startsWith('data:image') || imageData.startsWith('http')) {
        thumbnail = imageData;
      } else if (imageData.length > 100) {
        thumbnail = `data:image/jpeg;base64,${imageData}`;
      }
    }
    openItems.push({
      id: `item_${item.id}`,
      title: item.title,
      description: item.description || '',
      thumbnail: thumbnail || null,
      likes: 0,
      comments: 0,
      isLiked: false,
      timestamp: item.created_at || new Date().toISOString(),
      type: 'post',
      subtype: 'item',
      status: item.status,
      user: user
        ? {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            karmaPoints: user.karmaPoints,
          }
        : { id: 'unknown' },
      itemData: { ...item, price: item.price },
      price: item.price,
      rawData: item,
    });
  };

  const pushClosedItemRow = (item: any) => {
    if (closedExistingItemIds.has(item.id)) {
      return;
    }
    let thumbnail = '';
    if (item.image_base64) {
      const imageData = item.image_base64;
      if (imageData.startsWith('data:image') || imageData.startsWith('http')) {
        thumbnail = imageData;
      } else if (imageData.length > 100) {
        thumbnail = `data:image/jpeg;base64,${imageData}`;
      }
    }
    closedItems.push({
      id: `item_${item.id}`,
      title: item.title,
      description: item.description || '',
      thumbnail: thumbnail || null,
      likes: 0,
      comments: 0,
      isLiked: false,
      timestamp: item.created_at || new Date().toISOString(),
      type: 'post',
      subtype: 'item',
      status: item.status,
      user: user
        ? {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            karmaPoints: user.karmaPoints,
          }
        : { id: 'unknown' },
      itemData: { ...item, price: item.price },
      price: item.price,
      rawData: item,
    });
  };

  openUserItems.forEach(pushOpenItemRow);
  closedUserItems.forEach(pushClosedItemRow);

  try {
    const allRides = await enhancedDB.getRides({});
    logger.debug('profileTabContentLoader', 'Fetched rides', { count: allRides.length });

    const openRides = allRides.filter((ride: any) => {
      const driverId = ride.driver_id || ride.createdBy || ride.created_by || ride.driverId;
      const status = ride.status || 'active';
      return driverId === targetUserId && (status === 'active' || status === 'full');
    });

    openRides.forEach((ride: any) => {
      if (openExistingRideIds.has(ride.id)) {
        return;
      }
      const fromLocation =
        ride.from || ride.from_location?.name || ride.from_location?.city || '';
      const toLocation = ride.to || ride.to_location?.name || ride.to_location?.city || '';
      let time = '';
      let date = '';
      if (ride.departure_time) {
        const formatted = formatRideTime(ride.departure_time);
        time = formatted.time;
        date = formatted.date;
      } else if (ride.time) {
        time = ride.time;
        date = ride.date || '';
      }
      openItems.push({
        id: `ride_${ride.id}`,
        title: `טרמפ: ${fromLocation} ➝ ${toLocation}`,
        description: ride.description || '',
        thumbnail: ride.image || null,
        likes: 0,
        comments: 0,
        isLiked: false,
        timestamp: ride.created_at || new Date().toISOString(),
        type: 'post',
        subtype: 'ride',
        status: ride.status || 'active',
        from: fromLocation,
        to: toLocation,
        seats: ride.available_seats || ride.seats || 0,
        price: ride.price_per_seat || ride.price || 0,
        time,
        date,
        user: user
          ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              karmaPoints: user.karmaPoints,
            }
          : { id: 'unknown' },
        rideData: ride,
        rawData: ride,
        rideId: ride.id,
      });
    });

    const closedRides = allRides.filter((ride: any) => {
      const createdBy = ride.createdBy || ride.created_by || ride.driver_id || ride.driverId;
      const status = ride.status || 'active';
      return createdBy === targetUserId && status === 'completed';
    });

    closedRides.forEach((ride: any) => {
      if (closedExistingRideIds.has(ride.id)) {
        return;
      }
      const fromLocation =
        ride.from || ride.from_location?.name || ride.from_location?.city || '';
      const toLocation = ride.to || ride.to_location?.name || ride.to_location?.city || '';
      let time = '';
      let date = '';
      if (ride.departure_time) {
        const formatted = formatRideTime(ride.departure_time);
        time = formatted.time;
        date = formatted.date;
      } else if (ride.time) {
        time = ride.time;
        date = ride.date || '';
      }
      closedItems.push({
        id: `ride_${ride.id}`,
        title: `טרמפ: ${fromLocation} ➝ ${toLocation}`,
        description: ride.description || '',
        thumbnail: ride.image || null,
        likes: 0,
        comments: 0,
        isLiked: false,
        timestamp: ride.created_at || new Date().toISOString(),
        type: 'post',
        subtype: 'ride',
        status: ride.status || 'completed',
        from: fromLocation,
        to: toLocation,
        seats: ride.available_seats || ride.seats || 0,
        price: ride.price_per_seat || ride.price || 0,
        time,
        date,
        user: user
          ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              karmaPoints: user.karmaPoints,
            }
          : { id: 'unknown' },
        rideData: ride,
        rawData: ride,
        rideId: ride.id,
      });
    });
  } catch (error) {
    console.error('[profileTabContentLoader] Error loading rides:', error);
  }

  try {
    const openTaskIdsFromOpenPosts = new Set(
      openItems
        .filter((c: any) => c.type === 'task' && c.taskData?.id)
        .map((c: any) => c.taskData.id),
    );
    const [openTasksRes, inProgressTasksRes] = await Promise.all([
      apiService.getTasks({ assignee: targetUserId, status: 'open', limit: 50 }),
      apiService.getTasks({ assignee: targetUserId, status: 'in_progress', limit: 50 }),
    ]);
    const openTasks = [
      ...(openTasksRes.success && Array.isArray(openTasksRes.data) ? openTasksRes.data : []),
      ...(inProgressTasksRes.success && Array.isArray(inProgressTasksRes.data)
        ? inProgressTasksRes.data
        : []),
    ];
    openTasks.forEach((task: any) => {
      if (openTaskIdsFromOpenPosts.has(task.id)) {
        return;
      }
      openItems.push({
        id: `task_${task.id}`,
        title: task.title,
        description: task.description || '',
        thumbnail: '',
        likes: 0,
        comments: 0,
        isLiked: false,
        timestamp: task.created_at || new Date().toISOString(),
        type: 'task_post',
        subtype: 'task_assignment',
        status: task.status,
        user: user
          ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              karmaPoints: user.karmaPoints,
            }
          : { id: 'unknown' },
        taskData: { id: task.id, title: task.title, status: task.status },
        rawData: task,
      });
    });
  } catch (error) {
    console.error('[profileTabContentLoader] Error loading open tasks:', error);
  }

  try {
    const closedTaskIdsFromClosedPosts = new Set(
      closedItems
        .filter((c: any) => c.type === 'task' && c.taskData?.id)
        .map((c: any) => c.taskData.id),
    );
    const [doneTasksRes, archivedTasksRes] = await Promise.all([
      apiService.getTasks({ assignee: targetUserId, status: 'done', limit: 50 }),
      apiService.getTasks({ assignee: targetUserId, status: 'archived', limit: 50 }),
    ]);
    const closedTasks = [
      ...(doneTasksRes.success && Array.isArray(doneTasksRes.data) ? doneTasksRes.data : []),
      ...(archivedTasksRes.success && Array.isArray(archivedTasksRes.data)
        ? archivedTasksRes.data
        : []),
    ];
    closedTasks.forEach((task: any) => {
      if (closedTaskIdsFromClosedPosts.has(task.id)) {
        return;
      }
      closedItems.push({
        id: `task_${task.id}`,
        title: task.title,
        description: task.description || '',
        thumbnail: '',
        likes: 0,
        comments: 0,
        isLiked: false,
        timestamp: task.created_at || new Date().toISOString(),
        type: 'task_post',
        subtype: 'task_assignment',
        status: task.status,
        user: user
          ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              karmaPoints: user.karmaPoints,
            }
          : { id: 'unknown' },
        taskData: { id: task.id, title: task.title, status: task.status },
        rawData: task,
      });
    });
  } catch (error) {
    console.error('[profileTabContentLoader] Error loading closed tasks:', error);
  }

  try {
    const donationsRes = await apiService.getUserDonations(targetUserId);
    if (donationsRes.success && Array.isArray(donationsRes.data)) {
      (donationsRes.data as any[]).forEach((donation: any) => {
        if (donation.status === 'active') {
          openItems.push({
            id: `donation_${donation.id}`,
            title: donation.title,
            description: donation.description || '',
            thumbnail: donation.images?.length > 0 ? donation.images[0] : null,
            likes: 0,
            comments: 0,
            isLiked: false,
            timestamp: donation.created_at || new Date().toISOString(),
            type: 'post',
            subtype: 'donation',
            status: donation.status,
            user: user
              ? {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  karmaPoints: user.karmaPoints,
                }
              : { id: 'unknown' },
            rawData: donation,
          });
        }
        if (donation.status === 'completed') {
          closedItems.push({
            id: `donation_${donation.id}`,
            title: donation.title,
            description: donation.description || '',
            thumbnail: donation.images?.length > 0 ? donation.images[0] : null,
            likes: 0,
            comments: 0,
            isLiked: false,
            timestamp: donation.created_at || new Date().toISOString(),
            type: 'post',
            subtype: 'donation',
            status: donation.status,
            user: user
              ? {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  karmaPoints: user.karmaPoints,
                }
              : { id: 'unknown' },
            rawData: donation,
          });
        }
      });
    }
  } catch (error) {
    console.error('[profileTabContentLoader] Error loading donations:', error);
  }

  return { openItems, closedItems };
}
