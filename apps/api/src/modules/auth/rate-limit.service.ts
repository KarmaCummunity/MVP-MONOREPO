// File overview:
// - Purpose: Redis-backed rate limiting with per-identifier rules and block windows; utilities and stats.
// - Reached from: `RateLimitController` and other controllers/services enforcing quotas.
// - Rules: Built-in presets for general, login, register, password_reset, chat, search; supports custom rules.
import { Injectable } from "@nestjs/common";
import { RedisCacheService } from "../../redis/redis-cache.service";

export interface RateLimitRule {
  requests: number; // Number of requests allowed
  windowMs: number; // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  blocked?: boolean;
  blockExpiresAt?: Date;
}

@Injectable()
export class RateLimitService {
  private readonly RATE_LIMIT_PREFIX = "rate_limit:";
  private readonly BLOCKED_PREFIX = "blocked:";

  // Default rate limit rules
  private readonly DEFAULT_RULES: Record<string, RateLimitRule> = {
    // General API calls
    general: {
      requests: 100,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 5 * 60 * 1000, // 5 minutes
    },
    // Login attempts
    login: {
      requests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
    },
    // Registration
    register: {
      requests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
    },
    // Password reset
    password_reset: {
      requests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 60 * 60 * 1000, // 1 hour
    },
    // Chat/messaging
    chat: {
      requests: 50,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 10 * 60 * 1000, // 10 minutes
    },
    // Search
    search: {
      requests: 30,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 5 * 60 * 1000, // 5 minutes
    },
  };

  constructor(private readonly redisCache: RedisCacheService) {}

  /**
   * Check if request is allowed under rate limit
   */
  async checkRateLimit(
    identifier: string, // IP address or user ID
    ruleType = "general",
    customRule?: RateLimitRule,
  ): Promise<RateLimitResult> {
    const rule =
      customRule || this.DEFAULT_RULES[ruleType] || this.DEFAULT_RULES.general;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Check if currently blocked
    const blockKey = `${this.BLOCKED_PREFIX}${ruleType}:${identifier}`;
    const blockExpiry = await this.redisCache.get<number>(blockKey);

    if (blockExpiry && blockExpiry > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(blockExpiry),
        blocked: true,
        blockExpiresAt: new Date(blockExpiry),
      };
    }

    // Get current request count in window
    const key = `${this.RATE_LIMIT_PREFIX}${ruleType}:${identifier}`;
    const requests = (await this.redisCache.get<number[]>(key)) || [];

    // Filter requests within current window
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    // Check if limit exceeded
    if (validRequests.length >= rule.requests) {
      // Block user if rule has blocking configured
      if (rule.blockDurationMs) {
        const blockUntil = now + rule.blockDurationMs;
        await this.redisCache.setWithExpiry(
          blockKey,
          blockUntil,
          Math.ceil(rule.blockDurationMs / 1000),
        );

        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now + rule.windowMs),
          blocked: true,
          blockExpiresAt: new Date(blockUntil),
        };
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now + rule.windowMs),
      };
    }

    // Add current request
    validRequests.push(now);

    // Store updated requests with TTL
    await this.redisCache.setWithExpiry(
      key,
      validRequests,
      Math.ceil(rule.windowMs / 1000),
    );

    return {
      allowed: true,
      remaining: rule.requests - validRequests.length,
      resetTime: new Date(now + rule.windowMs),
    };
  }

  /**
   * Record a request (without checking limit)
   */
  async recordRequest(identifier: string, ruleType = "general"): Promise<void> {
    await this.checkRateLimit(identifier, ruleType);
  }

  /**
   * Clear rate limit for an identifier
   */
  async clearRateLimit(
    identifier: string,
    ruleType = "general",
  ): Promise<boolean> {
    const key = `${this.RATE_LIMIT_PREFIX}${ruleType}:${identifier}`;
    const blockKey = `${this.BLOCKED_PREFIX}${ruleType}:${identifier}`;

    const deleted1 = await this.redisCache.delete(key);
    const deleted2 = await this.redisCache.delete(blockKey);

    return deleted1 || deleted2;
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(
    identifier: string,
    ruleType = "general",
  ): Promise<{
    requests: number;
    limit: number;
    remaining: number;
    resetTime: Date;
    blocked: boolean;
    blockExpiresAt?: Date;
  }> {
    const rule = this.DEFAULT_RULES[ruleType] || this.DEFAULT_RULES.general;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Check if blocked
    const blockKey = `${this.BLOCKED_PREFIX}${ruleType}:${identifier}`;
    const blockExpiry = await this.redisCache.get<number>(blockKey);
    const blocked = blockExpiry ? blockExpiry > now : false;

    // Get current requests
    const key = `${this.RATE_LIMIT_PREFIX}${ruleType}:${identifier}`;
    const requests = (await this.redisCache.get<number[]>(key)) || [];
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    return {
      requests: validRequests.length,
      limit: rule.requests,
      remaining: Math.max(0, rule.requests - validRequests.length),
      resetTime: new Date(now + rule.windowMs),
      blocked,
      blockExpiresAt:
        blocked && blockExpiry ? new Date(blockExpiry) : undefined,
    };
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(): Promise<{
    totalRateLimitEntries: number;
    totalBlockedEntries: number;
    rateLimitKeys: string[];
    blockedKeys: string[];
  }> {
    const rateLimitKeys = await this.redisCache.getKeys(
      `${this.RATE_LIMIT_PREFIX}*`,
    );
    const blockedKeys = await this.redisCache.getKeys(
      `${this.BLOCKED_PREFIX}*`,
    );

    return {
      totalRateLimitEntries: rateLimitKeys.length,
      totalBlockedEntries: blockedKeys.length,
      rateLimitKeys,
      blockedKeys,
    };
  }

  /**
   * Get available rate limit rules
   */
  getRules(): Record<string, RateLimitRule> {
    return { ...this.DEFAULT_RULES };
  }

  /**
   * Create a custom rule for specific use case
   */
  async applyCustomRateLimit(
    identifier: string,
    rule: RateLimitRule,
    customKey?: string,
  ): Promise<RateLimitResult> {
    const ruleType = customKey || "custom";
    return await this.checkRateLimit(identifier, ruleType, rule);
  }
}
