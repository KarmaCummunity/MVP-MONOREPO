import colors from '../../globals/colors';
import { enhancedDB } from '../../utils/enhancedDatabaseService';
import { apiService } from '../../utils/apiService';
import type { ProfileRecentActivity } from './profileScreenActivity.types';
import { donationActivityTitle } from './profileDonationActivityTitle';

type ActivityDraft = Omit<ProfileRecentActivity, 'time'> & { time: string };

function formatRelativeTimeHebrew(isoTime: string): string {
  const activityTime = new Date(isoTime);
  const now = new Date();
  const diffMs = now.getTime() - activityTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'לפני רגע';
  }
  if (diffMins < 60) {
    return `לפני ${diffMins} דקות`;
  }
  if (diffHours < 24) {
    return `לפני ${diffHours} שעות`;
  }
  if (diffDays < 7) {
    return `לפני ${diffDays} ימים`;
  }
  return activityTime.toLocaleDateString('he-IL');
}

function donationCreatorMatchesUser(donation: Record<string, unknown>, userId: string): boolean {
  const createdBy =
    donation.createdBy ??
    donation.created_by ??
    donation.donor_id ??
    donation.donorId;
  return createdBy === userId;
}

function recordTime(record: Record<string, unknown>): string {
  const raw = record.created_at ?? record.createdAt;
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  return new Date().toISOString();
}

function recordId(record: Record<string, unknown>, fallback: string): string {
  const raw = record.id;
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  return fallback;
}

function pickTitle(record: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return fallback;
}

async function appendPostActivities(userId: string, activities: ActivityDraft[]): Promise<void> {
  try {
    const { db } = require('../../utils/databaseService');
    const userPosts = (await db.getUserPosts(userId)) || [];
    userPosts.forEach((post: Record<string, unknown>, index: number) => {
      activities.push({
        id: `post_${recordId(post, 'idx-' + String(index))}`,
        type: 'post',
        title: pickTitle(post, ['title', 'content'], 'פוסט חדש'),
        time: recordTime(post),
        icon: 'image-outline',
        color: colors.info,
        rawData: post,
      });
    });
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

async function appendItemActivities(userId: string, activities: ActivityDraft[]): Promise<void> {
  try {
    const { USE_BACKEND, API_BASE_URL } = await import('../../utils/dbConfig');
    let userItems: Record<string, unknown>[] = [];

    if (USE_BACKEND && API_BASE_URL) {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
          params: {
            owner_id: userId,
            limit: 20,
          },
        });
        if (response.data?.success && Array.isArray(response.data.data)) {
          userItems = response.data.data;
        }
      } catch (error) {
        console.error('Error loading items from API:', error);
      }
    } else {
      const { db } = require('../../utils/databaseService');
      userItems = (await db.getDedicatedItemsByOwner(userId)) || [];
    }

    userItems.forEach((item, index) => {
      activities.push({
        id: `item_${recordId(item, 'idx-' + String(index))}`,
        type: 'item',
        title: pickTitle(item, ['title'], 'פריט חדש'),
        time: recordTime(item),
        icon: 'cube-outline',
        color: colors.pink,
        rawData: item,
      });
    });
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

async function appendDonationActivities(userId: string, activities: ActivityDraft[]): Promise<void> {
  try {
    const allDonations = await enhancedDB.getDonations({});
    const userDonations = allDonations.filter((d: Record<string, unknown>) =>
      donationCreatorMatchesUser(d, userId),
    );

    userDonations.forEach((donation: Record<string, unknown>, index: number) => {
      activities.push({
        id: `donation_${recordId(donation, 'idx-' + String(index))}`,
        type: 'donation',
        title: donationActivityTitle({
          type: donation.type as string | undefined,
          amount: donation.amount as number | undefined,
          title: donation.title as string | undefined,
        }),
        time: recordTime(donation),
        icon: 'heart-outline',
        color: colors.error,
        rawData: donation,
      });
    });
  } catch (error) {
    console.error('Error loading donations:', error);
  }
}

function rideEndpointLabel(loc: unknown): string {
  if (typeof loc === 'string') {
    return loc;
  }
  if (loc && typeof loc === 'object') {
    const o = loc as Record<string, unknown>;
    const name = o.name;
    const city = o.city;
    if (typeof name === 'string' && name.trim()) {
      return name;
    }
    if (typeof city === 'string' && city.trim()) {
      return city;
    }
  }
  return 'לא צויין';
}

async function appendRideActivities(userId: string, activities: ActivityDraft[]): Promise<void> {
  try {
    const userRidesResponse = await apiService.getUserRides(userId, 'driver');
    if (!userRidesResponse.success || !Array.isArray(userRidesResponse.data)) {
      return;
    }
    userRidesResponse.data.forEach((ride: Record<string, unknown>, index: number) => {
      const fromLoc = ride.from ?? ride.from_location;
      const toLoc = ride.to ?? ride.to_location;
      activities.push({
        id: `ride_${recordId(ride, 'idx-' + String(index))}`,
        type: 'ride',
        title: `טרמפ: ${rideEndpointLabel(fromLoc)} ➝ ${rideEndpointLabel(toLoc)}`,
        time: recordTime(ride),
        icon: 'car-sport-outline',
        color: colors.info,
        rawData: ride,
      });
    });
  } catch (error) {
    console.error('Error loading rides:', error);
  }
}

async function appendTaskPostActivities(
  userId: string,
  selectedUserIdForPosts: string | undefined,
  activities: ActivityDraft[],
): Promise<void> {
  try {
    const taskPostsRes = await apiService.getUserPosts(userId, 50, selectedUserIdForPosts);
    if (!taskPostsRes.success || !Array.isArray(taskPostsRes.data)) {
      return;
    }
    taskPostsRes.data.forEach((p: Record<string, unknown>, index: number) => {
      if (p.post_type !== 'task_assignment' && p.post_type !== 'task_completion') {
        return;
      }
      const icon =
        p.post_type === 'task_assignment' ? 'add-circle-outline' : 'checkmark-circle-outline';
      const color = p.post_type === 'task_assignment' ? colors.info : colors.success;
      const typeLabel = p.post_type === 'task_assignment' ? 'משימה חדשה' : 'משימה הושלמה';
      activities.push({
        id: `taskpost_${recordId(p, 'idx-' + String(index))}`,
        type: 'task_post',
        subtype: String(p.post_type),
        title: pickTitle(p, ['title'], typeLabel),
        time:
          typeof p.created_at === 'string' || typeof p.created_at === 'number'
            ? String(p.created_at)
            : new Date().toISOString(),
        icon,
        color,
        rawData: p,
      });
    });
  } catch (error) {
    console.error('Error loading task posts:', error);
  }
}

async function appendStandaloneTaskActivities(userId: string, activities: ActivityDraft[]): Promise<void> {
  try {
    const existingTaskIds = new Set<string>();
    for (const a of activities) {
      if (a.type !== 'task_post' || !a.rawData || typeof a.rawData !== 'object') {
        continue;
      }
      const taskId = (a.rawData as { task?: { id?: string | number } }).task?.id;
      if (taskId !== undefined && taskId !== null) {
        existingTaskIds.add(String(taskId));
      }
    }

    const tasksRes = await apiService.getTasks({ assignee: userId, limit: 50 });
    if (!tasksRes.success || !Array.isArray(tasksRes.data)) {
      return;
    }
    tasksRes.data.forEach((task: Record<string, unknown>, index: number) => {
      const tid = recordId(task, 'idx-' + String(index));
      if (existingTaskIds.has(tid)) {
        return;
      }
      activities.push({
        id: `task_${tid}`,
        type: 'task',
        title: pickTitle(task, ['title'], 'משימה חדשה'),
        time:
          typeof task.created_at === 'string' || typeof task.created_at === 'number'
            ? String(task.created_at)
            : new Date().toISOString(),
        icon: 'checkmark-circle-outline',
        color: colors.success,
        rawData: task,
      });
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

export async function fetchRecentActivitiesForProfile(
  userId: string,
  selectedUserIdForPosts: string | undefined,
): Promise<ProfileRecentActivity[]> {
  const activities: ActivityDraft[] = [];

  await appendPostActivities(userId, activities);
  await appendItemActivities(userId, activities);
  await appendDonationActivities(userId, activities);
  await appendRideActivities(userId, activities);
  await appendTaskPostActivities(userId, selectedUserIdForPosts, activities);
  await appendStandaloneTaskActivities(userId, activities);

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return activities.slice(0, 5).map((activity) => ({
    ...activity,
    time: formatRelativeTimeHebrew(activity.time),
  }));
}
