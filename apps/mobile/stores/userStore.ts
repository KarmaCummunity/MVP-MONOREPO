// File overview:
// - Purpose: Global user/session state management using Zustand (replaces UserContext)
// - Reached from: Any component via `useUserStore()` hook, or services via direct import
// - Provides: Methods to set user with mode, sign out, toggle guest/demo, and resetHomeScreen trigger
// - Storage: Persists `current_user`, `guest_mode`, and `auth_mode` in AsyncStorage; clears local collections on real auth
// - Advantage: Can be used outside React components (in services) without circular dependencies

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { logger } from '../utils/loggerService';
import { ensureUserProfileUuid } from '../utils/ensureUserProfileUuid';

// Auth mode of the current session
export type AuthMode = 'guest' | 'demo' | 'real';
// Simplified role model for the app
export type Role = 'guest' | 'user' | 'admin';

/** Org application from db.listOrgApplications */
interface OrgApplicationRecord {
  id?: string;
  orgName?: string;
  status?: string;
}

/** API user record shape from getUserById / resolveUserId */
interface ApiUserRecord {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  avatar?: string;
  bio?: string;
  karma_points?: number;
  karmaPoints?: number;
  join_date?: string;
  created_at?: string;
  joinDate?: string;
  createdAt?: string;
  is_active?: boolean;
  isActive?: boolean;
  last_active?: string;
  lastActive?: string;
  city?: string;
  country?: string;
  location?: { city: string; country: string };
  interests?: string[];
  roles?: string[];
  posts_count?: number;
  followers_count?: number;
  following_count?: number;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  settings?: { language: string; darkMode: boolean; notificationsEnabled: boolean };
}

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
  isInitialized: boolean; // Flag to track if store has been initialized
  lastHomeTabScreen: string | null; // Last screen visited in HomeTabStack before switching tabs

  // Actions
  setSelectedUser: (user: User | null) => Promise<void>;
  setSelectedUserWithMode: (user: User | null, mode: AuthMode) => Promise<void>;
  setCurrentPrincipal: (principal: { user: User | null; role: Role }) => Promise<void>;
  signOut: () => Promise<void>;
  setGuestMode: () => Promise<void>;
  setDemoUser: () => Promise<void>;
  resetHomeScreen: () => void;
  setLastHomeTabScreen: (screen: string | null) => void;
  clearLastHomeTabScreen: () => void;
  checkAuthStatus: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUserRoles: () => Promise<void>; // Refresh user roles from database
}

const computeRole = (user: User | null, mode: AuthMode): Role => {
  if (mode === 'guest' || !user) return 'guest';
  const roles = Array.isArray(user?.roles) ? user!.roles : [];
  return (roles.includes('admin') || roles.includes('super_admin') || roles.includes('org_admin')) ? 'admin' : 'user';
};

const mapApiUserToUser = (
  record: ApiUserRecord,
  fallbacks: { displayName?: string; email?: string; photoURL?: string }
): User => {
  const nowIso = new Date().toISOString();
  return {
    id: record.id ?? '',
    name: record.name ?? fallbacks.displayName ?? fallbacks.email?.split('@')[0] ?? 'User',
    email: record.email ?? fallbacks.email ?? '',
    phone: record.phone ?? '+9720000000',
    avatar: record.avatar_url ?? record.avatar ?? fallbacks.photoURL ?? 'https://i.pravatar.cc/150?img=1',
    bio: record.bio ?? '',
    karmaPoints: (record.karma_points ?? record.karmaPoints ?? 0) as number,
    joinDate: record.join_date ?? record.created_at ?? record.joinDate ?? record.createdAt ?? nowIso,
    isActive: record.is_active !== false && record.isActive !== false,
    lastActive: record.last_active ?? record.lastActive ?? nowIso,
    location: record.location ?? { city: record.city ?? 'ישראל', country: record.country ?? 'IL' },
    interests: Array.isArray(record.interests) ? record.interests : [],
    roles: Array.isArray(record.roles) ? record.roles : ['user'],
    postsCount: (record.posts_count ?? record.postsCount ?? 0) as number,
    followersCount: (record.followers_count ?? record.followersCount ?? 0) as number,
    followingCount: (record.following_count ?? record.followingCount ?? 0) as number,
    notifications: [],
    settings: record.settings ?? { language: 'he', darkMode: false, notificationsEnabled: true },
  };
};

const enrichUserWithOrgRoles = async (user: User): Promise<User> => {
  try {
    console.log('🔐 enrichUserWithOrgRoles - Starting enrichment for:', user.email);
    const emailKey = (user.email || '').toLowerCase();
    if (!emailKey) {
      console.log('🔐 enrichUserWithOrgRoles - No email, returning user as-is');
      return user;
    }

    const SUPER_ADMINS = ['navesarussi@gmail.com', 'karmacommunity2.0@gmail.com'];
    const isSuperAdmin = SUPER_ADMINS.includes(emailKey);

    // Import services locally
    const { apiService } = await import('../src/api/api.service');
    const { db } = await import('../src/infrastructure/database.service');

    // Run fetches in parallel with independent timeouts
    const [userFetchResult, applicationsFetchResult] = await Promise.allSettled([
      // 1. Fetch user roles from DB
      (async () => {
        try {
          const response = await Promise.race([
            apiService.getUserById(user.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching user data')), 4000))
          ]) as { success?: boolean; data?: { roles?: string[] } };

          if (response.success && response.data) {
            return response.data.roles || [];
          }
        } catch (err) {
          console.warn('🔐 enrichUserWithOrgRoles - User fetch warning:', err);
        }
        return null; // Return null to indicate failure/no change
      })(),

      // 2. Fetch org applications
      (async () => {
        try {
          const apps = await Promise.race([
            db.listOrgApplications(emailKey),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching org apps')), 4000))
          ]) as OrgApplicationRecord[];
          return apps;
        } catch (err) {
          console.warn('🔐 enrichUserWithOrgRoles - Org apps fetch warning:', err);
          return [];
        }
      })()
    ]);

    // Process User Roles
    let dbRoles = user.roles || [];
    if (userFetchResult.status === 'fulfilled' && userFetchResult.value) {
      dbRoles = userFetchResult.value;
      console.log('🔐 enrichUserWithOrgRoles - Fetched roles from DB:', dbRoles);
    }

    // Process Org Applications
    let approved: OrgApplicationRecord | undefined = undefined;
    if (applicationsFetchResult.status === 'fulfilled' && Array.isArray(applicationsFetchResult.value)) {
      approved = applicationsFetchResult.value.find((a) => a.status === 'approved');
      console.log('🔐 enrichUserWithOrgRoles - Found approved org:', !!approved);
    }

    // Build final roles list
    let finalRoles = [...dbRoles];

    // Add super_admin if applicable (hardcoded)
    if (isSuperAdmin && !finalRoles.includes('super_admin')) {
      finalRoles.push('super_admin');
    }

    // Add org_admin if has approved application
    if (approved && !finalRoles.includes('org_admin')) {
      finalRoles.push('org_admin');
    }

    // Remove duplicates
    finalRoles = Array.from(new Set(finalRoles));

    console.log('🔐 enrichUserWithOrgRoles - Final roles:', finalRoles);
    return {
      ...user,
      roles: finalRoles,
      orgApplicationId: approved?.id,
      orgName: approved?.orgName
    };
  } catch (err) {
    console.log('🔐 userStore - enrichUserWithOrgRoles - skipped (no backend or no data)', err);
    return user;
  }
};

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  selectedUser: null,
  isLoading: true,
  isAuthenticated: false,
  isGuestMode: false,
  authMode: 'guest',
  resetHomeScreenTrigger: 0,
  isInitialized: false,
  lastHomeTabScreen: null,

  // Actions
  setCurrentPrincipal: async (principal: { user: User | null; role: Role }) => {
    try {
      console.log('🔐 userStore - setCurrentPrincipal:', { user: principal.user?.name || 'null', role: principal.role });
      if (principal.role === 'guest' || !principal.user) {
        set({
          selectedUser: null,
          isAuthenticated: true,
          isGuestMode: true,
          authMode: 'guest',
        });
        return;
      }
      let profileUser = principal.user;
      if (principal.role !== 'guest') {
        profileUser = await ensureUserProfileUuid(principal.user);
        if (profileUser.id !== principal.user.id) {
          await AsyncStorage.setItem('current_user', JSON.stringify(profileUser));
          logger.info('Auth', 'Persisted user after profile UUID normalization', {
            previousIdLength: principal.user.id?.length ?? 0,
          });
        }
      }
      const enriched = await enrichUserWithOrgRoles(profileUser);
      // Treat any non-guest role as real auth
      try {
        const { DatabaseService } = await import('../src/infrastructure/database.service');
        await DatabaseService.clearLocalCollections();
      } catch (e) {
        console.log('⚠️ Failed to clear local collections on real auth (non-fatal):', e);
      }
      set({
        selectedUser: enriched,
        isAuthenticated: true,
        isGuestMode: false,
        authMode: 'real',
      });
    } catch (error) {
      console.error('Error in setCurrentPrincipal:', error);
      // Fallbacks
      if (principal.role === 'guest' || !principal.user) {
        set({
          selectedUser: null,
          isAuthenticated: true,
          isGuestMode: true,
          authMode: 'guest',
        });
      } else {
        const fallbackUser =
          principal.role !== 'guest' && principal.user
            ? await ensureUserProfileUuid(principal.user)
            : principal.user;
        set({
          selectedUser: fallbackUser,
          isAuthenticated: true,
          isGuestMode: false,
          authMode: 'real',
        });
      }
    }
  },

  setSelectedUserWithMode: async (user: User | null, mode: AuthMode) => {
    try {
      console.log('🔐 userStore - setSelectedUserWithMode:', { user: user?.name || 'null', mode });
      const role = computeRole(user, mode);
      await get().setCurrentPrincipal({ user, role });
      console.log('🔐 userStore - setSelectedUserWithMode - completed');
    } catch (error) {
      console.error('Error setting user:', error);
      const role = computeRole(user, mode);
      await get().setCurrentPrincipal({ user, role });
    }
  },

  setSelectedUser: async (user: User | null) => {
    await get().setSelectedUserWithMode(user, user ? 'real' as const : 'guest');
  },

  checkAuthStatus: async () => {
    try {
      console.log('🔐 userStore - checkAuthStatus - Starting auth check');
      set({ isLoading: true });

      // First, check for successful OAuth authentication
      console.log('🔐 userStore - checkAuthStatus - Checking for OAuth success');
      const oauthSuccess = await AsyncStorage.getItem('oauth_success_flag');
      const userData = await AsyncStorage.getItem('google_auth_user');
      const token = await AsyncStorage.getItem('google_auth_token');

      if (oauthSuccess && userData && token) {
        try {
          console.log('🔐 userStore - checkAuthStatus - Found OAuth success data, processing');
          const parsedUserData = JSON.parse(userData);

          // Validate the user data
          if (parsedUserData && parsedUserData.id && parsedUserData.email) {
            console.log('🔐 userStore - checkAuthStatus - Setting authenticated user from OAuth');

            // Enrich user with org roles if applicable (with timeout)
            const enrichWithTimeout = Promise.race([
              enrichUserWithOrgRoles(parsedUserData),
              new Promise<User>((resolve) =>
                setTimeout(() => {
                  console.warn('🔐 userStore - Enrichment timed out, using basic user data');
                  resolve(parsedUserData);
                }, 8000)
              )
            ]);

            let enrichedUser = await enrichWithTimeout;
            enrichedUser = await ensureUserProfileUuid(enrichedUser);
            await AsyncStorage.setItem('current_user', JSON.stringify(enrichedUser));

            set({
              selectedUser: enrichedUser,
              isAuthenticated: true,
              isGuestMode: false,
              authMode: 'real',
            });

            // Clean up OAuth success flags since we've processed them
            await AsyncStorage.multiRemove(['oauth_success_flag', 'google_auth_user', 'google_auth_token']);

            console.log('🔐 userStore - checkAuthStatus - OAuth authentication restored successfully');
            set({ isLoading: false });
            return; // Exit early - user is authenticated
          } else {
            console.warn('🔐 userStore - checkAuthStatus - Invalid OAuth user data found');
          }
        } catch (parseError) {
          console.error('🔐 userStore - checkAuthStatus - Error parsing OAuth user data:', parseError);
        }
      }

      // Check for persistent user session
      console.log('🔐 userStore - checkAuthStatus - Checking for persistent session');
      const persistedUser = await AsyncStorage.getItem('current_user');
      const guestMode = await AsyncStorage.getItem('guest_mode');
      const authModeStored = await AsyncStorage.getItem('auth_mode');

      if (persistedUser) {
        try {
          const parsedUser = JSON.parse(persistedUser);
          if (parsedUser && parsedUser.id) {
            console.log('🔐 userStore - checkAuthStatus - Found persisted user, validating token');

            // Validate token before restoring session
            // Only validate if not in guest mode
            if (authModeStored !== 'guest') {
              const { apiService } = await import('../src/api/api.service');

              // Try to get a valid auth token (this will refresh if needed)
              const authToken = await apiService.getAuthToken();

              if (!authToken) {
                console.warn('🔐 userStore - checkAuthStatus - No valid token found, clearing session');
                // Token validation failed, clear session
                await AsyncStorage.multiRemove([
                  'current_user',
                  'guest_mode',
                  'auth_mode',
                  'oauth_in_progress',
                  'oauth_success_flag',
                  'google_auth_user',
                  'google_auth_token',
                  'jwt_access_token',
                  'jwt_token_expires_at',
                  'jwt_refresh_token',
                ]);
                // Continue to unauthenticated state below
              } else {
                // Token is valid, proceed with session restoration
                console.log('🔐 userStore - checkAuthStatus - Token validated, restoring session');

                // Enrich user with org roles if applicable (with timeout)
                const enrichWithTimeout = Promise.race([
                  enrichUserWithOrgRoles(parsedUser),
                  new Promise<User>((resolve) =>
                    setTimeout(() => {
                      console.warn('🔐 userStore - Enrichment timed out, using basic user data');
                      resolve(parsedUser);
                    }, 8000)
                  )
                ]);

                let enrichedUser = await enrichWithTimeout;
                enrichedUser = await ensureUserProfileUuid(enrichedUser);
                await AsyncStorage.setItem('current_user', JSON.stringify(enrichedUser));

                set({
                  selectedUser: enrichedUser,
                  isAuthenticated: true,
                  isGuestMode: guestMode === 'true',
                  authMode: (authModeStored as AuthMode) || 'real',
                });
                console.log('🔐 userStore - checkAuthStatus - Persisted session restored successfully');
                set({ isLoading: false });
                return; // Exit early - user is authenticated
              }
            } else {
              // Guest mode - no token validation needed
              console.log('🔐 userStore - checkAuthStatus - Guest mode, restoring session without token validation');

              set({
                selectedUser: parsedUser,
                isAuthenticated: true,
                isGuestMode: true,
                authMode: 'guest',
              });
              console.log('🔐 userStore - checkAuthStatus - Guest session restored successfully');
              set({ isLoading: false });
              return; // Exit early - guest user is authenticated
            }
          }
        } catch (parseError) {
          console.error('🔐 userStore - checkAuthStatus - Error parsing persisted user:', parseError);
        }
      }

      // No valid authentication found - clear any invalid data and set unauthenticated state
      console.log('🔐 userStore - checkAuthStatus - No valid authentication found, clearing data');
      await AsyncStorage.multiRemove([
        'current_user',
        'guest_mode',
        'auth_mode',
        'oauth_in_progress',
        'oauth_success_flag',
        'google_auth_user',
        'google_auth_token'
      ]);

      console.log('🔐 userStore - checkAuthStatus - Setting unauthenticated state');
      set({
        isAuthenticated: false,
        isGuestMode: false,
        selectedUser: null,
        authMode: 'guest',
        isLoading: false,
      });

    } catch (error) {
      console.error('🔐 userStore - checkAuthStatus - Error:', error);
      // On error, ensure clean unauthenticated state
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
      console.log('🔐 userStore - signOut - Starting sign out process');
      set({ isLoading: true });

      // Sign out from Firebase Auth
      try {
        const { app } = getFirebase();
        const auth = getAuth(app);
        await auth.signOut();
        console.log('🔥 Firebase - User signed out successfully');
      } catch (firebaseError) {
        console.warn('🔥 Firebase - Sign out error (non-fatal):', firebaseError);
      }

      console.log('🔐 userStore - signOut - Removing all auth data from AsyncStorage');
      await AsyncStorage.multiRemove([
        'current_user',
        'guest_mode',
        'auth_mode',
        'firebase_user_id',
        'oauth_in_progress',
        'oauth_success_flag',
        'google_auth_user',
        'google_auth_token'
      ]);

      console.log('🔐 userStore - signOut - Setting user state to null');
      set({
        selectedUser: null,
        isAuthenticated: false,
        isGuestMode: false,
        authMode: 'guest',
        isLoading: false,
        isInitialized: true, // Keep initialized flag true after sign out
      });

      console.log('🔐 userStore - signOut - Sign out completed successfully');
    } catch (error) {
      console.error('🔐 userStore - signOut - Error during sign out:', error);
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
    try {
      console.log('🔐 userStore - setGuestMode - Starting (session only)');
      set({ isLoading: true });

      // DO NOT SAVE TO AsyncStorage - session only
      console.log('🔐 userStore - setGuestMode - Setting guest mode for session only');

      // Update state for current session only
      set({
        selectedUser: null,
        authMode: 'guest',
        isGuestMode: true,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('🔐 userStore - setGuestMode - Guest mode set successfully (session only)');
    } catch (error) {
      console.error('🔐 userStore - setGuestMode - Error:', error);
      set({
        selectedUser: null,
        authMode: 'guest',
        isGuestMode: true,
        isAuthenticated: true,
        isLoading: false,
      });
    }
  },

  setDemoUser: async () => {
    // Demo mode removed – keep API for backward compatibility, but no-op
    console.log('🔐 userStore - setDemoUser called (no-op, demo removed)');
  },

  resetHomeScreen: () => {
    console.log('🏠 userStore - resetHomeScreen called');
    set((state) => ({ resetHomeScreenTrigger: state.resetHomeScreenTrigger + 1 }));
  },

  setLastHomeTabScreen: (screen: string | null) => {
    console.log('🏠 userStore - setLastHomeTabScreen called', { screen });
    set({ lastHomeTabScreen: screen });
  },

  clearLastHomeTabScreen: () => {
    console.log('🏠 userStore - clearLastHomeTabScreen called');
    set({ lastHomeTabScreen: null });
  },

  refreshUserRoles: async () => {
    const currentUser = get().selectedUser;
    if (!currentUser) {
      logger.debug('Auth', 'refreshUserRoles - No user to refresh');
      return;
    }

    try {
      logger.debug('Auth', 'refreshUserRoles - Refreshing roles', { email: currentUser.email });
      const enrichedUser = await enrichUserWithOrgRoles(currentUser);

      // Only update if roles actually changed to prevent infinite loops
      const currentRoles = JSON.stringify((currentUser.roles || []).sort((a, b) => a.localeCompare(b)));
      const newRoles = JSON.stringify((enrichedUser.roles || []).sort((a, b) => a.localeCompare(b)));

      if (currentRoles !== newRoles) {
        logger.info('Auth', 'refreshUserRoles - Roles changed', {
          email: enrichedUser.email,
          newRoles: enrichedUser.roles,
        });
        set({ selectedUser: enrichedUser });
        await AsyncStorage.setItem('current_user', JSON.stringify(enrichedUser));
      }
    } catch (error) {
      logger.error('Auth', 'refreshUserRoles - Error', { error });
    }
  },

  initialize: async () => {
    try {
      console.log('🔐 userStore - initialize - Starting initialization');

      // Check auth status
      await get().checkAuthStatus();

      // Mark as initialized after checkAuthStatus completes
      set({ isInitialized: true });

      // Setup Firebase Auth State Listener
      console.log('🔥 userStore - Setting up Firebase Auth listener');
      try {
        console.log('🔥 userStore - Getting Firebase instance');
        const firebase = getFirebase();
        if (!firebase || !firebase.app) {
          console.warn('🔥 userStore - Firebase not available, skipping Auth listener setup');
          return;
        }
        const { app } = firebase;
        console.log('🔥 userStore - Getting Auth instance');
        const auth = getAuth(app);

        onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
          const state = get();

          // Skip updates if store hasn't been initialized yet
          if (!state.isInitialized) {
            logger.debug('Auth', 'Firebase Auth State Changed - Skipping (not initialized yet)');
            return;
          }

          logger.info('Auth', 'Firebase Auth State Changed', {
            hasUser: !!firebaseUser,
            email: firebaseUser?.email,
            uid: firebaseUser?.uid,
            emailVerified: firebaseUser?.emailVerified,
          });

          if (firebaseUser) {
            // Firebase user is logged in - restore/create session
            logger.info('Auth', 'Firebase user detected, restoring session');

            try {
              // Get UUID from server using firebase_uid and google_id
              const { apiService } = await import('../src/api/api.service');

              // Extract google_id from providerData if available
              const googleProvider = firebaseUser.providerData?.find(
                (provider) => provider.providerId === 'google.com'
              );
              const googleId = googleProvider?.uid || undefined;

              logger.debug('Auth', 'Resolving user with identifiers', {
                firebase_uid: firebaseUser.uid,
                google_id: googleId,
                email: firebaseUser.email,
              });

              const resolveResponse = await apiService.resolveUserId({
                firebase_uid: firebaseUser.uid,
                google_id: googleId,
                email: firebaseUser.email || undefined
              });

              type ResolveTokens = { accessToken: string; refreshToken: string; expiresIn: number };
              const respWithUser = resolveResponse as { success?: boolean; user?: Record<string, unknown>; tokens?: ResolveTokens };
              if (!resolveResponse.success || !respWithUser.user) {
                logger.warn('Auth', 'Failed to resolve user ID from server, using fallback');
                // Fallback: try to get user by email
                if (firebaseUser.email) {
                  const userResponse = await apiService.getUserById(firebaseUser.email);
                  if (userResponse.success && userResponse.data) {
                    const serverUser = userResponse.data as ApiUserRecord;
                    let userData = mapApiUserToUser(serverUser, {
                      displayName: firebaseUser.displayName ?? undefined,
                      email: firebaseUser.email ?? undefined,
                      photoURL: firebaseUser.photoURL ?? undefined,
                    });
                    userData = await ensureUserProfileUuid(userData);

                    await AsyncStorage.setItem('current_user', JSON.stringify(userData));
                    await AsyncStorage.setItem('auth_mode', 'real');
                    await AsyncStorage.setItem('firebase_user_id', firebaseUser.uid);

                    const enrichedUser = await enrichUserWithOrgRoles(userData);
                    set({
                      selectedUser: enrichedUser,
                      isAuthenticated: true
                    });
                    logger.info('Auth', 'Firebase session restored successfully with UUID', { userId: userData.id });
                    return;
                  }
                }
                throw new Error('Failed to get user from server');
              }

              // ✅ FIX: Save JWT tokens returned by resolveUserId so that getAuthToken()
              // always sends a token whose userId matches the current user's DB UUID.
              // Without this, a stale or Firebase-UID-based token causes 403 on ownership checks.
              if (respWithUser.tokens?.accessToken) {
                await AsyncStorage.setItem('jwt_access_token', respWithUser.tokens.accessToken);
                await AsyncStorage.setItem(
                  'jwt_token_expires_at',
                  String(Date.now() + (respWithUser.tokens.expiresIn * 1000))
                );
                logger.debug('Auth', 'JWT access token refreshed from resolveUserId', { userId: respWithUser.user?.id });
              }
              if (respWithUser.tokens?.refreshToken) {
                await AsyncStorage.setItem('jwt_refresh_token', respWithUser.tokens.refreshToken);
              }

              // Use UUID from server
              const serverUser = (resolveResponse as { user: ApiUserRecord }).user;
              let userData = mapApiUserToUser(serverUser, {
                displayName: firebaseUser.displayName ?? undefined,
                email: firebaseUser.email ?? undefined,
                photoURL: firebaseUser.photoURL ?? undefined,
              });
              userData = await ensureUserProfileUuid(userData);

              // Save to AsyncStorage for persistence
              await AsyncStorage.setItem('current_user', JSON.stringify(userData));
              await AsyncStorage.setItem('auth_mode', 'real');
              await AsyncStorage.setItem('firebase_user_id', firebaseUser.uid);

              // Update store state
              const enrichedUser = await enrichUserWithOrgRoles(userData);
              set({
                selectedUser: enrichedUser,
                isAuthenticated: true,
                authMode: 'real',
                isGuestMode: false
              });
              logger.info('Auth', 'Firebase session restored successfully with UUID', { userId: userData.id });
            } catch (error) {
              logger.error('Auth', 'Failed to restore Firebase session', { error });
              // Don't set user state if we can't get UUID from server
            }
          } else {
            // No Firebase user - only clear if we had a Firebase user before
            const currentState = get();
            const firebaseUserId = await AsyncStorage.getItem('firebase_user_id');

            // Only clear if we actually had a Firebase user and we're not in guest mode
            if (firebaseUserId && currentState.authMode === 'real' && currentState.isAuthenticated) {
              logger.info('Auth', 'Firebase user logged out, clearing session');
              await AsyncStorage.multiRemove(['current_user', 'auth_mode', 'firebase_user_id']);
              set({
                selectedUser: null,
                isAuthenticated: false,
                isGuestMode: false,
                authMode: 'guest',
              });
            } else {
              logger.info('Auth', 'Firebase Auth State Changed - No user, not clearing (guest mode or no previous Firebase user)');
            }
          }
        });

        logger.info('Auth', 'Firebase Auth listener set up successfully');
      } catch (error) {
        logger.error('Auth', 'Error setting up Firebase Auth listener', { error });
      }
    } catch (error) {
      logger.error('Auth', 'Critical error during initialization', { error });
      // Ensure we still mark as initialized and set a safe state
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

// Computed selectors (for better performance)
// Uses useShallow to prevent "Maximum update depth exceeded" - avoids re-render cascade
// when returning new object references on each store update
export const useUser = () =>
  useUserStore(
    useShallow((store) => {
      const user = store.selectedUser;
      const isAdmin =
        user &&
        (user.email === 'navesarussi@gmail.com' ||
          (Array.isArray(user.roles) &&
            (user.roles.includes('admin') || user.roles.includes('super_admin'))));
      return {
        selectedUser: user,
        setSelectedUser: store.setSelectedUser,
        setSelectedUserWithMode: store.setSelectedUserWithMode,
        role: computeRole(user, store.authMode),
        setCurrentPrincipal: store.setCurrentPrincipal,
        isUserSelected: user !== null,
        isLoading: store.isLoading,
        signOut: store.signOut,
        isAuthenticated: store.isAuthenticated,
        isGuestMode: store.isGuestMode,
        isRealAuth: store.authMode === 'real',
        isAdmin: !!isAdmin,
        setGuestMode: store.setGuestMode,
        setDemoUser: store.setDemoUser,
        resetHomeScreen: store.resetHomeScreen,
        resetHomeScreenTrigger: store.resetHomeScreenTrigger,
        lastHomeTabScreen: store.lastHomeTabScreen,
        setLastHomeTabScreen: store.setLastHomeTabScreen,
        clearLastHomeTabScreen: store.clearLastHomeTabScreen,
        refreshUserRoles: store.refreshUserRoles,
      };
    })
  );

