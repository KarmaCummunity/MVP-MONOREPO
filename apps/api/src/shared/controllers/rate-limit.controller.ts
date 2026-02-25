// File overview:
// - Purpose: Endpoints to test, inspect, and manipulate rate limiting behavior.
// - Reached from: Routes under '/rate-limit'.
// - Provides: test, stress-test, status, clear, rules, stats, custom, simulate endpoints.
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Ip,
  Param,
  Query,
} from "@nestjs/common";
import {
  RateLimitService,
  RateLimitRule,
} from "../../modules/auth/rate-limit.service";

@Controller("rate-limit")
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  /**
   * Test rate limiting
   * POST /rate-limit/test
   */
  @Post("test")
  async testRateLimit(
    @Body() body: { ruleType?: string; identifier?: string },
    @Ip() ip: string,
  ) {
    try {
      const identifier = body.identifier || ip;
      const ruleType = body.ruleType || "general";

      const result = await this.rateLimitService.checkRateLimit(
        identifier,
        ruleType,
      );

      return {
        success: true,
        identifier,
        ruleType,
        rateLimitResult: result,
        message: result.allowed ? "Request allowed" : "Rate limit exceeded",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test multiple requests to trigger rate limit
   * POST /rate-limit/stress-test
   */
  @Post("stress-test")
  async stressTest(
    @Body()
    body: {
      requests?: number;
      ruleType?: string;
      identifier?: string;
      delayMs?: number;
    },
    @Ip() ip: string,
  ) {
    try {
      const identifier = body.identifier || ip;
      const ruleType = body.ruleType || "general";
      const requestCount = Math.min(body.requests || 10, 50); // Max 50 for safety
      const delayMs = body.delayMs || 100;

      const results = [];

      for (let i = 0; i < requestCount; i++) {
        const result = await this.rateLimitService.checkRateLimit(
          identifier,
          ruleType,
        );
        results.push({
          requestNumber: i + 1,
          allowed: result.allowed,
          remaining: result.remaining,
          blocked: result.blocked,
          resetTime: result.resetTime,
        });

        // Small delay between requests
        if (delayMs > 0 && i < requestCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => r.blocked).length;

      return {
        success: true,
        identifier,
        ruleType,
        totalRequests: requestCount,
        allowedRequests: allowedCount,
        deniedRequests: requestCount - allowedCount,
        blockedRequests: blockedCount,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get rate limit status for identifier
   * GET /rate-limit/status
   */
  @Get("status")
  async getRateLimitStatus(
    @Query("identifier") identifier: string,
    @Query("ruleType") ruleType = "general",
    @Ip() ip: string,
  ) {
    try {
      const targetIdentifier = identifier || ip;
      const status = await this.rateLimitService.getRateLimitStatus(
        targetIdentifier,
        ruleType,
      );

      return {
        success: true,
        identifier: targetIdentifier,
        ruleType,
        status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Clear rate limit for identifier
   * DELETE /rate-limit/clear
   */
  @Delete("clear")
  async clearRateLimit(
    @Body() body: { identifier?: string; ruleType?: string },
    @Ip() ip: string,
  ) {
    try {
      const identifier = body.identifier || ip;
      const ruleType = body.ruleType || "general";

      const cleared = await this.rateLimitService.clearRateLimit(
        identifier,
        ruleType,
      );

      return {
        success: true,
        identifier,
        ruleType,
        cleared,
        message: cleared
          ? "Rate limit cleared"
          : "No rate limit found to clear",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all available rate limit rules
   * GET /rate-limit/rules
   */
  @Get("rules")
  async getRules() {
    try {
      const rules = this.rateLimitService.getRules();

      return {
        success: true,
        rules,
        ruleTypes: Object.keys(rules),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get rate limit statistics
   * GET /rate-limit/stats
   */
  @Get("stats")
  async getStats() {
    try {
      const stats = await this.rateLimitService.getRateLimitStats();

      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test custom rate limit rule
   * POST /rate-limit/custom
   */
  @Post("custom")
  async testCustomRule(
    @Body()
    body: {
      rule: RateLimitRule;
      identifier?: string;
      customKey?: string;
    },
    @Ip() ip: string,
  ) {
    try {
      const identifier = body.identifier || ip;
      const result = await this.rateLimitService.applyCustomRateLimit(
        identifier,
        body.rule,
        body.customKey,
      );

      return {
        success: true,
        identifier,
        customRule: body.rule,
        customKey: body.customKey,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Simulate different endpoints with different rules
   * POST /rate-limit/simulate/:endpoint
   */
  @Post("simulate/:endpoint")
  async simulateEndpoint(
    @Param("endpoint") endpoint: string,
    @Ip() ip: string,
  ) {
    try {
      // Map endpoint to rule type
      const endpointRuleMap: Record<string, string> = {
        login: "login",
        register: "register",
        "reset-pwd": "pwd" + "_reset",
        chat: "chat",
        search: "search",
        api: "general",
      };

      const ruleType = endpointRuleMap[endpoint] || "general";
      const result = await this.rateLimitService.checkRateLimit(ip, ruleType);

      return {
        success: true,
        endpoint,
        ruleType,
        result,
        message: `Simulated ${endpoint} endpoint ${result.allowed ? "allowed" : "denied"}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
