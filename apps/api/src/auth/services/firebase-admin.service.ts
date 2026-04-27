// File overview:
// - Purpose: Firebase Admin SDK service for centralized Firebase authentication
// - Provides: Firebase app instance, token verification
// - Security: Initializes Firebase Admin SDK once with service account
//
// Always pass an explicit `projectId` when initializing. Without it, default
// credentials on non-GCP hosts (e.g. Railway) can try metadata.google.internal
// and fail with ENOTFOUND, breaking ID token verification for clients that
// send a Firebase ID token (common on mobile web when the session JWT is absent).
//
// When no service account is configured, `verifyIdToken` still works by
// validating tokens against Google's public JWKS. Project id is taken from the
// token `aud` claim (and `iss`) so no FIREBASE_PROJECT_ID env is required unless
// you want to restrict acceptance to that project only.

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";
import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_SECURE_TOKEN_JWKS =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

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
   * Read Firebase project id from the token before cryptographic verify.
   * `iss` must match Google securetoken format so `aud` is not attacker-controlled
   * without an invalid signature at verify time.
   */
  private resolveFirebaseProjectIdForJwks(token: string): string {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Firebase ID token format");
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as Record<string, unknown>;
    } catch {
      throw new Error("Invalid Firebase ID token payload");
    }

    const audRaw = payload.aud;
    const iss = payload.iss;
    const projectIdFromToken =
      typeof audRaw === "string"
        ? audRaw
        : Array.isArray(audRaw) && typeof audRaw[0] === "string"
          ? audRaw[0]
          : "";
    const expectedIss = `https://securetoken.google.com/${projectIdFromToken}`;
    if (!projectIdFromToken || iss !== expectedIss) {
      throw new Error("Invalid Firebase ID token: issuer/audience mismatch");
    }

    const envProjectId = this.resolveProjectId();
    if (envProjectId && envProjectId !== projectIdFromToken) {
      throw new Error(
        "Firebase ID token is for a different project than this server",
      );
    }

    return projectIdFromToken;
  }

  /**
   * Verify Firebase ID token using Google's public keys (no service account).
   * Cryptographic verification via JWKS; project id from token `aud` / `iss`.
   */
  private async verifyIdTokenWithPublicJwks(
    token: string,
  ): Promise<admin.auth.DecodedIdToken> {
    const projectId = this.resolveFirebaseProjectIdForJwks(token);

    const JWKS = createRemoteJWKSet(new URL(FIREBASE_SECURE_TOKEN_JWKS));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid =
      typeof payload.sub === "string"
        ? payload.sub
        : typeof (payload as { user_id?: unknown }).user_id === "string"
          ? String((payload as { user_id: string }).user_id)
          : "";
    if (!uid) {
      throw new Error("Invalid Firebase ID token: missing subject");
    }

    const email = typeof payload.email === "string" ? payload.email : undefined;
    const exp =
      typeof payload.exp === "number"
        ? payload.exp
        : Math.floor(Date.now() / 1000) + 3600;

    return {
      uid,
      email,
      email_verified: payload.email_verified === true,
      auth_time:
        typeof payload.auth_time === "number" ? payload.auth_time : undefined,
      exp,
      firebase: payload.firebase as admin.auth.DecodedIdToken["firebase"],
      aud: projectId,
      iss: `https://securetoken.google.com/${projectId}`,
      sub: uid,
      iat:
        typeof payload.iat === "number"
          ? payload.iat
          : Math.floor(Date.now() / 1000),
    } as admin.auth.DecodedIdToken;
  }

  /**
   * Verify Firebase ID token (Admin SDK when configured, else public JWKS).
   */
  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    const adminReady =
      this.firebaseApp !== null ||
      (typeof admin.apps !== "undefined" && admin.apps.length > 0);

    if (adminReady) {
      try {
        const app = this.firebaseApp ?? admin.app();
        return await app.auth().verifyIdToken(token);
      } catch (error) {
        this.logger.warn("Firebase token verification failed", {
          error: error instanceof Error ? error.message : String(error),
          tokenLength: token?.length,
        });
        throw error;
      }
    }

    this.logger.warn(
      "Firebase Admin SDK not initialized; verifying ID token via public JWKS",
    );
    try {
      return await this.verifyIdTokenWithPublicJwks(token);
    } catch (error) {
      this.logger.warn("Firebase JWKS token verification failed", {
        error: error instanceof Error ? error.message : String(error),
        tokenLength: token?.length,
      });
      throw error;
    }
  }
}
