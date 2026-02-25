// File overview:
// - Purpose: Session endpoints for login (demo), validation, listing, logout (single/all), protected test, and stats.
// - Reached from: Routes under '/session'.
// - Provides: Uses `SessionService` for Redis-backed sessions and `RateLimitService` for throttling.
//
// ⚠️ WARNING: This is a DEMO/TEST controller. It should NOT be used in production.
// ⚠️ The real authentication happens in UsersController (/api/users/login).
// ⚠️ TODO: Remove this controller from production builds or disable the /session routes.
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Headers,
  Ip,
  Param,
  Inject,
  Logger,
} from "@nestjs/common";
import { SessionService } from "../auth/session.service";
import { RateLimitService } from "../auth/rate-limit.service";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import * as argon2 from "argon2";

@Controller("session")
export class SessionController {
  private readonly logger = new Logger(SessionController.name);
  constructor(
    private readonly sessionService: SessionService,
    private readonly rateLimitService: RateLimitService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /**
   * Login endpoint - creates session
   * POST /session/login
   *
   * ⚠️ WARNING: This is a demo endpoint. Production apps should use /api/users/login instead.
   */
  @Post("login")
  async login(
    @Body() body: { email: string; password: string; username?: string },
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    try {
      // Check rate limit for login attempts
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        ip,
        "login",
      );

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: "Too many login attempts",
          rateLimitInfo: {
            blocked: rateLimitResult.blocked,
            resetTime: rateLimitResult.resetTime,
            blockExpiresAt: rateLimitResult.blockExpiresAt,
          },
        };
      }

      const { email, password, username } = body;

      if (!email || !password) {
        return { success: false, error: "Email and password are required" };
      }

      // SECURITY FIX: Add real password verification
      // Look up user in database
      const normalizedEmail = email.toLowerCase().trim();
      const { rows } = await this.pool.query(
        `SELECT id, email, name, password_hash FROM user_profiles WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [normalizedEmail],
      );

      if (rows.length === 0) {
        return { success: false, error: "Invalid email or password" };
      }

      const user = rows[0];

      // Verify password using argon2
      if (!user.password_hash) {
        return {
          success: false,
          error:
            "This account uses Google login. Please use /api/users/login or Google OAuth.",
        };
      }

      const isValidPassword = await argon2.verify(user.password_hash, password);

      if (!isValidPassword) {
        return { success: false, error: "Invalid email or password" };
      }

      // Password verified successfully - create session
      const userId = user.id;

      // Create session
      const sessionId = await this.sessionService.createSession(userId, email, {
        ipAddress: ip,
        userAgent,
        username: username || user.name,
      });

      return {
        success: true,
        message: "Login successful",
        sessionId,
        userId,
        email,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
      };
    } catch (error) {
      this.logger.error("Session login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate session
   * GET /session/validate/:sessionId
   */
  @Get("validate/:sessionId")
  async validateSession(@Param("sessionId") sessionId: string) {
    try {
      const sessionData = await this.sessionService.validateSession(sessionId);

      if (!sessionData) {
        return {
          success: false,
          valid: false,
          error: "Invalid or expired session",
        };
      }

      return {
        success: true,
        valid: true,
        session: sessionData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get user's all sessions
   * GET /session/user/:userId
   */
  @Get("user/:userId")
  async getUserSessions(@Param("userId") userId: string) {
    try {
      const sessions = await this.sessionService.getUserSessionsInfo(userId);

      return {
        success: true,
        userId,
        activeSessions: sessions.length,
        sessions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Logout specific session
   * DELETE /session/logout/:sessionId
   */
  @Delete("logout/:sessionId")
  async logout(@Param("sessionId") sessionId: string) {
    try {
      const deleted = await this.sessionService.deleteSession(sessionId);

      return {
        success: deleted,
        message: deleted ? "Logout successful" : "Session not found",
        sessionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Logout all sessions for user
   * DELETE /session/logout-all/:userId
   */
  @Delete("logout-all/:userId")
  async logoutAll(@Param("userId") userId: string) {
    try {
      const deletedCount =
        await this.sessionService.deleteAllUserSessions(userId);

      return {
        success: true,
        message: `Logged out from ${deletedCount} devices`,
        deletedSessions: deletedCount,
        userId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get session statistics
   * GET /session/stats
   */
  @Get("stats")
  async getSessionStats() {
    try {
      const stats = await this.sessionService.getSessionStats();

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
   * Demo: Protected endpoint that requires session
   * GET /session/protected
   */
  @Get("protected")
  async protectedEndpoint(
    @Headers("session-id") sessionId: string,
    @Ip() ip: string,
  ) {
    try {
      // Check rate limit
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        ip,
        "general",
      );

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: "Rate limit exceeded",
          rateLimitInfo: rateLimitResult,
        };
      }

      // Validate session
      if (!sessionId) {
        return {
          success: false,
          error: "Session ID required in headers",
        };
      }

      const sessionData = await this.sessionService.validateSession(sessionId);

      if (!sessionData) {
        return {
          success: false,
          error: "Invalid or expired session",
        };
      }

      return {
        success: true,
        message: "Access granted to protected resource",
        user: {
          userId: sessionData.userId,
          email: sessionData.email,
          username: sessionData.username,
          lastActivity: sessionData.lastActivity,
        },
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
