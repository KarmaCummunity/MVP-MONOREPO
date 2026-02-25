// utils/firebaseClient.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import Constants from 'expo-constants';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Note: Fill real values from Firebase console or use environment variables
const extra = (Constants?.expoConfig as any)?.extra || (Constants as any)?.manifest?.extra || {};
const mode = (extra?.mode as string) || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');
const extraFb = (extra?.firebase?.[mode]) || {};

console.log('🔥 Firebase config - loading from:', { mode, hasExtra: !!extra, hasExtraFb: !!extraFb });

const firebaseConfig: Record<string, string | undefined> = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.EXPO_PUBLIC_FIREBASE_API_KEY || extraFb.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extraFb.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extraFb.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extraFb.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extraFb.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.EXPO_PUBLIC_FIREBASE_APP_ID || extraFb.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || extra.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || extraFb.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
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
      console.warn('Firestore initialization with cache failed, using default:', (e as any)?.message);
      db = getFirestore(app);
    }
  }
  if (!storage) {
    storage = getStorage(app);
  }

  return { app, db, storage };
}

export type { Firestore };


