// File overview:
// - Purpose: Utility endpoints to verify Redis connectivity and operations.
// - Reached from: Routes under '/redis-test'.
// - Provides: info, set/get/delete, keys, increment, and a comprehensive test suite.
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { RedisCacheService } from "../../redis/redis-cache.service";

@Controller("redis-test")
export class RedisTestController {
  constructor(private readonly redisCache: RedisCacheService) {}

  /**
   * Get Redis info and stats
   */
  @Get("info")
  async getRedisInfo() {
    try {
      const info = await this.redisCache.getInfo();
      return {
        success: true,
        ...info,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Set a test value in Redis
   * POST /redis-test/set
   * Body: { key: string, value: any, ttl?: number }
   */
  @Post("set")
  async setValue(@Body() body: { key: string; value: unknown; ttl?: number }) {
    try {
      const { key, value, ttl } = body;

      if (!key) {
        return { success: false, error: "Key is required" };
      }

      await this.redisCache.set(key, value, ttl);

      return {
        success: true,
        message: `Value set for key: ${key}`,
        key,
        value,
        ...(ttl && { ttl }),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get a value from Redis
   * GET /redis-test/get/:key
   */
  @Get("get/:key")
  async getValue(@Param("key") key: string) {
    try {
      const value = await this.redisCache.get(key);
      const exists = await this.redisCache.exists(key);

      return {
        success: true,
        key,
        value,
        exists,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a key from Redis
   * DELETE /redis-test/delete/:key
   */
  @Delete("delete/:key")
  async deleteValue(@Param("key") key: string) {
    try {
      const deleted = await this.redisCache.delete(key);

      return {
        success: true,
        key,
        deleted,
        message: deleted ? "Key deleted" : "Key not found",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all keys (with optional pattern)
   * GET /redis-test/keys?pattern=*
   */
  @Get("keys")
  async getKeys(@Query("pattern") pattern = "*") {
    try {
      const keys = await this.redisCache.getKeys(pattern);

      return {
        success: true,
        pattern,
        keys,
        count: keys.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Increment a counter
   * POST /redis-test/increment/:key
   * Body: { amount?: number }
   */
  @Post("increment/:key")
  async incrementValue(
    @Param("key") key: string,
    @Body() body: { amount?: number },
  ) {
    try {
      const amount = body.amount || 1;
      const newValue = await this.redisCache.increment(key, amount);

      return {
        success: true,
        key,
        amount,
        newValue,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test Redis operations (comprehensive test)
   * POST /redis-test/comprehensive
   */
  @Post("comprehensive")
  async comprehensiveTest() {
    const testKey = `test_${Date.now()}`;
    const testValue = {
      message: "Hello Redis!",
      timestamp: new Date().toISOString(),
    };

    try {
      const results = [];

      // Test 1: Set value
      await this.redisCache.set(testKey, testValue, 60); // 60 seconds TTL
      results.push({ test: "SET", status: "PASS", key: testKey });

      // Test 2: Get value
      const retrieved = await this.redisCache.get(testKey);
      const isEqual = JSON.stringify(retrieved) === JSON.stringify(testValue);
      results.push({
        test: "GET",
        status: isEqual ? "PASS" : "FAIL",
        retrieved,
        expected: testValue,
      });

      // Test 3: Check exists
      const exists = await this.redisCache.exists(testKey);
      results.push({
        test: "EXISTS",
        status: exists ? "PASS" : "FAIL",
        exists,
      });

      // Test 4: Increment counter
      const counterKey = `counter_${Date.now()}`;
      const count1 = await this.redisCache.increment(counterKey);
      const count2 = await this.redisCache.increment(counterKey, 5);
      results.push({
        test: "INCREMENT",
        status: count1 === 1 && count2 === 6 ? "PASS" : "FAIL",
        count1,
        count2,
      });

      // Test 5: Delete
      const deleted = await this.redisCache.delete(testKey);
      const stillExists = await this.redisCache.exists(testKey);
      results.push({
        test: "DELETE",
        status: deleted && !stillExists ? "PASS" : "FAIL",
        deleted,
        stillExists,
      });

      // Cleanup counter
      await this.redisCache.delete(counterKey);

      const passedTests = results.filter((r) => r.status === "PASS").length;
      const totalTests = results.length;

      return {
        success: true,
        summary: `${passedTests}/${totalTests} tests passed`,
        allTestsPassed: passedTests === totalTests,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        testKey,
      };
    }
  }
}
