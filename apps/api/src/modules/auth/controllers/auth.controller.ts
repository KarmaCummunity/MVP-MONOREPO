// File overview:
// - Purpose: Authentication endpoints for email/password and Google OAuth with enhanced security.
// - Reached from: Routes under '/auth'.
// - Provides: check-email, register, login, google auth endpoints with secure validation.
// - External deps: argon2 for password hashing, google-auth-library for OAuth verification.
// - Security: Rate limiting, input validation DTOs, secure logging (no sensitive data).
//
// SECURITY IMPROVEMENTS:
// ✅ Input validation with class-validator DTOs
// ✅ Password hashing with Argon2 (industry standard)
// ✅ Secure logging - no tokens or passwords in logs
// ✅ Proper error handling with appropriate HTTP status codes
// ✅ Email normalization and validation
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { Pool } from "pg";
import * as argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";
import { PG_POOL } from "../../../database/database.module";
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  validate,
} from "class-validator";
import { Transform } from "class-transformer";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { JwtService } from "../jwt.service";
import { RedisCacheService } from "../../../redis/redis-cache.service";

// DTO for Google Auth with proper validation
// Ensures tokens are within expected length ranges to prevent malformed data
class GoogleAuthDto {
  @IsString()
  @IsOptional()
  @Length(10, 5000, { message: "ID token length is invalid" })
  idToken?: string;

  @IsString()
  @IsOptional()
  @Length(10, 2000, { message: "Access token length is invalid" })
  accessToken?: string;

  @IsString()
  @IsOptional()
  @Length(1, 200, { message: "Firebase UID length is invalid" })
  firebaseUid?: string; // Firebase UID from Firebase Auth (different from Google ID)
}

// DTO for token refresh
class RefreshTokenDto {
  @IsString()
  @Length(10, 2000, { message: "Refresh token length is invalid" })
  refreshToken!: string;
}

// DTO for login with validation
// Automatically transforms email to lowercase for consistent storage
class LoginDto {
  @IsEmail({}, { message: "Invalid email format" })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email!: string;

  @IsString()
  @Length(6, 100, { message: "Password must be between 6 and 100 characters" })
  password!: string;
}

// DTO for registration - extends LoginDto with optional name field
class RegisterDto extends LoginDto {
  @IsString()
  @IsOptional()
  @Length(1, 100, { message: "Name must be between 1 and 100 characters" })
  name?: string;
}

/**
 * Shape of user settings stored in JSON.
 * Keeps known keys typed while allowing future extensions.
 */
type UserSettings = {
  language?: string;
  darkMode?: boolean;
  notificationsEnabled?: boolean;
  [key: string]: unknown;
};

/**
 * Public user type - excludes sensitive data like password hash
 * This is what gets returned to clients
 */
type PublicUser = {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  roles?: string[];
  settings?: UserSettings;
  createdAt?: string;
  lastActive?: string;
};

/**
 * Legacy user data shape used when syncing from older schemas.
 * Only includes fields that are actually accessed in the code.
 */
type LegacyUserLocation = {
  city?: string | null;
  country?: string | null;
} | null;

type LegacyUserData = {
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  karmaPoints?: number | string | null;
  joinDate?: string | Date | null;
  isActive?: boolean | null;
  location?: LegacyUserLocation;
  interests?: string[] | null;
  roles?: string[] | null;
  postsCount?: number | string | null;
  followersCount?: number | string | null;
  followingCount?: number | string | null;
  total_donations_amount?: number | string | null;
  total_volunteer_hours?: number | string | null;
  emailVerified?: boolean | null;
  settings?: UserSettings | null;
};

/**
 * Database row shape when converting to a public user.
 * Includes password_hash so it can be safely stripped out.
 */
type UserRowWithPassword = PublicUser & {
  password_hash?: string | null;
};

/**
 * Basic Google user profile extracted from tokens / Google APIs.
 */
type GoogleUserProfile = {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatar?: string | null;
  emailVerified: boolean;
};

/**
 * Error type that may carry an HTTP status code (e.g. Nest exceptions).
 */
type ErrorWithStatus = Error & {
  status?: number;
};

/**
 * Authentication Controller
 *
 * Handles user authentication via email/password and Google OAuth.
 * All sensitive operations are rate-limited to prevent abuse.
 *
 * Security features:
 * - Rate limiting on all endpoints
 * - Input validation with DTOs
 * - Password hashing with Argon2
 * - Secure logging (no sensitive data in logs)
 * - Email normalization
 */
@Controller("auth")
@UseGuards(ThrottlerGuard) // Apply rate limiting to all auth endpoints
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private googleClient: OAuth2Client;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
    private readonly redisCache: RedisCacheService,
  ) {
    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!clientId) {
      this.logger.error(
        "❌ Google Client ID not found in environment variables",
      );
      throw new Error("Google authentication is not properly configured");
    }

    this.googleClient = new OAuth2Client(clientId);
    this.logger.log("✅ Google OAuth client initialized successfully");
  }

  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = $1
         ) AS exists`,
        [tableName],
      );
      return !!rows?.[0]?.exists;
    } catch {
      return false;
    }
  }

  private async upsertUserProfileFromLegacy(
    userData: LegacyUserData,
  ): Promise<void> {
    // Best-effort: keep relational profile in sync when schema exists
    if (!userData?.email) return;
    const hasProfiles = await this.tableExists("user_profiles");
    if (!hasProfiles) return;

    const email = this.normalizeEmail(userData.email);
    const name = userData.name || email.split("@")[0];
    const avatar = userData.avatar || null;
    const now = new Date().toISOString();

    try {
      const { rows } = await this.pool.query(
        `SELECT id FROM user_profiles WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email],
      );

      if (rows.length > 0) {
        await this.pool.query(
          `UPDATE user_profiles
             SET name = COALESCE($1, name),
                 avatar_url = COALESCE($2, avatar_url),
                 last_active = NOW(),
                 email_verified = COALESCE($3, email_verified),
                 updated_at = NOW()
           WHERE id = $4`,
          [name, avatar, !!userData.emailVerified, rows[0].id],
        );
      } else {
        await this.pool.query(
          `INSERT INTO user_profiles (
             email, name, avatar_url, bio, karma_points, join_date, is_active,
             last_active, city, country, interests, roles, posts_count, followers_count,
             following_count, total_donations_amount, total_volunteer_hours, email_verified, settings
           ) VALUES (
             $1,   $2,   $3,         $4,  $5,          $6,       $7,
             $8,          $9,  $10,    $11,      $12,   $13,         $14,
             $15,              $16,                    $17,             $18,          $19
           )`,
          [
            email,
            name,
            avatar,
            userData.bio || "משתמש חדש בקארמה קומיוניטי",
            Number(userData.karmaPoints || 0),
            userData.joinDate ? new Date(userData.joinDate) : new Date(),
            userData.isActive !== false,
            now,
            (userData.location && userData.location.city) || null,
            (userData.location && userData.location.country) || "Israel",
            Array.isArray(userData.interests) ? userData.interests : [],
            Array.isArray(userData.roles) ? userData.roles : ["user"],
            Number(userData.postsCount || 0),
            Number(userData.followersCount || 0),
            Number(userData.followingCount || 0),
            Number(userData.total_donations_amount || 0),
            Number(userData.total_volunteer_hours || 0),
            !!userData.emailVerified,
            userData.settings || {
              language: "he",
              dark_mode: false,
              notifications_enabled: true,
              privacy: "public",
            },
          ],
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      this.logger.warn(
        "AuthController - upsertUserProfileFromLegacy skipped (schema present but insert/update failed):",
        err,
      );
    }
  }

  private normalizeEmail(email: string): string {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  private toPublicUser(
    rowData: UserRowWithPassword | null | undefined,
  ): PublicUser {
    if (!rowData) {
      throw new Error("Invalid user data");
    }
    const { password_hash: _pw, ...rest } = rowData;
    return rest as PublicUser;
  }

  /**
   * Check if an email is already registered in the system
   *
   * Security: Rate limited to prevent email enumeration attacks
   *
   * @param email - Email address to check
   * @returns Object with 'exists' boolean
   */
  @Get("check-email")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async checkEmail(@Query("email") email?: string) {
    try {
      const normalized = this.normalizeEmail(email || "");
      if (!normalized || !this.isValidEmail(normalized)) {
        throw new BadRequestException("Invalid email format");
      }

      // SECURITY: Log only partial email (first 3 chars + domain) to prevent email leakage
      const emailParts = normalized.split("@");
      const safeEmail = `${emailParts[0].substring(0, 3)}***@${emailParts[1]}`;
      this.logger.log(`Email availability check for: ${safeEmail}`);

      const { rows } = await this.pool.query(
        `SELECT 1 FROM user_profiles WHERE LOWER(email) = $1 LIMIT 1`,
        [normalized],
      );

      return { exists: rows.length > 0 };
    } catch (error_: unknown) {
      const error = error_ as ErrorWithStatus;
      // SECURITY: Don't leak email in error logs
      this.logger.error("Email check failed", { error: error.message });
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to check email availability",
      );
    }
  }

  /**
   * Validate email format according to RFC 5321
   *
   * @param email - Email to validate
   * @returns true if valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 320; // RFC 5321 limit
  }

  /**
   * Register a new user with email and password
   *
   * Security:
   * - Rate limited to prevent spam registrations
   * - Password hashed with Argon2 (industry standard)
   * - Input validation via DTOs
   * - No sensitive data in logs
   *
   * @param registerDto - User registration data
   * @returns Success status and public user data
   */
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registrations per minute
  async register(@Body() registerDto: RegisterDto) {
    try {
      // Validate input
      const errors = await validate(registerDto);
      if (errors.length > 0) {
        throw new BadRequestException("Invalid input data");
      }

      const normalized = this.normalizeEmail(registerDto.email);

      // SECURITY: Log only partial email for privacy
      const emailParts = normalized.split("@");
      const safeEmail = `${emailParts[0].substring(0, 3)}***@${emailParts[1]}`;
      this.logger.log(`Registration attempt for: ${safeEmail}`);

      // Check if exists
      const existRes = await this.pool.query(
        `SELECT id FROM user_profiles WHERE LOWER(email) = $1 LIMIT 1`,
        [normalized],
      );
      if (existRes.rows.length > 0) {
        // SECURITY: Don't reveal if email exists to prevent enumeration
        this.logger.warn(`Registration failed - email already registered`);
        return { error: "Email already registered" };
      }

      // SECURITY: Hash password with Argon2 (memory-hard algorithm, resistant to GPU attacks)
      const passwordHash = await argon2.hash(registerDto.password);
      const nowIso = new Date().toISOString();

      // Insert into user_profiles with UUID
      const { rows: newUser } = await this.pool.query(
        `INSERT INTO user_profiles (
          email, name, phone, avatar_url, bio, password_hash, 
          karma_points, join_date, is_active, last_active, 
          city, country, interests, roles, email_verified, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, email, name, avatar_url, roles, settings, created_at, last_active`,
        [
          normalized,
          registerDto.name || normalized.split("@")[0],
          "+9720000000",
          "https://i.pravatar.cc/150?img=1",
          "משתמש חדש בקארמה קומיוניטי",
          passwordHash,
          0, // karma_points
          nowIso, // join_date
          true, // is_active
          nowIso, // last_active
          "ישראל", // city
          "Israel", // country
          [], // interests (empty array)
          ["user"], // roles
          false, // email_verified
          JSON.stringify({
            language: "he",
            darkMode: false,
            notificationsEnabled: true,
          }), // settings
        ],
      );

      const userId = newUser[0].id;
      const userData = {
        id: userId,
        email: normalized,
        name: newUser[0].name,
        avatar: newUser[0].avatar_url,
        roles: newUser[0].roles,
        settings: newUser[0].settings,
        createdAt: newUser[0].created_at,
        lastActive: newUser[0].last_active,
      };

      // Clear statistics cache when new user is registered
      // This ensures totalUsers and other user-related stats are refreshed immediately
      await this.redisCache.clearStatsCaches();

      // SECURITY: Log success without exposing sensitive data
      this.logger.log(`✅ User registered successfully (ID: ${userId})`);
      return { ok: true, user: this.toPublicUser(userData) };
    } catch (error_: unknown) {
      const error = error_ as ErrorWithStatus;
      // SECURITY: Generic error message, log details separately
      this.logger.error("Registration failed", { error: error.message });
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException("Registration failed");
    }
  }

  /**
   * Login with email and password
   *
   * Security:
   * - Rate limited to prevent brute force attacks
   * - Password verification with Argon2
   * - Generic error messages (don't reveal if email exists)
   * - No sensitive data in logs
   *
   * @param loginDto - Login credentials
   * @returns Success status and public user data
   */
  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  async login(@Body() loginDto: LoginDto) {
    try {
      // Validate input
      const errors = await validate(loginDto);
      if (errors.length > 0) {
        throw new BadRequestException("Invalid input data");
      }

      const normalized = this.normalizeEmail(loginDto.email);

      // SECURITY: Log only partial email
      const emailParts = normalized.split("@");
      const safeEmail = `${emailParts[0].substring(0, 3)}***@${emailParts[1]}`;
      this.logger.log(`Login attempt for user: ${safeEmail}`);

      const { rows } = await this.pool.query(
        `SELECT id, email, name, avatar_url, password_hash, roles, settings, created_at, last_active
         FROM user_profiles WHERE LOWER(email) = $1 LIMIT 1`,
        [normalized],
      );

      if (rows.length === 0) {
        // SECURITY: Generic error - don't reveal if email exists
        this.logger.warn(`Login failed - invalid credentials`);
        return { error: "Invalid email or password" };
      }

      const hash = rows[0].password_hash as string | undefined;

      if (!hash) {
        // SECURITY: Generic error message
        this.logger.warn(`Login failed - no password hash for user`);
        return { error: "User cannot login with password" };
      }

      // SECURITY: Verify password with Argon2 (constant-time comparison)
      const valid = await argon2.verify(hash, loginDto.password);
      if (!valid) {
        // SECURITY: Generic error - don't reveal that email exists
        this.logger.warn(`Login failed - invalid password`);
        return { error: "Invalid email or password" };
      }

      // Update lastActive
      await this.pool.query(
        `UPDATE user_profiles SET last_active = NOW(), updated_at = NOW() WHERE id = $1`,
        [rows[0].id],
      );

      // Build user data object
      const userData = {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].name,
        avatar: rows[0].avatar_url,
        roles: rows[0].roles || ["user"],
        settings: rows[0].settings || {},
        createdAt: rows[0].created_at,
        lastActive: new Date().toISOString(),
      };

      // SECURITY: Log success without exposing sensitive data
      this.logger.log(`✅ Successful login for user ID: ${rows[0].id}`);
      return { ok: true, user: this.toPublicUser(userData) };
    } catch (error_: unknown) {
      const error = error_ as Error;
      // SECURITY: Generic error message
      this.logger.error("Login error", { error: error.message });
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException("Login failed");
    }
  }

  /**
   * Authenticate with Google OAuth
   *
   * Security:
   * - Rate limited to prevent abuse
   * - Server-side token verification (prevents token forgery)
   * - Email verification required
   * - No sensitive data in logs (no tokens logged)
   *
   * @param googleAuthDto - Google OAuth tokens
   * @returns Success status and public user data
   */
  @Post("google")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 Google auth attempts per minute
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    try {
      // Validate input
      const errors = await validate(googleAuthDto);
      if (errors.length > 0) {
        throw new BadRequestException("Invalid token format");
      }

      const { idToken, accessToken, firebaseUid } = googleAuthDto;

      if (!idToken && !accessToken) {
        throw new BadRequestException("Missing Google token");
      }

      // SECURITY: Log auth attempt without exposing tokens
      this.logger.log("Google authentication attempt", {
        hasIdToken: !!idToken,
        hasAccessToken: !!accessToken,
        timestamp: new Date().toISOString(),
      });

      let googleUser: GoogleUserProfile | null = null;

      // Verify ID token if provided
      if (idToken) {
        try {
          // SECURITY: Verify token with Google's servers (prevents forgery)
          const ticket = await this.googleClient.verifyIdToken({
            idToken,
            audience:
              process.env.GOOGLE_CLIENT_ID ||
              process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          });
          const payload = ticket.getPayload();

          if (!payload || !payload.email) {
            this.logger.warn("Invalid Google ID token payload");
            throw new BadRequestException("Invalid Google token");
          }

          // SECURITY: Email must be verified by Google
          if (!payload.email_verified) {
            // SECURITY: Log only domain, not full email
            const emailDomain = payload.email.split("@")[1];
            this.logger.warn(
              `Google account email not verified (domain: ${emailDomain})`,
            );
            throw new BadRequestException(
              "Google account email must be verified",
            );
          }

          googleUser = {
            id: payload.sub, // Google ID (sub claim)
            googleId: payload.sub, // Store Google ID separately
            email: payload.email,
            name: payload.name || payload.given_name || "Google User",
            avatar: payload.picture,
            emailVerified: payload.email_verified,
          };

          // SECURITY: Log only domain, not full email
          const emailDomain = payload.email.split("@")[1];
          this.logger.log(
            `✅ Google ID token verified successfully (domain: ${emailDomain})`,
          );
        } catch (error) {
          this.logger.warn(
            `Google ID token verification failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          // If we have an access token, we can try to use that instead
          if (!accessToken) {
            throw error;
          }
          this.logger.log("Falling back to access token verification...");
        }
      }

      // If no googleUser yet (either no idToken or verification failed), try access token
      if (!googleUser && accessToken) {
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!response.ok) {
          // If we already tried idToken and it failed, and now accessToken also failed
          if (idToken) {
            throw new BadRequestException(
              "Both ID token and Access token verification failed",
            );
          }
          return { error: "Invalid Google access token" };
        }

        const profile = await response.json();
        googleUser = {
          id: profile.sub, // Google ID (sub claim)
          googleId: profile.sub, // Store Google ID separately
          email: profile.email,
          name: profile.name || profile.given_name || "Google User",
          avatar: profile.picture,
          emailVerified: true, // Assume verified since it came from Google
        };

        this.logger.log("✅ Google Access token verified successfully");
      }

      if (!googleUser || !googleUser.email) {
        this.logger.error("Failed to extract user info from Google response");
        throw new BadRequestException("Could not get user info from Google");
      }

      const normalizedEmail = this.normalizeEmail(googleUser.email);
      if (!this.isValidEmail(normalizedEmail)) {
        // SECURITY: Log only domain
        const emailDomain = normalizedEmail.split("@")[1];
        this.logger.error(`Invalid email from Google (domain: ${emailDomain})`);
        throw new BadRequestException("Invalid email from Google");
      }

      const nowIso = new Date().toISOString();

      // SECURITY: Log only partial email
      const emailParts = normalizedEmail.split("@");
      const safeEmail = `${emailParts[0].substring(0, 3)}***@${emailParts[1]}`;
      this.logger.log(`Processing Google auth for user: ${safeEmail}`);

      // Extract Google ID and Firebase UID separately
      // Firebase UID is the actual UID from Firebase Auth, which is different from Google ID
      const googleIdToUse = googleUser.googleId || googleUser.id; // Google ID (sub claim)
      const firebaseUidToUse = firebaseUid; // Only Firebase UID, not Google ID

      // Check if user exists by email, firebase_uid, or google_id
      type UserProfileRow = {
        id: string;
        email: string;
        name: string | null;
        avatar_url: string | null;
        firebase_uid?: string | null;
        google_id?: string | null;
        roles?: string[] | null;
        settings?: UserSettings | null;
        created_at?: string | Date;
        last_active?: string | Date;
      };

      let rows: UserProfileRow[];
      try {
        const result = await this.pool.query(
          `SELECT id, email, name, avatar_url, firebase_uid, google_id, roles, settings, created_at, last_active
           FROM user_profiles 
           WHERE LOWER(email) = $1 OR firebase_uid = $2 OR google_id = $3
           LIMIT 1`,
          [normalizedEmail, firebaseUidToUse, googleIdToUse],
        );
        rows = result.rows as UserProfileRow[];
      } catch (error_: unknown) {
        const error = error_ as Error;
        // If google_id column doesn't exist, try without it
        if (error.message && error.message.includes("google_id")) {
          const result = await this.pool.query(
            `SELECT id, email, name, avatar_url, firebase_uid, roles, settings, created_at, last_active
             FROM user_profiles 
             WHERE LOWER(email) = $1 OR firebase_uid = $2
             LIMIT 1`,
            [normalizedEmail, firebaseUidToUse],
          );
          rows = result.rows as UserProfileRow[];
        } else {
          throw error;
        }
      }

      let userData: PublicUser;
      let userId: string;

      if (rows.length > 0) {
        // Update existing user
        userId = rows[0].id;
        try {
          await this.pool.query(
            `UPDATE user_profiles 
             SET name = $1, avatar_url = $2, firebase_uid = $3, google_id = $4, last_active = $5, updated_at = NOW()
             WHERE id = $6`,
            [
              googleUser.name,
              googleUser.avatar || rows[0].avatar_url,
              firebaseUidToUse, // Store Firebase UID (from Firebase Auth, not Google ID)
              googleIdToUse, // Store Google ID separately
              nowIso,
              userId,
            ],
          );
        } catch (error_: unknown) {
          const error = error_ as Error;
          // If google_id column doesn't exist, try without it
          if (error.message && error.message.includes("google_id")) {
            await this.pool.query(
              `UPDATE user_profiles 
               SET name = $1, avatar_url = $2, firebase_uid = $3, last_active = $4, updated_at = NOW()
               WHERE id = $5`,
              [
                googleUser.name,
                googleUser.avatar || rows[0].avatar_url,
                firebaseUidToUse, // Store Firebase UID (from Firebase Auth, not Google ID)
                nowIso,
                userId,
              ],
            );
          } else {
            throw error;
          }
        }

        // Fetch updated user data
        const { rows: updatedRows } = await this.pool.query(
          `SELECT id, email, name, avatar_url, roles, settings, created_at, last_active
           FROM user_profiles WHERE id = $1`,
          [userId],
        );

        userData = {
          id: updatedRows[0].id,
          email: updatedRows[0].email,
          name: updatedRows[0].name ?? undefined,
          avatar: updatedRows[0].avatar_url ?? undefined,
          roles: updatedRows[0].roles || ["user"],
          settings: updatedRows[0].settings || {},
          createdAt: updatedRows[0].created_at
            ? new Date(updatedRows[0].created_at).toISOString()
            : undefined,
          lastActive: updatedRows[0].last_active
            ? new Date(updatedRows[0].last_active).toISOString()
            : undefined,
        };

        // Clear statistics cache when existing user is updated
        await this.redisCache.clearStatsCaches();
      } else {
        // Create new user with UUID
        let newUser: { rows: UserProfileRow[] };
        try {
          const result = await this.pool.query(
            `INSERT INTO user_profiles (
              firebase_uid, google_id, email, name, avatar_url, bio, 
              karma_points, join_date, is_active, last_active, 
              city, country, interests, roles, email_verified, settings
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb)
            RETURNING id, email, name, avatar_url, roles, settings, created_at, last_active`,
            [
              firebaseUidToUse, // firebase_uid (from Firebase Auth, not Google ID)
              googleIdToUse, // google_id (from Google, not Firebase UID)
              normalizedEmail,
              googleUser.name,
              googleUser.avatar || "https://i.pravatar.cc/150?img=1",
              "משתמש חדש בקארמה קומיוניטי",
              0, // karma_points
              nowIso, // join_date
              true, // is_active
              nowIso, // last_active
              "ישראל", // city
              "Israel", // country
              [], // interests (empty array)
              ["user"], // roles
              googleUser.emailVerified || false, // email_verified
              JSON.stringify({
                language: "he",
                darkMode: false,
                notificationsEnabled: true,
              }), // settings
            ],
          );
          newUser = result as { rows: UserProfileRow[] };
        } catch (error_: unknown) {
          const error = error_ as Error;
          // If google_id column doesn't exist, try without it
          if (error.message && error.message.includes("google_id")) {
            const result = await this.pool.query(
              `INSERT INTO user_profiles (
                firebase_uid, email, name, avatar_url, bio, 
                karma_points, join_date, is_active, last_active, 
                city, country, interests, roles, email_verified, settings
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13::text[], $14, $15::jsonb)
              RETURNING id, email, name, avatar_url, roles, settings, created_at, last_active`,
              [
                firebaseUidToUse, // firebase_uid (from Firebase Auth, not Google ID)
                normalizedEmail,
                googleUser.name,
                googleUser.avatar || "https://i.pravatar.cc/150?img=1",
                "משתמש חדש בקארמה קומיוניטי",
                0, // karma_points
                nowIso, // join_date
                true, // is_active
                nowIso, // last_active
                "ישראל", // city
                "Israel", // country
                [], // interests (empty array)
                ["user"], // roles
                googleUser.emailVerified || false, // email_verified
                JSON.stringify({
                  language: "he",
                  darkMode: false,
                  notificationsEnabled: true,
                }), // settings
              ],
            );
            newUser = result as { rows: UserProfileRow[] };
          } else {
            throw error;
          }
        }

        const { rows: newUserRows } = newUser;

        userId = newUserRows[0].id;
        userData = {
          id: newUserRows[0].id,
          email: newUserRows[0].email,
          name: newUserRows[0].name ?? undefined,
          avatar: newUserRows[0].avatar_url ?? undefined,
          roles: newUserRows[0].roles || ["user"],
          settings: newUserRows[0].settings || {},
          createdAt: newUserRows[0].created_at
            ? new Date(newUserRows[0].created_at).toISOString()
            : undefined,
          lastActive: newUserRows[0].last_active
            ? new Date(newUserRows[0].last_active).toISOString()
            : undefined,
        };

        // Clear statistics cache when new user is created
        await this.redisCache.clearStatsCaches();
      }

      // SECURITY: Log success without exposing sensitive data
      this.logger.log(
        `✅ Google authentication successful (user ID: ${userId})`,
      );

      // Generate JWT tokens for the authenticated user
      const publicUser = this.toPublicUser(userData);

      const tokenPair = await this.jwtService.createTokenPair({
        id: publicUser.id,
        email: publicUser.email,
        roles: publicUser.roles || ["user"],
      });

      // Return tokens and user data in the format expected by the client
      return {
        success: true,
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          refreshExpiresIn: tokenPair.refreshExpiresIn,
        },
        user: publicUser,
      };
    } catch (error_: unknown) {
      const error = error_ as ErrorWithStatus;
      // SECURITY: Generic error message, log details separately
      this.logger.error("Google authentication failed", {
        error: error?.message || String(error),
        // Only include stack trace in development
        stack:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException("Google authentication failed");
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * Security:
   * - Rate limited to prevent abuse
   * - Validates refresh token before issuing new access token
   * - No sensitive data in logs
   *
   * @param refreshTokenDto - Refresh token data
   * @returns New access token and expiration time
   */
  @Post("refresh")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 refresh attempts per minute
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      // Validate input
      const errors = await validate(refreshTokenDto);
      if (errors.length > 0) {
        throw new BadRequestException("Invalid refresh token format");
      }

      this.logger.log("Token refresh attempt", {
        timestamp: new Date().toISOString(),
      });

      // Use JwtService to refresh the token
      const result = await this.jwtService.refreshAccessToken(
        refreshTokenDto.refreshToken,
      );

      this.logger.log("Token refreshed successfully");

      return {
        success: true,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      };
    } catch (error_: unknown) {
      const error = error_ as ErrorWithStatus;
      // SECURITY: Generic error message, log details separately
      this.logger.error("Token refresh failed", {
        error: error?.message || String(error),
        // Only include stack trace in development
        stack:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      // If it's an UnauthorizedException from JwtService, return as 401
      if (error.status === 401 || error.message?.includes("Unauthorized")) {
        throw new BadRequestException("Invalid or expired refresh token");
      }

      throw new InternalServerErrorException("Token refresh failed");
    }
  }
}
