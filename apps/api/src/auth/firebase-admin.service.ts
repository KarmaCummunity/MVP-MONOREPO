// File overview:
// - Purpose: Firebase Admin SDK service for centralized Firebase authentication
// - Provides: Firebase app instance, token verification
// - Security: Initializes Firebase Admin SDK once with service account
//
// Always pass an explicit `projectId` when initializing. Without it, default
// credentials on non-GCP hosts (e.g. Railway) can try metadata.google.internal
// and fail with ENOTFOUND, breaking ID token verification for clients that
// send a Firebase ID token (common on mobile web when the session JWT is absent).

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private firebaseApp: admin.app.App | null = null;

  onModuleInit() {
    this.initializeFirebase();
  }

  private resolveProjectId(serviceAccount?: {
    project_id?: string;
  }): string | undefined {
    return (
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      serviceAccount?.project_id
    );
  }

  private initializeFirebase(): void {
    if (admin.apps.length > 0) {
      this.firebaseApp = admin.app();
      this.logger.log("Firebase Admin SDK already initialized");
      return;
    }

    try {
      const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountBase64) {
        const serviceAccountJson = Buffer.from(
          serviceAccountBase64,
          "base64",
        ).toString("utf-8");
        const serviceAccount = JSON.parse(serviceAccountJson) as {
          project_id?: string;
        };
        const projectId = this.resolveProjectId(serviceAccount);
        if (!projectId) {
          this.logger.error(
            "FIREBASE_SERVICE_ACCOUNT JSON must include project_id, or set FIREBASE_PROJECT_ID",
          );
          return;
        }
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
          projectId,
        });
        this.logger.log(
          "Firebase Admin SDK initialized with service account (base64)",
        );
      } else if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey) as {
          project_id?: string;
        };
        const projectId = this.resolveProjectId(serviceAccount);
        if (!projectId) {
          this.logger.error(
            "FIREBASE_SERVICE_ACCOUNT_KEY JSON must include project_id, or set FIREBASE_PROJECT_ID",
          );
          return;
        }
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
          projectId,
        });
        this.logger.log(
          "Firebase Admin SDK initialized with service account (JSON)",
        );
      } else {
        const projectId = this.resolveProjectId();
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) {
          this.firebaseApp = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId,
          });
          this.logger.log(
            "Firebase Admin SDK initialized with application default credentials",
          );
        } else {
          this.logger.error(
            "Firebase Admin: configure FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_KEY, or GOOGLE_APPLICATION_CREDENTIALS with FIREBASE_PROJECT_ID (or GOOGLE_CLOUD_PROJECT).",
          );
        }
      }
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get Firebase Admin app instance
   */
  getApp(): admin.app.App {
    if (admin.apps.length > 0 && !this.firebaseApp) {
      this.firebaseApp = admin.app();
    }
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
