/**
 * Unit tests for JwtService — SEC-001.1 (HMAC-SHA256 signing)
 * Tests: sign, verify, reject tampered tokens, reject expired tokens
 */
import { createHmac } from "crypto";

// Mock RedisCacheService
const mockRedisCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  setWithExpiry: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

// Mock Pool (pg)
const mockPool = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn(),
};

// Set JWT_SECRET before importing the service
process.env.JWT_SECRET = "test-secret-key-for-unit-tests-32chars!";

import { JwtService } from "./jwt.service";

describe("JwtService", () => {
  let service: JwtService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JwtService(
      mockRedisCache as unknown as import("../../redis/redis-cache.service").RedisCacheService,
      mockPool as unknown as import("pg").Pool,
    );
  });

  describe("Token Signing (SEC-001.1)", () => {
    it("should create a valid JWT with 3 parts", async () => {
      const result = await service.createTokenPair({
        id: "test-user-id",
        email: "test@example.com",
        roles: ["user"],
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");

      // JWT should have 3 parts: header.payload.signature
      const parts = result.accessToken.split(".");
      expect(parts).toHaveLength(3);
    });

    it("should use HMAC-SHA256 (not plain SHA-256)", async () => {
      const result = await service.createTokenPair({
        id: "test-user-id",
        email: "test@example.com",
        roles: ["user"],
      });

      const [header, payload, signature] = result.accessToken.split(".");

      // Verify the signature uses HMAC-SHA256
      const expectedSignature = createHmac(
        "sha256",
        process.env.JWT_SECRET ?? "",
      )
        .update(`${header}.${payload}`)
        .digest("base64url");

      expect(signature).toBe(expectedSignature);
    });

    it("should include correct claims in the payload", async () => {
      const result = await service.createTokenPair({
        id: "user-uuid-123",
        email: "user@karma.com",
        roles: ["user", "admin"],
      });

      const payloadBase64 = result.accessToken.split(".")[1];
      const payload = JSON.parse(
        Buffer.from(payloadBase64, "base64url").toString(),
      );

      expect(payload.userId).toBe("user-uuid-123");
      expect(payload.email).toBe("user@karma.com");
      expect(payload.roles).toEqual(["user", "admin"]);
      expect(payload.type).toBe("access");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("exp");
    });

    it("should set different expiry for access vs refresh tokens", async () => {
      const result = await service.createTokenPair({
        id: "user-id",
        email: "user@test.com",
        roles: ["user"],
      });

      const accessPayload = JSON.parse(
        Buffer.from(result.accessToken.split(".")[1], "base64url").toString(),
      );
      const refreshPayload = JSON.parse(
        Buffer.from(result.refreshToken.split(".")[1], "base64url").toString(),
      );

      // Refresh token should expire later than access token
      expect(refreshPayload.exp).toBeGreaterThan(accessPayload.exp);
    });
  });

  describe("Token Verification (SEC-001.1)", () => {
    it("should verify a valid access token", async () => {
      const tokens = await service.createTokenPair({
        id: "verify-user",
        email: "verify@test.com",
        roles: ["user"],
      });

      const payload = await service.verifyToken(tokens.accessToken);
      expect(payload.userId).toBe("verify-user");
      expect(payload.email).toBe("verify@test.com");
      expect(payload.type).toBe("access");
    });

    it("should reject a tampered token", async () => {
      const tokens = await service.createTokenPair({
        id: "user-original",
        email: "original@test.com",
        roles: ["user"],
      });

      // Tamper with the payload (change userId)
      const parts = tokens.accessToken.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      payload.userId = "attacker-user-id";
      parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const tamperedToken = parts.join(".");

      await expect(service.verifyToken(tamperedToken)).rejects.toThrow();
    });

    it("should reject a token with invalid format", async () => {
      await expect(service.verifyToken("not-a-valid-token")).rejects.toThrow();
      await expect(service.verifyToken("")).rejects.toThrow();
      await expect(service.verifyToken("a.b")).rejects.toThrow();
    });

    it("should reject an expired token", async () => {
      // Create a token that's already expired
      const header = { alg: "HS256", typ: "JWT" };
      const payload = {
        userId: "expired-user",
        email: "expired@test.com",
        sessionId: "session-expired",
        roles: ["user"],
        type: "access",
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      };

      const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
        "base64url",
      );
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64url",
      );
      const signature = createHmac("sha256", process.env.JWT_SECRET ?? "")
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64url");
      const expiredToken = `${encodedHeader}.${encodedPayload}.${signature}`;

      await expect(service.verifyToken(expiredToken)).rejects.toThrow();
    });
  });
});
