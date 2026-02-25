// File overview:
// - Purpose: Sync Firebase Authentication users to user_profiles table
// - Provides: Endpoint to sync users automatically (can be called from Firebase Cloud Function)
// - Security: Should be protected with API key or admin authentication

import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UnauthorizedException,
  UseGuards,
  Logger,
  Inject,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { AdminAuthGuard } from "../../auth/jwt-auth.guard";
import * as admin from "firebase-admin";

@Controller("api/sync")
export class SyncController {
  private readonly logger = new Logger(SyncController.name);
  // Simple API key check - in production, use proper authentication
  private readonly SYNC_API_KEY =
    process.env.SYNC_API_KEY || "change-me-in-production";
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
          );
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        }
      } catch {
        this.logger.warn(
          "⚠️ Firebase Admin SDK not initialized - sync endpoint will not work",
        );
      }
    }
  }

  /**
   * Check API key for sync endpoints
   */
  private checkApiKey(apiKey?: string) {
    if (!apiKey || apiKey !== this.SYNC_API_KEY) {
      throw new UnauthorizedException("Invalid API key");
    }
  }

  private async getFirebaseUser(
    firebase_uid?: string,
    email?: string,
  ): Promise<
    { ok: true; user: admin.auth.UserRecord } | { ok: false; error: string }
  > {
    if (!firebase_uid && !email) {
      return { ok: false, error: "Must provide firebase_uid or email" };
    }
    try {
      const user = firebase_uid
        ? await admin.auth().getUser(firebase_uid)
        : await admin.auth().getUserByEmail(email ?? "");
      if (!user.email) {
        return { ok: false, error: "User has no email" };
      }
      return { ok: true, user };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("❌ Error fetching user from Firebase:", error);
      return { ok: false, error: "User not found in Firebase" };
    }
  }

  /**
   * Sync a single user from Firebase to user_profiles
   * Can be called from Firebase Cloud Function when a new user is created
   *
   * @param body - { firebase_uid: string } or { email: string }
   * @param headers - API key in X-API-Key header
   * @returns Success status
   */
  @Post("user")
  @UseGuards(AdminAuthGuard)
  async syncUser(
    @Body() body: { firebase_uid?: string; email?: string },
    @Headers("x-api-key") apiKey?: string,
  ) {
    if (this.SYNC_API_KEY !== "change-me-in-production") {
      this.checkApiKey(apiKey);
    }
    const fbResult = await this.getFirebaseUser(body.firebase_uid, body.email);
    if (!fbResult.ok) {
      return { success: false, error: fbResult.error };
    }
    const firebaseUser = fbResult.user;
    const normalizedEmail = (firebaseUser.email ?? "").toLowerCase().trim();
    const googleProvider = firebaseUser.providerData?.find(
      (p) => p.providerId === "google.com",
    );
    const googleId = googleProvider?.uid ?? null;

    try {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");

        // Check if user already exists
        const { rows: existingUsers } = await client.query(
          `SELECT id, email, firebase_uid, google_id FROM user_profiles 
           WHERE firebase_uid = $1 OR LOWER(email) = LOWER($2)
           LIMIT 1`,
          [firebaseUser.uid, normalizedEmail],
        );

        const creationTime = firebaseUser.metadata.creationTime
          ? new Date(firebaseUser.metadata.creationTime)
          : new Date();
        const lastSignInTime = firebaseUser.metadata.lastSignInTime
          ? new Date(firebaseUser.metadata.lastSignInTime)
          : creationTime;

        if (existingUsers.length > 0) {
          // User exists - update if needed
          const existingUser = existingUsers[0];
          const needsUpdate: string[] = [];
          const updateValues: unknown[] = [];
          let paramCount = 1;

          if (
            !existingUser.firebase_uid ||
            existingUser.firebase_uid !== firebaseUser.uid
          ) {
            needsUpdate.push(`firebase_uid = $${paramCount++}`);
            updateValues.push(firebaseUser.uid);
          }

          if (
            googleId &&
            (!existingUser.google_id || existingUser.google_id !== googleId)
          ) {
            needsUpdate.push(`google_id = $${paramCount++}`);
            updateValues.push(googleId);
          }

          if (
            firebaseUser.displayName &&
            existingUser.name !== firebaseUser.displayName
          ) {
            needsUpdate.push(`name = $${paramCount++}`);
            updateValues.push(firebaseUser.displayName);
          }

          if (firebaseUser.photoURL) {
            needsUpdate.push(`avatar_url = $${paramCount++}`);
            updateValues.push(firebaseUser.photoURL);
          }

          if (firebaseUser.emailVerified !== undefined) {
            needsUpdate.push(`email_verified = $${paramCount++}`);
            updateValues.push(firebaseUser.emailVerified);
          }

          if (firebaseUser.metadata.lastSignInTime) {
            needsUpdate.push(`last_active = $${paramCount++}`);
            updateValues.push(new Date(firebaseUser.metadata.lastSignInTime));
          }

          if (needsUpdate.length > 0) {
            needsUpdate.push(`updated_at = NOW()`);
            updateValues.push(existingUser.id);

            await client.query(
              `UPDATE user_profiles 
               SET ${needsUpdate.join(", ")} 
               WHERE id = $${paramCount}`,
              updateValues,
            );
            await client.query("COMMIT");
            return {
              success: true,
              action: "updated",
              user_id: existingUser.id,
            };
          } else {
            await client.query("COMMIT");
            return {
              success: true,
              action: "no_changes",
              user_id: existingUser.id,
            };
          }
        } else {
          // User doesn't exist - create new
          try {
            const { rows: newUser } = await client.query(
              `INSERT INTO user_profiles (
                firebase_uid, google_id, email, name, avatar_url, bio,
                karma_points, join_date, is_active, last_active,
                city, country, interests, roles, email_verified, settings
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb)
              RETURNING id`,
              [
                firebaseUser.uid,
                googleId,
                normalizedEmail,
                firebaseUser.displayName ||
                  normalizedEmail.split("@")[0] ||
                  "User",
                firebaseUser.photoURL || "https://i.pravatar.cc/150?img=1",
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
            return { success: true, action: "created", user_id: newUser[0].id };
          } catch (insertError_: unknown) {
            const insertError = insertError_ as Error;
            // If google_id column doesn't exist, try without it
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
                RETURNING id`,
                [
                  firebaseUser.uid,
                  normalizedEmail,
                  firebaseUser.displayName ||
                    normalizedEmail.split("@")[0] ||
                    "User",
                  firebaseUser.photoURL || "https://i.pravatar.cc/150?img=1",
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
              return {
                success: true,
                action: "created",
                user_id: newUser[0].id,
              };
            } else {
              throw insertError;
            }
          }
        }
      } catch (error_: unknown) {
        const error = error_ as Error;
        await client.query("ROLLBACK");
        this.logger.error("❌ Error syncing user:", error);
        return {
          success: false,
          error: error.message || "Failed to sync user",
        };
      } finally {
        client.release();
      }
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("❌ Sync user error:", error);
      return { success: false, error: error.message || "Failed to sync user" };
    }
  }

  private async syncSingleUser(
    client: import("pg").PoolClient,
    firebaseUser: admin.auth.UserRecord,
  ): Promise<{ created: boolean; updated: boolean; error: boolean }> {
    const normalizedEmail = (firebaseUser.email || "").toLowerCase().trim();

    let googleId: string | null = null;
    const googleProvider = firebaseUser.providerData?.find(
      (p) => p.providerId === "google.com",
    );
    if (googleProvider?.uid) {
      googleId = googleProvider.uid;
    }

    const creationTime = firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime).toISOString()
      : new Date().toISOString();
    const lastSignInTime = firebaseUser.metadata.lastSignInTime
      ? new Date(firebaseUser.metadata.lastSignInTime).toISOString()
      : creationTime;

    const { rows: existingUsers } = await client.query(
      `SELECT id, firebase_uid, email, google_id FROM user_profiles 
       WHERE email = $1 OR firebase_uid = $2 OR (google_id IS NOT NULL AND google_id = $3)
       LIMIT 1`,
      [normalizedEmail, firebaseUser.uid, googleId],
    );

    if (existingUsers.length > 0) {
      return await this.updateExistingUser(
        client,
        firebaseUser,
        existingUsers[0],
        normalizedEmail,
        lastSignInTime,
        googleId,
      );
    } else {
      return await this.createNewUser(
        client,
        firebaseUser,
        normalizedEmail,
        creationTime,
        lastSignInTime,
        googleId,
      );
    }
  }

  private async updateExistingUser(
    client: import("pg").PoolClient,
    firebaseUser: admin.auth.UserRecord,
    existingUser: { id: string; name?: string; avatar_url?: string },
    normalizedEmail: string,
    lastSignInTime: string,
    googleId: string | null,
  ): Promise<{ created: boolean; updated: boolean; error: boolean }> {
    try {
      await client.query(
        `UPDATE user_profiles SET
          firebase_uid = COALESCE($1, firebase_uid),
          name = COALESCE($2, name),
          avatar_url = COALESCE($3, avatar_url),
          email_verified = COALESCE($4, email_verified),
          last_active = GREATEST(COALESCE($5, last_active), last_active),
          google_id = COALESCE($6, google_id),
          updated_at = NOW()
        WHERE id = $7`,
        [
          firebaseUser.uid,
          firebaseUser.displayName ||
            existingUser.name ||
            normalizedEmail.split("@")[0] ||
            "User",
          firebaseUser.photoURL ||
            existingUser.avatar_url ||
            "https://i.pravatar.cc/150?img=1",
          firebaseUser.emailVerified || false,
          lastSignInTime,
          googleId,
          existingUser.id,
        ],
      );
      this.logger.log(
        `🔄 Updated user: ${normalizedEmail} (${firebaseUser.uid})`,
      );
      return { created: false, updated: true, error: false };
    } catch (updateError_: unknown) {
      const updateError = updateError_ as Error;
      if (updateError.message && updateError.message.includes("google_id")) {
        await client.query(
          `UPDATE user_profiles SET
            firebase_uid = COALESCE($1, firebase_uid),
            name = COALESCE($2, name),
            avatar_url = COALESCE($3, avatar_url),
            email_verified = COALESCE($4, email_verified),
            last_active = GREATEST(COALESCE($5, last_active), last_active),
            updated_at = NOW()
          WHERE id = $6`,
          [
            firebaseUser.uid,
            firebaseUser.displayName ||
              existingUser.name ||
              normalizedEmail.split("@")[0] ||
              "User",
            firebaseUser.photoURL ||
              existingUser.avatar_url ||
              "https://i.pravatar.cc/150?img=1",
            firebaseUser.emailVerified || false,
            lastSignInTime,
            existingUser.id,
          ],
        );
        this.logger.log(
          `🔄 Updated user: ${normalizedEmail} (${firebaseUser.uid})`,
        );
        return { created: false, updated: true, error: false };
      } else {
        throw updateError;
      }
    }
  }

  private async createNewUser(
    client: import("pg").PoolClient,
    firebaseUser: admin.auth.UserRecord,
    normalizedEmail: string,
    creationTime: string,
    lastSignInTime: string,
    googleId: string | null,
  ): Promise<{ created: boolean; updated: boolean; error: boolean }> {
    try {
      await client.query(
        `INSERT INTO user_profiles (
          firebase_uid, email, name, avatar_url, bio,
          karma_points, join_date, is_active, last_active,
          city, country, interests, roles, email_verified, settings, google_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13::text[], $14, $15::jsonb, $16)
        RETURNING id`,
        [
          firebaseUser.uid,
          normalizedEmail,
          firebaseUser.displayName || normalizedEmail.split("@")[0] || "User",
          firebaseUser.photoURL || "https://i.pravatar.cc/150?img=1",
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
          googleId,
        ],
      );
      this.logger.log(
        `✨ Created user: ${normalizedEmail} (${firebaseUser.uid})`,
      );
      return { created: true, updated: false, error: false };
    } catch (insertError_: unknown) {
      const insertError = insertError_ as Error;
      if (insertError.message && insertError.message.includes("google_id")) {
        await client.query(
          `INSERT INTO user_profiles (
            firebase_uid, email, name, avatar_url, bio,
            karma_points, join_date, is_active, last_active,
            city, country, interests, roles, email_verified, settings
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13::text[], $14, $15::jsonb)
          RETURNING id`,
          [
            firebaseUser.uid,
            normalizedEmail,
            firebaseUser.displayName || normalizedEmail.split("@")[0] || "User",
            firebaseUser.photoURL || "https://i.pravatar.cc/150?img=1",
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
        this.logger.log(
          `✨ Created user: ${normalizedEmail} (${firebaseUser.uid})`,
        );
        return { created: true, updated: false, error: false };
      } else {
        throw insertError;
      }
    }
  }

  /**
   * Sync ALL users from Firebase to user_profiles
   * This endpoint runs the full sync process - use with caution in production
   *
   * @param headers - API key in X-API-Key header (optional if SYNC_API_KEY is not set)
   * @returns Sync summary with created/updated counts
   */
  @Post("all")
  @UseGuards(AdminAuthGuard)
  async syncAllUsers(@Headers("x-api-key") apiKey?: string) {
    // Check API key (optional - can be disabled for internal use)
    if (this.SYNC_API_KEY !== "change-me-in-production") {
      this.checkApiKey(apiKey);
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      this.logger.log("🔄 Starting full Firebase users sync...");

      // Get all users from Firebase Authentication
      let allUsers: admin.auth.UserRecord[] = [];
      let nextPageToken: string | undefined;

      do {
        const listUsersResult = await admin
          .auth()
          .listUsers(1000, nextPageToken);
        allUsers = allUsers.concat(listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
        this.logger.log(`📥 Fetched ${allUsers.length} users from Firebase...`);
      } while (nextPageToken);

      this.logger.log(`✅ Total users in Firebase: ${allUsers.length}`);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const firebaseUser of allUsers) {
        try {
          if (!firebaseUser.email) {
            this.logger.log(`⚠️ Skipping user ${firebaseUser.uid} - no email`);
            skipped++;
            continue;
          }

          const result = await this.syncSingleUser(client, firebaseUser);

          if (result.created) created++;
          if (result.updated) updated++;
          if (result.error) errors++;
        } catch (error_: unknown) {
          const error = error_ as Error;
          this.logger.error(
            `❌ Error processing user ${firebaseUser.uid}:`,
            error,
          );
          errors++;
        }
      }

      await client.query("COMMIT");

      const summary = {
        success: true,
        firebase_users: allUsers.length,
        created,
        updated,
        skipped,
        errors,
        total_processed: created + updated + skipped,
      };

      this.logger.log("\n📊 Sync Summary:");
      this.logger.log(`   ✅ Created: ${created}`);
      this.logger.log(`   🔄 Updated: ${updated}`);
      this.logger.log(`   ⏭️  Skipped: ${skipped}`);
      this.logger.log(`   ❌ Errors: ${errors}`);
      this.logger.log(`   📈 Total processed: ${created + updated + skipped}`);
      this.logger.log("\n✅ Firebase users sync completed!");

      return summary;
    } catch (error_: unknown) {
      const error = error_ as Error;
      await client.query("ROLLBACK");
      this.logger.error("❌ Full sync error:", error);
      return {
        success: false,
        error: error.message || "Failed to sync all users",
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get sync status - check how many users are in Firebase vs user_profiles
   * Useful for monitoring sync health
   */
  @Get("status")
  @UseGuards(AdminAuthGuard)
  async getSyncStatus() {
    try {
      // Count users in Firebase
      let firebaseCount = 0;
      try {
        let nextPageToken: string | undefined;
        do {
          const listUsersResult = await admin
            .auth()
            .listUsers(1000, nextPageToken);
          firebaseCount += listUsersResult.users.length;
          nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
      } catch (error) {
        this.logger.warn("⚠️ Could not count Firebase users:", error);
      }

      // Count users in user_profiles
      const { rows: dbCountResult } = await this.pool.query(
        `SELECT COUNT(*) as count FROM user_profiles WHERE email IS NOT NULL AND email <> ''`,
      );
      const dbCount = parseInt(dbCountResult[0]?.count || "0", 10);

      // Count users with firebase_uid
      const { rows: firebaseLinkedResult } = await this.pool.query(
        `SELECT COUNT(*) as count FROM user_profiles WHERE firebase_uid IS NOT NULL`,
      );
      const firebaseLinked = parseInt(
        firebaseLinkedResult[0]?.count || "0",
        10,
      );

      return {
        success: true,
        firebase_users: firebaseCount,
        user_profiles_total: dbCount,
        user_profiles_with_firebase_uid: firebaseLinked,
        missing_sync: Math.max(0, firebaseCount - firebaseLinked),
      };
    } catch (error_: unknown) {
      const error = error_ as Error;
      this.logger.error("❌ Get sync status error:", error);
      return {
        success: false,
        error: error.message || "Failed to get sync status",
      };
    }
  }
}
