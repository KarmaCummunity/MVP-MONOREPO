/**
 * Open profile tab: aggregates posts, items, rides, tasks, donations.
 * Split out to keep OpenRoute.tsx shallow for Sonar cognitive complexity.
 */
import { apiService } from '../../utils/apiService';
import { enhancedDB } from '../../utils/enhancedDatabaseService';
import type { ProfileOpenTabUser } from '../../utils/profileOpenTabPostEntry';
import {
  buildOpenTabEntryFromPost,
  classifyOpenProfilePost,
} from '../../utils/profileOpenTabPostEntry';
import { formatRideTime } from './profileScreenHelpers';
import { logger } from '../../utils/loggerService';

export type OpenTabLoaderArgs = {
  targetUserId: string;
  viewerUserId?: string;
  user: ProfileOpenTabUser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy DB handle from databaseService
  db: any;
};

function tabPreviewUser(user: ProfileOpenTabUser) {
  if (!user?.id) {
    return { id: 'unknown' as const };
  }
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    karmaPoints: user.karmaPoints,
  };
}

async function loadPostsIntoOpenTab(
  args: OpenTabLoaderArgs,
  allContent: unknown[],
  existingRideIds: Set<string>,
  existingItemIds: Set<string>,
): Promise<void> {
  try {
    const res = await apiService.getUserPosts(args.targetUserId, 50, args.viewerUserId);
    if (!res.success || !Array.isArray(res.data)) {
      return;
    }

    res.data.forEach((p: Record<string, unknown>) => {
      const row = classifyOpenProfilePost(p);
      if (!row?.shouldInclude) {
        return;
      }
      const rideData = p.ride_data as { id?: string } | undefined;
      const itemData = p.item_data as { id?: string } | undefined;
      if (row.type === 'ride' && rideData?.id) {
        existingRideIds.add(rideData.id);
      }
      if ((row.type === 'item' || row.type === 'donation') && itemData?.id) {
        existingItemIds.add(itemData.id);
      }
      allContent.push(buildOpenTabEntryFromPost(p, args.user, row));
    });
    logger.debug('OpenRoute', 'Loaded posts from API', { count: res.data.length });
  } catch (error) {
    console.error('Error loading posts from API:', error);
  }
}

async function fetchOwnerItemsOpenStatuses(args: OpenTabLoaderArgs): Promise<Record<string, unknown>[]> {
  const { USE_BACKEND, API_BASE_URL } = await import('../../utils/dbConfig');
  let userItems: Record<string, unknown>[] = [];

  if (USE_BACKEND && API_BASE_URL) {
    try {
      const axios = (await import('axios')).default;
      const availableResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
        params: { owner_id: args.targetUserId, status: 'available', limit: 50 },
      });
      if (availableResponse.data?.success && Array.isArray(availableResponse.data.data)) {
        userItems.push(...availableResponse.data.data);
      }
      const reservedResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
        params: { owner_id: args.targetUserId, status: 'reserved', limit: 50 },
      });
      if (reservedResponse.data?.success && Array.isArray(reservedResponse.data.data)) {
        userItems.push(...reservedResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading items from API:', error);
    }
  } else {
    try {
      const allItems = (await args.db.getDedicatedItemsByOwner(args.targetUserId)) || [];
      userItems = allItems.filter(
        (item: { status?: string }) =>
          item.status === 'available' || item.status === 'reserved',
      );
    } catch (error) {
      console.error('Error loading items from local DB:', error);
    }
  }
  return userItems;
}

function itemThumbnailFromRaw(item: { image_base64?: string }): string {
  const imageData = item.image_base64;
  if (!imageData) {
    return '';
  }
  if (imageData.startsWith('data:image') || imageData.startsWith('http')) {
    return imageData;
  }
  if (imageData.length > 100) {
    return `data:image/jpeg;base64,${imageData}`;
  }
  return '';
}

function appendOrphanItemsToOpenTab(
  userItems: Record<string, unknown>[],
  existingItemIds: Set<string>,
  allContent: unknown[],
  user: ProfileOpenTabUser,
): void {
  userItems.forEach((item) => {
    const id = item.id;
    if (typeof id !== 'string' || existingItemIds.has(id)) {
      return;
    }
    const thumbnail = itemThumbnailFromRaw(item as { image_base64?: string });
    allContent.push({
      id: `item_${id}`,
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
      user: tabPreviewUser(user),
      itemData: {
        ...item,
        price: item.price,
      },
      price: item.price,
      rawData: item,
    });
  });
}

function departureTimeString(ride: Record<string, unknown>): string {
  const raw = ride.departure_time;
  if (typeof raw === 'string') {
    return raw;
  }
  return '';
}

function rideTimeString(ride: Record<string, unknown>): string {
  const raw = ride.time;
  return typeof raw === 'string' ? raw : '';
}

async function appendOrphanRidesToOpenTab(
  args: OpenTabLoaderArgs,
  existingRideIds: Set<string>,
  allContent: unknown[],
): Promise<void> {
  try {
    const allRides = await enhancedDB.getRides({});
    logger.debug('OpenRoute', 'Fetched rides', { count: allRides.length });

    const userRides = allRides.filter((ride: Record<string, unknown>) => {
      const driverId =
        ride.driver_id || ride.createdBy || ride.created_by || ride.driverId;
      const status = (ride.status as string) || 'active';
      return driverId === args.targetUserId && (status === 'active' || status === 'full');
    });

    logger.debug('OpenRoute', 'User rides count', { count: userRides.length });

    userRides.forEach((ride: Record<string, unknown>) => {
      const rideId = ride.id;
      if (typeof rideId !== 'string' || existingRideIds.has(rideId)) {
        return;
      }
      const fromLoc = ride.from_location as Record<string, string> | undefined;
      const toLoc = ride.to_location as Record<string, string> | undefined;
      const fromLocation =
        (ride.from as string) ||
        fromLoc?.name ||
        fromLoc?.city ||
        '';
      const toLocation =
        (ride.to as string) ||
        toLoc?.name ||
        toLoc?.city ||
        '';

      let time = '';
      let date = '';
      const depStr = departureTimeString(ride);
      if (depStr) {
        const formatted = formatRideTime(depStr);
        time = formatted.time;
        date = formatted.date;
      } else {
        const tStr = rideTimeString(ride);
        if (tStr) {
          time = tStr;
          date = typeof ride.date === 'string' ? ride.date : '';
        }
      }

      allContent.push({
        id: `ride_${rideId}`,
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
        user: tabPreviewUser(args.user),
        rideData: ride,
        rawData: ride,
        rideId,
      });
    });
  } catch (error) {
    console.error('[ProfileScreen OpenRoute] Error loading rides:', error);
  }
}

async function appendOpenTasksToOpenTab(
  args: OpenTabLoaderArgs,
  allContent: unknown[],
): Promise<void> {
  try {
    const rows = allContent as Record<string, unknown>[];
    const existingTaskIds = new Set<string>();
    for (const c of rows) {
      const td = c.taskData as { id?: string } | undefined;
      if (typeof td?.id === 'string' && td.id.length > 0) {
        existingTaskIds.add(td.id);
      }
      const taskId = c.taskId;
      if (typeof taskId === 'string' && taskId.length > 0) {
        existingTaskIds.add(taskId);
      }
    }

    const openTasksRes = await apiService.getTasks({
      assignee: args.targetUserId,
      status: 'open',
      limit: 50,
    });
    const inProgressTasksRes = await apiService.getTasks({
      assignee: args.targetUserId,
      status: 'in_progress',
      limit: 50,
    });
    const tasks = [
      ...(openTasksRes.success && Array.isArray(openTasksRes.data) ? openTasksRes.data : []),
      ...(inProgressTasksRes.success && Array.isArray(inProgressTasksRes.data)
        ? inProgressTasksRes.data
        : []),
    ];

    tasks.forEach((task: Record<string, unknown>) => {
      const taskId = task.id;
      if (typeof taskId !== 'string') {
        return;
      }
      if (existingTaskIds.has(taskId)) {
        logger.debug('OpenRoute', 'Skipping duplicate task', { taskId });
        return;
      }

      allContent.push({
        id: `task_${taskId}`,
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
        user: tabPreviewUser(args.user),
        taskData: {
          id: taskId,
          title: task.title,
          status: task.status,
        },
        rawData: task,
      });
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

async function appendActiveDonationsToOpenTab(
  args: OpenTabLoaderArgs,
  allContent: unknown[],
): Promise<void> {
  try {
    const donationsRes = await apiService.getUserDonations(args.targetUserId);
    if (!donationsRes.success || !Array.isArray(donationsRes.data)) {
      return;
    }

    const activeDonations = donationsRes.data.filter(
      (donation: { status?: string }) => donation.status === 'active',
    );
    activeDonations.forEach((donation: Record<string, unknown>) => {
      const images = donation.images as unknown[] | undefined;
      if (typeof donation.id !== 'string') {
        return;
      }
      allContent.push({
        id: `donation_${donation.id}`,
        title: donation.title,
        description: donation.description || '',
        thumbnail: images && images.length > 0 ? images[0] : null,
        likes: 0,
        comments: 0,
        isLiked: false,
        timestamp: donation.created_at || new Date().toISOString(),
        type: 'post',
        subtype: 'donation',
        status: donation.status,
        user: tabPreviewUser(args.user),
        rawData: donation,
      });
    });
  } catch (error) {
    console.error('Error loading donations:', error);
  }
}

export async function collectOpenTabFeed(args: OpenTabLoaderArgs): Promise<unknown[]> {
  logger.debug('OpenRoute', 'Loading open content for userId', {
    targetUserId: args.targetUserId,
  });

  const allContent: unknown[] = [];
  const existingRideIds = new Set<string>();
  const existingItemIds = new Set<string>();

  await loadPostsIntoOpenTab(args, allContent, existingRideIds, existingItemIds);

  const userItems = await fetchOwnerItemsOpenStatuses(args);
  appendOrphanItemsToOpenTab(userItems, existingItemIds, allContent, args.user);

  await appendOrphanRidesToOpenTab(args, existingRideIds, allContent);
  await appendOpenTasksToOpenTab(args, allContent);
  await appendActiveDonationsToOpenTab(args, allContent);

  logger.debug('OpenRoute', 'Total open content', { count: allContent.length });
  return allContent;
}
