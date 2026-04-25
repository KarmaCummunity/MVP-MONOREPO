// File overview:
// - Purpose: Zustand projection of the authoritative session managed by `AuthSessionService` (SSoT).
// - Reached from: Any component via `useUserStore()` / `useUser()`, services via direct import.
// - Provides: Methods to set user with mode, sign out, toggle guest, refresh roles, and resetHomeScreen trigger.
// - SSoT: All canonicalization, token persistence, and AsyncStorage writes live in `AuthSessionService`.
//   This store only mirrors the session into a UI-friendly shape and provides side-effects that depend
//   on the projected user (org enrichment, local DB clearing on real auth, etc.).

import { create } from 'zustand';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { logger } from '../utils/loggerService';
import {
  AuthSessionService,
  type SessionUser,
  type AuthMode as SessionAuthMode,
} from '../session/AuthSessionService';
import { isCanonicalUserProfileUuid } from '../session/userProfileId';

// Auth mode of the current session
export type AuthMode = SessionAuthMode;
// Simplified role model for the app
export type Role = 'guest' | 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  karmaPoints: number;
  joinDate: string;
  isActive: boolean;
  lastActive: string;
  location: { city: string; country: string };
  interests: string[];
  roles: string[];
  postsCount: number;
  followersCount: number;
  followingCount: number;
  notifications: Array<{ type: string; text: string; date: string }>;
  settings: { language: string; darkMode: boolean; notificationsEnabled: boolean };
  // Optional org enrichment
  orgApplicationId?: string;
  orgName?: string;
}

interface UserState {
  selectedUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  authMode: AuthMode;
  resetHomeScreenTrigger: number;
  isInitialized: boolean;
  lastHomeTabScreen: string | null;

  // Actions
  setSelectedUser: (user: User | null) => Promise<void>;
  setSelectedUserWithMode: (user: User | null, mode: AuthMode) => Promise<void>;
  setCurrentPrincipal: (principal: { user: User | null; role: Role }) => Promise<void>;
  syncFromSession: () => void;
  signOut: () => Promise<void>;
  setGuestMode: () => Promise<void>;
  setDemoUser: () => Promise<void>;
  resetHomeScreen: () => void;
  setLastHomeTabScreen: (screen: string | null) => void;
  clearLastHomeTabScreen: () => void;
  checkAuthStatus: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUserRoles: () => Promise<void>;
}

const computeRole = (user: User | null, mode: AuthMode): Role => {
  if (mode === 'guest' || !user) return 'guest';
  const roles = Array.isArray(user?.roles) ? user!.roles : [];
  return (roles.includes('admin') || roles.includes('super_admin') || roles.includes('org_admin')) ? 'admin' : 'user';
};

// Build a full UI `User` from the minimal session snapshot. Pulls extra fields from `raw`
// when available, falling back to safe defaults. This is purely a presentation concern.
function projectSessionUser(session: SessionUser | null): User | null {
  if (!session) return null;
  const raw: Record<string, any> = session.raw || {};
  const nowIso = new Date().toISOString();
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    phone: raw.phone || '+9720000000',
    avatar: session.avatar || raw.avatar || raw.avatar_url || 'https://i.pravatar.cc/150?img=1',
    bio: raw.bio || '',
    karmaPoints: raw.karmaPoints || raw.karma_points || 0,
    joinDate: raw.joinDate || raw.join_date || raw.created_at || nowIso,
    isActive: raw.isActive !== false && raw.is_active !== false,
    lastActive: raw.lastActive || raw.last_active || nowIso,
    location: raw.location || { city: raw.city || '', country: raw.country || 'IL' },
    interests: Array.isArray(raw.interests) ? raw.interests : [],
    roles: session.roles || ['user'],
    postsCount: raw.postsCount || raw.posts_count || 0,
    followersCount: raw.followersCount || raw.followers_count || 0,
    followingCount: raw.followingCount || raw.following_count || 0,
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    settings:
      raw.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
    orgApplicationId: raw.orgApplicationId,
    orgName: raw.orgName,
  };
}

const enrichUserWithOrgRoles = async (user: User): Promise<User> => {
  try {
    const emailKey = (user.email || '').toLowerCase();
    if (!emailKey) {
      return user;
    }

    const SUPER_ADMINS = ['navesarussi@gmail.com', 'karmacommunity2.0@gmail.com'];
    const isSuperAdmin = SUPER_ADMINS.includes(emailKey);

    const { apiService } = await import('../utils/apiService');
    const { db } = await import('../utils/databaseService');

    const [userFetchResult, applicationsFetchResult] = await Promise.allSettled([
      (async () => {
        try {
          const response = (await Promise.race([
            apiService.getUserById(user.id),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout fetching user data')), 4000),
            ),
          ])) as any;
          if (response.success && response.data) {
            return response.data.roles || [];
          }
        } catch (err) {
          logger.warn('userStore', 'enrichUserWithOrgRoles - user fetch failed', { error: String(err) });
        }
        return null;
      })(),
      (async () => {
        try {
          const apps = (await Promise.race([
            db.listOrgApplications(emailKey),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout fetching org apps')), 4000),
            ),
          ])) as any[];
          return apps;
        } catch (err) {
          logger.warn('userStore', 'enrichUserWithOrgRoles - org apps fetch failed', { error: String(err) });
          return [];
        }
      })(),
    ]);

    let dbRoles = user.roles || [];
    if (userFetchResult.status === 'fulfilled' && userFetchResult.value) {
      dbRoles = userFetchResult.value;
    }

    let approved: any = undefined;
    if (applicationsFetchResult.status === 'fulfilled' && Array.isArray(applicationsFetchResult.value)) {
      approved = applicationsFetchResult.value.find((a) => a.status === 'approved');
    }

    let finalRoles = [...dbRoles];
    if (isSuperAdmin && !finalRoles.includes('super_admin')) {
      finalRoles.push('super_admin');
    }
    if (approved && !finalRoles.includes('org_admin')) {
      finalRoles.push('org_admin');
    }
    finalRoles = Array.from(new Set(finalRoles));

    return {
      ...user,
      roles: finalRoles,
      orgApplicationId: approved?.id,
      orgName: approved?.orgName,
    };
  } catch (err) {
    logger.debug('userStore', 'enrichUserWithOrgRoles - skipped', { error: String(err) });
    return user;
  }
};

// Convert an inbound UI `User` shape into the minimal payload accepted by `establishSession`.
// All extra fields are forwarded as `raw` so projection on the way back is lossless.
function toEstablishPayload(user: User, mode: AuthMode) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      roles: user.roles,
      raw: user as unknown as Record<string, unknown>,
    },
    authMode: mode,
    resolutionHints: {
      email: user.email,
    },
  };
}

export const useUserStore = create<UserState>((set, get) => ({
  selectedUser: null,
  isLoading: true,
  isAuthenticated: false,
  isGuestMode: false,
  authMode: 'guest',
  resetHomeScreenTrigger: 0,
  isInitialized: false,
  lastHomeTabScreen: null,

  setCurrentPrincipal: async (principal: { user: User | null; role: Role }) => {
    try {
      logger.debug('userStore', 'setCurrentPrincipal', {
        user: principal.user?.email || 'null',
        role: principal.role,
      });

      if (principal.role === 'guest' || !principal.user) {
        AuthSessionService.setGuestSession();
        set({
          selectedUser: null,
          isAuthenticated: true,
          isGuestMode: true,
          authMode: 'guest',
        });
        return;
      }

      // SSoT compatibility: synthetic preview users (`guest_*`, `demo_*`) MUST NOT be treated as
      // real auth. Auto-correct to a guest session — keeps existing UI flows working without
      // sending synthetic ids to the server resolve endpoint.
      const candidateId = String(principal.user.id || '');
      if (candidateId.startsWith('guest_') || candidateId.startsWith('demo_')) {
        logger.debug('userStore', 'Synthetic id seen in setCurrentPrincipal; routing to guest mode', {
          idPrefix: candidateId.slice(0, 8),
        });
        AuthSessionService.setGuestSession();
        set({
          selectedUser: null,
          isAuthenticated: true,
          isGuestMode: true,
          authMode: 'guest',
        });
        return;
      }

      // Real authentication: delegate canonicalization & persistence to AuthSessionService.
      const sessionUser = await AuthSessionService.establishSession(
        toEstablishPayload(principal.user, 'real'),
      );

      // Reflect the new session in the Zustand projection IMMEDIATELY so consumers (navigation,
      // auth-gated screens) can react synchronously. Do NOT toggle `isLoading` here — that would
      // mount the loading screen and unmount the auth stack mid-login, breaking navigation.
      const projected = projectSessionUser(sessionUser)!;
      set({
        selectedUser: projected,
        isAuthenticated: true,
        isGuestMode: false,
        authMode: 'real',
      });

      // Side-effects that should happen on real auth, but must NOT block the UI projection.
      try {
        const { DatabaseService } = await import('../utils/databaseService');
        await DatabaseService.clearLocalCollections();
      } catch (e) {
        logger.warn('userStore', 'Failed to clear local collections on real auth (non-fatal)', { error: String(e) });
      }

      // Async enrichment (org roles, super-admin overrides). Update the store again on completion;
      // failures fall back silently to the already-projected user.
      try {
        const enriched = await enrichUserWithOrgRoles(projected);
        if (enriched && enriched.id === projected.id) {
          set({ selectedUser: enriched });
        }
      } catch (e) {
        logger.warn('userStore', 'enrichUserWithOrgRoles failed (non-fatal)', { error: String(e) });
      }
    } catch (error) {
      logger.error('userStore', 'setCurrentPrincipal failed', { error: String(error) });
      // Fail closed: clear session if we cannot establish it.
      await AuthSessionService.clearSession({ silent: true });
      set({
        selectedUser: null,
        isAuthenticated: false,
        isGuestMode: false,
        authMode: 'guest',
      });
    }
  },

  /**
   * Sync the Zustand projection from the in-memory AuthSessionService session.
   *
   * Used after establishSession was called directly (e.g. from `loginFlows.ts`). Unlike
   * `checkAuthStatus`, this does NOT toggle `isLoading` and does NOT re-read AsyncStorage —
   * it simply mirrors the live session into the store so navigation can proceed without
   * remounting the loading screen.
   */
  syncFromSession: () => {
    const state = AuthSessionService.getState();
    if (!state.isAuthenticated || !state.user) {
      // Do nothing: the only consumers of `syncFromSession` are post-establishSession callers
      // which already have an authenticated session. Falling through to `checkAuthStatus` covers
      // unexpected misuse.
      return;
    }
    const projected = projectSessionUser(state.user)!;
    set({
      selectedUser: projected,
      isAuthenticated: true,
      isGuestMode: state.authMode === 'guest',
      authMode: state.authMode,
      // Force isLoading off in case anything upstream left it on. The auth-gated stack must mount
      // immediately so the queued navigation reset can dispatch against `HomeStack`.
      isLoading: false,
    });

    // Fire-and-forget enrichment.
    void (async () => {
      try {
        const enriched = await enrichUserWithOrgRoles(projected);
        if (enriched && enriched.id === projected.id) {
          set({ selectedUser: enriched });
        }
      } catch (e) {
        logger.warn('userStore', 'syncFromSession enrichment failed (non-fatal)', { error: String(e) });
      }
    })();
  },

  setSelectedUserWithMode: async (user: User | null, mode: AuthMode) => {
    const role = computeRole(user, mode);
    await get().setCurrentPrincipal({ user, role });
  },

  setSelectedUser: async (user: User | null) => {
    await get().setSelectedUserWithMode(user, user ? 'real' : 'guest');
  },

  checkAuthStatus: async () => {
    try {
      logger.debug('userStore', 'checkAuthStatus - starting');
      set({ isLoading: true });

      const state = await AuthSessionService.restoreSession();
      const projected = projectSessionUser(state.user);

      if (!state.isAuthenticated || !projected) {
        set({
          selectedUser: null,
          isAuthenticated: false,
          isGuestMode: false,
          authMode: 'guest',
          isLoading: false,
        });
        return;
      }

      const enriched = await enrichUserWithOrgRoles(projected);
      set({
        selectedUser: enriched,
        isAuthenticated: true,
        isGuestMode: state.authMode === 'guest',
        authMode: state.authMode,
        isLoading: false,
      });
      logger.info('userStore', 'checkAuthStatus - session restored', { userId: enriched.id });
    } catch (error) {
      logger.error('userStore', 'checkAuthStatus - error', { error: String(error) });
      await AuthSessionService.clearSession({ silent: true });
      set({
        isAuthenticated: false,
        isGuestMode: false,
        selectedUser: null,
        authMode: 'guest',
        isLoading: false,
      });
    }
  },

  signOut: async () => {
    try {
      logger.info('userStore', 'signOut - starting');
      set({ isLoading: true });

      try {
        const { app } = getFirebase();
        const auth = getAuth(app);
        await auth.signOut();
      } catch (firebaseError) {
        logger.warn('userStore', 'Firebase sign-out failed (non-fatal)', { error: String(firebaseError) });
      }

      await AuthSessionService.clearSession();

      set({
        selectedUser: null,
        isAuthenticated: false,
        isGuestMode: false,
        authMode: 'guest',
        isLoading: false,
        isInitialized: true,
      });
      logger.info('userStore', 'signOut - completed');
    } catch (error) {
      logger.error('userStore', 'signOut - error', { error: String(error) });
      set({
        selectedUser: null,
        isAuthenticated: false,
        isGuestMode: false,
        authMode: 'guest',
        isLoading: false,
      });
    }
  },

  setGuestMode: async () => {
    logger.debug('userStore', 'setGuestMode - session-only');
    AuthSessionService.setGuestSession();
    set({
      selectedUser: null,
      authMode: 'guest',
      isGuestMode: true,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setDemoUser: async () => {
    // Demo mode removed; kept as a no-op for backward compatibility.
    logger.debug('userStore', 'setDemoUser called (no-op)');
  },

  resetHomeScreen: () => {
    set((state) => ({ resetHomeScreenTrigger: state.resetHomeScreenTrigger + 1 }));
  },

  setLastHomeTabScreen: (screen: string | null) => {
    set({ lastHomeTabScreen: screen });
  },

  clearLastHomeTabScreen: () => {
    set({ lastHomeTabScreen: null });
  },

  refreshUserRoles: async () => {
    const currentUser = get().selectedUser;
    if (!currentUser) {
      return;
    }

    try {
      const enrichedUser = await enrichUserWithOrgRoles(currentUser);
      const currentRoles = JSON.stringify((currentUser.roles || []).slice().sort((a, b) => a.localeCompare(b)));
      const newRoles = JSON.stringify((enrichedUser.roles || []).slice().sort((a, b) => a.localeCompare(b)));
      if (currentRoles !== newRoles) {
        set({ selectedUser: enrichedUser });
        // Re-establish so the persisted snapshot reflects the new roles.
        try {
          await AuthSessionService.establishSession(toEstablishPayload(enrichedUser, 'real'));
        } catch (e) {
          logger.warn('userStore', 'refreshUserRoles - re-establish failed', { error: String(e) });
        }
      }
    } catch (error) {
      logger.error('userStore', 'refreshUserRoles - error', { error: String(error) });
    }
  },

  initialize: async () => {
    try {
      logger.info('userStore', 'initialize - starting');
      await get().checkAuthStatus();
      set({ isInitialized: true });

      // Firebase auth listener: handle sign-out detection only.
      // Establishing/restoring the session is handled by AuthSessionService — never here.
      try {
        const firebase = getFirebase();
        if (!firebase || !firebase.app) {
          logger.warn('userStore', 'Firebase not available; skipping auth listener');
          return;
        }
        const auth = getAuth(firebase.app);

        onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
          const state = get();
          if (!state.isInitialized) {
            return;
          }
          if (firebaseUser) {
            // No-op: session is established explicitly via login flows / restoreSession.
            // We deliberately do NOT re-run resolution here to avoid bypassing the SSoT pipeline.
            return;
          }
          // Firebase reports signed-out: only clear if we currently believe we're in a real session
          // tied to Firebase. Guest sessions are unaffected.
          if (state.authMode === 'real' && state.isAuthenticated) {
            const currentId = state.selectedUser?.id;
            if (currentId && isCanonicalUserProfileUuid(currentId)) {
              logger.info('userStore', 'Firebase signed out; clearing session');
              await AuthSessionService.clearSession();
              set({
                selectedUser: null,
                isAuthenticated: false,
                isGuestMode: false,
                authMode: 'guest',
              });
            }
          }
        });
        logger.info('userStore', 'Firebase auth listener installed');
      } catch (error) {
        logger.error('userStore', 'Failed to install Firebase auth listener', { error: String(error) });
      }
    } catch (error) {
      logger.error('userStore', 'initialize - critical error', { error: String(error) });
      set({
        isInitialized: true,
        isLoading: false,
        isAuthenticated: false,
        isGuestMode: false,
        selectedUser: null,
        authMode: 'guest',
      });
    }
  },
}));

export const useUser = () => {
  const store = useUserStore();
  return {
    selectedUser: store.selectedUser,
    setSelectedUser: store.setSelectedUser,
    setSelectedUserWithMode: store.setSelectedUserWithMode,
    role: computeRole(store.selectedUser, store.authMode),
    setCurrentPrincipal: store.setCurrentPrincipal,
    syncFromSession: store.syncFromSession,
    isUserSelected: store.selectedUser !== null,
    isLoading: store.isLoading,
    signOut: store.signOut,
    isAuthenticated: store.isAuthenticated,
    isGuestMode: store.isGuestMode,
    isRealAuth: store.authMode === 'real',
    isAdmin: (() => {
      const user = store.selectedUser;
      if (!user) return false;
      // Super-admin email shortcut for the documented root admin (kept for parity with prior behavior).
      if (user.email === 'navesarussi@gmail.com') return true;
      const roles = Array.isArray(user.roles) ? user.roles : [];
      return roles.includes('admin') || roles.includes('super_admin');
    })(),
    setGuestMode: store.setGuestMode,
    setDemoUser: store.setDemoUser,
    resetHomeScreen: store.resetHomeScreen,
    resetHomeScreenTrigger: store.resetHomeScreenTrigger,
    lastHomeTabScreen: store.lastHomeTabScreen,
    setLastHomeTabScreen: store.setLastHomeTabScreen,
    clearLastHomeTabScreen: store.clearLastHomeTabScreen,
    refreshUserRoles: store.refreshUserRoles,
  };
};
