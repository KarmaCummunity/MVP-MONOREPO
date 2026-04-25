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

// Set JWT_SECRET before importing the service
process.env.JWT_SECRET = "test-secret-key-for-unit-tests-32chars!";

import { JwtService } from "./jwt.service";

describe("JwtService", () => {
  let service: JwtService;
  // Canonical user_profiles.id UUID used across all valid-token tests (SSoT).
  const TEST_USER_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-1234567890ab";

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JwtService(
      mockRedisCache as unknown as import("../redis/redis-cache.service").RedisCacheService,
    );
  });

  describe("Token Signing (SEC-001.1)", () => {
    it("should create a valid JWT with 3 parts", async () => {
      const result = await service.createTokenPair({
        id: TEST_USER_UUID,
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
        id: TEST_USER_UUID,
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
        id: TEST_USER_UUID,
        email: "user@karma.com",
        roles: ["user", "admin"],
      });

      const payloadBase64 = result.accessToken.split(".")[1];
      const payload = JSON.parse(
        Buffer.from(payloadBase64, "base64url").toString(),
      );

      expect(payload.userId).toBe(TEST_USER_UUID);
      expect(payload.email).toBe("user@karma.com");
      expect(payload.roles).toEqual(["user", "admin"]);
      expect(payload.type).toBe("access");
      expect(payload).toHaveProperty("iat");
      expect(payload).toHaveProperty("exp");
    });

    it("should set different expiry for access vs refresh tokens", async () => {
      const result = await service.createTokenPair({
        id: TEST_USER_UUID,
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

  describe("SSoT enforcement (UUID-bound subject)", () => {
    it("refuses to mint tokens whose user id is not a canonical user_profiles UUID", async () => {
      // Firebase-style UID (28 chars, no dashes) — must be rejected.
      await expect(
        service.createTokenPair({
          id: "FbAbCdEfGhIjKlMnOpQrStUv12",
          email: "x@y.com",
          roles: ["user"],
        }),
      ).rejects.toThrow(/UUID/);

      // Email is not a UUID — must be rejected.
      await expect(
        service.createTokenPair({
          id: "alice@example.com",
          email: "alice@example.com",
          roles: ["user"],
        }),
      ).rejects.toThrow(/UUID/);
    });

    it("accepts a canonical user_profiles.id UUID", async () => {
      const canonical = "a1b2c3d4-e5f6-4a7b-8c9d-1234567890ab";
      const tokens = await service.createTokenPair({
        id: canonical,
        email: "ok@example.com",
        roles: ["user"],
      });
      const payload = JSON.parse(
        Buffer.from(tokens.accessToken.split(".")[1], "base64url").toString(),
      );
      expect(payload.userId).toBe(canonical);
    });

    it("accepts any well-formed UUID (not just v4)", async () => {
      // v1 UUID — must not be rejected. Postgres' `uuid` column accepts it and we must not
      // brick login for a user whose row was generated with a non-v4 UUID.
      const v1Uuid = "e4eaaaf2-d142-11e1-b3e4-080027620cdd";
      const tokens = await service.createTokenPair({
        id: v1Uuid,
        email: "v1@example.com",
        roles: ["user"],
      });
      const payload = JSON.parse(
        Buffer.from(tokens.accessToken.split(".")[1], "base64url").toString(),
      );
      expect(payload.userId).toBe(v1Uuid);
    });
  });

  describe("Token Verification (SEC-001.1)", () => {
    it("should verify a valid access token", async () => {
      const tokens = await service.createTokenPair({
        id: TEST_USER_UUID,
        email: "verify@test.com",
        roles: ["user"],
      });

      const payload = await service.verifyToken(tokens.accessToken);
      expect(payload.userId).toBe(TEST_USER_UUID);
      expect(payload.email).toBe("verify@test.com");
      expect(payload.type).toBe("access");
    });

    it("should reject a tampered token", async () => {
      const tokens = await service.createTokenPair({
        id: TEST_USER_UUID,
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
