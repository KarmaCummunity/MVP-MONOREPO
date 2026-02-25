import { Injectable, Logger } from "@nestjs/common";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import { StatsQueriesService } from "./stats-queries.service";
import { StatsMapperService, CommunityStats } from "./stats-mapper.service";

interface CacheKeys {
  userMetrics: string;
  donationMetrics: string;
  rideMetrics: string;
  eventMetrics: string;
  activityMetrics: string;
  chatMetrics: string;
  siteVisitsMetrics: string;
  taskMetrics: string;
}

@Injectable()
export class ComputedStatsService {
  private readonly logger = new Logger(ComputedStatsService.name);

  constructor(
    private readonly queriesService: StatsQueriesService,
    private readonly mapperService: StatsMapperService,
    private readonly redisCache: RedisCacheService,
  ) {}

  private buildCacheKeys(city?: string): CacheKeys {
    const cityKey = city || "global";
    return {
      userMetrics: `computed_stats_users_${cityKey}`,
      donationMetrics: `computed_stats_donations_${cityKey}`,
      rideMetrics: `computed_stats_rides_${cityKey}`,
      eventMetrics: `computed_stats_events_${cityKey}`,
      activityMetrics: `computed_stats_activities_${cityKey}`,
      chatMetrics: `computed_stats_chat_${cityKey}`,
      siteVisitsMetrics: `computed_stats_site_visits_${cityKey}`,
      taskMetrics: `computed_stats_tasks_${cityKey}`,
    };
  }

  private buildCityConditions(city?: string): {
    userCondition: string;
    donationCondition: string;
    rideCondition: string;
    eventCondition: string;
  } {
    return {
      userCondition: city ? "AND city = $1" : "",
      donationCondition: city ? "AND (d.location->>'city' = $1)" : "",
      rideCondition: city ? "AND (from_location->>'city' = $1)" : "",
      eventCondition: city ? "AND (location->>'city' = $1)" : "",
    };
  }

  async addComputedStats(stats: CommunityStats, city?: string): Promise<void> {
    try {
      const params = city ? [city] : [];
      const conditions = this.buildCityConditions(city);
      const cacheKeys = this.buildCacheKeys(city);

      const cachedMetrics = await this.tryGetCachedMetrics(cacheKeys);

      const [
        userMetrics,
        donationMetrics,
        rideMetrics,
        eventMetrics,
        activityMetrics,
        chatMetrics,
        siteVisitsMetrics,
        taskMetrics,
      ] = await Promise.all([
        this.getOrFetchUserMetrics(
          cacheKeys.userMetrics,
          cachedMetrics,
          conditions.userCondition,
          params,
        ),
        this.getOrFetchDonationMetrics(
          cacheKeys.donationMetrics,
          cachedMetrics,
          conditions.donationCondition,
          params,
        ),
        this.getOrFetchRideMetrics(
          cacheKeys.rideMetrics,
          cachedMetrics,
          conditions.rideCondition,
          params,
        ),
        this.getOrFetchEventMetrics(
          cacheKeys.eventMetrics,
          cachedMetrics,
          conditions.eventCondition,
          params,
        ),
        this.getOrFetchActivityMetrics(
          cacheKeys.activityMetrics,
          cachedMetrics,
        ),
        this.getOrFetchChatMetrics(cacheKeys.chatMetrics, cachedMetrics),
        this.getOrFetchSiteVisitsMetrics(
          cacheKeys.siteVisitsMetrics,
          cachedMetrics,
          city,
        ),
        this.getOrFetchTaskMetrics(cacheKeys.taskMetrics, cachedMetrics),
      ]);

      this.mergeMetrics(stats, [
        this.mapperService.mapUserMetrics(userMetrics),
        this.mapperService.mapDonationMetrics(donationMetrics),
        this.mapperService.mapRideMetrics(rideMetrics),
        this.mapperService.mapEventMetrics(eventMetrics),
        this.mapperService.mapActivityMetrics(activityMetrics),
        this.mapperService.mapChatMetrics(chatMetrics),
        this.mapperService.mapSiteVisitsMetrics(siteVisitsMetrics),
        this.mapperService.mapTaskMetrics(taskMetrics),
        this.mapperService.calculateDerivedMetrics(stats),
      ]);
    } catch (error) {
      this.logger.error("Error adding computed stats:", error);
      throw error;
    }
  }

  private async tryGetCachedMetrics(
    cacheKeys: CacheKeys,
  ): Promise<Map<string, unknown>> {
    try {
      return await this.redisCache.getMultiple(Object.values(cacheKeys));
    } catch (cacheError) {
      this.logger.warn(
        "Cache getMultiple error, continuing without cache:",
        cacheError,
      );
      return new Map();
    }
  }

  private async getOrFetchUserMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
    condition: string,
    params: unknown[],
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getUserMetrics(condition, params);
    await this.cacheMetrics(cacheKey, metrics, 20 * 60);
    return metrics;
  }

  private async getOrFetchDonationMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
    condition: string,
    params: unknown[],
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getDonationMetrics(
      condition,
      params,
    );
    await this.cacheMetrics(cacheKey, metrics, 15 * 60);
    return metrics;
  }

  private async getOrFetchRideMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
    condition: string,
    params: unknown[],
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getRideMetrics(condition, params);
    await this.cacheMetrics(cacheKey, metrics, 15 * 60);
    return metrics;
  }

  private async getOrFetchEventMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
    condition: string,
    params: unknown[],
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getEventMetrics(
      condition,
      params,
    );
    await this.cacheMetrics(cacheKey, metrics, 10 * 60);
    return metrics;
  }

  private async getOrFetchActivityMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getActivityMetrics();
    await this.cacheMetrics(cacheKey, metrics, 5 * 60);
    return metrics;
  }

  private async getOrFetchChatMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getChatMetrics();
    await this.cacheMetrics(cacheKey, metrics, 5 * 60);
    return metrics;
  }

  private async getOrFetchSiteVisitsMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
    city?: string,
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getSiteVisitsMetrics(city);
    await this.cacheMetrics(cacheKey, metrics, 5 * 60);
    return metrics;
  }

  private async getOrFetchTaskMetrics(
    cacheKey: string,
    cachedMetrics: Map<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const cached = cachedMetrics.get(cacheKey);
    if (cached) return cached as Record<string, unknown>;

    const metrics = await this.queriesService.getTaskMetrics();
    await this.cacheMetrics(cacheKey, metrics, 10 * 60);
    return metrics;
  }

  private async cacheMetrics(
    key: string,
    data: unknown,
    ttl: number,
  ): Promise<void> {
    try {
      await this.redisCache.set(key, data, ttl);
    } catch (error) {
      this.logger.warn(`Failed to cache metrics for ${key}:`, error);
    }
  }

  private mergeMetrics(
    target: CommunityStats,
    sources: Partial<CommunityStats>[],
  ): void {
    sources.forEach((source) => {
      Object.assign(target, source);
    });
  }
}
