// File overview:
// - Purpose: Sync all Firebase Authentication users to user_profiles table
// - Usage: Run once to sync existing users, then automatic sync handles new users
// - Run: npm run sync:firebase-users

import * as admin from "firebase-admin";
import { Pool, PoolClient } from "pg";
import * as dotenv from "dotenv";
import {
  buildVerifiedPgSslOptions,
  isPgSslEnabled,
} from "../database/pgSslOptions";

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

// Initialize PostgreSQL connection (SSL only when required — same rules as DatabaseModule)
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sslEnabled = isPgSslEnabled(dbUrl);
const pool = new Pool({
  connectionString: dbUrl,
  ssl: sslEnabled ? buildVerifiedPgSslOptions() : undefined,
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

interface SyncCounters {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface ExistingProfileRow {
  id: number;
  email: string;
  name: string | null;
  firebase_uid: string | null;
  google_id: string | null;
}

const NEW_USER_SETTINGS_JSON = JSON.stringify({
  language: "he",
  dark_mode: false,
  notifications_enabled: true,
  privacy: "public",
});

const INSERT_PROFILE_WITH_GOOGLE_SQL = `
  INSERT INTO user_profiles (
    firebase_uid, google_id, email, name, avatar_url, bio,
    karma_points, join_date, is_active, last_active,
    city, country, interests, roles, email_verified, settings
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb)
  RETURNING id`;

const INSERT_PROFILE_WITHOUT_GOOGLE_SQL = `
  INSERT INTO user_profiles (
    firebase_uid, email, name, avatar_url, bio,
    karma_points, join_date, is_active, last_active,
    city, country, interests, roles, email_verified, settings
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13::text[], $14, $15::jsonb)
  RETURNING id`;

async function listAllFirebaseUsers(): Promise<FirebaseUser[]> {
  let allUsers: FirebaseUser[] = [];
  let nextPageToken: string | undefined;
  do {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    allUsers = allUsers.concat(listUsersResult.users);
    nextPageToken = listUsersResult.pageToken;
    console.log(`📥 Fetched ${allUsers.length} users from Firebase...`);
  } while (nextPageToken);
  return allUsers;
}

function extractGoogleId(user: FirebaseUser): string | null {
  const googleProvider = user.providerData?.find(
    (p) => p.providerId === "google.com",
  );
  return googleProvider?.uid ?? null;
}

async function findExistingProfile(
  client: PoolClient,
  firebaseUid: string,
  normalizedEmail: string,
): Promise<ExistingProfileRow | undefined> {
  const { rows } = await client.query<ExistingProfileRow>(
    `SELECT id, email, name, firebase_uid, google_id FROM user_profiles 
     WHERE firebase_uid = $1 OR LOWER(email) = LOWER($1) OR email = $2
     LIMIT 1`,
    [firebaseUid, normalizedEmail],
  );
  return rows[0];
}

interface ProfileUpdatePlan {
  setFragments: string[];
  values: unknown[];
  idPlaceholder: number;
}

function buildProfileUpdatePlan(
  existingUser: ExistingProfileRow,
  firebaseUser: FirebaseUser,
  googleId: string | null,
): ProfileUpdatePlan | null {
  const setFragments: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  if (
    !existingUser.firebase_uid ||
    existingUser.firebase_uid !== firebaseUser.uid
  ) {
    setFragments.push(`firebase_uid = $${p++}`);
    values.push(firebaseUser.uid);
  }

  if (
    googleId &&
    (!existingUser.google_id || existingUser.google_id !== googleId)
  ) {
    setFragments.push(`google_id = $${p++}`);
    values.push(googleId);
  }

  if (
    firebaseUser.displayName &&
    existingUser.name !== firebaseUser.displayName
  ) {
    setFragments.push(`name = $${p++}`);
    values.push(firebaseUser.displayName);
  }

  if (firebaseUser.photoURL) {
    setFragments.push(`avatar_url = $${p++}`);
    values.push(firebaseUser.photoURL);
  }

  if (firebaseUser.emailVerified !== undefined) {
    setFragments.push(`email_verified = $${p++}`);
    values.push(firebaseUser.emailVerified);
  }

  if (firebaseUser.metadata.lastSignInTime) {
    setFragments.push(`last_active = $${p++}`);
    values.push(new Date(firebaseUser.metadata.lastSignInTime));
  }

  if (setFragments.length === 0) {
    return null;
  }

  setFragments.push(`updated_at = NOW()`);
  values.push(existingUser.id);
  return { setFragments, values, idPlaceholder: p };
}

async function applyProfileUpdate(
  client: PoolClient,
  plan: ProfileUpdatePlan,
): Promise<void> {
  await client.query(
    `UPDATE user_profiles SET ${plan.setFragments.join(", ")} WHERE id = $${plan.idPlaceholder}`,
    plan.values,
  );
}

async function updateExistingUserIfNeeded(
  client: PoolClient,
  existingUser: ExistingProfileRow,
  firebaseUser: FirebaseUser,
  normalizedEmail: string,
  googleId: string | null,
  counters: SyncCounters,
): Promise<void> {
  const plan = buildProfileUpdatePlan(existingUser, firebaseUser, googleId);
  if (!plan) {
    counters.skipped++;
    console.log(`⏭️  User already up to date: ${normalizedEmail}`);
    return;
  }
  await applyProfileUpdate(client, plan);
  counters.updated++;
  console.log(`✅ Updated user: ${normalizedEmail} (${firebaseUser.uid})`);
}

function buildNewUserInsertValues(
  firebaseUser: FirebaseUser,
  normalizedEmail: string,
  googleId: string | null,
  includeGoogleColumn: boolean,
): unknown[] {
  const creationTime = firebaseUser.metadata.creationTime
    ? new Date(firebaseUser.metadata.creationTime)
    : new Date();
  const lastSignInTime = firebaseUser.metadata.lastSignInTime
    ? new Date(firebaseUser.metadata.lastSignInTime)
    : creationTime;

  const name =
    firebaseUser.displayName || normalizedEmail.split("@")[0] || "User";
  const avatarUrl = firebaseUser.photoURL || "https://i.pravatar.cc/150?img=1";

  const tail: unknown[] = [
    name,
    avatarUrl,
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
    NEW_USER_SETTINGS_JSON,
  ];

  if (includeGoogleColumn) {
    return [firebaseUser.uid, googleId, normalizedEmail, ...tail];
  }
  return [firebaseUser.uid, normalizedEmail, ...tail];
}

async function insertNewUserProfile(
  client: PoolClient,
  firebaseUser: FirebaseUser,
  normalizedEmail: string,
  googleId: string | null,
  counters: SyncCounters,
): Promise<void> {
  try {
    await client.query(
      INSERT_PROFILE_WITH_GOOGLE_SQL,
      buildNewUserInsertValues(firebaseUser, normalizedEmail, googleId, true),
    );
    counters.created++;
    console.log(`✨ Created user: ${normalizedEmail} (${firebaseUser.uid})`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("google_id")) {
      await client.query(
        INSERT_PROFILE_WITHOUT_GOOGLE_SQL,
        buildNewUserInsertValues(
          firebaseUser,
          normalizedEmail,
          googleId,
          false,
        ),
      );
      counters.created++;
      console.log(
        `✨ Created user (without google_id): ${normalizedEmail} (${firebaseUser.uid})`,
      );
      return;
    }
    throw err;
  }
}

async function syncOneFirebaseUser(
  client: PoolClient,
  firebaseUser: FirebaseUser,
  counters: SyncCounters,
): Promise<void> {
  if (!firebaseUser.email) {
    console.log(`⚠️ Skipping user ${firebaseUser.uid} - no email`);
    counters.skipped++;
    return;
  }

  const normalizedEmail = firebaseUser.email.toLowerCase().trim();
  const googleId = extractGoogleId(firebaseUser);

  const existingUser = await findExistingProfile(
    client,
    firebaseUser.uid,
    normalizedEmail,
  );

  if (existingUser) {
    await updateExistingUserIfNeeded(
      client,
      existingUser,
      firebaseUser,
      normalizedEmail,
      googleId,
      counters,
    );
    return;
  }

  await insertNewUserProfile(
    client,
    firebaseUser,
    normalizedEmail,
    googleId,
    counters,
  );
}

async function syncOneFirebaseUserHandlingErrors(
  client: PoolClient,
  firebaseUser: FirebaseUser,
  counters: SyncCounters,
): Promise<void> {
  try {
    await syncOneFirebaseUser(client, firebaseUser, counters);
  } catch (err) {
    const error = err as Error;
    counters.errors++;
    console.error(`❌ Error syncing user ${firebaseUser.uid}:`, error.message);
  }
}

function logSyncSummary(counters: SyncCounters, totalUsers: number): void {
  console.log("\n📊 Sync Summary:");
  console.log(`   ✅ Created: ${counters.created}`);
  console.log(`   🔄 Updated: ${counters.updated}`);
  console.log(`   ⏭️  Skipped: ${counters.skipped}`);
  console.log(`   ❌ Errors: ${counters.errors}`);
  console.log(`   📈 Total processed: ${totalUsers}`);
  console.log("\n✅ Firebase users sync completed!");
}

async function syncFirebaseUsers() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🔄 Starting Firebase users sync...");

    const allUsers = await listAllFirebaseUsers();
    console.log(`✅ Total users in Firebase: ${allUsers.length}`);

    const counters: SyncCounters = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const firebaseUser of allUsers) {
      await syncOneFirebaseUserHandlingErrors(client, firebaseUser, counters);
    }

    await client.query("COMMIT");

    logSyncSummary(counters, allUsers.length);
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
