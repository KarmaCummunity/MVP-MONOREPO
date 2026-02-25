import { Injectable, Inject, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { JwtService } from "../auth/jwt.service";
import * as argon2 from "argon2";
import * as admin from "firebase-admin";

export type UserSettings = {
  language?: string;
  dark_mode?: boolean;
  darkMode?: boolean;
  notifications_enabled?: boolean;
  notificationsEnabled?: boolean;
  privacy?: string;
  [key: string]: unknown;
};

export type RegisterUserBody = {
  email: string;
  password?: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  country?: string;
  interests?: string[];
  settings?: UserSettings;
  firebase_uid?: string;
  id?: string;
};

export type LoginUserBody = {
  email: string;
  password?: string;
};

type ResolveUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  roles: string[] | null;
  settings: UserSettings | null;
  created_at: string | Date;
  last_active: string | Date;
  firebase_uid?: string | null;
  google_id?: string | null;
};

type FirebaseProviderInfo = {
  providerId: string;
  uid?: string | null;
};

@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(userData: RegisterUserBody): Promise<{
    success: boolean;
    error?: string;
    data?: unknown;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const normalizedEmail = userData.email.toLowerCase().trim();

      const { rows: existingUsers } = await client.query(
        `SELECT id FROM user_profiles WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [normalizedEmail],
      );

      if (existingUsers.length > 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User already exists" };
      }

      let passwordHash = null;
      if (userData.password) {
        passwordHash = await argon2.hash(userData.password);
      }

      const PRE_APPROVED_ADMINS = [
        "mahalalel100@gmail.com",
        "matan7491@gmail.com",
        "ichai1306@gmail.com",
        "lianbh2004@gmail.com",
        "navesarussi@gmail.com",
        "karmacommunity2.0@gmail.com",
      ];

      const shouldBeAdmin = PRE_APPROVED_ADMINS.includes(normalizedEmail);
      const initialRoles = shouldBeAdmin ? ["user", "admin"] : ["user"];

      const nowIso = new Date().toISOString();
      const { rows: newUser } = await client.query(
        `
        INSERT INTO user_profiles (
          email, name, phone, avatar_url, bio, password_hash,
          karma_points, join_date, is_active, last_active,
          city, country, interests, roles, email_verified, settings, firebase_uid
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb, $17)
        RETURNING id
      `,
        [
          normalizedEmail,
          userData.name || normalizedEmail.split("@")[0],
          userData.phone || "+9720000000",
          userData.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || "User")}&background=random`,
          userData.bio || "משתמש חדש בקארמה קומיוניטי",
          passwordHash,
          0,
          nowIso,
          true,
          nowIso,
          userData.city || "ישראל",
          userData.country || "Israel",
          userData.interests || [],
          initialRoles,
          false,
          JSON.stringify(
            userData.settings || {
              language: "he",
              dark_mode: false,
              notifications_enabled: true,
              privacy: "public",
            },
          ),
          userData.firebase_uid || userData.id || null,
        ],
      );

      const userId = newUser[0].id;

      await client.query("COMMIT");

      await this.redisCache.clearStatsCaches();

      const { rows: createdUser } = await client.query(
        `SELECT id, email, name, phone, avatar_url, bio, city, country, interests, roles, settings, created_at, parent_manager_id
         FROM user_profiles WHERE id = $1`,
        [userId],
      );

      const user = {
        id: createdUser[0].id,
        email: createdUser[0].email,
        name: createdUser[0].name,
        phone: createdUser[0].phone,
        avatar_url: createdUser[0].avatar_url,
        bio: createdUser[0].bio || "",
        karma_points: 0,
        join_date: createdUser[0].created_at,
        is_active: true,
        last_active: nowIso,
        city: createdUser[0].city || "",
        country: createdUser[0].country || "Israel",
        interests: createdUser[0].interests || [],
        roles: createdUser[0].roles || ["user"],
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        total_donations_amount: 0,
        total_volunteer_hours: 0,
        email_verified: false,
        parent_manager_id: createdUser[0].parent_manager_id || null,
        settings: createdUser[0].settings || {},
      };

      return { success: true, data: user };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Register user error:", error);
      return { success: false, error: "Failed to register user" };
    } finally {
      client.release();
    }
  }

  async loginUser(loginData: LoginUserBody): Promise<{
    success: boolean;
    error?: string;
    data?: unknown;
  }> {
    try {
      const normalizedEmail = loginData.email.toLowerCase().trim();

      const { rows } = await this.pool.query(
        `SELECT id, email, name, phone, avatar_url, bio, password_hash, 
                karma_points, join_date, is_active, last_active, parent_manager_id,
                city, country, interests, roles, settings, created_at
         FROM user_profiles WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [normalizedEmail],
      );

      if (rows.length === 0) {
        return { success: false, error: "User not found" };
      }

      const user = rows[0];

      const PRE_APPROVED_ADMINS = [
        "mahalalel100@gmail.com",
        "matan7491@gmail.com",
        "ichai1306@gmail.com",
        "lianbh2004@gmail.com",
        "navesarussi@gmail.com",
        "karmacommunity2.0@gmail.com",
      ];

      const shouldBeAdmin = PRE_APPROVED_ADMINS.includes(normalizedEmail);
      const currentRoles: string[] = user.roles || [];

      if (shouldBeAdmin && !currentRoles.includes("admin")) {
        await this.pool.query(
          `UPDATE user_profiles SET roles = array_append(roles, 'admin') WHERE id = $1`,
          [user.id],
        );
        user.roles = [...currentRoles, "admin"];
      }

      if (loginData.password && user.password_hash) {
        const isValid = await argon2.verify(
          user.password_hash,
          loginData.password,
        );
        if (!isValid) {
          return { success: false, error: "Invalid password" };
        }
      }

      await this.pool.query(
        `UPDATE user_profiles SET last_active = NOW(), updated_at = NOW() WHERE id = $1`,
        [user.id],
      );

      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        bio: user.bio || "",
        karma_points: user.karma_points || 0,
        join_date: user.join_date || user.created_at,
        is_active: user.is_active !== false,
        last_active: new Date().toISOString(),
        city: user.city || "",
        country: user.country || "Israel",
        interests: user.interests || [],
        roles: user.roles || ["user"],
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        total_donations_amount: 0,
        total_volunteer_hours: 0,
        email_verified: user.email_verified || false,
        parent_manager_id: user.parent_manager_id || null,
        settings: user.settings || {},
      };

      return { success: true, data: userResponse };
    } catch (error) {
      this.logger.error("Login user error:", error);
      return { success: false, error: "Login failed" };
    }
  }

  async resolveUserId(body: {
    firebase_uid?: string;
    google_id?: string;
    email?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    tokens?: unknown;
    user?: unknown;
  }> {
    const { firebase_uid, google_id, email } = body;

    this.logger.log("🔍 ResolveUserId called with:", {
      firebase_uid,
      google_id,
      email,
    });

    if (!firebase_uid && !google_id && !email) {
      return {
        success: false,
        error: "Must provide firebase_uid, google_id, or email",
      };
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      let query = `
        SELECT id, email, name, avatar_url, roles, settings, created_at, last_active, firebase_uid, google_id
        FROM user_profiles 
        WHERE false 
      `;
      const params = [];
      let paramCount = 1;

      if (firebase_uid) {
        query += ` OR firebase_uid = $${paramCount++}`;
        params.push(firebase_uid);
      }
      if (google_id) {
        query += ` OR google_id = $${paramCount++}`;
        params.push(google_id);
      }
      if (email) {
        query += ` OR LOWER(email) = LOWER($${paramCount++})`;
        params.push(email);
      }

      query += ` LIMIT 1`;

      let rows: ResolveUserRow[] = [];
      try {
        const result = await client.query(query, params);
        rows = result.rows as ResolveUserRow[];
      } catch (err) {
        if ((err as Error).message?.includes("google_id")) {
          this.logger.warn(
            "⚠️ Google ID column missing in resolve-id, retrying without it",
          );
          let fallbackQuery = `SELECT id, email, name, avatar_url, roles, settings, created_at, last_active, firebase_uid FROM user_profiles WHERE false`;
          const fallbackParams = [];
          let fbCount = 1;
          if (firebase_uid) {
            fallbackQuery += ` OR firebase_uid = $${fbCount++}`;
            fallbackParams.push(firebase_uid);
          }
          if (email) {
            fallbackQuery += ` OR LOWER(email) = LOWER($${fbCount++})`;
            fallbackParams.push(email);
          }

          const fallbackResult = await client.query(
            fallbackQuery,
            fallbackParams,
          );
          rows = fallbackResult.rows as ResolveUserRow[];
        } else {
          throw err;
        }
      }

      if (rows.length === 0) {
        this.logger.log("❌ User not found for resolution:", {
          firebase_uid,
          google_id,
          email,
        });

        if (firebase_uid) {
          try {
            if (admin.apps.length > 0) {
              try {
                const firebaseUser = await admin.auth().getUser(firebase_uid);
                if (firebaseUser.email) {
                  const normalizedEmail = firebaseUser.email
                    .toLowerCase()
                    .trim();
                  const providerData = firebaseUser.providerData as
                    | FirebaseProviderInfo[]
                    | undefined;
                  const googleProvider = providerData?.find(
                    (p) => p.providerId === "google.com",
                  );
                  const googleId = googleProvider?.uid || null;

                  const creationTime = firebaseUser.metadata.creationTime
                    ? new Date(firebaseUser.metadata.creationTime)
                    : new Date();
                  const lastSignInTime = firebaseUser.metadata.lastSignInTime
                    ? new Date(firebaseUser.metadata.lastSignInTime)
                    : creationTime;

                  try {
                    const { rows: newUser } = await client.query(
                      `INSERT INTO user_profiles (
                        firebase_uid, google_id, email, name, avatar_url, bio,
                        karma_points, join_date, is_active, last_active,
                        city, country, interests, roles, email_verified, settings
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb)
                      RETURNING id, email, name, avatar_url, roles, settings, created_at, last_active`,
                      [
                        firebaseUser.uid,
                        googleId,
                        normalizedEmail,
                        firebaseUser.displayName ||
                          normalizedEmail.split("@")[0] ||
                          "User",
                        firebaseUser.photoURL ||
                          "https://i.pravatar.cc/150?img=1",
                        "משתמש חדש בקארמה קומיוניטי",
                        0,
                        creationTime,
                        true,
                        lastSignInTime,
                        "ישראל",
                        "Israel",
                        [],
                        ["user"],
                        firebaseUser.emailVerified || false,
                        JSON.stringify({
                          language: "he",
                          dark_mode: false,
                          notifications_enabled: true,
                          privacy: "public",
                        }),
                      ],
                    );
                    await client.query("COMMIT");
                    this.logger.log(
                      `✨ Auto-created user from Firebase: ${normalizedEmail} (${firebaseUser.uid})`,
                    );

                    const tokenPair = await this.jwtService.createTokenPair({
                      id: newUser[0].id,
                      email: newUser[0].email,
                      roles: newUser[0].roles || ["user"],
                    });

                    return {
                      success: true,
                      tokens: {
                        accessToken: tokenPair.accessToken,
                        refreshToken: tokenPair.refreshToken,
                        expiresIn: tokenPair.expiresIn,
                        refreshExpiresIn: tokenPair.refreshExpiresIn,
                      },
                      user: {
                        id: newUser[0].id,
                        email: newUser[0].email,
                        name: newUser[0].name,
                        avatar: newUser[0].avatar_url,
                        roles: newUser[0].roles || ["user"],
                        settings: newUser[0].settings || {},
                        createdAt: newUser[0].created_at,
                        lastActive: newUser[0].last_active,
                      },
                    };
                  } catch (insertError_: unknown) {
                    const insertError = insertError_ as Error;
                    if (
                      insertError.message &&
                      insertError.message.includes("google_id")
                    ) {
                      const { rows: newUser } = await client.query(
                        `INSERT INTO user_profiles (
                          firebase_uid, email, name, avatar_url, bio,
                          karma_points, join_date, is_active, last_active,
                          city, country, interests, roles, email_verified, settings
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13::text[], $14, $15::jsonb)
                        RETURNING id, email, name, avatar_url, roles, settings, created_at, last_active`,
                        [
                          firebaseUser.uid,
                          normalizedEmail,
                          firebaseUser.displayName ||
                            normalizedEmail.split("@")[0] ||
                            "User",
                          firebaseUser.photoURL ||
                            "https://i.pravatar.cc/150?img=1",
                          "משתמש חדש בקארמה קומיוניטי",
                          0,
                          creationTime,
                          true,
                          lastSignInTime,
                          "ישראל",
                          "Israel",
                          [],
                          ["user"],
                          firebaseUser.emailVerified || false,
                          JSON.stringify({
                            language: "he",
                            dark_mode: false,
                            notifications_enabled: true,
                            privacy: "public",
                          }),
                        ],
                      );
                      await client.query("COMMIT");
                      this.logger.log(
                        `✨ Auto-created user from Firebase (without google_id): ${normalizedEmail} (${firebaseUser.uid})`,
                      );

                      const tokenPair = await this.jwtService.createTokenPair({
                        id: newUser[0].id,
                        email: newUser[0].email,
                        roles: newUser[0].roles || ["user"],
                      });

                      return {
                        success: true,
                        tokens: {
                          accessToken: tokenPair.accessToken,
                          refreshToken: tokenPair.refreshToken,
                          expiresIn: tokenPair.expiresIn,
                          refreshExpiresIn: tokenPair.refreshExpiresIn,
                        },
                        user: {
                          id: newUser[0].id,
                          email: newUser[0].email,
                          name: newUser[0].name,
                          avatar: newUser[0].avatar_url,
                          roles: newUser[0].roles || ["user"],
                          settings: newUser[0].settings || {},
                          createdAt: newUser[0].created_at,
                          lastActive: newUser[0].last_active,
                        },
                      };
                    } else {
                      throw insertError;
                    }
                  }
                }
              } catch (firebaseError) {
                this.logger.warn(
                  "⚠️ Could not fetch user from Firebase Admin SDK:",
                  firebaseError,
                );
              }
            }
          } catch {
            this.logger.warn(
              "⚠️ Firebase Admin SDK not available for auto-creation",
            );
          }
        }

        await client.query("ROLLBACK");
        this.logger.log("❌ User not found for resolution");
        return { success: false, error: "User not found" };
      }

      const user = rows[0];

      let resolvedBy = "unknown";
      if (firebase_uid && user.firebase_uid === firebase_uid) {
        resolvedBy = "firebase_uid";
      } else if (google_id && user.google_id === google_id) {
        resolvedBy = "google_id";
      } else if (email && user.email?.toLowerCase() === email.toLowerCase()) {
        resolvedBy = "email";
      }
      this.logger.log(`✅ User resolved by ${resolvedBy}:`, {
        email: user.email,
        id: user.id,
      });

      let needsUpdate = false;
      const updateFields: string[] = [];
      const updateValues = [];
      let upCount = 1;

      if (firebase_uid && user.firebase_uid !== firebase_uid) {
        if (!user.firebase_uid) {
          this.logger.log(
            `🔗 Linking User ${user.email} to Firebase UID: ${firebase_uid}`,
          );
          updateFields.push(`firebase_uid = $${upCount++}`);
          updateValues.push(firebase_uid);
          needsUpdate = true;
        } else {
          this.logger.warn(
            `⚠️ Conflict: User ${user.email} has different Firebase UID (${user.firebase_uid}) than provided (${firebase_uid})`,
          );
        }
      }

      if (google_id && user.google_id !== google_id) {
        if (!user.google_id) {
          this.logger.log(
            `🔗 Linking User ${user.email} to Google ID: ${google_id}`,
          );
          updateFields.push(`google_id = $${upCount++}`);
          updateValues.push(google_id);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        try {
          updateValues.push(user.id);
          const updateQuery = `
            UPDATE user_profiles 
            SET ${updateFields.join(", ")}, updated_at = NOW()
            WHERE id = $${upCount}
          `;
          await client.query(updateQuery, updateValues);
          this.logger.log("✅ User linked successfully");
        } catch (updateErr) {
          this.logger.error("❌ Failed to link user account:", updateErr);
        }
      }

      await client.query("COMMIT");

      await this.redisCache.delete(`user_profile_${user.id}`);
      if (user.firebase_uid)
        await this.redisCache.delete(`user_profile_${user.firebase_uid}`);
      if (user.email)
        await this.redisCache.delete(`user_profile_${user.email}`);

      const tokenPair = await this.jwtService.createTokenPair({
        id: user.id,
        email: user.email ?? "",
        roles: user.roles || ["user"],
      });

      return {
        success: true,
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          refreshExpiresIn: tokenPair.refreshExpiresIn,
        },
        user: {
          id: user.id,
          email: user.email ?? "",
          name: user.name,
          avatar: user.avatar_url,
          roles: user.roles || ["user"],
          settings: user.settings || {},
          createdAt: user.created_at,
          lastActive: user.last_active,
        },
      };
    } catch (err) {
      const error = err as Error;
      await client.query("ROLLBACK");
      this.logger.error("❌ Error in resolveUserId:", error);
      return {
        success: false,
        error: error.message || "Failed to resolve user ID",
      };
    } finally {
      client.release();
    }
  }
}
