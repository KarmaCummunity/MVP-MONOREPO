// utils/firebaseClient.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import Constants from 'expo-constants';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Note: Fill real values from Firebase console or use environment variables
interface ExpoConstantsWithExtra {
  expoConfig?: { extra?: Record<string, unknown> };
  manifest?: { extra?: Record<string, unknown> };
}
const constantsWithExtra = Constants as ExpoConstantsWithExtra;
const extra: Record<string, unknown> = constantsWithExtra?.expoConfig?.extra ?? constantsWithExtra?.manifest?.extra ?? {};
const mode = (extra?.mode as string) || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');
const extraFb: Record<string, unknown> = ((extra?.firebase as Record<string, unknown>)?.[mode] ?? {}) as Record<string, unknown>;

/** Reads a config value from env, then extra, then extraFb (string | undefined). */
const configVal = (key: string): string | undefined =>
  (process.env[key] as string | undefined)
  ?? (extra[key] as string | undefined)
  ?? (extraFb[key] as string | undefined);

console.log('🔥 Firebase config - loading from:', { mode, hasExtra: !!extra, hasExtraFb: !!extraFb });

const firebaseConfig: Record<string, string | undefined> = {
  apiKey: configVal('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: configVal('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: configVal('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: configVal('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: configVal('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: configVal('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

const measurementId = configVal('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID');
if (measurementId) {
  firebaseConfig.measurementId = measurementId;
}

console.log('🔥 Firebase config loaded:', { 
  hasApiKey: !!firebaseConfig.apiKey, 
  hasProjectId: !!firebaseConfig.projectId, 
  hasAppId: !!firebaseConfig.appId,
  projectId: firebaseConfig.projectId 
});

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

export function getFirebase() {
  if (!getApps().length) {
    // Basic validation of critical configuration for clearer developer errors
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
      const msg = 'Firebase configuration is missing. Please set EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_APP_ID.';
      console.error(msg);
      throw new Error(msg);
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }

  if (!db) {
    // Initialize Firestore with persistent local cache (new recommended approach)
    // This replaces the deprecated enableIndexedDbPersistence() method
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ 
          tabManager: persistentMultipleTabManager() 
        }),
      });
    } catch (e) {
      // Fallback to getFirestore if initialization fails (e.g., already initialized)
      // This can happen if Firestore was already initialized elsewhere
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn('Firestore initialization with cache failed, using default:', errMsg);
      db = getFirestore(app);
    }
  }
  if (!storage) {
    storage = getStorage(app);
  }

  return { app, db, storage };
}

export type { Firestore };


