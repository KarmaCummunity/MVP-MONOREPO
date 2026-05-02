// File overview:
// - Purpose: Community statistics helpers, formatting, and a backend-integrated EnhancedStatsService.
// - Reached from: `FloatingBubblesOverlay`, `HomeScreen`, analytics components.
// - Provides: Default stats, getters/savers, number format/parse, and backend-coordinated methods.
// utils/statsService.ts
import { DatabaseService, DB_COLLECTIONS } from './databaseService';
import { enhancedDB } from './enhancedDatabaseService';
import { apiService } from './apiService';
import { USE_BACKEND } from './config.constants';
import { logger } from './loggerService';
import { mapBackendCommunityStatsPayload } from './communityStatsMapping';
import { DEFAULT_STATS, type CommunityStats } from './statsServiceTypes';

export type { CommunityStats } from './statsServiceTypes';
export { DEFAULT_STATS } from './statsServiceTypes';

export async function getGlobalStats(): Promise<CommunityStats> {
  try {
    const data = await DatabaseService.read<CommunityStats>(DB_COLLECTIONS.SETTINGS, 'global', 'community_stats');
    if (!data || typeof data !== 'object') return { ...DEFAULT_STATS };
    // Ensure defaults for missing keys
    const merged: CommunityStats = { ...DEFAULT_STATS, ...data };
    return merged;
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export async function saveGlobalStats(partial: Partial<CommunityStats>): Promise<void> {
  const current = await getGlobalStats();
  const next = { ...current, ...partial };
  await DatabaseService.create(DB_COLLECTIONS.SETTINGS, 'global', 'community_stats', next);
}

export function getStat(stats: CommunityStats, key: string, fallback = 0): number {
  const v = stats?.[key];
  return typeof v === 'number' && isFinite(v) ? v : fallback;
}

export function formatShortNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export function parseShortNumber(s: string): number {
  if (!s) return 0;
  const m = String(s).trim().toUpperCase();
  const factor = m.endsWith('B') ? 1_000_000_000 : m.endsWith('M') ? 1_000_000 : m.endsWith('K') ? 1_000 : 1;
  const num = parseFloat(m.replace(/[BMK]/g, ''));
  return isFinite(num) ? num * factor : 0;
}

// Enhanced Stats Service with Backend Integration
// שירות סטטיסטיקות משופר עם אינטגרציה לשרת
// Enhanced Stats Service with Backend Integration
export class EnhancedStatsService {
  // Get community stats from backend or fallback to local
  // שינוי: תמיכה ב-forceRefresh לטעינה מחדש של נתונים מהשרת
  // Change: Support for forceRefresh to reload data from backend
  static async getCommunityStats(filters: { city?: string; period?: string } = {}, forceRefresh = false): Promise<CommunityStats> {
    try {
      if (USE_BACKEND) {
        const stats = await enhancedDB.getCommunityStats(filters, forceRefresh);

        // Check if stats is empty or invalid
        if (!stats || typeof stats !== 'object' || Object.keys(stats).length === 0) {
          logger.warn('EnhancedStatsService', 'Received empty stats from backend, using default stats');
          return { ...DEFAULT_STATS };
        }

        const mappedStats = mapBackendCommunityStatsPayload(
          stats as Record<string, { value?: number } | undefined>,
          DEFAULT_STATS,
        );

        // Verify that we got some actual data (not all zeros)
        const hasData = Object.values(mappedStats).some((value: unknown) => {
          if (typeof value === 'number') return value > 0;
          return false;
        });

        if (!hasData && forceRefresh) {
          // If we forced refresh and got all zeros, something might be wrong
          logger.warn('EnhancedStatsService', 'Mapped stats are all zeros after force refresh');
        }

        return mappedStats;
      }

      // Fallback to local stats
      const localStats = await DatabaseService.getItem<CommunityStats>(DB_COLLECTIONS.ANALYTICS, 'global', 'community_stats');
      return localStats ? { ...DEFAULT_STATS, ...localStats } : { ...DEFAULT_STATS };
    } catch (error) {
      logger.error('EnhancedStatsService', 'Get community stats error', { error });
      // Return default stats instead of throwing to prevent UI from getting stuck
      return { ...DEFAULT_STATS };
    }
  }

  // Get real-time dashboard statistics
  static async getDashboardStats(): Promise<Record<string, unknown> | null> {
    try {
      if (USE_BACKEND) {
        const response = await apiService.getDashboardStats();
        return response.success ? response.data : null;
      }

      return null;
    } catch (error) {
      logger.error('EnhancedStatsService', 'Get dashboard stats error', { error });
      return null;
    }
  }

  // Get category analytics with engagement metrics
  static async getCategoryAnalytics(): Promise<Record<string, unknown>[]> {
    try {
      if (USE_BACKEND) {
        const response = await apiService.getCategoryAnalytics();
        return response.success ? response.data : [];
      }

      return [];
    } catch (error) {
      logger.error('EnhancedStatsService', 'Get category analytics error', { error });
      return [];
    }
  }

  // Increment a specific statistic
  static async incrementStat(statType: string, value: number = 1, city?: string): Promise<void> {
    try {
      if (USE_BACKEND) {
        await enhancedDB.incrementStat(statType, value, city);
        return;
      }

      // Fallback to local increment
      const stored =
        (await DatabaseService.getItem<CommunityStats>(DB_COLLECTIONS.ANALYTICS, 'global', 'community_stats')) ??
        null;
      const currentStats: CommunityStats = { ...DEFAULT_STATS, ...(stored ?? {}) };

      // Map new stat types to legacy format
      const legacyKey = this.mapStatToLegacyKey(statType);
      if (legacyKey && Object.prototype.hasOwnProperty.call(currentStats, legacyKey)) {
        currentStats[legacyKey] = (currentStats[legacyKey] || 0) + value;
        await DatabaseService.setItem(DB_COLLECTIONS.ANALYTICS, 'global', 'community_stats', currentStats);
      }
    } catch (error) {
      logger.error('EnhancedStatsService', 'Increment stat error', { error });
    }
  }

  // Track user activity for analytics
  static async trackActivity(userId: string, activityType: string, activityData: Record<string, unknown> = {}): Promise<void> {
    try {
      if (USE_BACKEND) {
        // Activity tracking is handled automatically in the backend
        logger.info('EnhancedStatsService', `Activity tracked: ${activityType} for user ${userId}`);
        return;
      }

      // Fallback to local tracking
      const activity = {
        id: Date.now().toString(),
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
        timestamp: new Date().toISOString(),
      };

      const activities = await DatabaseService.getItem<Record<string, unknown>[]>(DB_COLLECTIONS.ANALYTICS, userId, 'activities') || [];
      activities.push(activity);

      // Keep only last 100 activities
      if (activities.length > 100) {
        activities.splice(0, activities.length - 100);
      }

      await DatabaseService.setItem(DB_COLLECTIONS.ANALYTICS, userId, 'activities', activities);
    } catch (error) {
      logger.error('EnhancedStatsService', 'Track activity error', { error });
    }
  }

  // Track category engagement
  static async trackCategoryView(categoryId: string, userId?: string): Promise<void> {
    try {
      await this.incrementStat('category_views', 1);

      if (userId) {
        await this.trackActivity(userId, 'category_viewed', { category_id: categoryId });
      }

      // Legacy analytics tracking
      const analytics = await DatabaseService.getItem<{ count: number, lastViewed?: string }>(DB_COLLECTIONS.ANALYTICS, 'global', categoryId) || { count: 0 };
      analytics.count = (analytics.count || 0) + 1;
      analytics.lastViewed = new Date().toISOString();

      await DatabaseService.setItem(DB_COLLECTIONS.ANALYTICS, 'global', categoryId, analytics);
    } catch (error) {
      logger.error('EnhancedStatsService', 'Track category view error', { error });
    }
  }

  // Track donation creation
  static async trackDonationCreated(donation: { type: string; city?: string; donor_id?: string; amount?: number; category?: string }): Promise<void> {
    try {
      const statType = donation.type === 'money' ? 'money_donations' :
        donation.type === 'time' ? 'volunteer_hours' :
          donation.type === 'trump' ? 'rides_created' : 'other_donations';

      const value = donation.type === 'money' ? (donation.amount || 0) : 1;

      await this.incrementStat(statType, value, donation.city);

      if (donation.donor_id) {
        await this.trackActivity(donation.donor_id, 'donation_created', {
          type: donation.type,
          category: donation.category,
          amount: donation.amount,
        });
      }
    } catch (error) {
      logger.error('EnhancedStatsService', 'Track donation created error', { error });
    }
  }

  // Track ride creation
  static async trackRideCreated(ride: { from_city?: string; driver_id?: string; from_location?: { name: string }; to_location?: { name: string }; available_seats?: number }): Promise<void> {
    try {
      await this.incrementStat('rides_created', 1, ride.from_city);

      if (ride.driver_id) {
        await this.trackActivity(ride.driver_id, 'ride_created', {
          from: ride.from_location?.name,
          to: ride.to_location?.name,
          seats: ride.available_seats,
        });
      }
    } catch (error) {
      logger.error('EnhancedStatsService', 'Track ride created error', { error });
    }
  }

  // Reset community statistics (admin only)
  static async resetCommunityStats(): Promise<boolean> {
    try {
      if (USE_BACKEND) {
        const response = await apiService.resetCommunityStats();
        if (response.success) {
          // Clear local cache as well
          await enhancedDB.clearAllCache();
          return true;
        }
        return false;
      }

      // Fallback: Reset local stats
      await DatabaseService.setItem(DB_COLLECTIONS.ANALYTICS, 'global', 'community_stats', DEFAULT_STATS);
      return true;
    } catch (error) {
      logger.error('EnhancedStatsService', 'Reset community stats error', { error });
      return false;
    }
  }

  // Get user personal statistics
  static async getUserStats(userId: string): Promise<Record<string, unknown> | null> {
    try {
      if (USE_BACKEND) {
        const response = await apiService.getUserStats(userId);
        return response.success ? response.data : null;
      }

      // Fallback to local calculation
      const userDonations = await DatabaseService.getItem<Record<string, unknown>[]>(DB_COLLECTIONS.DONATIONS, userId, 'all') || [];
      const userRides = await DatabaseService.getItem<Record<string, unknown>[]>(DB_COLLECTIONS.RIDES, userId, 'all') || [];

      return {
        donations: {
          total_donations: userDonations.length,
          total_money_donated: userDonations
            .filter((d) => d.type === 'money')
            .reduce((sum: number, d) => sum + ((d.amount as number) || 0), 0),
          volunteer_activities: userDonations.filter((d) => d.type === 'time').length,
          rides_offered: userDonations.filter((d) => d.type === 'trump').length,
        },
        rides: {
          rides_created: userRides.length,
          total_seats_offered: userRides.reduce((sum: number, r) => sum + ((r.available_seats as number) || 0), 0),
          completed_rides: userRides.filter((r) => r.status === 'completed').length,
        },
      };
    } catch (error) {
      logger.error('EnhancedStatsService', 'Get user stats error', { error });
      return null;
    }
  }

  private static mapStatToLegacyKey(statType: string): string | null {
    const mapping: { [key: string]: string } = {
      'money_donations': 'moneyDonations',
      'volunteer_hours': 'volunteerHours',
      'rides_completed': 'rides',
      'rides_created': 'rides',
      'events_created': 'events',
      'active_members': 'activeMembers',
      'food_kg': 'foodKg',
      'clothing_kg': 'clothingKg',
      'books_donated': 'booksShared',
    };

    return mapping[statType] || null;
  }
}


