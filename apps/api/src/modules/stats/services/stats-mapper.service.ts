import { Injectable } from "@nestjs/common";
import { MetricsRow } from "./stats-queries.service";

export interface StatMetric {
  value: number;
  days_tracked: number;
}

export interface CommunityStats {
  [key: string]: StatMetric | undefined;
  site_visits?: StatMetric;
  total_users?: StatMetric;
  active_members?: StatMetric;
  daily_active_users?: StatMetric;
  weekly_active_users?: StatMetric;
  new_users_this_week?: StatMetric;
  new_users_this_month?: StatMetric;
  total_organizations?: StatMetric;
  cities_with_users?: StatMetric;
  total_donations?: StatMetric;
  donations_this_week?: StatMetric;
  donations_this_month?: StatMetric;
  active_donations?: StatMetric;
  completed_donations?: StatMetric;
  money_donations?: StatMetric;
  item_donations?: StatMetric;
  service_donations?: StatMetric;
  volunteer_hours?: StatMetric;
  total_money_donated?: StatMetric;
  recurring_donations_amount?: StatMetric;
  unique_donors?: StatMetric;
  total_rides?: StatMetric;
  rides_this_week?: StatMetric;
  rides_this_month?: StatMetric;
  active_rides?: StatMetric;
  completed_rides?: StatMetric;
  total_seats_offered?: StatMetric;
  unique_drivers?: StatMetric;
  total_events?: StatMetric;
  events_this_week?: StatMetric;
  events_this_month?: StatMetric;
  active_events?: StatMetric;
  completed_events?: StatMetric;
  total_event_attendees?: StatMetric;
  virtual_events?: StatMetric;
  total_activities?: StatMetric;
  activities_today?: StatMetric;
  activities_this_week?: StatMetric;
  total_logins?: StatMetric;
  donation_activities?: StatMetric;
  chat_activities?: StatMetric;
  active_users_tracked?: StatMetric;
  total_messages?: StatMetric;
  total_conversations?: StatMetric;
  messages_this_week?: StatMetric;
  group_conversations?: StatMetric;
  direct_conversations?: StatMetric;
  total_tasks?: StatMetric;
  completed_tasks?: StatMetric;
  open_tasks?: StatMetric;
  in_progress_tasks?: StatMetric;
  completed_tasks_this_week?: StatMetric;
  completed_tasks_this_month?: StatMetric;
  avg_donation_amount?: StatMetric;
  avg_seats_per_ride?: StatMetric;
  user_engagement_rate?: StatMetric;
  total_contributions?: StatMetric;
}

@Injectable()
export class StatsMapperService {
  private getNumericValue(row: MetricsRow, key: string): number {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseInt(value, 10) || 0;
    return 0;
  }

  private createMetric(value: number, daysTracked = 1): StatMetric {
    return { value, days_tracked: daysTracked };
  }

  mapUserMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      total_users: this.createMetric(this.getNumericValue(data, "total_users")),
      active_members: this.createMetric(
        this.getNumericValue(data, "active_members"),
      ),
      daily_active_users: this.createMetric(
        this.getNumericValue(data, "daily_active_users"),
      ),
      weekly_active_users: this.createMetric(
        this.getNumericValue(data, "weekly_active_users"),
      ),
      new_users_this_week: this.createMetric(
        this.getNumericValue(data, "new_users_this_week"),
      ),
      new_users_this_month: this.createMetric(
        this.getNumericValue(data, "new_users_this_month"),
      ),
      total_organizations: this.createMetric(
        this.getNumericValue(data, "total_organizations"),
      ),
      cities_with_users: this.createMetric(
        this.getNumericValue(data, "cities_with_users"),
      ),
    };
  }

  mapDonationMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      total_donations: this.createMetric(
        this.getNumericValue(data, "total_donations"),
      ),
      donations_this_week: this.createMetric(
        this.getNumericValue(data, "donations_this_week"),
      ),
      donations_this_month: this.createMetric(
        this.getNumericValue(data, "donations_this_month"),
      ),
      active_donations: this.createMetric(
        this.getNumericValue(data, "active_donations"),
      ),
      completed_donations: this.createMetric(
        this.getNumericValue(data, "completed_donations"),
      ),
      money_donations: this.createMetric(
        this.getNumericValue(data, "money_donations"),
      ),
      item_donations: this.createMetric(
        this.getNumericValue(data, "item_donations"),
      ),
      service_donations: this.createMetric(
        this.getNumericValue(data, "service_donations"),
      ),
      volunteer_hours: this.createMetric(
        this.getNumericValue(data, "volunteer_hours"),
      ),
      total_money_donated: this.createMetric(
        this.getNumericValue(data, "total_money_donated"),
      ),
      recurring_donations_amount: this.createMetric(
        this.getNumericValue(data, "recurring_donations_amount"),
      ),
      unique_donors: this.createMetric(
        this.getNumericValue(data, "unique_donors"),
      ),
    };
  }

  mapRideMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      total_rides: this.createMetric(this.getNumericValue(data, "total_rides")),
      rides_this_week: this.createMetric(
        this.getNumericValue(data, "rides_this_week"),
      ),
      rides_this_month: this.createMetric(
        this.getNumericValue(data, "rides_this_month"),
      ),
      active_rides: this.createMetric(
        this.getNumericValue(data, "active_rides"),
      ),
      completed_rides: this.createMetric(
        this.getNumericValue(data, "completed_rides"),
      ),
      total_seats_offered: this.createMetric(
        this.getNumericValue(data, "total_seats_offered"),
      ),
      unique_drivers: this.createMetric(
        this.getNumericValue(data, "unique_drivers"),
      ),
    };
  }

  mapEventMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      total_events: this.createMetric(
        this.getNumericValue(data, "total_events"),
      ),
      events_this_week: this.createMetric(
        this.getNumericValue(data, "events_this_week"),
      ),
      events_this_month: this.createMetric(
        this.getNumericValue(data, "events_this_month"),
      ),
      active_events: this.createMetric(
        this.getNumericValue(data, "active_events"),
      ),
      completed_events: this.createMetric(
        this.getNumericValue(data, "completed_events"),
      ),
      total_event_attendees: this.createMetric(
        this.getNumericValue(data, "total_event_attendees"),
      ),
      virtual_events: this.createMetric(
        this.getNumericValue(data, "virtual_events"),
      ),
    };
  }

  mapActivityMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      total_activities: this.createMetric(
        this.getNumericValue(data, "total_activities"),
      ),
      activities_today: this.createMetric(
        this.getNumericValue(data, "activities_today"),
      ),
      activities_this_week: this.createMetric(
        this.getNumericValue(data, "activities_this_week"),
      ),
      total_logins: this.createMetric(
        this.getNumericValue(data, "total_logins"),
      ),
      donation_activities: this.createMetric(
        this.getNumericValue(data, "donation_activities"),
      ),
      chat_activities: this.createMetric(
        this.getNumericValue(data, "chat_activities"),
      ),
      active_users_tracked: this.createMetric(
        this.getNumericValue(data, "active_users_tracked"),
      ),
    };
  }

  mapChatMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      total_messages: this.createMetric(
        this.getNumericValue(data, "total_messages"),
      ),
      total_conversations: this.createMetric(
        this.getNumericValue(data, "total_conversations"),
      ),
      messages_this_week: this.createMetric(
        this.getNumericValue(data, "messages_this_week"),
      ),
      group_conversations: this.createMetric(
        this.getNumericValue(data, "group_conversations"),
      ),
      direct_conversations: this.createMetric(
        this.getNumericValue(data, "direct_conversations"),
      ),
    };
  }

  mapSiteVisitsMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      site_visits: this.createMetric(this.getNumericValue(data, "site_visits")),
    };
  }

  mapTaskMetrics(data: MetricsRow): Partial<CommunityStats> {
    return {
      total_tasks: this.createMetric(this.getNumericValue(data, "total_tasks")),
      completed_tasks: this.createMetric(
        this.getNumericValue(data, "completed_tasks"),
      ),
      open_tasks: this.createMetric(this.getNumericValue(data, "open_tasks")),
      in_progress_tasks: this.createMetric(
        this.getNumericValue(data, "in_progress_tasks"),
      ),
      completed_tasks_this_week: this.createMetric(
        this.getNumericValue(data, "completed_tasks_this_week"),
      ),
      completed_tasks_this_month: this.createMetric(
        this.getNumericValue(data, "completed_tasks_this_month"),
      ),
    };
  }

  calculateDerivedMetrics(stats: CommunityStats): Partial<CommunityStats> {
    const totalDonations = stats.total_donations?.value || 0;
    const totalMoneyDonated = stats.total_money_donated?.value || 0;
    const totalRides = stats.total_rides?.value || 0;
    const totalSeats = stats.total_seats_offered?.value || 0;
    const totalUsers = stats.total_users?.value || 1;
    const activeUsers = stats.weekly_active_users?.value || 0;

    return {
      avg_donation_amount: this.createMetric(
        totalDonations > 0 ? Math.round(totalMoneyDonated / totalDonations) : 0,
      ),
      avg_seats_per_ride: this.createMetric(
        totalRides > 0 ? Math.round((totalSeats / totalRides) * 10) / 10 : 0,
      ),
      user_engagement_rate: this.createMetric(
        totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      ),
      total_contributions: this.createMetric(
        (stats.total_donations?.value || 0) +
          (stats.total_rides?.value || 0) +
          (stats.total_events?.value || 0),
      ),
    };
  }
}
