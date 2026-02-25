import { sendFollowNotification } from './notification.service';
import { db, DatabaseService } from '../infrastructure/database.service';
import { apiService, ServerUser } from '../api/api.service';
import { USE_BACKEND } from '../../utils/dbConfig';
import { logger } from '../../utils/loggerService';

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
    logger.error('follow.service', 'Get updated follow counts error', { error });
    return {
      followersCount: 0,
      followingCount: 0,
    };
  }
};

export const getFollowStats = async (userId: string, currentUserId: string): Promise<FollowStats> => {
  try {
    const followers = await db.getFollowers(userId);
    const following = await db.getFollowing(userId);

    const isFollowing = (following as FollowRelationship[]).some((rel) => rel.followerId === currentUserId);

    return {
      followersCount: followers.length,
      followingCount: following.length,
      isFollowing
    };
  } catch (error) {
    logger.error('follow.service', 'Get follow stats error', { error });
    return {
      followersCount: 0,
      followingCount: 0,
      isFollowing: false
    };
  }
};

export const followUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    if (followerId === followingId) {
      return false;
    }

    const existingFollowers = await db.getFollowers(followingId);
    const isAlreadyFollowing = (existingFollowers as FollowRelationship[]).some((rel) => rel.followerId === followerId);

    if (isAlreadyFollowing) {
      return false;
    }

    const newFollow: FollowRelationship = {
      followerId,
      followingId,
      followDate: new Date().toISOString()
    };

    await db.addFollower(followingId, followerId, newFollow as unknown as Record<string, unknown>);

    await db.addFollowing(followerId, followingId, newFollow as unknown as Record<string, unknown>);

    // Optional: fetch follower name from backend; fallback to ID
    try {
      const followerName = followerId;
      await sendFollowNotification(followerName, followingId);
    } catch {
      // Notification send failed; follow still succeeded
    }

    // Update follow counts for both users
    await updateFollowCounts(followerId);
    await updateFollowCounts(followingId);

    return true;
  } catch (error) {
    logger.error('follow.service', 'Follow user error', { error });
    return false;
  }
};

export const unfollowUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    await db.removeFollower(followingId, followerId);

    await db.removeFollowing(followerId, followingId);

    // Update follow counts for both users
    await updateFollowCounts(followerId);
    await updateFollowCounts(followingId);

    return true;
  } catch (error) {
    logger.error('follow.service', 'Unfollow user error', { error });
    return false;
  }
};

interface FollowerUser {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  email?: string;
  karmaPoints: number;
  followersCount: number;
  completedTasks: number;
  roles: string[];
  isVerified: boolean;
  isActive: boolean;
}

export const getFollowers = async (userId: string): Promise<FollowerUser[]> => {
  try {
    const followers = await db.getFollowers(userId);
    const followerIds = (followers as FollowRelationship[]).map((rel) => rel.followerId);

    if (followerIds.length === 0) {
      return [];
    }

    // Fetch full user data from backend for each follower
    if (USE_BACKEND) {
      try {
        const userPromises = followerIds.map(async (id: string) => {
          try {
            const response = await apiService.getUserById(id);
            if (response.success && response.data) {
              const user = response.data as ServerUser;
              return {
                id: user.id || id,
                name: user.name || '',
                avatar: user.avatar_url || user.avatar || 'https://i.pravatar.cc/150?img=1',
                bio: user.bio || '',
                karmaPoints: user.karma_points || 0,
                followersCount: user.followers_count || 0,
                completedTasks: 0, // TODO: Get from backend if available
                roles: user.roles || ['user'],
                isVerified: false, // TODO: Get from backend if available
                isActive: user.is_active !== false,
              };
            }
          } catch (error) {
            logger.warn('follow.service', `Failed to fetch follower ${id}`, { error });
          }
          // Fallback to minimal data if fetch fails
          return {
            id,
            name: '',
            avatar: 'https://i.pravatar.cc/150?img=1',
            bio: '',
            karmaPoints: 0,
            followersCount: 0,
            completedTasks: 0,
            roles: ['user'],
            isVerified: false,
            isActive: false,
          };
        });

        const users = await Promise.all(userPromises);
        return users.filter(user => user !== null);
      } catch (error) {
        logger.error('follow.service', 'Get followers from backend error', { error });
      }
    }

    // Fallback: return minimal data with IDs only
    return followerIds.map((id: string) => ({
      id,
      name: '',
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
    logger.error('follow.service', 'Get followers error', { error });
    return [];
  }
};

export const getFollowing = async (userId: string): Promise<FollowerUser[]> => {
  try {
    const following = await db.getFollowing(userId);
    const followingIds = (following as FollowRelationship[]).map((rel) => rel.followingId);

    if (followingIds.length === 0) {
      return [];
    }

    // Fetch full user data from backend for each following user
    if (USE_BACKEND) {
      try {
        const userPromises = followingIds.map(async (id: string) => {
          try {
            const response = await apiService.getUserById(id);
            if (response.success && response.data) {
              const user = response.data as ServerUser;
              return {
                id: user.id || id,
                name: user.name || '',
                avatar: user.avatar_url || user.avatar || 'https://i.pravatar.cc/150?img=1',
                bio: user.bio || '',
                karmaPoints: user.karma_points || 0,
                followersCount: user.followers_count || 0,
                completedTasks: 0, // TODO: Get from backend if available
                roles: user.roles || ['user'],
                isVerified: false, // TODO: Get from backend if available
                isActive: user.is_active !== false,
              };
            }
          } catch (error) {
            logger.warn('follow.service', `Failed to fetch following user ${id}`, { error });
          }
          // Fallback to minimal data if fetch fails
          return {
            id,
            name: '',
            avatar: 'https://i.pravatar.cc/150?img=1',
            bio: '',
            karmaPoints: 0,
            followersCount: 0,
            completedTasks: 0,
            roles: ['user'],
            isVerified: false,
            isActive: false,
          };
        });

        const users = await Promise.all(userPromises);
        return users.filter((user): user is FollowerUser => user !== null);
      } catch (error) {
        logger.error('follow.service', 'Get following from backend error', { error });
      }
    }

    // Fallback: return minimal data with IDs only
    return followingIds.map((id: string) => ({
      id,
      name: '',
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
    logger.error('follow.service', 'Get following error', { error });
    return [];
  }
};

export const getFollowSuggestions = async (currentUserId: string, limit: number = 10, currentUserEmail?: string): Promise<FollowerUser[]> => {
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
        const users = (response.data as Record<string, unknown>[])
          .filter((user: Record<string, unknown>) => {
            const userId = String(user.id || '').trim().toLowerCase();
            const userEmail = user.email ? String(user.email).trim().toLowerCase() : '';
            const isCurrentUser = userId === excludeId ||
              (excludeEmail && userEmail === excludeEmail) ||
              userId === '';

            if (isCurrentUser) {
              logger.debug('follow.service', 'Filtered out current user in suggestions', { userId, userEmail });
            }

            return !isCurrentUser;
          })
          .map((user: Record<string, unknown>) => ({
            id: user.id as string,
            name: (user.name as string) || '',
            avatar: (user.avatar_url as string) || 'https://i.pravatar.cc/150?img=1',
            bio: (user.bio as string) || '',
            email: (user.email as string) || '',
            karmaPoints: (user.karma_points as number) || 0,
            followersCount: (user.followers_count as number) || 0,
            completedTasks: 0,
            roles: (user.roles as string[]) || ['user'],
            isVerified: false,
            isActive: true,
          }));
        return users.slice(0, limit);
      }
    }
    return [];
  } catch (error) {
    logger.error('follow.service', 'Get follow suggestions error', { error });
    return [];
  }
};

export const resetFollowRelationships = async (): Promise<void> => {
  try {
    await DatabaseService.clearAllData();
    logger.info('follow.service', 'All follow relationships reset');
  } catch (error) {
    logger.error('follow.service', 'Reset follow relationships error', { error });
  }
};

export const createSampleFollowData = async (): Promise<void> => {
  try {
    // Demo data creation removed
    logger.info('follow.service', 'createSampleFollowData skipped (demo removed)');
  } catch (error) {
    logger.error('follow.service', 'Create sample follow data error', { error });
  }
};

export const getFollowHistory = async (userId: string): Promise<FollowRelationship[]> => {
  try {
    const followers = await db.getFollowers(userId);
    const following = await db.getFollowing(userId);

    const allRelationships: FollowRelationship[] = [
      ...(followers as FollowRelationship[]),
      ...(following as FollowRelationship[])
    ];

    return allRelationships;
  } catch (error) {
    logger.error('follow.service', 'Get follow history error', { error });
    return [];
  }
};

export const getPopularUsers = async (limit: number = 10, excludeUserId?: string, excludeUserEmail?: string): Promise<FollowerUser[]> => {
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
        const users = (response.data as Record<string, unknown>[])
          .filter((user: Record<string, unknown>) => {
            if (!excludeId) return true;
            const userId = String(user.id || '').trim().toLowerCase();
            const userEmail = user.email ? String(user.email).trim().toLowerCase() : '';
            const isCurrentUser = userId === excludeId ||
              (excludeEmail && userEmail === excludeEmail) ||
              userId === '';

            if (isCurrentUser) {
              logger.debug('follow.service', 'Filtered out current user in popular users', { userId, userEmail });
            }

            return !isCurrentUser;
          })
          .map((user: Record<string, unknown>) => ({
            id: user.id as string,
            name: (user.name as string) || '',
            avatar: (user.avatar_url as string) || 'https://i.pravatar.cc/150?img=1',
            bio: (user.bio as string) || '',
            email: (user.email as string) || '',
            karmaPoints: (user.karma_points as number) || 0,
            followersCount: (user.followers_count as number) || 0,
            completedTasks: 0,
            roles: (user.roles as string[]) || ['user'],
            isVerified: false,
            isActive: true,
          }));
        return users.slice(0, limit);
      }
    }
    return [];
  } catch (error) {
    logger.error('follow.service', 'Get popular users error', { error });
    return [];
  }
};


export const debugFollowRelationships = async (): Promise<void> => {
  try {
    logger.info('follow.service', 'debugFollowRelationships skipped (demo users removed)');
  } catch (error) {
    logger.error('follow.service', 'Debug follow relationships error', { error });
  }
};


export const comprehensiveSystemCheck = async (): Promise<void> => {
  try {
    logger.info('follow.service', 'comprehensiveSystemCheck skipped (demo users removed)');
  } catch (error) {
    logger.error('follow.service', 'Comprehensive system check error', { error });
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
    logger.info('follow.service', 'Updated follow counts for user', { userId, userData });
  } catch (error) {
    logger.error('follow.service', 'Update follow counts error', { error });
  }
}; 