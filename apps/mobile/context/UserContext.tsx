// File overview:
// - Purpose: Global user/session context managing auth mode (guest/demo/real), selected user, and auth persistence.
// - Reached from: Wrapped around the app in `App.tsx`; consumed via `useUser()` in many screens.
// - Provides: Methods to set user with mode, sign out, toggle guest/demo, and resetHomeScreen trigger.
// - Storage: Persists `current_user`, `guest_mode`, and `auth_mode` in AsyncStorage; clears local collections on real auth.

// TODO: CRITICAL - This context is doing too much. Split into multiple contexts:
//   - AuthContext for authentication state
//   - UserProfileContext for user data
//   - AppStateContext for app-level state
// TODO: Add proper error handling and recovery mechanisms
// TODO: Implement proper TypeScript strict typing - remove any types
// TODO: Add comprehensive state validation and sanitization
// TODO: Remove hardcoded user data and implement proper user fetching
// TODO: Add proper loading states for all async operations
// TODO: Implement proper storage encryption for sensitive data
// TODO: Add unit tests for all context methods and state changes
// TODO: Remove console.log statements and use proper logging service
// TODO: Add proper memory management and cleanup for subscriptions
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db } from '../utils/databaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { logger } from '../utils/loggerService';

// Auth mode of the current session
export type AuthMode = 'guest' | 'demo' | 'real';
// Simplified role model for the app
export type Role = 'guest' | 'user' | 'admin';

interface User {
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

interface UserContextType {
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => Promise<void>;
  setSelectedUserWithMode: (user: User | null, mode: AuthMode) => Promise<void>;
  // New simplified API
  role: Role;
  setCurrentPrincipal: (principal: { user: User | null; role: Role }) => Promise<void>;
  isUserSelected: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  isRealAuth: boolean;
  isAdmin: boolean;
  setGuestMode: () => Promise<void>;
  setDemoUser: () => Promise<void>;
  resetHomeScreen: () => void;
  resetHomeScreenTrigger: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [selectedUser, setSelectedUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('guest');
  const [resetHomeScreenTrigger, setResetHomeScreenTrigger] = useState(0);

  // Check authentication status on app start
  useEffect(() => {
    console.log('🔐 UserContext - useEffect - Starting auth check');
    checkAuthStatus();
  }, []);

  // Firebase Auth State Listener - automatically detects when user logs in/out
  useEffect(() => {
    console.log('🔥 UserContext - Setting up Firebase Auth listener');
    let unsubscribe: (() => void) | undefined;

    try {
      const { app } = getFirebase();
      const auth = getAuth(app);

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
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
            // Get UUID from server using firebase_uid
            const { API_BASE_URL } = await import('../utils/config.constants');
            const { apiService } = await import('../utils/apiService');

            const resolveResponse = await apiService.resolveUserId({
              firebase_uid: firebaseUser.uid,
              email: firebaseUser.email || undefined
            });

            // Save JWT tokens if provided
            if (resolveResponse.tokens) {
              await AsyncStorage.setItem('jwt_access_token', resolveResponse.tokens.accessToken);
              await AsyncStorage.setItem('jwt_refresh_token', resolveResponse.tokens.refreshToken);
              await AsyncStorage.setItem('jwt_token_expires_at', 
                String(Date.now() + (resolveResponse.tokens.expiresIn * 1000))
              );
              logger.debug('Auth', 'JWT tokens saved from resolve-id');
            }

            const serverUser = resolveResponse.user || resolveResponse.data;
            if (!resolveResponse.success || !serverUser) {
              logger.warn('Auth', 'Failed to resolve user ID from server, using fallback');
              // Fallback: try to get user by email
              if (firebaseUser.email) {
                const userResponse = await apiService.getUserById(firebaseUser.email);
                if (userResponse.success && userResponse.data) {
                  const fallbackServerUser = userResponse.data;
                  const userData: User = {
                    id: fallbackServerUser.id, // UUID from database
                    name: fallbackServerUser.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    email: fallbackServerUser.email || firebaseUser.email || '',
                    phone: fallbackServerUser.phone || firebaseUser.phoneNumber || '+9720000000',
                    avatar: fallbackServerUser.avatar_url || firebaseUser.photoURL || 'https://i.pravatar.cc/150?img=1',
                    bio: fallbackServerUser.bio || '',
                    karmaPoints: fallbackServerUser.karma_points || 0,
                    joinDate: fallbackServerUser.join_date || fallbackServerUser.created_at || new Date().toISOString(),
                    isActive: fallbackServerUser.is_active !== false,
                    lastActive: fallbackServerUser.last_active || new Date().toISOString(),
                    location: { city: fallbackServerUser.city || 'ישראל', country: fallbackServerUser.country || 'IL' },
                    interests: fallbackServerUser.interests || [],
                    roles: fallbackServerUser.roles || ['user'],
                    postsCount: fallbackServerUser.posts_count || 0,
                    followersCount: fallbackServerUser.followers_count || 0,
                    followingCount: fallbackServerUser.following_count || 0,
                    notifications: [],
                    settings: fallbackServerUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
                  };

                  await AsyncStorage.setItem('current_user', JSON.stringify(userData));
                  await AsyncStorage.setItem('auth_mode', 'real');
                  await AsyncStorage.setItem('firebase_user_id', firebaseUser.uid);

                  const enrichedUser = await enrichUserWithOrgRoles(userData);
                  setSelectedUserState(enrichedUser);
                  setIsAuthenticated(true);
                  setIsGuestMode(false);
                  setAuthMode('real');

                  logger.info('Auth', 'Firebase session restored successfully with UUID', { userId: userData.id });
                  return;
                }
              }
              throw new Error('Failed to get user from server');
            }

            // Use UUID from server (serverUser already defined above)
            const nowIso = new Date().toISOString();
            const userData: User = {
              id: serverUser.id, // UUID from database - this is the primary identifier
              name: serverUser.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: serverUser.email || firebaseUser.email || '',
              phone: serverUser.phone || firebaseUser.phoneNumber || '+9720000000',
              avatar: serverUser.avatar || firebaseUser.photoURL || 'https://i.pravatar.cc/150?img=1',
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

            // Update context state
            const enrichedUser = await enrichUserWithOrgRoles(userData);
            setSelectedUserState(enrichedUser);
            setIsAuthenticated(true);
            setIsGuestMode(false);
            setAuthMode('real');

            logger.info('Auth', 'Firebase session restored successfully with UUID', { userId: userData.id });
          } catch (error) {
            logger.error('Auth', 'Failed to restore Firebase session', { error });
            // Don't set user state if we can't get UUID from server
          }
        } else {
          // No Firebase user - only clear if we had a Firebase user before
          const firebaseUserId = await AsyncStorage.getItem('firebase_user_id');
          if (firebaseUserId) {
            logger.info('Auth', 'Firebase user logged out, clearing session');
            await AsyncStorage.multiRemove(['current_user', 'auth_mode', 'firebase_user_id']);
            setSelectedUserState(null);
            setIsAuthenticated(false);
            setIsGuestMode(false);
            setAuthMode('guest');
          }
        }
      });

      logger.info('Auth', 'Firebase Auth listener set up successfully');
    } catch (error) {
      logger.error('Auth', 'Error setting up Firebase Auth listener', { error });
    }

    // Cleanup function
    return () => {
      logger.debug('Auth', 'Cleaning up Firebase Auth listener');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const computeRole = (user: User | null, mode: AuthMode): Role => {
    if (mode === 'guest' || !user) return 'guest';
    const roles = Array.isArray(user?.roles) ? user!.roles : [];
    return (roles.includes('admin') || roles.includes('super_admin') || roles.includes('org_admin')) ? 'admin' : 'user';
  };

  const checkAuthStatus = async () => {
    try {
      console.log('🔐 UserContext - checkAuthStatus - Starting auth check');
      setIsLoading(true);

      // First, check for successful OAuth authentication
      console.log('🔐 UserContext - checkAuthStatus - Checking for OAuth success');
      const oauthSuccess = await AsyncStorage.getItem('oauth_success_flag');
      const userData = await AsyncStorage.getItem('google_auth_user');
      const token = await AsyncStorage.getItem('google_auth_token');

      if (oauthSuccess && userData && token) {
        try {
          console.log('🔐 UserContext - checkAuthStatus - Found OAuth success data, processing');
          const parsedUserData = JSON.parse(userData);

          // Validate the user data
          if (parsedUserData && parsedUserData.id && parsedUserData.email) {
            console.log('🔐 UserContext - checkAuthStatus - Setting authenticated user from OAuth');

            // Enrich user with org roles if applicable
            const enrichedUser = await enrichUserWithOrgRoles(parsedUserData);

            setSelectedUserState(enrichedUser);
            setIsAuthenticated(true);
            setIsGuestMode(false);
            setAuthMode('real');

            // Clean up OAuth success flags since we've processed them
            await AsyncStorage.multiRemove(['oauth_success_flag', 'google_auth_user', 'google_auth_token']);

            console.log('🔐 UserContext - checkAuthStatus - OAuth authentication restored successfully');
            return; // Exit early - user is authenticated
          } else {
            console.warn('🔐 UserContext - checkAuthStatus - Invalid OAuth user data found');
          }
        } catch (parseError) {
          console.error('🔐 UserContext - checkAuthStatus - Error parsing OAuth user data:', parseError);
        }
      }

      // Check for persistent user session
      console.log('🔐 UserContext - checkAuthStatus - Checking for persistent session');
      const persistedUser = await AsyncStorage.getItem('current_user');
      const guestMode = await AsyncStorage.getItem('guest_mode');
      const authModeStored = await AsyncStorage.getItem('auth_mode');

      if (persistedUser) {
        try {
          const parsedUser = JSON.parse(persistedUser);
          if (parsedUser && parsedUser.id) {
            console.log('🔐 UserContext - checkAuthStatus - Found persisted user, validating token');

            // Validate token before restoring session
            // Only validate if not in guest mode
            if (authModeStored !== 'guest') {
              const { apiService } = await import('../utils/apiService');
              
              // Try to get a valid auth token (this will refresh if needed)
              const authToken = await apiService.getAuthToken();
              
              if (!authToken) {
                console.warn('🔐 UserContext - checkAuthStatus - No valid token found, clearing session');
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
                console.log('🔐 UserContext - checkAuthStatus - Token validated, restoring session');
                const enrichedUser = await enrichUserWithOrgRoles(parsedUser);
                setSelectedUserState(enrichedUser);
                setIsAuthenticated(true);
                setIsGuestMode(guestMode === 'true');
                setAuthMode((authModeStored as AuthMode) || 'real');
                console.log('🔐 UserContext - checkAuthStatus - Persisted session restored successfully');
                return; // Exit early - user is authenticated
              }
            } else {
              // Guest mode - no token validation needed
              console.log('🔐 UserContext - checkAuthStatus - Guest mode, restoring session without token validation');
              setSelectedUserState(parsedUser);
              setIsAuthenticated(true);
              setIsGuestMode(true);
              setAuthMode('guest');
              console.log('🔐 UserContext - checkAuthStatus - Guest session restored successfully');
              return; // Exit early - guest user is authenticated
            }
          }
        } catch (parseError) {
          console.error('🔐 UserContext - checkAuthStatus - Error parsing persisted user:', parseError);
        }
      }

      // No valid authentication found - clear any invalid data and set unauthenticated state
      console.log('🔐 UserContext - checkAuthStatus - No valid authentication found, clearing data');
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

      console.log('🔐 UserContext - checkAuthStatus - Setting unauthenticated state');
      setIsAuthenticated(false);
      setIsGuestMode(false);
      setSelectedUserState(null);
      setAuthMode('guest');

    } catch (error) {
      console.error('🔐 UserContext - checkAuthStatus - Error:', error);
      // On error, ensure clean unauthenticated state
      setIsAuthenticated(false);
      setIsGuestMode(false);
      setSelectedUserState(null);
      setAuthMode('guest');
    } finally {
      console.log('🔐 UserContext - checkAuthStatus - Auth check completed');
      setIsLoading(false);
    }
  };

  // New simplified setter: sets current principal using role model
  const setCurrentPrincipal = async (principal: { user: User | null; role: Role }) => {
    try {
      console.log('🔐 UserContext - setCurrentPrincipal:', { user: principal.user?.name || 'null', role: principal.role });
      if (principal.role === 'guest' || !principal.user) {
        setSelectedUserState(null);
        setIsAuthenticated(true);
        setIsGuestMode(true);
        setAuthMode('guest');
        return;
      }
      const enriched = await enrichUserWithOrgRoles(principal.user);
      // Treat any non-guest role as real auth
      try {
        const { DatabaseService } = await import('../utils/databaseService');
        await DatabaseService.clearLocalCollections();
      } catch (e) {
        console.log('⚠️ Failed to clear local collections on real auth (non-fatal):', e);
      }
      setSelectedUserState(enriched);
      setIsAuthenticated(true);
      setIsGuestMode(false);
      setAuthMode('real');
    } catch (error) {
      console.error('Error in setCurrentPrincipal:', error);
      // Fallbacks
      if (principal.role === 'guest' || !principal.user) {
        setSelectedUserState(null);
        setIsAuthenticated(true);
        setIsGuestMode(true);
        setAuthMode('guest');
      } else {
        setSelectedUserState(principal.user);
        setIsAuthenticated(true);
        setIsGuestMode(false);
        setAuthMode('real');
      }
    }
  };

  const setSelectedUserWithMode = async (user: User | null, mode: AuthMode) => {
    try {
      console.log('🔐 UserContext - setSelectedUserWithMode:', { user: user?.name || 'null', mode });
      // Bridge to new API
      const role = computeRole(user, mode);
      await setCurrentPrincipal({ user, role });
      console.log('🔐 UserContext - setSelectedUserWithMode - bridged to setCurrentPrincipal');
    } catch (error) {
      console.error('Error setting user:', error);
      const role = computeRole(user, mode);
      await setCurrentPrincipal({ user, role });
    }
  };

  // Backward compatible API
  const setSelectedUser = async (user: User | null) => setSelectedUserWithMode(user, user ? 'real' as const : 'guest');

  /**
   * Enriches a user object with organization roles if there is an approved org application
   * keyed by the user's email (partition key in DB for org applications).
   */
  const enrichUserWithOrgRoles = async (user: User): Promise<User> => {
    try {
      const emailKey = (user.email || '').toLowerCase();
      if (!emailKey) return user;

      // Super admin email - hardcoded for main admin
      const SUPER_ADMINS = ['navesarussi@gmail.com', 'karmacommunity2.0@gmail.com'];
      const isSuperAdmin = SUPER_ADMINS.includes(emailKey);

      // Grant admin role by env config (comma-separated emails)
      const adminEmailsEnv = (process.env.EXPO_PUBLIC_ADMIN_EMAILS || '').toLowerCase();
      const adminEmails = adminEmailsEnv
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const withAdmin = adminEmails.includes(emailKey) || isSuperAdmin;

      const applications = await db.listOrgApplications(emailKey);
      const approved = (applications as any[]).find((a) => a.status === 'approved');

      if (approved || withAdmin) {
        // Super admin gets super_admin role, others get admin
        const adminRole = isSuperAdmin ? 'super_admin' : 'admin';
        const extraRoles = [
          approved ? 'org_admin' : null,
          withAdmin ? adminRole : null
        ].filter(Boolean) as string[];
        const roles = Array.isArray(user.roles)
          ? Array.from(new Set([...user.roles, ...extraRoles]))
          : extraRoles;
        return { ...user, roles, orgApplicationId: approved?.id, orgName: approved?.orgName };
      }
      return user;
    } catch (err) {
      console.log('🔐 UserContext - enrichUserWithOrgRoles - skipped (no backend or no data)', err);
      return user;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 UserContext - signOut - Starting sign out process');
      setIsLoading(true);

      // Sign out from Firebase Auth
      try {
        const { app } = getFirebase();
        const auth = getAuth(app);
        await auth.signOut();
        console.log('🔥 Firebase - User signed out successfully');
      } catch (firebaseError) {
        console.warn('🔥 Firebase - Sign out error (non-fatal):', firebaseError);
      }

      console.log('🔐 UserContext - signOut - Removing all auth data from AsyncStorage');
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

      console.log('🔐 UserContext - signOut - Setting user state to null');
      setSelectedUserState(null);

      console.log('🔐 UserContext - signOut - Setting isAuthenticated to false');
      setIsAuthenticated(false);

      console.log('🔐 UserContext - signOut - Setting isGuestMode to false');
      setIsGuestMode(false);

      console.log('🔐 UserContext - signOut - Setting authMode to guest');
      setAuthMode('guest');

      console.log('🔐 UserContext - signOut - Sign out completed successfully');
    } catch (error) {
      console.error('🔐 UserContext - signOut - Error during sign out:', error);
      setSelectedUserState(null);
      setIsAuthenticated(false);
      setIsGuestMode(false);
      setAuthMode('guest');
    } finally {
      console.log('🔐 UserContext - signOut - Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const setGuestMode = async () => {
    try {
      console.log('🔐 UserContext - setGuestMode - Starting (session only)');
      setIsLoading(true);

      // DO NOT SAVE TO AsyncStorage - session only
      console.log('🔐 UserContext - setGuestMode - Setting guest mode for session only');

      // Update state for current session only
      setSelectedUserState(null);
      setAuthMode('guest');
      setIsGuestMode(true);
      setIsAuthenticated(true);

      console.log('🔐 UserContext - setGuestMode - Guest mode set successfully (session only)');
    } catch (error) {
      console.error('🔐 UserContext - setGuestMode - Error:', error);
      setSelectedUserState(null);
      setAuthMode('guest');
      setIsGuestMode(true);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
      console.log('🔐 UserContext - setGuestMode - Completed');
    }
  };

  const setDemoUser = async () => {
    // Demo mode removed – keep API for backward compatibility, but no-op
    console.log('🔐 UserContext - setDemoUser called (no-op, demo removed)');
  };

  const resetHomeScreen = () => {
    console.log('🏠 UserContext - resetHomeScreen called');
    setResetHomeScreenTrigger(prev => prev + 1);
  };

  /**
   * Checks if the current user has admin privileges
   * Returns true if user has 'admin' or 'super_admin' role
   */
  const isAdmin = (): boolean => {
    if (!selectedUser || !selectedUser.roles) return false;
    const roles = Array.isArray(selectedUser.roles) ? selectedUser.roles : [];
    return roles.includes('admin') || roles.includes('super_admin');
  };

  const value: UserContextType = {
    selectedUser,
    setSelectedUser,
    setSelectedUserWithMode,
    role: computeRole(selectedUser, authMode),
    setCurrentPrincipal,
    isUserSelected: selectedUser !== null,
    isLoading,
    signOut,
    isAuthenticated,
    isGuestMode,
    isRealAuth: authMode === 'real',
    isAdmin: isAdmin(),
    setGuestMode,
    setDemoUser,
    resetHomeScreen,
    resetHomeScreenTrigger,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export type { User }; 