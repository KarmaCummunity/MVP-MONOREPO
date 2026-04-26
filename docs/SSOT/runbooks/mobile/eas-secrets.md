# EAS Build – Environment variables (Secrets)

For **EAS Build**, set these as **Secrets** in the EAS Dashboard so they are available at build time (no values in code or in this repo).

1. Open [expo.dev](https://expo.dev) → your project → **Secrets**.
2. Add each of the following names with the correct value.

## Required for app to work

| Secret name | Where to get the value |
|-------------|-------------------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → General → Your apps |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same (e.g. `your-app.firebaseapp.com`) |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Same |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Same (optional for analytics) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Same |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Same |

## Optional

| Secret name | Description |
|-------------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API URL (defaults in code for dev/prod if not set) |
| `EXPO_PUBLIC_ADMIN_EMAILS` | Comma-separated admin emails |
| `EXPO_PUBLIC_ENVIRONMENT` | `development` / `preview` / `production` |

After adding secrets, run:

```bash
eas build --platform all --profile production
```

Secrets are injected as environment variables during the build; `app.config.js` reads them via `process.env.EXPO_PUBLIC_*`.
