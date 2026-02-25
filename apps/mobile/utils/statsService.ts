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

export type CommunityStats = Record<string, number>;

export const DEFAULT_STATS: CommunityStats = {
  // Core stats
  moneyDonations: 0,
  volunteerHours: 0,
  rides: 0,
  events: 0,
  activeMembers: 0,
  monthlyDonations: 0,
  monthlyGrowthPct: 0,
  activeCities: 0,

  // User engagement stats
  totalUsers: 0,
  dailyActiveUsers: 0,
  weeklyActiveUsers: 0,
  newUsersThisWeek: 0,
  newUsersThisMonth: 0,
  totalOrganizations: 0,
  citiesWithUsers: 0,
  userEngagementRate: 0,

  // Donation stats
  totalDonations: 0,
  donationsThisWeek: 0,
  donationsThisMonth: 0,
  activeDonations: 0,
  completedDonations: 0,
  itemDonations: 0,
  serviceDonations: 0,
  totalMoneyDonated: 0,
  recurringDonationsAmount: 0,
  uniqueDonors: 0,
  siteVisits: 0,
  avgDonationAmount: 0,

  // Ride stats
  totalRides: 0,
  ridesThisWeek: 0,
  ridesThisMonth: 0,
  activeRides: 0,
  completedRides: 0,
  totalSeatsOffered: 0,
  uniqueDrivers: 0,
  avgSeatsPerRide: 0,

  // Event stats
  totalEvents: 0,
  eventsThisWeek: 0,
  eventsThisMonth: 0,
  activeEvents: 0,
  completedEvents: 0,
  totalEventAttendees: 0,
  virtualEvents: 0,

  // Activity stats
  totalActivities: 0,
  activitiesToday: 0,
  activitiesThisWeek: 0,
  totalLogins: 0,
  donationActivities: 0,
  chatActivities: 0,
  activeUsersTracked: 0,

  // Communication stats
  totalMessages: 0,
  totalConversations: 0,
  messagesThisWeek: 0,
  groupConversations: 0,
  directConversations: 0,

  // Extended legacy stats
  foodKg: 0,
  clothingKg: 0,
  bloodLiters: 0,
  courses: 0,
  treesPlanted: 0,
  animalsAdopted: 0,
  recyclingBags: 0,
  culturalEvents: 0,
  appActiveUsers: 0,
  appDownloads: 0,
  activeVolunteers: 0,
  kmCarpooled: 0,
  fundsRaised: 0,
  mealsServed: 0,
  booksDonated: 0,
};

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
          return DEFAULT_STATS;
        }

        const mappedStats = this.mapBackendStats(stats as Record<string, { value?: number }>);

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
      return localStats || DEFAULT_STATS;
    } catch (error) {
      logger.error('EnhancedStatsService', 'Get community stats error', { error });
      // Return default stats instead of throwing to prevent UI from getting stuck
      return DEFAULT_STATS;
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
      const currentStats = await DatabaseService.getItem<CommunityStats>(DB_COLLECTIONS.ANALYTICS, 'global', 'community_stats') || DEFAULT_STATS;

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

  // Helper methods
  // שינוי: מיפוי סטטיסטיקות מהשרת לפורמט הלקוח עם תמיכה בערכים מקוננים
  // Change: Mapping backend stats to client format with support for nested values
  private static mapBackendStats(backendStats: Record<string, { value?: number }>): CommunityStats {
    const mapped: CommunityStats = { ...DEFAULT_STATS };

    // Direct mapping for stats with matching names
    // מיפוי ישיר של סטטיסטיקות עם שמות תואמים
    const mappings = {
      // Core stats
      'money_donations': 'moneyDonations',
      'volunteer_hours': 'volunteerHours',
      'events': 'events',
      'active_members': 'activeMembers',

      // User engagement stats
      'total_users': 'totalUsers',
      'daily_active_users': 'dailyActiveUsers',
      'weekly_active_users': 'weeklyActiveUsers',
      'new_users_this_week': 'newUsersThisWeek',
      'new_users_this_month': 'newUsersThisMonth',
      'total_organizations': 'totalOrganizations',
      'cities_with_users': 'citiesWithUsers',
      'user_engagement_rate': 'userEngagementRate',

      // Donation stats
      'total_donations': 'totalDonations',
      'donations_this_week': 'donationsThisWeek',
      'donations_this_month': 'donationsThisMonth',
      'active_donations': 'activeDonations',
      'completed_donations': 'completedDonations',
      'item_donations': 'itemDonations',
      'service_donations': 'serviceDonations',
      'total_money_donated': 'totalMoneyDonated',
      'recurring_donations_amount': 'recurringDonationsAmount',
      'unique_donors': 'uniqueDonors',
      'site_visits': 'siteVisits',
      'avg_donation_amount': 'avgDonationAmount',

      // Ride stats
      'total_rides': 'totalRides',
      'rides_this_week': 'ridesThisWeek',
      'rides_this_month': 'ridesThisMonth',
      'active_rides': 'activeRides',
      'completed_rides': 'completedRides',
      'total_seats_offered': 'totalSeatsOffered',
      'unique_drivers': 'uniqueDrivers',
      'avg_seats_per_ride': 'avgSeatsPerRide',

      // Event stats
      'total_events': 'totalEvents',
      'events_this_week': 'eventsThisWeek',
      'events_this_month': 'eventsThisMonth',
      'active_events': 'activeEvents',
      'completed_events': 'completedEvents',
      'total_event_attendees': 'totalEventAttendees',
      'virtual_events': 'virtualEvents',

      // Activity stats
      'total_activities': 'totalActivities',
      'activities_today': 'activitiesToday',
      'activities_this_week': 'activitiesThisWeek',
      'total_logins': 'totalLogins',
      'donation_activities': 'donationActivities',
      'chat_activities': 'chatActivities',
      'active_users_tracked': 'activeUsersTracked',

      // Communication stats
      'total_messages': 'totalMessages',
      'total_conversations': 'totalConversations',
      'messages_this_week': 'messagesThisWeek',
      'group_conversations': 'groupConversations',
      'direct_conversations': 'directConversations',

      // Extended legacy stats
      'food_kg': 'foodKg',
      'clothing_kg': 'clothingKg',
      'blood_liters': 'bloodLiters',
      'courses': 'courses',
      'trees_planted': 'treesPlanted',
      'animals_adopted': 'animalsAdopted',
      'recycling_bags': 'recyclingBags',
      'cultural_events': 'culturalEvents',
      'app_active_users': 'appActiveUsers',
      'app_downloads': 'appDownloads',
      'active_volunteers': 'activeVolunteers',
      'km_carpooled': 'kmCarpooled',
      'funds_raised': 'fundsRaised',
      'meals_served': 'mealsServed',
      'books_donated': 'booksDonated',
    };

    // Map all stats
    Object.entries(mappings).forEach(([backendKey, frontendKey]) => {
      if (backendStats[backendKey]?.value !== undefined) {
        mapped[frontendKey] = backendStats[backendKey].value || 0;
      }
    });

    // Special handling for rides (prefer total_rides, fallback to completed_rides)
    if (backendStats.total_rides?.value !== undefined) {
      mapped.rides = backendStats.total_rides.value || 0;
    } else if (backendStats.completed_rides?.value !== undefined) {
      mapped.rides = backendStats.completed_rides.value || 0;
    }

    return mapped;
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


