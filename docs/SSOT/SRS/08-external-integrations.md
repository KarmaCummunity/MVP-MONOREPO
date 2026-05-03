> **SRS shard:** `SRS/08-external-integrations.md` — part of [SRS index](README.md). References § refer to the full document.

## 8. External Integrations

### 8.1 Firebase

| Component | Usage | Configuration |
|-----------|-------|--------------|
| **Firebase Auth (client)** | User authentication (email, Google) on mobile/web | `EXPO_PUBLIC_FIREBASE_*` keys in mobile `.env` |
| **Firebase Admin SDK (server)** | ID token verification, user sync | `FIREBASE_SERVICE_ACCOUNT` (base64) or `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON) |
| **Firestore (client)** | Optional data adapter (currently disabled: `USE_FIRESTORE=false`) | Persistent local cache enabled for offline |
| **Firebase Storage (client)** | File uploads (chat files, user images, donation images, admin files) | Via `storage.service.ts` with path builders |

### 8.2 Google APIs

| API | Usage | Configuration |
|-----|-------|---------------|
| **Google OAuth 2.0** | User authentication via Google Sign-In | `GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| **Google Places API** | Location autocomplete and place details | `GOOGLE_API_KEY` |
| **google-auth-library (server)** | Server-side Google token verification | `GOOGLE_CLIENT_ID` |

### 8.3 SonarCloud

| Component | Usage | Configuration |
|-----------|-------|--------------|
| **SonarCloud** | Static code analysis in CI pipeline | `SONAR_TOKEN` (CI secret), project config in workflow YAML |

### 8.4 Snyk

| Component | Usage | Configuration |
|-----------|-------|--------------|
| **Snyk** | Dependency vulnerability scanning in CI | `SNYK_TOKEN` (optional) |

### 8.5 Expo Application Services (EAS)

| Component | Usage |
|-----------|-------|
| **EAS Build** | Mobile app builds (iOS/Android) |
| **EAS Update** | Over-the-air updates
| **Expo Notifications** | Push notification infrastructure |

---