// File overview:
// - Purpose: Thin wrapper around Firebase Auth for email/password flows and verification utilities.
// - Reached from: `LoginScreen` for email flows; occasionally for password reset.
// - Provides: sign up/in, verify email, check verification, sign out, send password reset.
// utils/authService.ts

// TODO: Add comprehensive error handling with proper error types and messages
// TODO: Implement proper authentication state management and persistence
// TODO: Add comprehensive input validation for email and password
// TODO: Implement proper password strength validation
// TODO: Add comprehensive logging and monitoring for all auth operations
// TODO: Implement proper session management and token refresh
// TODO: Add comprehensive security measures (rate limiting, brute force protection)
// TODO: Create proper TypeScript interfaces for all auth-related types
// TODO: Add comprehensive unit tests for all authentication functions
// TODO: Implement proper multi-factor authentication support
import { getFirebase } from './firebaseClient';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  signOut,
  reload,
  User,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { Platform } from 'react-native';

let authInstance: any = null;

export const getAuthInstance = () => {
  if (!authInstance) {
    const { app } = getFirebase();
    authInstance = getAuth(app);
    
    // Configure persistence based on platform
    if (Platform.OS === 'web') {
      // Web: use browserLocalPersistence (localStorage)
      setPersistence(authInstance, browserLocalPersistence).catch((error) => {
        console.warn('Failed to set web auth persistence:', error);
      });
    } else {
      // React Native: Firebase automatically uses AsyncStorage
      // No need to set persistence explicitly - it's the default
      console.log('🔥 Firebase Auth - Using native AsyncStorage persistence (default)');
    }
  }
  
  return authInstance;
};

export async function getSignInMethods(email: string): Promise<string[]> {
  // TODO: Add comprehensive input validation for email parameter
  // TODO: Add proper error handling and user-friendly error messages
  // TODO: Implement caching mechanism for frequently checked emails
  const auth = getAuthInstance();
  return fetchSignInMethodsForEmail(auth, email);
}

export type EmailAuthSituation = {
  methods: string[];
  canPasswordLogin: boolean;
  hasGoogle: boolean;
  hasAnyAccount: boolean;
};

export async function getEmailAuthSituation(normalizedEmail: string): Promise<EmailAuthSituation> {
  const email = normalizedEmail.trim().toLowerCase();
  const methods = await getSignInMethods(email);
  return {
    methods,
    canPasswordLogin: methods.includes('password'),
    hasGoogle: methods.includes('google.com'),
    hasAnyAccount: methods.length > 0,
  };
}

/**
 * For accounts that exist with Google only: sign in via Google popup, then link
 * email/password so the same Firebase UID can use either method.
 * Web only (signInWithPopup). Caller must verify email matches the signed-in Google user.
 */
export async function signInWithGoogleThenLinkPassword(
  email: string,
  password: string
): Promise<User> {
  if (Platform.OS !== 'web') {
    throw new Error('GOOGLE_LINK_WEB_ONLY');
  }
  const auth = getAuthInstance();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    login_hint: email.trim(),
    prompt: 'select_account',
  });
  const result = await signInWithPopup(auth, provider);
  const signedEmail = result.user.email?.trim().toLowerCase();
  const target = email.trim().toLowerCase();
  if (signedEmail !== target) {
    await signOut(auth);
    const err = new Error('GOOGLE_EMAIL_MISMATCH');
    (err as { code?: string }).code = 'auth/google-email-mismatch';
    throw err;
  }
  const emailCred = EmailAuthProvider.credential(target, password);
  try {
    await linkWithCredential(result.user, emailCred);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'auth/provider-already-linked') {
      return result.user;
    }
    throw e;
  }
  return result.user;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  // TODO: Add comprehensive input validation (email format, password strength)
  // TODO: Add proper error handling with specific error codes
  // TODO: Implement user profile creation after successful signup
  // TODO: Add analytics tracking for successful/failed signups
  const auth = getAuthInstance();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getAuthInstance();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function sendVerification(user?: User): Promise<void> {
  const auth = getAuthInstance();
  const u = user || auth.currentUser;
  if (!u) throw new Error('No current user');
  await sendEmailVerification(u);
}

export async function isEmailVerified(): Promise<boolean> {
  const auth = getAuthInstance();
  const u = auth.currentUser;
  if (!u) return false;
  await reload(u);
  return !!u.emailVerified;
}

export async function signOutFirebase(): Promise<void> {
  const auth = getAuthInstance();
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getAuthInstance();
  await sendPasswordResetEmail(auth, email);
}


