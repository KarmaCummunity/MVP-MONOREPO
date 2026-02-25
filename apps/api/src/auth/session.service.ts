// File overview:
// - Purpose: Manage user sessions stored in Redis (create, validate, list, delete, stats).
// - Reached from: `SessionController` endpoints and other services.
// - Storage: Keys `session:*` and `user_sessions:*` with TTL; metadata includes IP/UA.
import { Injectable } from "@nestjs/common";
import { RedisCacheService } from "../redis/redis-cache.service";
import { randomBytes } from "crypto";

export interface UserSession {
  userId: string;
  email: string;
  username?: string;
  loginTime: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = "session:";
  private readonly USER_SESSIONS_PREFIX = "user_sessions:";
  private readonly SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

  constructor(private readonly redisCache: RedisCacheService) {}

  /**
   * Create a new session for user
   */
  async createSession(
    userId: string,
    email: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      username?: string;
    } = {},
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();

    const sessionData: UserSession = {
      userId,
      email,
      username: metadata.username,
      loginTime: now,
      lastActivity: now,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    };

    // Store session data
    await this.redisCache.setWithExpiry(
      `${this.SESSION_PREFIX}${sessionId}`,
      sessionData,
      this.SESSION_DURATION,
    );

    // Track user sessions (for logout all devices)
    await this.addSessionToUser(userId, sessionId);

    return sessionId;
  }

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    if (!sessionId) return null;

    const sessionData = await this.redisCache.get<UserSession>(
      `${this.SESSION_PREFIX}${sessionId}`,
    );

    if (sessionData) {
      // Update last activity
      sessionData.lastActivity = new Date().toISOString();
      await this.redisCache.setWithExpiry(
        `${this.SESSION_PREFIX}${sessionId}`,
        sessionData,
        this.SESSION_DURATION,
      );
    }

    return sessionData;
  }

  /**
   * Validate session and return user data
   */
  async validateSession(sessionId: string): Promise<UserSession | null> {
    return await this.getSession(sessionId);
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;

    // Get session to find userId
    const sessionData = await this.redisCache.get<UserSession>(
      `${this.SESSION_PREFIX}${sessionId}`,
    );

    if (sessionData) {
      // Remove from user sessions list
      await this.removeSessionFromUser(sessionData.userId, sessionId);
    }

    // Delete the session
    return await this.redisCache.delete(`${this.SESSION_PREFIX}${sessionId}`);
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<number> {
    const userSessions = await this.getUserSessions(userId);
    let deletedCount = 0;

    for (const sessionId of userSessions) {
      const deleted = await this.redisCache.delete(
        `${this.SESSION_PREFIX}${sessionId}`,
      );
      if (deleted) deletedCount++;
    }

    // Clear user sessions list
    await this.redisCache.delete(`${this.USER_SESSIONS_PREFIX}${userId}`);

    return deletedCount;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const sessions = await this.redisCache.get<string[]>(
      `${this.USER_SESSIONS_PREFIX}${userId}`,
    );
    return sessions || [];
  }

  /**
   * Get session info for a user (for admin/debugging)
   */
  async getUserSessionsInfo(userId: string): Promise<UserSession[]> {
    const sessionIds = await this.getUserSessions(userId);
    const sessions: UserSession[] = [];

    for (const sessionId of sessionIds) {
      const sessionData = await this.redisCache.get<UserSession>(
        `${this.SESSION_PREFIX}${sessionId}`,
      );
      if (sessionData) {
        sessions.push(sessionData);
      }
    }

    return sessions;
  }

  /**
   * Clean expired sessions from user list
   */
  async cleanExpiredSessions(userId: string): Promise<void> {
    const sessionIds = await this.getUserSessions(userId);
    const validSessions: string[] = [];

    for (const sessionId of sessionIds) {
      const exists = await this.redisCache.exists(
        `${this.SESSION_PREFIX}${sessionId}`,
      );
      if (exists) {
        validSessions.push(sessionId);
      }
    }

    if (validSessions.length !== sessionIds.length) {
      await this.redisCache.setWithExpiry(
        `${this.USER_SESSIONS_PREFIX}${userId}`,
        validSessions,
        this.SESSION_DURATION,
      );
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    sessionKeys: string[];
  }> {
    const sessionKeys = await this.redisCache.getKeys(
      `${this.SESSION_PREFIX}*`,
    );

    return {
      totalActiveSessions: sessionKeys.length,
      sessionKeys,
    };
  }

  // Private helper methods

  private generateSessionId(): string {
    return randomBytes(32).toString("hex");
  }

  private async addSessionToUser(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    userSessions.push(sessionId);

    await this.redisCache.setWithExpiry(
      `${this.USER_SESSIONS_PREFIX}${userId}`,
      userSessions,
      this.SESSION_DURATION,
    );
  }

  private async removeSessionFromUser(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    const filteredSessions = userSessions.filter((id) => id !== sessionId);

    if (filteredSessions.length > 0) {
      await this.redisCache.setWithExpiry(
        `${this.USER_SESSIONS_PREFIX}${userId}`,
        filteredSessions,
        this.SESSION_DURATION,
      );
    } else {
      await this.redisCache.delete(`${this.USER_SESSIONS_PREFIX}${userId}`);
    }
  }
}
