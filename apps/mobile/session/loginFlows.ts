// File overview:
// - Purpose: Thin login flow helpers that funnel every successful authentication through `AuthSessionService.establishSession`.
// - Reached from: LoginScreen, FirebaseGoogleButton, OAuth restore.
// - Provides: `loginWithEmailAndEstablishSession()`, `establishSessionFromGoogleResponse()`,
//   `establishSessionFromAppleResponse()`.
// - SSoT: All client login paths must go through these helpers (or `AuthSessionService.establishSession` directly).

import { signInWithEmail, signUpWithEmail, sendVerification } from '../utils/authService';
import { AuthSessionService, type SessionUser } from './AuthSessionService';
import { logger } from '../utils/loggerService';

export type EmailLoginResult =
  | { kind: 'session'; user: SessionUser }
  | { kind: 'verification_sent' };

/**
 * Unified email/password login: signs in via Firebase, resolves canonical UUID via the server,
 * and establishes the session in one atomic operation.
 *
 * Returns:
 *  - { kind: 'session', user } on success
 *  - { kind: 'verification_sent' } if the user was newly registered and a verification email was sent
 *
 * Throws on any other failure (invalid credentials, server unreachable, resolution failure).
 */
export async function loginWithEmailAndEstablishSession(
  email: string,
  password: string,
): Promise<EmailLoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  let fbUser;
  try {
    fbUser = await signInWithEmail(email, password);
  } catch (signInError: any) {
    if (signInError?.code === 'auth/user-not-found') {
      const newFbUser = await signUpWithEmail(email, password);
      try {
        await sendVerification(newFbUser);
      } catch (verifyError) {
        logger.warn('AuthSession', 'Failed to send verification email (non-fatal)', {
          error: String(verifyError),
        });
      }
      return { kind: 'verification_sent' };
    }
    if (signInError?.code === 'auth/email-already-in-use') {
      // Race: another tab registered between attempts. Retry sign-in.
      fbUser = await signInWithEmail(email, password);
    } else {
      throw signInError;
    }
  }

  // Resolve canonical UUID via the server. Lazy require keeps this module testable and
  // avoids a top-level circular dependency between session and apiService.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const apiServiceModule = require('../utils/apiService');
  const apiService = apiServiceModule.apiService || apiServiceModule.default?.apiService;
  const resolveResponse = await apiService.resolveUserId({
    firebase_uid: fbUser.uid,
    email: normalizedEmail,
  });

  if (resolveResponse?.success && resolveResponse.user?.id) {
    const serverUser = resolveResponse.user;
    const sessionUser = await AuthSessionService.establishSession({
      user: {
        id: serverUser.id,
        email: serverUser.email || normalizedEmail,
        name: serverUser.name || fbUser.displayName || normalizedEmail.split('@')[0] || 'User',
        avatar: serverUser.avatar || serverUser.avatar_url || fbUser.photoURL || undefined,
        roles: serverUser.roles || ['user'],
        raw: serverUser,
      },
      tokens: (resolveResponse as any).tokens,
      resolutionHints: { firebaseUid: fbUser.uid, email: normalizedEmail },
      authMode: 'real',
    });
    return { kind: 'session', user: sessionUser };
  }

  // Last-resort: fetch profile by email and try one resolution pass through the session service.
  const profileResponse = await apiService.getUserById(normalizedEmail);
  if (profileResponse?.success && profileResponse.data?.id) {
    const profile = profileResponse.data;
    const sessionUser = await AuthSessionService.establishSession({
      user: {
        id: profile.id,
        email: profile.email || normalizedEmail,
        name: profile.name || fbUser.displayName || normalizedEmail.split('@')[0] || 'User',
        avatar: profile.avatar_url || fbUser.photoURL || undefined,
        roles: profile.roles || ['user'],
        raw: profile,
      },
      resolutionHints: { firebaseUid: fbUser.uid, email: normalizedEmail },
      authMode: 'real',
    });
    return { kind: 'session', user: sessionUser };
  }

  throw new Error('Failed to resolve canonical user_profiles.id after Firebase email login');
}

/**
 * Establish the session from the response of `POST /auth/google`.
 */
type ServerAuthResponse = {
  success?: boolean;
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
    avatar_url?: string;
    roles?: string[];
  };
  tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
};

export async function establishSessionFromGoogleResponse(
  response: ServerAuthResponse,
  hints: { firebaseUid?: string },
): Promise<SessionUser> {
  if (!response?.success || !response.user?.id) {
    throw new Error('Invalid Google auth server response');
  }
  return AuthSessionService.establishSession({
    user: {
      id: response.user.id,
      email: response.user.email || '',
      name: response.user.name || response.user.email || 'User',
      avatar: response.user.avatar || response.user.avatar_url,
      roles: response.user.roles || ['user'],
      raw: response.user as Record<string, unknown>,
    },
    tokens: response.tokens,
    resolutionHints: hints,
    authMode: 'real',
  });
}

/** Same server contract as Google (`POST /auth/apple`); no Firebase UID hint. */
export async function establishSessionFromAppleResponse(
  response: ServerAuthResponse,
): Promise<SessionUser> {
  return establishSessionFromGoogleResponse(response, {});
}
