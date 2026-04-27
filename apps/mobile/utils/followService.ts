import { sendFollowNotification } from './notificationService';
import { db, DatabaseService } from './databaseService';
import { apiService } from './apiService';
import { USE_BACKEND } from './dbConfig';

/** Max concurrent profile fetches when hydrating follower/following lists (backend). */
const USER_FETCH_CONCURRENCY = 8;

/**
 * Normalize follow relation documents from REST/local storage (camelCase vs snake_case, nested data).
 */
export function followerIdFromRelation(rel: any): string | undefined {
  if (!rel || typeof rel !== 'object') return undefined;
  const nested = rel.data && typeof rel.data === 'object' ? rel.data : rel;
  const v =
    nested.followerId ??
    nested.follower_id ??
    rel.followerId ??
    rel.follower_id;
  return v != null && v !== '' ? String(v).trim() : undefined;
}

export function followingIdFromRelation(rel: any): string | undefined {
  if (!rel || typeof rel !== 'object') return undefined;
  const nested = rel.data && typeof rel.data === 'object' ? rel.data : rel;
  const v =
    nested.followingId ??
    nested.following_id ??
    rel.followingId ??
    rel.following_id;
  return v != null && v !== '' ? String(v).trim() : undefined;
}

export interface FollowRelationship {
  followerId: string;
  followingId: string;
  followDate: string;
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export const getUpdatedFollowCounts = async (userId: string): Promise<{ followersCount: number; followingCount: number }> => {
  try {
    const followers = await db.getFollowers(userId);
    const following = await db.getFollowing(userId);

    return {
      followersCount: followers.length,
      followingCount: following.length,
    };
  } catch (error) {
    console.error('❌ Get updated follow counts error:', error);
    return {
      followersCount: 0,
      followingCount: 0,
    };
  }
};

export const getFollowStats = async (userId: string, currentUserId: string): Promise<FollowStats> => {
  try {
    const targetId = String(userId).trim();
    const viewerId = String(currentUserId).trim();

    const followers = await db.getFollowers(targetId);
    const following = await db.getFollowing(targetId);

    // "Viewer follows target" means viewer appears among target's followers (not "in target's following list").
    const isFollowing = followers.some((rel: any) => followerIdFromRelation(rel) === viewerId);

    return {
      followersCount: followers.length,
      followingCount: following.length,
      isFollowing
    };
  } catch (error) {
    console.error('❌ Get follow stats error:', error);
    return {
      followersCount: 0,
      followingCount: 0,
      isFollowing: false
    };
  }
};

/**
 * For a list of user IDs, returns whether the viewer follows each user (single following-list read).
 */
export const getFollowingStateForUserIds = async (
  viewerId: string,
  candidateIds: string[]
): Promise<Record<string, { isFollowing: boolean }>> => {
  const out: Record<string, { isFollowing: boolean }> = {};
  const viewer = String(viewerId || '').trim();
  if (!viewer) {
    for (const id of candidateIds) {
      out[String(id).trim()] = { isFollowing: false };
    }
    return out;
  }
  try {
    const relations = await db.getFollowing(viewer);
    const followingSet = new Set(
      (relations as any[])
        .map((rel) => followingIdFromRelation(rel))
        .filter((id): id is string => !!id)
    );
    for (const raw of candidateIds) {
      const id = String(raw).trim();
      out[id] = { isFollowing: followingSet.has(id) };
    }
    return out;
  } catch (error) {
    console.error('❌ getFollowingStateForUserIds error:', error);
    for (const raw of candidateIds) {
      out[String(raw).trim()] = { isFollowing: false };
    }
    return out;
  }
};

export const followUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const fid = String(followerId).trim();
    const tid = String(followingId).trim();
    if (fid === tid) {
      return false;
    }

    if (USE_BACKEND) {
      const res = await apiService.followUser(tid, fid);
      if (!res.success) {
        return false;
      }
      try {
        await sendFollowNotification(fid, tid);
      } catch { /* optional */ }
      await updateFollowCounts(fid);
      await updateFollowCounts(tid);
      return true;
    }

    const existingFollowers = await db.getFollowers(tid);
    const isAlreadyFollowing = existingFollowers.some((rel: any) => followerIdFromRelation(rel) === fid);

    if (isAlreadyFollowing) {
      return false;
    }

    const newFollow: FollowRelationship = {
      followerId: fid,
      followingId: tid,
      followDate: new Date().toISOString()
    };

    await db.addFollower(tid, fid, newFollow);

    await db.addFollowing(fid, tid, newFollow);

    try {
      await sendFollowNotification(fid, tid);
    } catch { }

    await updateFollowCounts(fid);
    await updateFollowCounts(tid);

    return true;
  } catch (error) {
    console.error('❌ Follow user error:', error);
    return false;
  }
};

export const unfollowUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const fid = String(followerId).trim();
    const tid = String(followingId).trim();

    if (USE_BACKEND) {
      const res = await apiService.unfollowUser(tid, fid);
      if (!res.success) {
        return false;
      }
      await updateFollowCounts(fid);
      await updateFollowCounts(tid);
      return true;
    }

    await db.removeFollower(tid, fid);

    await db.removeFollowing(fid, tid);

    await updateFollowCounts(fid);
    await updateFollowCounts(tid);

    return true;
  } catch (error) {
    console.error('❌ Unfollow user error:', error);
    return false;
  }
};

function mapUserPreviewFromApi(user: any, id: string) {
  return {
    id: user.id || id,
    name: user.name || 'ללא שם',
    avatar: user.avatar_url || user.avatar || 'https://i.pravatar.cc/150?img=1',
    bio: user.bio || '',
    karmaPoints: user.karma_points || 0,
    followersCount: user.followers_count || 0,
    completedTasks: 0,
    roles: user.roles || ['user'],
    isVerified: false,
    isActive: user.is_active !== false,
  };
}

function minimalUserPreview(id: string) {
  return {
    id,
    name: 'ללא שם',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: '',
    karmaPoints: 0,
    followersCount: 0,
    completedTasks: 0,
    roles: ['user'],
    isVerified: false,
    isActive: false,
  };
}

async function mapPoolConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await mapper(items[i]);
    }
  }

  const n = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export const getFollowers = async (userId: string): Promise<any[]> => {
  try {
    const followers = await db.getFollowers(userId);
    const followerIds = (followers as any[])
      .map((rel: any) => followerIdFromRelation(rel))
      .filter((id): id is string => !!id);

    if (followerIds.length === 0) {
      return [];
    }

    // Fetch full user data from backend for each follower
    if (USE_BACKEND) {
      try {
        const users = await mapPoolConcurrency(followerIds, USER_FETCH_CONCURRENCY, async (id: string) => {
          try {
            const response = await apiService.getUserById(id);
            if (response.success && response.data) {
              return mapUserPreviewFromApi(response.data, id);
            }
          } catch (error) {
            console.warn(`Failed to fetch follower ${id}:`, error);
          }
          return minimalUserPreview(id);
        });

        return users.filter(user => user !== null);
      } catch (error) {
        console.error('❌ Get followers from backend error:', error);
      }
    }

    // Fallback: return minimal data with IDs only
    return followerIds.map((id: string) => ({
      id,
      name: 'ללא שם',
      avatar: 'https://i.pravatar.cc/150?img=1',
      bio: '',
      karmaPoints: 0,
      followersCount: 0,
      completedTasks: 0,
      roles: ['user'],
      isVerified: false,
      isActive: false,
    }));
  } catch (error) {
    console.error('❌ Get followers error:', error);
    return [];
  }
};

export const getFollowing = async (userId: string): Promise<any[]> => {
  try {
    const following = await db.getFollowing(userId);
    const followingIds = (following as any[])
      .map((rel: any) => followingIdFromRelation(rel))
      .filter((id): id is string => !!id);

    if (followingIds.length === 0) {
      return [];
    }

    // Fetch full user data from backend for each following user
    if (USE_BACKEND) {
      try {
        const users = await mapPoolConcurrency(followingIds, USER_FETCH_CONCURRENCY, async (id: string) => {
          try {
            const response = await apiService.getUserById(id);
            if (response.success && response.data) {
              return mapUserPreviewFromApi(response.data, id);
            }
          } catch (error) {
            console.warn(`Failed to fetch following user ${id}:`, error);
          }
          return minimalUserPreview(id);
        });

        return users.filter(user => user !== null);
      } catch (error) {
        console.error('❌ Get following from backend error:', error);
      }
    }

    // Fallback: return minimal data with IDs only
    return followingIds.map((id: string) => ({
      id,
      name: 'ללא שם',
      avatar: 'https://i.pravatar.cc/150?img=1',
      bio: '',
      karmaPoints: 0,
      followersCount: 0,
      completedTasks: 0,
      roles: ['user'],
      isVerified: false,
      isActive: false,
    }));
  } catch (error) {
    console.error('❌ Get following error:', error);
    return [];
  }
};

export const getFollowSuggestions = async (currentUserId: string, limit: number = 10, currentUserEmail?: string): Promise<any[]> => {
  try {
    if (USE_BACKEND) {
      // Get ALL users (use high limit to get all users from database)
      // This ensures we show all users, not just a subset
      const fetchLimit = 1000; // High limit to get all users
      const response = await apiService.getUsers({ limit: fetchLimit, offset: 0 });
      if (response.success && response.data) {
        // Filter out current user using strict string comparison (case-insensitive)
        const excludeId = String(currentUserId).trim().toLowerCase();
        const excludeEmail = currentUserEmail ? String(currentUserEmail).trim().toLowerCase() : '';
        const users = (response.data as any[])
          .filter((user: any) => {
            const userId = String(user.id || '').trim().toLowerCase();
            const userEmail = user.email ? String(user.email).trim().toLowerCase() : '';
            const isCurrentUser = userId === excludeId ||
              (excludeEmail && userEmail === excludeEmail) ||
              userId === '';

            if (isCurrentUser) {
              console.log('🚫 getFollowSuggestions - Filtered out current user:', { userId, userEmail, name: user.name });
            }

            return !isCurrentUser;
          })
          .map((user: any) => ({
            id: user.id,
            name: user.name || 'ללא שם',
            avatar: user.avatar_url || 'https://i.pravatar.cc/150?img=1',
            bio: user.bio || '',
            email: user.email || '', // Include email for additional filtering
            karmaPoints: user.karma_points || 0,
            completedTasks: 0, // TODO: Get from backend if available
            roles: ['user'], // TODO: Get from backend if available
            isVerified: false, // TODO: Get from backend if available
            isActive: true, // Users from backend are active by default
          }));
        return users.slice(0, limit);
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Get follow suggestions error:', error);
    return [];
  }
};

export const resetFollowRelationships = async (): Promise<void> => {
  try {
    await DatabaseService.clearAllData();
    console.log('✅ All follow relationships reset');
  } catch (error) {
    console.error('❌ Reset follow relationships error:', error);
  }
};

export const createSampleFollowData = async (): Promise<void> => {
  try {
    // Demo data creation removed
    console.log('ℹ️ createSampleFollowData skipped (demo removed)');
  } catch (error) {
    console.error('❌ Create sample follow data error:', error);
  }
};

export const getFollowHistory = async (userId: string): Promise<FollowRelationship[]> => {
  try {
    const followers = await db.getFollowers(userId);
    const following = await db.getFollowing(userId);

    const allRelationships: FollowRelationship[] = [
      ...(followers as any[]),
      ...(following as any[])
    ];

    return allRelationships;
  } catch (error) {
    console.error('❌ Get follow history error:', error);
    return [];
  }
};

export const getPopularUsers = async (limit: number = 10, excludeUserId?: string, excludeUserEmail?: string): Promise<any[]> => {
  try {
    if (USE_BACKEND) {
      // Get ALL users (use high limit to get all users from database)
      // This ensures we show all users, not just a subset
      const fetchLimit = 1000; // High limit to get all users
      // Get popular users from backend (sorted by karma_points and last_active)
      const response = await apiService.getUsers({ limit: fetchLimit, offset: 0 });
      if (response.success && response.data) {
        // Map to UserPreview format and filter out current user if provided (case-insensitive)
        const excludeId = excludeUserId ? String(excludeUserId).trim().toLowerCase() : null;
        const excludeEmail = excludeUserEmail ? String(excludeUserEmail).trim().toLowerCase() : '';
        const users = (response.data as any[])
          .filter((user: any) => {
            if (!excludeId) return true;
            const userId = String(user.id || '').trim().toLowerCase();
            const userEmail = user.email ? String(user.email).trim().toLowerCase() : '';
            const isCurrentUser = userId === excludeId ||
              (excludeEmail && userEmail === excludeEmail) ||
              userId === '';

            if (isCurrentUser) {
              console.log('🚫 getPopularUsers - Filtered out current user:', { userId, userEmail, name: user.name });
            }

            return !isCurrentUser;
          })
          .map((user: any) => ({
            id: user.id,
            name: user.name || 'ללא שם',
            avatar: user.avatar_url || 'https://i.pravatar.cc/150?img=1',
            bio: user.bio || '',
            email: user.email || '', // Include email for additional filtering
            karmaPoints: user.karma_points || 0,
            completedTasks: 0, // TODO: Get from backend if available
            roles: ['user'], // TODO: Get from backend if available
            isVerified: false, // TODO: Get from backend if available
            isActive: true, // Users from backend are active by default
          }));
        return users.slice(0, limit);
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Get popular users error:', error);
    return [];
  }
};


export const debugFollowRelationships = async (): Promise<void> => {
  try {
    console.log('ℹ️ debugFollowRelationships skipped (demo users removed)');
  } catch (error) {
    console.error('❌ Debug follow relationships error:', error);
  }
};


export const comprehensiveSystemCheck = async (): Promise<void> => {
  try {
    console.log('ℹ️ comprehensiveSystemCheck skipped (demo users removed)');
  } catch (error) {
    console.error('❌ Comprehensive system check error:', error);
  }
};


export const validateSystemIntegrity = async (): Promise<{ isValid: boolean; errors: string[] }> => {
  return { isValid: true, errors: [] };
};


export const updateFollowCounts = async (userId: string): Promise<void> => {
  try {
    const followers = await db.getFollowers(userId);
    const following = await db.getFollowing(userId);


    const userData = {
      followersCount: followers.length,
      followingCount: following.length,
    };

    await db.updateUser(userId, userData);
    console.log('✅ Updated follow counts for user:', userId, userData);
  } catch (error) {
    console.error('❌ Update follow counts error:', error);
  }
}; 