// File overview:
// - Purpose: Firebase Admin SDK service for centralized Firebase authentication
// - Provides: Firebase app instance, token verification
// - Security: Initializes Firebase Admin SDK once with service account

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";

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
      // Try to initialize with service account from environment variable
      const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountBase64) {
        // Option 1: Base64 encoded service account (for Railway/production)
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
        // Option 2: JSON string service account (for local development)
        const serviceAccount = JSON.parse(serviceAccountKey);

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        this.logger.log(
          "Firebase Admin SDK initialized with service account (JSON)",
        );
      } else {
        // Fallback: Try to use default credentials (for local development)
        this.firebaseApp = admin.initializeApp();
        this.logger.warn(
          "Firebase Admin SDK initialized with default credentials",
        );
      }
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Initialize without credentials as fallback (will fail on actual use but won't crash)
      if (!this.firebaseApp) {
        this.firebaseApp = admin.initializeApp();
      }
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
      throw new Error("Firebase Admin SDK not initialized");
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
      this.logger.warn("Firebase token verification failed", {
        error: error instanceof Error ? error.message : String(error),
        tokenLength: token?.length,
      });
      throw error;
    }
  }
}
