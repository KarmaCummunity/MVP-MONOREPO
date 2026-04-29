// File overview:
// - Purpose: Global user/session state management using Zustand (replaces UserContext)
// - Reached from: Any component via `useUserStore()` hook, or services via direct import
// - Provides: Methods to set user with mode, sign out, toggle guest/demo, and resetHomeScreen trigger
// - Storage: Persists `current_user`, `guest_mode`, and `auth_mode` in AsyncStorage; clears local collections on real auth
// - Advantage: Can be used outside React components (in services) without circular dependencies

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { logger } from '../utils/loggerService';

// Auth mode of the current session
const UserStore_LOG = 'userStore';
export type AuthMode = 'guest' | 'demo' | 'real';
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
  isInitialized: boolean; // Flag to track if store has been initialized
  lastHomeTabScreen: string | null; // Last screen visited in HomeTabStack before switching tabs

  // Navigation–store contract: `resetHomeScreen()` increments `resetHomeScreenTrigger`. Consumer: `HomeTabStack`
  // (useEffect) pops the Home nested stack to `HomeMain` via the tab parent. Producer: `BottomNavigator` on Home
  // tab re-press. Do not add other consumers without revisiting detach/tab focus behavior.

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

/** Operator workspace (Shiduchim Tov); admins/super_admins have implicit access per SRS §2.14 */
export const userHasOperatorAccess = (user: User | null): boolean => {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return (
    roles.includes('operator') ||
    roles.includes('admin') ||
    roles.includes('super_admin')
  );
};


const enrichUserWithOrgRoles = async (user: User): Promise<User> => {
  try {
    logger.debug(
      UserStore_LOG,
      `🔐 enrichUserWithOrgRoles - Starting enrichment for: ${user.email}`,
      undefined,
      { periodic: true },
    );
    const emailKey = (user.email || '').toLowerCase();
    if (!emailKey) {
      logger.debug(UserStore_LOG, '🔐 enrichUserWithOrgRoles - No email, returning user as-is');
      return user;
    }

    const SUPER_ADMINS = ['navesarussi@gmail.com', 'karmacommunity2.0@gmail.com'];
    const isSuperAdmin = SUPER_ADMINS.includes(emailKey);

    // Import services locally
    const { apiService } = await import('../utils/apiService');
    const { db } = await import('../utils/databaseService');

    // Run fetches in parallel with independent timeouts
    const [userFetchResult, applicationsFetchResult] = await Promise.allSettled([
      // 1. Fetch user roles from DB
      (async () => {
        try {
          const response = await Promise.race([
            apiService.getUserById(user.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching user data')), 4000))
          ]) as any;

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
          ]) as any[];
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
      logger.debug(UserStore_LOG, '🔐 enrichUserWithOrgRoles - Fetched roles from DB:', { dbRoles }, { periodic: true });
    }

    // Process Org Applications
    let approved: any = undefined;
    if (applicationsFetchResult.status === 'fulfilled' && Array.isArray(applicationsFetchResult.value)) {
      approved = applicationsFetchResult.value.find((a) => a.status === 'approved');
      logger.debug(UserStore_LOG, '🔐 enrichUserWithOrgRoles - Found approved org:', { approved: !!approved }, { periodic: true });
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

    logger.debug(UserStore_LOG, '🔐 enrichUserWithOrgRoles - Final roles:', { finalRoles }, { periodic: true });
    return {
      ...user,
      roles: finalRoles,
      orgApplicationId: approved?.id,
      orgName: approved?.orgName
    };
  } catch (err) {
    logger.debug(UserStore_LOG, '🔐 userStore - enrichUserWithOrgRoles - skipped (no backend or no data)', err);
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
      logger.debug(UserStore_LOG, '🔐 userStore - setCurrentPrincipal:', { user: principal.user?.name || 'null', role: principal.role });
      if (principal.role === 'guest' || !principal.user) {
        set({
          selectedUser: null,
          isAuthenticated: true,
          isGuestMode: true,
          authMode: 'guest',
        });
        return;
      }
      const enriched = await enrichUserWithOrgRoles(principal.user);
      // Treat any non-guest role as real auth
      try {
        const { DatabaseService } = await import('../utils/databaseService');
        await DatabaseService.clearLocalCollections();
      } catch (e) {
        logger.debug(UserStore_LOG, '⚠️ Failed to clear local collections on real auth (non-fatal):', e);
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
        set({
          selectedUser: principal.user,
          isAuthenticated: true,
          isGuestMode: false,
          authMode: 'real',
        });
      }
    }
  },

  setSelectedUserWithMode: async (user: User | null, mode: AuthMode) => {
    try {
      logger.debug(UserStore_LOG, '🔐 userStore - setSelectedUserWithMode:', { user: user?.name || 'null', mode });
      const role = computeRole(user, mode);
      await get().setCurrentPrincipal({ user, role });
      logger.debug(UserStore_LOG, '🔐 userStore - setSelectedUserWithMode - completed');
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
      logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Starting auth check');
      set({ isLoading: true });

      // --- One-time migration: move legacy jwt_access_token to tokenManager ---
      try {
        const legacyToken = await AsyncStorage.getItem('jwt_access_token');
        const legacyRefresh = await AsyncStorage.getItem('jwt_refresh_token');
        if (legacyToken) {
          const { tokenManager } = await import('../auth/services/tokenManager');
          const existing = await tokenManager.getAccessToken();
          if (!existing) {
            logger.debug(UserStore_LOG, '🔄 Migrating legacy JWT tokens to tokenManager...');
            await tokenManager.setTokens(legacyToken, legacyRefresh || '');
          }
          // Clean up legacy keys after migration
          await AsyncStorage.multiRemove(['jwt_access_token', 'jwt_refresh_token', 'jwt_token_expires_at']);
        }
      } catch (migrationError) {
        console.warn('Token migration error (non-fatal):', migrationError);
      }
      // -----------------------------------------------------------------------

      // First, check for successful OAuth authentication
      logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Checking for OAuth success');
      const oauthSuccess = await AsyncStorage.getItem('oauth_success_flag');
      const userData = await AsyncStorage.getItem('google_auth_user');
      const token = await AsyncStorage.getItem('google_auth_token');

      if (oauthSuccess && userData && token) {
        try {
          logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Found OAuth success data, processing');
          const parsedUserData = JSON.parse(userData);

          // Validate the user data
          if (parsedUserData && parsedUserData.id && parsedUserData.email) {
            logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Setting authenticated user from OAuth');

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

            const enrichedUser = await enrichWithTimeout;

            set({
              selectedUser: enrichedUser,
              isAuthenticated: true,
              isGuestMode: false,
              authMode: 'real',
            });

            // Clean up OAuth success flags since we've processed them
            await AsyncStorage.multiRemove(['oauth_success_flag', 'google_auth_user', 'google_auth_token']);

            logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - OAuth authentication restored successfully');
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
      logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Checking for persistent session');
      const persistedUser = await AsyncStorage.getItem('current_user');
      const guestMode = await AsyncStorage.getItem('guest_mode');
      const authModeStored = await AsyncStorage.getItem('auth_mode');

      if (persistedUser) {
        try {
          const parsedUser = JSON.parse(persistedUser);
          if (parsedUser && parsedUser.id) {
            logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Found persisted user, validating token');

            // Validate token before restoring session
            // Only validate if not in guest mode
            if (authModeStored !== 'guest') {
              const { apiService } = await import('../utils/apiService');

              // Try to get a valid auth token (this will refresh if needed)
              const authToken = await apiService.getAuthToken();

              if (!authToken) {
                console.warn('🔐 userStore - checkAuthStatus - No valid token found, clearing session');
                // Token validation failed, clear session — use tokenManager as SSOT
                const { tokenManager } = await import('../auth/services/tokenManager');
                await tokenManager.clearTokens();
                await AsyncStorage.multiRemove([
                  'current_user',
                  'guest_mode',
                  'auth_mode',
                  'oauth_in_progress',
                  'oauth_success_flag',
                  'google_auth_user',
                  'google_auth_token',
                ]);
                // Continue to unauthenticated state below
              } else {
                // Token is valid, proceed with session restoration
                logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Token validated, restoring session');

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

                const enrichedUser = await enrichWithTimeout;

                set({
                  selectedUser: enrichedUser,
                  isAuthenticated: true,
                  isGuestMode: guestMode === 'true',
                  authMode: (authModeStored as AuthMode) || 'real',
                });
                logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Persisted session restored successfully');
                set({ isLoading: false });
                return; // Exit early - user is authenticated
              }
            } else {
              // Guest mode - no token validation needed
              logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Guest mode, restoring session without token validation');

              set({
                selectedUser: parsedUser,
                isAuthenticated: true,
                isGuestMode: true,
                authMode: 'guest',
              });
              logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Guest session restored successfully');
              set({ isLoading: false });
              return; // Exit early - guest user is authenticated
            }
          }
        } catch (parseError) {
          console.error('🔐 userStore - checkAuthStatus - Error parsing persisted user:', parseError);
        }
      }

      // No valid authentication found - clear any invalid data and set unauthenticated state
      logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - No valid authentication found, clearing data');
      await AsyncStorage.multiRemove([
        'current_user',
        'guest_mode',
        'auth_mode',
        'oauth_in_progress',
        'oauth_success_flag',
        'google_auth_user',
        'google_auth_token'
      ]);

      logger.debug(UserStore_LOG, '🔐 userStore - checkAuthStatus - Setting unauthenticated state');
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
      logger.debug(UserStore_LOG, '🔐 userStore - signOut - Starting sign out process');
      set({ isLoading: true });

      // Sign out from Firebase Auth
      try {
        const { app } = getFirebase();
        const auth = getAuth(app);
        await auth.signOut();
        logger.debug(UserStore_LOG, '🔥 Firebase - User signed out successfully');
      } catch (firebaseError) {
        console.warn('🔥 Firebase - Sign out error (non-fatal):', firebaseError);
      }

      logger.debug(UserStore_LOG, '🔐 userStore - signOut - Removing all auth data');
      // Clear JWT tokens via tokenManager (SSOT)
      try {
        const { tokenManager } = await import('../auth/services/tokenManager');
        await tokenManager.clearTokens();
      } catch (e) {
        console.warn('Failed to clear tokens from tokenManager:', e);
      }
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

      logger.debug(UserStore_LOG, '🔐 userStore - signOut - Setting user state to null');
      set({
        selectedUser: null,
        isAuthenticated: false,
        isGuestMode: false,
        authMode: 'guest',
        isLoading: false,
        isInitialized: true, // Keep initialized flag true after sign out
      });

      logger.debug(UserStore_LOG, '🔐 userStore - signOut - Sign out completed successfully');
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
      logger.debug(UserStore_LOG, '🔐 userStore - setGuestMode - Starting (session only)');
      set({ isLoading: true });

      // DO NOT SAVE TO AsyncStorage - session only
      logger.debug(UserStore_LOG, '🔐 userStore - setGuestMode - Setting guest mode for session only');

      // Update state for current session only
      set({
        selectedUser: null,
        authMode: 'guest',
        isGuestMode: true,
        isAuthenticated: true,
        isLoading: false,
      });

      logger.debug(UserStore_LOG, '🔐 userStore - setGuestMode - Guest mode set successfully (session only)');
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
    logger.debug(UserStore_LOG, '🔐 userStore - setDemoUser called (no-op, demo removed)');
  },

  resetHomeScreen: () => {
    logger.debug(UserStore_LOG, '🏠 userStore - resetHomeScreen called');
    set((state) => ({ resetHomeScreenTrigger: state.resetHomeScreenTrigger + 1 }));
  },

  setLastHomeTabScreen: (screen: string | null) => {
    logger.debug(UserStore_LOG, '🏠 userStore - setLastHomeTabScreen called', { screen });
    set({ lastHomeTabScreen: screen });
  },

  clearLastHomeTabScreen: () => {
    logger.debug(UserStore_LOG, '🏠 userStore - clearLastHomeTabScreen called');
    set({ lastHomeTabScreen: null });
  },

  refreshUserRoles: async () => {
    const currentUser = get().selectedUser;
    if (!currentUser) {
      logger.debug(UserStore_LOG, '🔐 userStore - refreshUserRoles - No user to refresh');
      return;
    }

    try {
      logger.debug(UserStore_LOG, '🔐 userStore - refreshUserRoles - Refreshing roles for user:', { email: currentUser.email }, { periodic: true });
      const enrichedUser = await enrichUserWithOrgRoles(currentUser);

      // Only update if roles actually changed to prevent infinite loops
      const currentRoles = JSON.stringify((currentUser.roles || []).sort((a, b) => a.localeCompare(b)));
      const newRoles = JSON.stringify((enrichedUser.roles || []).sort((a, b) => a.localeCompare(b)));

      if (currentRoles !== newRoles) {
        logger.debug(UserStore_LOG, '🔐 userStore - refreshUserRoles - Roles changed!', {
          email: enrichedUser.email,
          oldRoles: currentUser.roles,
          newRoles: enrichedUser.roles
        });

        set({ selectedUser: enrichedUser });
        await AsyncStorage.setItem('current_user', JSON.stringify(enrichedUser));
      }
    } catch (error) {
      console.error('🔐 userStore - refreshUserRoles - Error:', error);
    }
  },

  initialize: async () => {
    try {
      logger.debug(UserStore_LOG, '🔐 userStore - initialize - Starting initialization');

      // Check auth status
      await get().checkAuthStatus();

      // Mark as initialized after checkAuthStatus completes
      set({ isInitialized: true });

      // Setup Firebase Auth State Listener
      logger.debug(UserStore_LOG, '🔥 userStore - Setting up Firebase Auth listener');
      try {
        logger.debug(UserStore_LOG, '🔥 userStore - Getting Firebase instance');
        const firebase = getFirebase();
        if (!firebase || !firebase.app) {
          console.warn('🔥 userStore - Firebase not available, skipping Auth listener setup');
          return;
        }
        const { app } = firebase;
        logger.debug(UserStore_LOG, '🔥 userStore - Getting Auth instance');
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
              // Get UUID and JWT tokens from server using firebase_uid and google_id
              const { apiService } = await import('../utils/apiService');
              const { tokenManager } = await import('../auth/services/tokenManager');

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

              if (!resolveResponse.success || !(resolveResponse as any).user) {
                logger.warn('Auth', 'Failed to resolve user ID from server, using fallback');
                // Fallback: try to get user by email
                if (firebaseUser.email) {
                  const userResponse = await apiService.getUserById(firebaseUser.email);
                  if (userResponse.success && userResponse.data) {
                    const serverUser = userResponse.data;
                    const nowIso = new Date().toISOString();
                    const userData: User = {
                      id: serverUser.id, // UUID from database
                      name: serverUser.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                      email: serverUser.email || firebaseUser.email || '',
                      phone: serverUser.phone || firebaseUser.phoneNumber || '+9720000000',
                      avatar: serverUser.avatar_url || firebaseUser.photoURL || 'https://i.pravatar.cc/150?img=1',
                      bio: serverUser.bio || '',
                      karmaPoints: serverUser.karma_points || 0,
                      joinDate: serverUser.join_date || serverUser.created_at || nowIso,
                      isActive: serverUser.is_active !== false,
                      lastActive: serverUser.last_active || nowIso,
                      location: { city: serverUser.city || 'ישראל', country: serverUser.country || 'IL' },
                      interests: serverUser.interests || [],
                      roles: serverUser.roles || ['user'],
                      postsCount: serverUser.posts_count || 0,
                      followersCount: serverUser.followers_count || 0,
                      followingCount: serverUser.following_count || 0,
                      notifications: [],
                      settings: serverUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
                    };

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

              // We used to skip update if ID matched, but this prevents fresh data (like roles/avatar) 
              // from being applied on startup if the user is already cached.
              // Removing the check ensures we always sync with server.

              // Use UUID from server
              const serverUser = (resolveResponse as any).user;
              const nowIso = new Date().toISOString();
              const userData: User = {
                id: serverUser.id, // UUID from database - this is the primary identifier
                name: serverUser.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                email: serverUser.email || firebaseUser.email || '',
                phone: serverUser.phone || firebaseUser.phoneNumber || '+9720000000',
                avatar: serverUser.avatar_url || serverUser.avatar || firebaseUser.photoURL || 'https://i.pravatar.cc/150?img=1',
                bio: serverUser.bio || '',
                karmaPoints: serverUser.karmaPoints || 0,
                joinDate: serverUser.createdAt || serverUser.joinDate || nowIso,
                isActive: serverUser.isActive !== false,
                lastActive: serverUser.lastActive || nowIso,
                location: serverUser.location || { city: 'ישראל', country: 'IL' },
                interests: serverUser.interests || [],
                roles: serverUser.roles || ['user'],
                postsCount: serverUser.postsCount || 0,
                followersCount: serverUser.followersCount || 0,
                followingCount: serverUser.followingCount || 0,
                notifications: [],
                settings: serverUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
              };

              // Save to AsyncStorage for persistence
              await AsyncStorage.setItem('current_user', JSON.stringify(userData));
              await AsyncStorage.setItem('auth_mode', 'real');
              await AsyncStorage.setItem('firebase_user_id', firebaseUser.uid);

              // Save JWT tokens to tokenManager (SSOT)
              if (resolveResponse.tokens) {
                logger.info('Auth', 'Saving fresh JWT tokens to tokenManager');
                await tokenManager.setTokens(
                  resolveResponse.tokens.accessToken,
                  resolveResponse.tokens.refreshToken
                );
              }

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
export const useUser = () => {
  const store = useUserStore();
  return {
    selectedUser: store.selectedUser,
    setSelectedUser: store.setSelectedUser,
    setSelectedUserWithMode: store.setSelectedUserWithMode,
    role: computeRole(store.selectedUser, store.authMode),
    setCurrentPrincipal: store.setCurrentPrincipal,
    isUserSelected: store.selectedUser !== null,
    isLoading: store.isLoading,
    signOut: store.signOut,
    isAuthenticated: store.isAuthenticated,
    isGuestMode: store.isGuestMode,
    isRealAuth: store.authMode === 'real',
    isAdmin: (() => {
      const user = store.selectedUser;
      if (!user) return false;
      // Super admin email check (fallback if roles not updated in DB)
      if (user.email === 'navesarussi@gmail.com') return true;
      const roles = Array.isArray(user.roles) ? user.roles : [];
      return (
        roles.includes('admin') ||
        roles.includes('super_admin') ||
        roles.includes('org_admin')
      );
    })(),
    isOperator: userHasOperatorAccess(store.selectedUser),
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

