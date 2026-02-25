// Read version from package.json
const packageJson = require('./package.json');
const APP_VERSION = packageJson.version;

// Environment detection
const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || 'production';
const IS_DEV = ENVIRONMENT === 'development';

// API URL based on environment
const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ||
  (IS_DEV
    ? 'https://kc-mvp-server-dev.up.railway.app'
    : 'https://kc-mvp-server-production.up.railway.app');

// Firebase and Google OAuth: read only from env at build time. Do not hardcode.
// Set in .env (local) or EAS Secrets (CI). See README or .env.example.
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';
const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '';
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';
const FIREBASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
const FIREBASE_MESSAGING_SENDER_ID = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '';
const FIREBASE_APP_ID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '';
const FIREBASE_MEASUREMENT_ID = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

// Define colors locally for config usage (colors.tsx cannot be imported in JS config)
const colors = {
  secondary: '#FFB6C1',     // Soft Pink - Secondary brand color
  backgroundTertiary: '#E3F2FD', // Very light blue for highlights
};



export default {
  expo: {
    name: IS_DEV ? "KC - DEV 🟢" : "KC - הקיבוץ הקפיטליסטי",
    slug: "karma-community",
    version: APP_VERSION,
    orientation: "portrait",
    icon: "./assets/images/לוגו_חדש_שחור.png",
    scheme: "karma-community",
    userInterfaceStyle: "automatic",
    // שמירה על primaryColor שהיה ב-app.json
    primaryColor: colors.secondary,
    splash: {
      image: "./assets/images/לוגו_חדש_שחור.png",
      resizeMode: "contain",
      backgroundColor: colors.backgroundTertiary
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.navesarussi1.KarmaCommunity",
      // Associated domains for Universal Links
      associatedDomains: [
        "applinks:karma-community-kc.com",
        "applinks:www.karma-community-kc.com"
      ],
      // איחוד הרשאות ו־ATS שהיו ב-app.json
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: true
        },
        NSCameraUsageDescription: "האפליקציה זקוקה לגישה למצלמה כדי לצלם תמונות וסרטונים",
        NSMicrophoneUsageDescription: "האפליקציה זקוקה לגישה למיקרופון לצורך הקלטת אודיו",
        NSPhotoLibraryUsageDescription: "האפליקציה זקוקה לגישה לספריית התמונות כדי לבחור ולהעלות קבצים"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/לוגו_חדש_שחור.png",
        backgroundColor: colors.backgroundTertiary
      },
      package: "com.navesarussi1.KarmaCommunity",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "com.navesarussi1.KarmaCommunity"
            },
            {
              scheme: "karma-community"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      // הרשאות שהוגדרו ב-app.json
      permissions: [
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.WAKE_LOCK",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_DATA_SYNC"
      ]
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png",
      name: "KC - הקיבוץ הקפיטליסטי",
      shortName: "KC",
      description: "פלטפורמה חינמית ללא מטרות רווח לקהילה הישראלית",
      lang: "he",
      dir: "rtl",
      themeColor: colors.secondary,
      backgroundColor: colors.backgroundTertiary,
      // הגדרות meta ו-build מה-app.json
      meta: {
        viewport: "width=device-width, initial-scale=1, shrink-to-fit=no"
      },
      build: {
        babel: {
          include: ["@expo/vector-icons"]
        }
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/images/לוגו_חדש_שחור.png",
          color: colors.secondary,
          mode: "production",
          androidMode: "default",
          androidCollapsedTitle: "התראה חדשה"
        }
      ]
    ],
    experiments: {
      // ב-app.json היה false; אנו שומרים על true לשילוב עם expo-router
      typedRoutes: true
    },
    // שמירה על owner מ-app.json
    owner: "navesarussi1",
    extra: {
      EXPO_PUBLIC_ENVIRONMENT: ENVIRONMENT,
      EXPO_PUBLIC_API_BASE_URL: DEFAULT_API_BASE_URL,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: GOOGLE_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_USE_BACKEND: "1",
      EXPO_PUBLIC_USE_FIRESTORE: "0",
      EXPO_PUBLIC_ADMIN_EMAILS: process.env.EXPO_PUBLIC_ADMIN_EMAILS || "navesarussi@gmail.com",
      EXPO_PUBLIC_FIREBASE_API_KEY: FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: FIREBASE_APP_ID,
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: FIREBASE_MEASUREMENT_ID,
      firebase: {
        prod: {
          EXPO_PUBLIC_FIREBASE_API_KEY: FIREBASE_API_KEY,
          EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: FIREBASE_AUTH_DOMAIN,
          EXPO_PUBLIC_FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID,
          EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: FIREBASE_STORAGE_BUCKET,
          EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID,
          EXPO_PUBLIC_FIREBASE_APP_ID: FIREBASE_APP_ID,
          EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: FIREBASE_MEASUREMENT_ID
        },
        dev: {
          EXPO_PUBLIC_FIREBASE_API_KEY: FIREBASE_API_KEY,
          EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: FIREBASE_AUTH_DOMAIN,
          EXPO_PUBLIC_FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID,
          EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: FIREBASE_STORAGE_BUCKET,
          EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: FIREBASE_MESSAGING_SENDER_ID,
          EXPO_PUBLIC_FIREBASE_APP_ID: FIREBASE_APP_ID,
          EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: FIREBASE_MEASUREMENT_ID
        }
      },
      eas: {
        projectId: "e9adde31-7801-4e3c-a709-2454fe511c24"
      }
    }
  }
};
