import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";

export interface MetricsRow {
  [key: string]: unknown;
}

@Injectable()
export class StatsQueriesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getUserMetrics(
    cityCondition: string,
    params: unknown[],
  ): Promise<MetricsRow> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        COUNT(DISTINCT LOWER(email)) as total_users,
        COUNT(DISTINCT CASE WHEN is_active = true AND last_active >= NOW() - INTERVAL '30 days' THEN LOWER(email) END) as active_members,
        COUNT(DISTINCT CASE WHEN last_active >= NOW() - INTERVAL '1 day' THEN LOWER(email) END) as daily_active_users,
        COUNT(DISTINCT CASE WHEN last_active >= NOW() - INTERVAL '7 days' THEN LOWER(email) END) as weekly_active_users,
        COUNT(DISTINCT CASE WHEN join_date >= CURRENT_DATE - INTERVAL '7 days' THEN LOWER(email) END) as new_users_this_week,
        COUNT(DISTINCT CASE WHEN join_date >= CURRENT_DATE - INTERVAL '30 days' THEN LOWER(email) END) as new_users_this_month,
        COUNT(DISTINCT CASE WHEN 'org_admin' = ANY(roles) THEN LOWER(email) END) as total_organizations,
        COUNT(DISTINCT city) as cities_with_users
      FROM user_profiles
      WHERE email IS NOT NULL AND email <> ''
        ${cityCondition}
    `,
      params,
    );
    return rows[0] || {};
  }

  async getDonationMetrics(
    cityCondition: string,
    params: unknown[],
  ): Promise<MetricsRow> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        COUNT(*) as total_donations,
        COUNT(CASE WHEN d.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as donations_this_week,
        COUNT(CASE WHEN d.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as donations_this_month,
        COUNT(CASE WHEN d.status = 'active' THEN 1 END) as active_donations,
        COUNT(CASE WHEN d.status = 'completed' THEN 1 END) as completed_donations,
        COUNT(CASE WHEN d.type = 'money' THEN 1 END) as money_donations,
        COUNT(CASE WHEN d.type = 'item' AND d.status = 'active' THEN 1 END) as item_donations,
        COUNT(CASE WHEN d.type = 'service' THEN 1 END) as service_donations,
        COUNT(CASE WHEN d.type = 'time' THEN 1 END) as volunteer_hours,
        SUM(CASE WHEN d.type = 'money' THEN d.amount ELSE 0 END) as total_money_donated,
        SUM(CASE WHEN d.type = 'money' AND d.is_recurring = true AND d.status = 'active' THEN d.amount ELSE 0 END) as recurring_donations_amount,
        COUNT(DISTINCT CASE WHEN d.is_recurring = true AND up.is_active = true THEN d.donor_id END) as unique_donors
      FROM donations d
      LEFT JOIN user_profiles up ON up.id = d.donor_id
      WHERE 1=1 ${cityCondition}
    `,
      params,
    );
    return rows[0] || {};
  }

  async getRideMetrics(
    cityCondition: string,
    params: unknown[],
  ): Promise<MetricsRow> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        COUNT(*) as total_rides,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as rides_this_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as rides_this_month,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rides,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides,
        SUM(available_seats) as total_seats_offered,
        COUNT(DISTINCT driver_id) as unique_drivers
      FROM rides 
      WHERE 1=1 ${cityCondition}
    `,
      params,
    );
    return rows[0] || {};
  }

  async getEventMetrics(
    cityCondition: string,
    params: unknown[],
  ): Promise<MetricsRow> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as events_this_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as events_this_month,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_events,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
        SUM(current_attendees) as total_event_attendees,
        COUNT(CASE WHEN is_virtual = true THEN 1 END) as virtual_events
      FROM community_events 
      WHERE 1=1 ${cityCondition}
    `,
      params,
    );
    return rows[0] || {};
  }

  async getActivityMetrics(): Promise<MetricsRow> {
    const { rows } = await this.pool.query(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as activities_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as activities_this_week,
        COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as total_logins,
        COUNT(CASE WHEN activity_type = 'donation' THEN 1 END) as donation_activities,
        COUNT(CASE WHEN activity_type = 'chat' THEN 1 END) as chat_activities,
        COUNT(DISTINCT user_id) as active_users_tracked
      FROM user_activities 
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    `);
    return rows[0] || {};
  }

  async getChatMetrics(): Promise<MetricsRow> {
    const { rows } = await this.pool.query(`
      SELECT 
        COUNT(DISTINCT cm.id) as total_messages,
        COUNT(DISTINCT cc.id) as total_conversations,
        COUNT(CASE WHEN cm.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as messages_this_week,
        COUNT(CASE WHEN cc.type = 'group' THEN 1 END) as group_conversations,
        COUNT(CASE WHEN cc.type = 'direct' THEN 1 END) as direct_conversations
      FROM chat_conversations cc
      LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
      WHERE cm.is_deleted = false
    `);
    return rows[0] || {};
  }

  async getSiteVisitsMetrics(city?: string): Promise<MetricsRow> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        COALESCE(SUM(stat_value), 0) as site_visits
      FROM community_stats 
      WHERE stat_type = 'site_visits'
      ${city ? "AND city IS NULL" : ""}
    `,
      city ? [city] : [],
    );
    return rows[0] || {};
  }

  async getTaskMetrics(): Promise<MetricsRow> {
    const { rows } = await this.pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'done' AND updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as completed_tasks_this_week,
        COUNT(CASE WHEN status = 'done' AND updated_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as completed_tasks_this_month
      FROM tasks
    `);
    return rows[0] || {};
  }

  async fetchCommunityStats(
    city?: string,
    dateFilter = "",
  ): Promise<MetricsRow[]> {
    const params: unknown[] = [];
    let query = `
      SELECT 
        stat_type,
        SUM(stat_value) as total_value,
        COUNT(DISTINCT date_period) as days_tracked
      FROM community_stats
      WHERE 1=1 ${dateFilter}
    `;

    if (city) {
      query += " AND city = $1";
      params.push(city);
    }

    query += " GROUP BY stat_type";
    const { rows } = await this.pool.query(query, params);
    return rows;
  }

  async getCityStats(statType?: string): Promise<MetricsRow[]> {
    const query = statType
      ? `
          SELECT city, SUM(stat_value) as total
          FROM community_stats
          WHERE stat_type = $1 AND city IS NOT NULL
          GROUP BY city
          ORDER BY total DESC
          LIMIT 20
        `
      : `
          SELECT city, COUNT(DISTINCT id) as total_users
          FROM user_profiles
          WHERE city IS NOT NULL AND city <> ''
          GROUP BY city
          ORDER BY total_users DESC
          LIMIT 20
        `;

    const params = statType ? [statType] : [];
    const { rows } = await this.pool.query(query, params);
    return rows;
  }

  async getCommunityTrends(
    statType: string,
    days: number,
  ): Promise<MetricsRow[]> {
    const { rows } = await this.pool.query(
      `
      SELECT date_period, SUM(stat_value) as value
      FROM community_stats
      WHERE stat_type = $1 AND date_period >= CURRENT_DATE - $2::INTEGER
      GROUP BY date_period
      ORDER BY date_period ASC
    `,
      [statType, days],
    );
    return rows;
  }
}
