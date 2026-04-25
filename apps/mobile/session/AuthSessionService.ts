// File overview:
// - Purpose: Single client-side pipeline for establishing, restoring, and clearing the user session (SSoT projection).
// - Reached from: userStore, LoginScreen, FirebaseGoogleButton, OAuth restore flows.
// - Provides: establishSession() / restoreSession() / clearSession() with one canonical user id.
// - SSoT contract: the active session always carries a `user_profiles.id` UUID. Firebase UID, Google sub, and email
//   are mapping inputs only and are never used as the canonical actor id.
// - Side-effects: persists tokens + minimal user snapshot in AsyncStorage; emits change events to subscribers.
// - Logging: project logger only; English messages.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/loggerService';
import { isCanonicalUserProfileUuid, type UserProfileId } from './userProfileId';

// ------------------------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------------------------

export type AuthMode = 'guest' | 'demo' | 'real';

/**
 * Minimal user snapshot persisted in AsyncStorage and surfaced on the session.
 * Anything beyond `id`/`email`/`name`/`avatar`/`roles` is treated as a UI-only enrichment.
 */
export interface SessionUser {
  id: UserProfileId;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  // Free-form payload kept for compatibility with the existing userStore.User shape.
  // The session service does NOT introspect or canonicalize it.
  raw?: Record<string, unknown>;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
}

export interface EstablishSessionPayload {
  user: {
    id: string; // candidate id; will be validated/branded
    email: string;
    name?: string;
    avatar?: string;
    roles?: string[];
    raw?: Record<string, unknown>;
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number; // seconds
  };
  // Optional resolution hints used only when `user.id` is not already a canonical UUID.
  resolutionHints?: {
    firebaseUid?: string;
    email?: string;
  };
  authMode?: AuthMode; // defaults to 'real'
}

export interface SessionState {
  user: SessionUser | null;
  authMode: AuthMode;
  isAuthenticated: boolean;
}

export type SessionListener = (state: SessionState) => void;

// ------------------------------------------------------------------------------------------------
// Storage keys (single source for all auth-related AsyncStorage entries)
// ------------------------------------------------------------------------------------------------

const STORAGE_KEYS = {
  user: 'current_user',
  authMode: 'auth_mode',
  guestMode: 'guest_mode',
  firebaseUid: 'firebase_user_id',
  jwtAccess: 'jwt_access_token',
  jwtRefresh: 'jwt_refresh_token',
  jwtExpiresAt: 'jwt_token_expires_at',
  oauthInProgress: 'oauth_in_progress',
  oauthSuccessFlag: 'oauth_success_flag',
  googleAuthUser: 'google_auth_user',
  googleAuthToken: 'google_auth_token',
} as const;

const ALL_AUTH_KEYS: string[] = Object.values(STORAGE_KEYS);

// ------------------------------------------------------------------------------------------------
// Internal state
// ------------------------------------------------------------------------------------------------

const listeners = new Set<SessionListener>();
let currentState: SessionState = {
  user: null,
  authMode: 'guest',
  isAuthenticated: false,
};

function emit(): void {
  for (const fn of listeners) {
    try {
      fn(currentState);
    } catch (err) {
      logger.warn('AuthSession', 'Listener error', { error: String(err) });
    }
  }
}

function setState(next: Partial<SessionState>): void {
  currentState = { ...currentState, ...next };
  emit();
}

// ------------------------------------------------------------------------------------------------
// Token / user persistence helpers (AsyncStorage)
// ------------------------------------------------------------------------------------------------

async function persistTokens(tokens?: EstablishSessionPayload['tokens']): Promise<void> {
  if (!tokens?.accessToken) return;
  const expiresAt = tokens.expiresIn
    ? String(Date.now() + tokens.expiresIn * 1000)
    : undefined;

  const ops: Array<Promise<unknown>> = [
    AsyncStorage.setItem(STORAGE_KEYS.jwtAccess, tokens.accessToken),
  ];
  if (tokens.refreshToken) {
    ops.push(AsyncStorage.setItem(STORAGE_KEYS.jwtRefresh, tokens.refreshToken));
  }
  if (expiresAt) {
    ops.push(AsyncStorage.setItem(STORAGE_KEYS.jwtExpiresAt, expiresAt));
  }
  await Promise.all(ops);
}

async function persistUser(user: SessionUser, mode: AuthMode, firebaseUid?: string): Promise<void> {
  const payloadToPersist = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    roles: user.roles,
    ...(user.raw || {}),
  };
  const ops: Array<Promise<unknown>> = [
    AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(payloadToPersist)),
    AsyncStorage.setItem(STORAGE_KEYS.authMode, mode),
  ];
  if (firebaseUid) {
    ops.push(AsyncStorage.setItem(STORAGE_KEYS.firebaseUid, firebaseUid));
  }
  await Promise.all(ops);
}

async function readPersistedUser(): Promise<{ raw: any; mode: AuthMode } | null> {
  const [rawUser, mode] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.user),
    AsyncStorage.getItem(STORAGE_KEYS.authMode),
  ]);
  if (!rawUser) return null;
  try {
    return { raw: JSON.parse(rawUser), mode: (mode as AuthMode) || 'real' };
  } catch (err) {
    logger.warn('AuthSession', 'Failed to parse persisted user', { error: String(err) });
    return null;
  }
}

async function clearAllAuthStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(ALL_AUTH_KEYS);
  } catch (err) {
    logger.warn('AuthSession', 'Failed to clear auth storage (non-fatal)', { error: String(err) });
  }
}

// ------------------------------------------------------------------------------------------------
// Resolution helpers
// ------------------------------------------------------------------------------------------------

/**
 * Best-effort canonicalization of an incoming user id using server resolution.
 *
 * Returns a branded `UserProfileId` if successful, or null on failure.
 * Synthetic identifiers (`guest_*`, `demo_*`) are NEVER sent to the resolve endpoint.
 */
async function resolveCanonicalId(
  candidateId: string,
  hints: { firebaseUid?: string; email?: string } | undefined,
): Promise<UserProfileId | null> {
  if (isCanonicalUserProfileUuid(candidateId)) {
    return candidateId;
  }
  if (isSyntheticId(candidateId)) {
    logger.debug('AuthSession', 'Synthetic id; skipping server resolution', {
      idPrefix: candidateId.slice(0, 8),
    });
    return null;
  }

  const firebaseUid = hints?.firebaseUid || (looksLikeFirebaseUid(candidateId) ? candidateId : undefined);
  const email = hints?.email || (candidateId.includes('@') ? candidateId : undefined);

  if (!firebaseUid && !email) {
    return null;
  }

  try {
    // Lazy require to avoid a top-level circular dependency between this module and apiService,
    // while still being mock-friendly (jest substitutes the module via jest.mock).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const apiServiceModule = require('../utils/apiService');
    const apiService = apiServiceModule.apiService || apiServiceModule.default?.apiService;
    if (!apiService || typeof apiService.resolveUserId !== 'function') {
      logger.warn('AuthSession', 'apiService.resolveUserId unavailable');
      return null;
    }
    const response = await apiService.resolveUserId({
      firebase_uid: firebaseUid,
      email,
    });
    const resolved = response?.user?.id;
    if (response?.success && isCanonicalUserProfileUuid(resolved)) {
      return resolved;
    }
    logger.warn('AuthSession', 'Server resolution returned non-canonical id', {
      success: !!response?.success,
    });
    return null;
  } catch (err) {
    logger.warn('AuthSession', 'Server resolution failed', { error: String(err) });
    return null;
  }
}

function isSyntheticId(id: string): boolean {
  return id.startsWith('guest_') || id.startsWith('demo_');
}

function looksLikeFirebaseUid(value: string): boolean {
  // Firebase UIDs are 28-char alphanumeric (no dashes) — but be permissive here.
  return !value.includes('@') && !value.includes('-') && value.length >= 8 && value.length <= 64;
}

// ------------------------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------------------------

export const AuthSessionService = {
  /**
   * Subscribe to session state changes.
   */
  subscribe(listener: SessionListener): () => void {
    listeners.add(listener);
    listener(currentState);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Get the current in-memory session snapshot.
   */
  getState(): SessionState {
    return currentState;
  },

  /**
   * Establish a real-auth session after server-confirmed authentication.
   *
   * Validates that `payload.user.id` is the canonical `user_profiles.id` UUID, OR resolves it
   * once via the server. Persists tokens + minimal user snapshot atomically. Throws on failure.
   */
  async establishSession(payload: EstablishSessionPayload): Promise<SessionUser> {
    const incoming = payload.user;
    if (!incoming || !incoming.id) {
      throw new Error('[SSoT] establishSession requires user.id');
    }

    let canonicalId: UserProfileId;
    if (isCanonicalUserProfileUuid(incoming.id)) {
      canonicalId = incoming.id;
    } else {
      logger.warn('AuthSession', 'Non-canonical user id in establishSession; attempting resolution', {
        idShape: incoming.id.length > 30 ? 'uuid-like' : 'short',
      });
      const resolved = await resolveCanonicalId(incoming.id, {
        firebaseUid: payload.resolutionHints?.firebaseUid,
        email: payload.resolutionHints?.email || incoming.email,
      });
      if (!resolved) {
        throw new Error('[SSoT] Failed to resolve canonical user_profiles.id for incoming session');
      }
      canonicalId = resolved;
    }

    const user: SessionUser = {
      id: canonicalId,
      email: (incoming.email || '').toLowerCase().trim(),
      name: incoming.name || incoming.email || 'User',
      avatar: incoming.avatar,
      roles: incoming.roles || ['user'],
      raw: incoming.raw,
    };

    const mode: AuthMode = payload.authMode || 'real';

    await persistTokens(payload.tokens);
    await persistUser(user, mode, payload.resolutionHints?.firebaseUid);

    setState({ user, authMode: mode, isAuthenticated: true });
    logger.info('AuthSession', 'Session established', { userId: user.id, authMode: mode });
    return user;
  },

  /**
   * Mark the current session as a guest session (in-memory only; NOT persisted).
   */
  setGuestSession(): void {
    setState({ user: null, authMode: 'guest', isAuthenticated: true });
    logger.info('AuthSession', 'Guest session set (session-only)');
  },

  /**
   * Restore a previously persisted session, if any.
   *
   * - Validates that the persisted user id is canonical; if not, attempts ONE server resolution.
   * - On any failure, clears the session deterministically (hard-fail).
   * - Returns the restored session state.
   */
  async restoreSession(): Promise<SessionState> {
    try {
      const persisted = await readPersistedUser();
      if (!persisted) {
        await this.clearSession({ silent: true });
        return currentState;
      }
      const { raw, mode } = persisted;
      if (mode === 'guest') {
        // Guest mode is session-only; previous guest snapshot is informational, not a session.
        await this.clearSession({ silent: true });
        return currentState;
      }

      const candidateId: unknown = raw?.id;
      let canonicalId: UserProfileId | null = isCanonicalUserProfileUuid(candidateId)
        ? candidateId
        : null;

      if (!canonicalId) {
        logger.warn('AuthSession', 'Persisted user.id is not canonical; attempting one-shot resolution');
        const firebaseUid = await AsyncStorage.getItem(STORAGE_KEYS.firebaseUid);
        canonicalId = await resolveCanonicalId(String(candidateId || ''), {
          firebaseUid: firebaseUid || undefined,
          email: typeof raw?.email === 'string' ? raw.email : undefined,
        });
      }

      if (!canonicalId) {
        logger.warn('AuthSession', 'Could not canonicalize persisted user; hard-failing session');
        await this.clearSession({ silent: false });
        return currentState;
      }

      // Validate token freshness (best-effort): if there's an access token but it is expired and
      // we have no refresh token, force re-auth.
      const [accessToken, expiresAtStr, refreshToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.jwtAccess),
        AsyncStorage.getItem(STORAGE_KEYS.jwtExpiresAt),
        AsyncStorage.getItem(STORAGE_KEYS.jwtRefresh),
      ]);
      if (accessToken && expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Number.isFinite(expiresAt) && expiresAt < Date.now() && !refreshToken) {
          logger.warn('AuthSession', 'Access token expired with no refresh token; clearing session');
          await this.clearSession({ silent: false });
          return currentState;
        }
      }

      const user: SessionUser = {
        id: canonicalId,
        email: (raw?.email || '').toLowerCase(),
        name: raw?.name || raw?.email || 'User',
        avatar: raw?.avatar,
        roles: Array.isArray(raw?.roles) ? raw.roles : ['user'],
        raw,
      };

      // Re-persist with canonical id in case we resolved it.
      await persistUser(user, 'real');

      setState({ user, authMode: 'real', isAuthenticated: true });
      logger.info('AuthSession', 'Session restored', { userId: user.id });
      return currentState;
    } catch (err) {
      logger.error('AuthSession', 'restoreSession failed; clearing session', { error: String(err) });
      await this.clearSession({ silent: false });
      return currentState;
    }
  },

  /**
   * Clear all auth artifacts deterministically.
   */
  async clearSession(opts: { silent?: boolean } = {}): Promise<void> {
    await clearAllAuthStorage();
    setState({ user: null, authMode: 'guest', isAuthenticated: false });
    if (!opts.silent) {
      logger.info('AuthSession', 'Session cleared');
    }
  },

  // -------- Test helpers (not part of the public production contract) --------
  __resetForTests(): void {
    listeners.clear();
    currentState = { user: null, authMode: 'guest', isAuthenticated: false };
  },
};

export { STORAGE_KEYS };
