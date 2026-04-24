// File overview:
// - Purpose: Firebase Admin SDK service for centralized Firebase authentication
// - Provides: Firebase app instance, token verification
// - Security: Initializes Firebase Admin SDK once with service account

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { existsSync, readFileSync } from "fs";
import * as admin from "firebase-admin";

/** Shown when verifyIdToken is called but Admin was never configured with a service account */
export const FIREBASE_ADMIN_CONFIG_ERROR =
  "Firebase Admin is not configured on this server. Set FIREBASE_SERVICE_ACCOUNT (base64 JSON), FIREBASE_SERVICE_ACCOUNT_KEY (JSON string), or GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON). Google / Firebase ID tokens cannot be verified until one of these is set.";

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private firebaseApp: admin.app.App | null = null;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      this.firebaseApp = admin.app();
      this.logger.log("Firebase Admin SDK already initialized");
      return;
    }

    try {
      const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

      if (serviceAccountBase64) {
        const serviceAccountJson = Buffer.from(
          serviceAccountBase64,
          "base64",
        ).toString("utf-8");
        const serviceAccount = JSON.parse(serviceAccountJson);

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.logger.log(
          "Firebase Admin SDK initialized with service account (base64)",
        );
      } else if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.logger.log(
          "Firebase Admin SDK initialized with service account (JSON)",
        );
      } else if (gacPath) {
        if (!existsSync(gacPath)) {
          this.logger.error(
            `GOOGLE_APPLICATION_CREDENTIALS file not found: ${gacPath}`,
          );
        } else {
          const fileJson = readFileSync(gacPath, "utf-8");
          const serviceAccount = JSON.parse(fileJson);
          this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.logger.log(
            "Firebase Admin SDK initialized from GOOGLE_APPLICATION_CREDENTIALS file",
          );
        }
      } else {
        // Do NOT call admin.initializeApp() without credentials: on Railway/Docker
        // that uses Application Default Credentials and tries metadata.google.internal (ENOTFOUND).
        this.logger.error(
          "Firebase Admin SDK not initialized: no FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_KEY, or GOOGLE_APPLICATION_CREDENTIALS. Google sign-in token verification will fail.",
        );
        this.firebaseApp = null;
      }
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.firebaseApp = null;
    }
  }

  /**
   * Get Firebase Admin app instance
   */
  getApp(): admin.app.App {
    if (!this.firebaseApp) {
      this.initializeFirebase();
    }
    if (!this.firebaseApp) {
      throw new Error(FIREBASE_ADMIN_CONFIG_ERROR);
    }
    return this.firebaseApp;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth(): admin.auth.Auth {
    return this.getApp().auth();
  }

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.getAuth().verifyIdToken(token);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn("Firebase token verification failed", {
        error: msg,
        tokenLength: token?.length,
      });
      throw error;
    }
  }
}
