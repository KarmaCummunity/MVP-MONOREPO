// File overview:
// - Purpose: Places autocomplete and details via Google Places API, with Redis caching and simple analytics.
// - Reached from: Routes '/autocomplete', '/place-details', '/search-stats'.
// - Env inputs: GOOGLE_API_KEY; language fixed to he-IL and country IL.
// - Provides: Caching for autocomplete results, simple Redis-based search metrics.
import { Controller, Get, Query } from "@nestjs/common";
import { RedisCacheService } from "../../redis/redis-cache.service";

@Controller()
export class PlacesController {
  constructor(private readonly redisCache: RedisCacheService) {}

  @Get("autocomplete")
  async autocomplete(@Query("input") input?: string) {
    if (!input) {
      return { error: "Missing input parameter" };
    }

    // Check cache first
    const cacheKey = `places:autocomplete:${input.toLowerCase()}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      // Track search activity
      await this.trackSearchActivity(input, "cached");
      return {
        predictions: cached,
        cached: true,
        source: "redis",
      };
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { error: "Missing GOOGLE_API_KEY" };
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input,
    )}&key=${apiKey}&language=he&components=country:il`;

    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      predictions: unknown[];
      error_message?: string;
    };

    if (data.status !== "OK") {
      return { error: data.status, message: data.error_message };
    }

    // Cache the results for 10 minutes
    await this.redisCache.set(cacheKey, data.predictions, 10 * 60);

    // Track search activity
    await this.trackSearchActivity(input, "api");

    return {
      predictions: data.predictions,
      cached: false,
      source: "google_api",
    };
  }

  @Get("place-details")
  async placeDetails(@Query("place_id") placeId?: string) {
    if (!placeId) {
      return { error: "Missing place_id parameter" };
    }
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { error: "Missing GOOGLE_API_KEY" };
    }
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&language=he`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      result: unknown;
      error_message?: string;
    };
    if (data.status !== "OK") {
      return { error: data.status, message: data.error_message };
    }
    return data.result;
  }

  @Get("search-stats")
  async getSearchStats() {
    try {
      const stats = await this.getPlacesStats();
      return {
        success: true,
        stats,
        message: "Places search statistics from Redis",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async trackSearchActivity(
    searchTerm: string,
    source: "cached" | "api",
  ) {
    const searchKey = `search_activity:${searchTerm.toLowerCase()}`;
    const globalKey = "global_search_stats";

    // Track individual search
    await this.redisCache.increment(searchKey);

    // Track global stats
    const globalStats = ((await this.redisCache.get(globalKey)) as {
      totalSearches: number;
      cacheHits: number;
      apiCalls: number;
      lastUpdated: string;
    }) || {
      totalSearches: 0,
      cacheHits: 0,
      apiCalls: 0,
      lastUpdated: new Date().toISOString(),
    };

    globalStats.totalSearches++;
    if (source === "cached") {
      globalStats.cacheHits++;
    } else {
      globalStats.apiCalls++;
    }
    globalStats.lastUpdated = new Date().toISOString();

    await this.redisCache.set(globalKey, globalStats, 24 * 60 * 60); // 24 hours
  }

  private async getPlacesStats() {
    const searchKeys = await this.redisCache.getKeys("search_activity:*");
    const cacheKeys = await this.redisCache.getKeys("places:autocomplete:*");
    const globalStats = ((await this.redisCache.get("global_search_stats")) as {
      totalSearches: number;
      cacheHits: number;
      apiCalls: number;
    }) || {
      totalSearches: 0,
      cacheHits: 0,
      apiCalls: 0,
    };

    const popularSearches = [];
    for (const key of searchKeys.slice(0, 10)) {
      // Top 10
      const searchTerm = key.replace("search_activity:", "");
      const count = (await this.redisCache.get<number>(key)) || 0;
      popularSearches.push({ searchTerm, count });
    }

    popularSearches.sort((a, b) => b.count - a.count);

    return {
      ...globalStats,
      cachedResults: cacheKeys.length,
      uniqueSearches: searchKeys.length,
      popularSearches: popularSearches.slice(0, 5),
      cacheHitRate:
        globalStats.totalSearches > 0
          ? Math.round(
              (globalStats.cacheHits / globalStats.totalSearches) * 100,
            )
          : 0,
    };
  }
}
