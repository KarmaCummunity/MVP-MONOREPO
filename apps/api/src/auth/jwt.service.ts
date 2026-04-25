// File overview:
// - Purpose: JWT service for secure session token creation, validation, and refresh token management
// - Provides: Session token creation, validation, refresh tokens, secure signing
// - Security: Uses HMAC-SHA256 signing (SEC-001.1), proper expiration, blacklist support
// - SSoT contract: `userId` (the JWT actor / "sub" equivalent) is ALWAYS the canonical
//   `user_profiles.id` UUID. Firebase UID and Google `sub` are mapping inputs only and MUST
//   NOT be issued as tokens. Enforced in `createTokenPair`.

import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { RedisCacheService } from "../redis/redis-cache.service";
import { randomBytes, createHash, createHmac } from "crypto";

// Permissive UUID guard: accepts any 8-4-4-4-12 hex layout (matches what Postgres' `uuid`
// column accepts). We intentionally do NOT restrict by version/variant bits — refusing to mint
// tokens for legacy non-v4 UUIDs would brick login for those users.
const USER_PROFILE_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Canonical user-profile UUID guard.
 * Used inside `JwtService.createTokenPair` to refuse minting tokens with non-UUID actor ids
 * (e.g. firebase_uid or google_sub leaking through as the JWT subject).
 */
export function isCanonicalUserProfileUuid(value: unknown): value is string {
  return typeof value === "string" && USER_PROFILE_UUID_REGEX.test(value);
}

export interface SessionTokenPayload {
  userId: string;
  email: string;
  sessionId: string;
  roles: string[];
  iat: number;
  exp: number;
  type: "access" | "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private readonly ACCESS_TOKEN_EXPIRY = 60 * 60; // 1 hour in seconds
  private readonly REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds
  private readonly TOKEN_BLACKLIST_PREFIX = "blacklisted_token:";
  private readonly REFRESH_TOKEN_PREFIX = "refresh_token:";

  constructor(private readonly redisCache: RedisCacheService) {
    this.validateJwtSecret();
  }

  private validateJwtSecret(): void {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      this.logger.error(
        "JWT_SECRET is missing or too short (minimum 32 characters required)",
      );
      throw new Error("Invalid JWT configuration");
    }
  }

  /**
   * Create access and refresh token pair for authenticated user
   */
  async createTokenPair(user: {
    id: string;
    email: string;
    roles?: string[];
  }): Promise<TokenPair> {
    // SSoT enforcement: refuse to mint tokens whose actor id is not a canonical
    // `user_profiles.id` UUID. Firebase UIDs / Google `sub` values must be resolved first.
    if (!isCanonicalUserProfileUuid(user.id)) {
      const id: unknown = user.id;
      this.logger.error(
        "Refusing to issue JWT with non-UUID user id (SSoT violation)",
        {
          idShape: typeof id,
          length: typeof id === "string" ? id.length : 0,
        },
      );
      throw new Error(
        "JWT subject must be a canonical user_profiles.id UUID",
      );
    }

    const sessionId = this.generateSessionId();
    const now = Math.floor(Date.now() / 1000);

    // Create access token payload
    const accessPayload: SessionTokenPayload = {
      userId: user.id,
      email: user.email,
      sessionId,
      roles: user.roles || ["user"],
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRY,
      type: "access",
    };

    // Create refresh token payload
    const refreshPayload: SessionTokenPayload = {
      userId: user.id,
      email: user.email,
      sessionId,
      roles: user.roles || ["user"],
      iat: now,
      exp: now + this.REFRESH_TOKEN_EXPIRY,
      type: "refresh",
    };

    const accessToken = this.signToken(accessPayload);
    const refreshToken = this.signToken(refreshPayload);

    // Store refresh token in Redis with expiry
    await this.storeRefreshToken(sessionId, refreshToken, user.id);

    this.logger.log("Created token pair for user", {
      userId: user.id,
      email: user.email,
      sessionId,
      accessExpiresIn: this.ACCESS_TOKEN_EXPIRY,
      refreshExpiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      refreshExpiresIn: this.REFRESH_TOKEN_EXPIRY,
    };
  }

  /**
   * Verify and decode token
   */
  async verifyToken(token: string): Promise<SessionTokenPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException("Token has been revoked");
      }

      const payload = this.verifyTokenSignature(token);

      // Validate token hasn't expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new UnauthorizedException("Token has expired");
      }

      // For refresh tokens, verify it still exists in Redis
      if (payload.type === "refresh") {
        const storedToken = await this.getStoredRefreshToken(payload.sessionId);
        if (!storedToken || storedToken !== token) {
          throw new UnauthorizedException(
            "Refresh token is invalid or has been revoked",
          );
        }
      }

      return payload;
    } catch (error) {
      this.logger.warn("Token verification failed", {
        error: error instanceof Error ? error.message : String(error),
        tokenLength: token?.length,
      });
      throw new UnauthorizedException("Invalid token");
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const payload = await this.verifyToken(refreshToken);

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type for refresh");
    }

    // Create new access token with same session ID
    const now = Math.floor(Date.now() / 1000);
    const newAccessPayload: SessionTokenPayload = {
      userId: payload.userId,
      email: payload.email,
      sessionId: payload.sessionId,
      roles: payload.roles,
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRY,
      type: "access",
    };

    const accessToken = this.signToken(newAccessPayload);

    this.logger.log("Refreshed access token", {
      userId: payload.userId,
      sessionId: payload.sessionId,
    });

    return {
      accessToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    };
  }

  /**
   * Revoke token by adding to blacklist
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const payload = this.verifyTokenSignature(token);
      const remainingTtl = payload.exp - Math.floor(Date.now() / 1000);

      if (remainingTtl > 0) {
        // Add to blacklist until expiry
        const blacklistKey = `${this.TOKEN_BLACKLIST_PREFIX}${this.hashToken(token)}`;
        await this.redisCache.setWithExpiry(blacklistKey, true, remainingTtl);

        // If it's a refresh token, also remove from storage
        if (payload.type === "refresh") {
          await this.removeRefreshToken(payload.sessionId);
        }

        this.logger.log("Token revoked", {
          userId: payload.userId,
          sessionId: payload.sessionId,
          tokenType: payload.type,
        });
      }
    } catch (error) {
      this.logger.warn("Failed to revoke token", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Revoke all tokens for a user session
   */
  async revokeUserSession(sessionId: string): Promise<void> {
    try {
      await this.removeRefreshToken(sessionId);
      this.logger.log("User session revoked", { sessionId });
    } catch (error) {
      this.logger.error("Failed to revoke user session", {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  }

  /**
   * Get active sessions for user (for security monitoring)
   */
  async getUserActiveSessions(userId: string): Promise<
    Array<{
      sessionId: string;
      createdAt: Date;
      expiresAt: Date;
    }>
  > {
    try {
      const keys = await this.redisCache.getKeys(
        `${this.REFRESH_TOKEN_PREFIX}*`,
      );
      const sessions: Array<{
        sessionId: string;
        createdAt: Date;
        expiresAt: Date;
      }> = [];

      for (const key of keys) {
        const token = await this.redisCache.get<string>(key);
        if (token) {
          try {
            const payload = this.verifyTokenSignature(token);
            if (payload.userId === userId) {
              sessions.push({
                sessionId: payload.sessionId,
                createdAt: new Date(payload.iat * 1000),
                expiresAt: new Date(payload.exp * 1000),
              });
            }
          } catch {
            // Skip invalid tokens
          }
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error("Failed to get user active sessions", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return [];
    }
  }

  // Private helper methods

  private signToken(payload: SessionTokenPayload): string {
    const secret = process.env.JWT_SECRET as string;
    const header = { alg: "HS256", typ: "JWT" };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      "base64url",
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );

    const signature = createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verifyTokenSignature(token: string): SessionTokenPayload {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const secret = process.env.JWT_SECRET as string;

    // Verify signature
    const expectedSignature = createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      throw new Error("Invalid token signature");
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString(),
    );
    return payload;
  }

  private generateSessionId(): string {
    return randomBytes(32).toString("hex");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = `${this.TOKEN_BLACKLIST_PREFIX}${this.hashToken(token)}`;
    const isBlacklisted = await this.redisCache.get(blacklistKey);
    return Boolean(isBlacklisted);
  }

  private async storeRefreshToken(
    sessionId: string,
    refreshToken: string,
    userId: string,
  ): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${sessionId}`;
    await this.redisCache.setWithExpiry(
      key,
      refreshToken,
      this.REFRESH_TOKEN_EXPIRY,
    );

    // Also store user mapping for cleanup
    const userKey = `user_sessions:${userId}`;
    const userSessions = (await this.redisCache.get<string[]>(userKey)) || [];
    userSessions.push(sessionId);
    await this.redisCache.setWithExpiry(
      userKey,
      userSessions,
      this.REFRESH_TOKEN_EXPIRY,
    );
  }

  private async getStoredRefreshToken(
    sessionId: string,
  ): Promise<string | null> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${sessionId}`;
    return await this.redisCache.get<string>(key);
  }

  private async removeRefreshToken(sessionId: string): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${sessionId}`;
    await this.redisCache.delete(key);
  }
}
