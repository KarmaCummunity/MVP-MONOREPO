// File overview:
// - Purpose: Sync all Firebase Authentication users to user_profiles table
// - Usage: Run once to sync existing users, then automatic sync handles new users
// - Run: npm run sync:firebase-users

import * as admin from "firebase-admin";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
// You need to set FIREBASE_SERVICE_ACCOUNT_KEY environment variable
// Or use GOOGLE_APPLICATION_CREDENTIALS pointing to service account JSON file
if (!admin.apps.length) {
  try {
    // Try to initialize with service account key from environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      ) as Record<string, unknown>;
      const fromJson = serviceAccount["project_id"] as string | undefined;
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        fromJson;
      if (!projectId) {
        console.error(
          "❌ Set FIREBASE_PROJECT_ID or use a service account JSON with project_id",
        );
        process.exit(1);
      }
      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount,
        ),
        projectId,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT;
      if (!projectId) {
        console.error(
          "❌ With GOOGLE_APPLICATION_CREDENTIALS, set FIREBASE_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) so the SDK does not use metadata.google.internal on non-GCP hosts",
        );
        process.exit(1);
      }
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    } else {
      console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS must be set",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error);
    process.exit(1);
  }
}

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  providerData?: Array<{
    providerId: string;
    uid?: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
  }>;
  metadata: {
    creationTime: string;
    lastSignInTime?: string;
  };
}

async function syncFirebaseUsers() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔄 Starting Firebase users sync...");

    // Get all users from Firebase Authentication
    let allUsers: FirebaseUser[] = [];
    let nextPageToken: string | undefined;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
      console.log(`📥 Fetched ${allUsers.length} users from Firebase...`);
    } while (nextPageToken);

    console.log(`✅ Total users in Firebase: ${allUsers.length}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const firebaseUser of allUsers) {
      try {
        // Skip users without email
        if (!firebaseUser.email) {
          console.log(`⚠️ Skipping user ${firebaseUser.uid} - no email`);
          skipped++;
          continue;
        }

        const normalizedEmail = firebaseUser.email.toLowerCase().trim();

        // Extract Google ID from provider data if available
        let googleId: string | null = null;
        const googleProvider = firebaseUser.providerData?.find(
          (p) => p.providerId === "google.com",
        );
        if (googleProvider?.uid) {
          googleId = googleProvider.uid;
        }

        // Check if user already exists in user_profiles
        const { rows: existingUsers } = await client.query(
          `SELECT id, email, firebase_uid, google_id FROM user_profiles 
           WHERE firebase_uid = $1 OR LOWER(email) = LOWER($1) OR email = $2
           LIMIT 1`,
          [firebaseUser.uid, normalizedEmail],
        );

        if (existingUsers.length > 0) {
          // User exists - update if needed
          const existingUser = existingUsers[0];
          const needsUpdate: string[] = [];
          const updateValues: unknown[] = [];
          let paramCount = 1;

          // Check if firebase_uid needs to be set/updated
          if (
            !existingUser.firebase_uid ||
            existingUser.firebase_uid !== firebaseUser.uid
          ) {
            needsUpdate.push(`firebase_uid = $${paramCount++}`);
            updateValues.push(firebaseUser.uid);
          }

          // Check if google_id needs to be set/updated
          if (
            googleId &&
            (!existingUser.google_id || existingUser.google_id !== googleId)
          ) {
            needsUpdate.push(`google_id = $${paramCount++}`);
            updateValues.push(googleId);
          }

          // Update name if available and different
          if (
            firebaseUser.displayName &&
            existingUser.name !== firebaseUser.displayName
          ) {
            needsUpdate.push(`name = $${paramCount++}`);
            updateValues.push(firebaseUser.displayName);
          }

          // Update avatar if available and different
          if (firebaseUser.photoURL) {
            needsUpdate.push(`avatar_url = $${paramCount++}`);
            updateValues.push(firebaseUser.photoURL);
          }

          // Update email_verified
          if (firebaseUser.emailVerified !== undefined) {
            needsUpdate.push(`email_verified = $${paramCount++}`);
            updateValues.push(firebaseUser.emailVerified);
          }

          // Update last_active from lastSignInTime
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
            updated++;
            console.log(
              `✅ Updated user: ${normalizedEmail} (${firebaseUser.uid})`,
            );
          } else {
            skipped++;
            console.log(`⏭️  User already up to date: ${normalizedEmail}`);
          }
        } else {
          // User doesn't exist - create new
          const creationTime = firebaseUser.metadata.creationTime
            ? new Date(firebaseUser.metadata.creationTime)
            : new Date();
          const lastSignInTime = firebaseUser.metadata.lastSignInTime
            ? new Date(firebaseUser.metadata.lastSignInTime)
            : creationTime;

          try {
            await client.query(
              `INSERT INTO user_profiles (
                firebase_uid, google_id, email, name, avatar_url, bio,
                karma_points, join_date, is_active, last_active,
                city, country, interests, roles, email_verified, settings
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb)
              RETURNING id`,
              [
                firebaseUser.uid, // firebase_uid
                googleId, // google_id (can be null)
                normalizedEmail, // email
                firebaseUser.displayName ||
                  normalizedEmail.split("@")[0] ||
                  "User", // name
                firebaseUser.photoURL || "https://i.pravatar.cc/150?img=1", // avatar_url
                "משתמש חדש בקארמה קומיוניטי", // bio
                0, // karma_points
                creationTime, // join_date
                true, // is_active
                lastSignInTime, // last_active
                "ישראל", // city
                "Israel", // country
                [], // interests
                ["user"], // roles
                firebaseUser.emailVerified || false, // email_verified
                JSON.stringify({
                  language: "he",
                  dark_mode: false,
                  notifications_enabled: true,
                  privacy: "public",
                }), // settings
              ],
            );
            created++;
            console.log(
              `✨ Created user: ${normalizedEmail} (${firebaseUser.uid})`,
            );
          } catch (err) {
            const insertError = err as Error;
            // If google_id column doesn't exist, try without it
            if (
              insertError.message &&
              insertError.message.includes("google_id")
            ) {
              await client.query(
                `INSERT INTO user_profiles (
                  firebase_uid, email, name, avatar_url, bio,
                  karma_points, join_date, is_active, last_active,
                  city, country, interests, roles, email_verified, settings
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13::text[], $14, $15::jsonb)
                RETURNING id`,
                [
                  firebaseUser.uid, // firebase_uid
                  normalizedEmail, // email
                  firebaseUser.displayName ||
                    normalizedEmail.split("@")[0] ||
                    "User", // name
                  firebaseUser.photoURL || "https://i.pravatar.cc/150?img=1", // avatar_url
                  "משתמש חדש בקארמה קומיוניטי", // bio
                  0, // karma_points
                  creationTime, // join_date
                  true, // is_active
                  lastSignInTime, // last_active
                  "ישראל", // city
                  "Israel", // country
                  [], // interests
                  ["user"], // roles
                  firebaseUser.emailVerified || false, // email_verified
                  JSON.stringify({
                    language: "he",
                    dark_mode: false,
                    notifications_enabled: true,
                    privacy: "public",
                  }), // settings
                ],
              );
              created++;
              console.log(
                `✨ Created user (without google_id): ${normalizedEmail} (${firebaseUser.uid})`,
              );
            } else {
              throw insertError;
            }
          }
        }
      } catch (err) {
        const error = err as Error;
        errors++;
        console.error(
          `❌ Error syncing user ${firebaseUser.uid}:`,
          error.message,
        );
        // Continue with next user
      }
    }

    await client.query("COMMIT");

    console.log("\n📊 Sync Summary:");
    console.log(`   ✅ Created: ${created}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📈 Total processed: ${allUsers.length}`);
    console.log("\n✅ Firebase users sync completed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Sync failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run sync
syncFirebaseUsers()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
