/**
 * Pure mapping from API community_stats payload (snake_case metric keys) to client CommunityStats.
 * Kept separate from EnhancedStatsService for low complexity and unit testing (Sonar / coverage).
 */
import type { CommunityStats } from './statsServiceTypes';

/** Backend `stat_type` / metric keys returned by GET /api/stats/community → client `CommunityStats` keys. */
export const COMMUNITY_STAT_BACKEND_TO_CLIENT: Readonly<
  Record<string, keyof CommunityStats>
> = {
  money_donations: 'moneyDonations',
  volunteer_hours: 'volunteerHours',
  events: 'events',
  active_members: 'activeMembers',
  total_users: 'totalUsers',
  daily_active_users: 'dailyActiveUsers',
  weekly_active_users: 'weeklyActiveUsers',
  new_users_this_week: 'newUsersThisWeek',
  new_users_this_month: 'newUsersThisMonth',
  total_organizations: 'totalOrganizations',
  cities_with_users: 'citiesWithUsers',
  user_engagement_rate: 'userEngagementRate',
  total_donations: 'totalDonations',
  donations_this_week: 'donationsThisWeek',
  donations_this_month: 'donationsThisMonth',
  active_donations: 'activeDonations',
  completed_donations: 'completedDonations',
  item_donations: 'itemDonations',
  service_donations: 'serviceDonations',
  total_money_donated: 'totalMoneyDonated',
  recurring_donations_amount: 'recurringDonationsAmount',
  unique_donors: 'uniqueDonors',
  site_visits: 'siteVisits',
  avg_donation_amount: 'avgDonationAmount',
  total_rides: 'totalRides',
  rides_this_week: 'ridesThisWeek',
  rides_this_month: 'ridesThisMonth',
  active_rides: 'activeRides',
  completed_rides: 'completedRides',
  total_seats_offered: 'totalSeatsOffered',
  unique_drivers: 'uniqueDrivers',
  avg_seats_per_ride: 'avgSeatsPerRide',
  total_events: 'totalEvents',
  events_this_week: 'eventsThisWeek',
  events_this_month: 'eventsThisMonth',
  active_events: 'activeEvents',
  completed_events: 'completedEvents',
  total_event_attendees: 'totalEventAttendees',
  virtual_events: 'virtualEvents',
  total_activities: 'totalActivities',
  activities_today: 'activitiesToday',
  activities_this_week: 'activitiesThisWeek',
  total_logins: 'totalLogins',
  donation_activities: 'donationActivities',
  chat_activities: 'chatActivities',
  active_users_tracked: 'activeUsersTracked',
  total_messages: 'totalMessages',
  total_conversations: 'totalConversations',
  messages_this_week: 'messagesThisWeek',
  group_conversations: 'groupConversations',
  direct_conversations: 'directConversations',
  completed_tasks: 'completedTasks',
  food_kg: 'foodKg',
  clothing_kg: 'clothingKg',
  blood_liters: 'bloodLiters',
  courses: 'courses',
  trees_planted: 'treesPlanted',
  animals_adopted: 'animalsAdopted',
  recycling_bags: 'recyclingBags',
  cultural_events: 'culturalEvents',
  app_active_users: 'appActiveUsers',
  app_downloads: 'appDownloads',
  active_volunteers: 'activeVolunteers',
  km_carpooled: 'kmCarpooled',
  funds_raised: 'fundsRaised',
  meals_served: 'mealsServed',
  books_donated: 'booksDonated',
} as const;

type BackendMetricRow = { value?: number };

function readMetricValue(row: BackendMetricRow | undefined): number | undefined {
  if (!row || typeof row.value !== 'number' || !Number.isFinite(row.value)) {
    return undefined;
  }
  return row.value;
}

/**
 * Maps API community stats object into a full `CommunityStats` clone (does not mutate `defaults`).
 */
export function mapBackendCommunityStatsPayload(
  backendStats: Record<string, BackendMetricRow | undefined>,
  defaults: CommunityStats,
): CommunityStats {
  const mapped: CommunityStats = { ...defaults };

  for (const [backendKey, clientKey] of Object.entries(COMMUNITY_STAT_BACKEND_TO_CLIENT)) {
    const raw = readMetricValue(backendStats[backendKey]);
    if (raw !== undefined) {
      mapped[clientKey] = raw;
    }
  }

  const totalRides = readMetricValue(backendStats.total_rides);
  const completedRides = readMetricValue(backendStats.completed_rides);
  if (totalRides !== undefined) {
    mapped.rides = totalRides;
  } else if (completedRides !== undefined) {
    mapped.rides = completedRides;
  }

  return mapped;
}
