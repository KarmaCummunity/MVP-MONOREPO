/**
 * MainNavigator
 *
 * Root stack navigator. Sits directly inside <NavigationContainer> (App.tsx) and
 * owns the top-level auth routing decision:
 *
 *   Authenticated / Guest  →  HomeStack (BottomNavigator + protected screens)
 *   Unauthenticated + web site-mode  →  LandingSiteScreen
 *   Unauthenticated + app mode       →  LoginScreen
 *
 * ─── IMPORTANT: NO LOADING GATE HERE ───────────────────────────────────────────
 * This component must NEVER replace the navigator tree with a loading spinner.
 * Doing so unmounts all screen components, wiping navigation state and causing the
 * Home tab (initial route) to flash white when the nav remounts.
 * Loading states from the user store (e.g. Firebase token refresh, role check) are
 * transient background operations — they should not affect what the user sees.
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * Stack key strategy
 * ──────────────────
 * The Stack.Navigator receives a `key` derived from (mode, auth-branch). Changing
 * the key fully resets the navigator state, which is intentional when the user
 * crosses a major boundary (logs in, logs out, switches web mode).  It must NOT
 * change on transient loading states — therefore `isLoading` is intentionally
 * excluded from the key.
 *
 * Data flow
 * ─────────
 *   App.tsx → NavigationContainer → MainNavigator → BottomNavigator → HomeTabStack …
 *                                               └──→ (protected modal screens)
 *
 * Google OAuth callback
 * ─────────────────────
 * When the backend-initiated OAuth flow completes, the backend redirects the
 * browser back to the original app URL with a `google_auth_data` query parameter
 * containing a base64url-encoded JSON payload:
 *   { accessToken, refreshToken, expiresIn, refreshExpiresIn, user: PublicUser }
 *
 * A `useEffect` on mount reads this parameter, stores tokens, maps the server's
 * PublicUser shape to the store's User shape (filling in sensible defaults for
 * fields the server does not return), then calls `setSelectedUserWithMode`.
 */

import React, { useEffect, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { getAuth, getRedirectResult, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { GoogleAuthService, SecureAuthUser } from '../google_auth/GoogleAuthService';

import BottomNavigator from './BottomNavigator';
import WebViewScreen from '../screens/WebViewScreen';
import PostsReelsScreenWrapper from '../components/PostsReelsScreenWrapper';
import BookmarksScreen from '../screens/BookmarksScreen';
import FollowersScreen from '../screens/FollowersScreen';
import DiscoverPeopleScreen from '../screens/DiscoverPeopleScreen';
import LoginScreen from '../screens/LoginScreen';
import NewChatScreen from '../screens/NewChatScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import SettingsScreen from '../topBarScreens/SettingsScreen';
import ChatListScreen from '../topBarScreens/ChatListScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AboutKarmaCommunityScreen from '../topBarScreens/AboutKarmaCommunityScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import LandingSiteScreen from '../screens/Landing/LandingSiteScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import TopBarNavigator from './TopBarNavigator';

import { useUser, User } from '../stores/userStore';
import { useWebMode } from '../stores/webModeStore';
import { logger } from '../utils/loggerService';
import { RootStackParamList } from '../globals/types';
import { computeMainNavigatorStackKey } from './mainNavigatorStackKey';

const Stack = createStackNavigator<RootStackParamList>();

// ─── Type helpers ────────────────────────────────────────────────────────────

/**
 * Shape returned by the backend's `POST /auth/google` (PublicUser).
 * Only the fields the backend actually sends are listed here.
 */
interface BackendPublicUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  roles?: string[];
  settings?: {
    language?: string;
    darkMode?: boolean;
    notificationsEnabled?: boolean;
    [key: string]: unknown;
  };
  createdAt?: string;
  lastActive?: string;
}

/**
 * Shape of the payload carried in the `google_auth_data` URL query parameter
 * after the backend-initiated OAuth callback completes.
 */
interface GoogleAuthCallbackPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: BackendPublicUser;
}

/**
 * Map the server's lean PublicUser to the store's full User shape.
 * The backend only returns fields it stores; the store requires several
 * additional fields — default values are filled in here.
 */
function backendUserToStoreUser(pub: BackendPublicUser): User {
  const nowIso = new Date().toISOString();
  return {
    id: pub.id,
    name: pub.name || pub.email.split('@')[0],
    email: pub.email,
    phone: '',
    avatar: pub.avatar || 'https://i.pravatar.cc/150?img=1',
    bio: '',
    karmaPoints: 0,
    joinDate: pub.createdAt || nowIso,
    isActive: true,
    lastActive: pub.lastActive || nowIso,
    location: { city: '', country: '' },
    interests: [],
    roles: pub.roles || ['user'],
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    notifications: [],
    settings: {
      language: pub.settings?.language || 'he',
      darkMode: pub.settings?.darkMode ?? false,
      notificationsEnabled: pub.settings?.notificationsEnabled ?? true,
    },
  };
}

/**
 * Map GoogleAuthService's SecureAuthUser to the store's User shape.
 * Used when the Firebase redirect flow produces a result (legacy path kept
 * as a fallback while we transition fully to the backend-initiated flow).
 */
function secureAuthUserToStoreUser(src: SecureAuthUser): User {
  const nowIso = new Date().toISOString();
  return {
    id: src.id,
    name: src.name,
    email: src.email,
    phone: '',
    avatar: src.avatar || 'https://i.pravatar.cc/150?img=1',
    bio: '',
    karmaPoints: 0,
    joinDate: src.metadata?.accountCreatedAt || nowIso,
    isActive: true,
    lastActive: src.metadata?.lastLoginAt || nowIso,
    location: { city: '', country: '' },
    interests: [],
    roles: src.roles || ['user'],
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    notifications: [],
    settings: {
      language: src.settings?.language || 'he',
      darkMode: src.settings?.darkMode ?? false,
      notificationsEnabled: src.settings?.notificationsEnabled ?? true,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MainNavigator() {
  // ─── Store subscriptions ────────────────────────────────────────────────────
  // `isLoading` is read for logging only. It must not gate rendering (see header).
  const { selectedUser, isLoading, isGuestMode, isAuthenticated, setSelectedUserWithMode } = useUser();
  const { mode } = useWebMode();
  const { t } = useTranslation(['common', 'profile']);

  // ─── Backend-initiated OAuth callback handler ────────────────────────────────
  // After the backend completes the Google OAuth dance it redirects the browser
  // back to the original app URL with `?google_auth_data=<base64url JSON>`.
  // We pick that up here, store the JWT tokens, map the user, and update the
  // store — all without involving Firebase's domain-authorization check.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const rawData = params.get('google_auth_data');
    const authError = params.get('google_auth_error');

    // Clean up URL params so they don't persist across refreshes
    if (rawData || authError) {
      params.delete('google_auth_data');
      params.delete('google_auth_error');
      const newSearch = params.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }

    if (authError) {
      logger.warn('MainNavigator', 'Google OAuth callback returned error', { authError });
      Alert.alert(
        'שגיאת התחברות',
        'ההתחברות דרך גוגל נכשלה. נסה שוב מאוחר יותר.',
      );
      return;
    }

    if (!rawData) return;

    let cancelled = false;

    (async () => {
      try {
        const payload = JSON.parse(
          Buffer.from(rawData, 'base64').toString('utf8'),
        ) as GoogleAuthCallbackPayload;

        if (cancelled) return;

        if (!payload?.user?.id || !payload?.user?.email) {
          throw new Error('Incomplete user payload in google_auth_data');
        }

        // Store JWT tokens using the same keys that tokenManager / GoogleAuthService
        // use, so checkAuthStatus and token-refresh logic work on the next cold start.
        const { tokenManager } = await import('../auth/services/tokenManager');
        await tokenManager.setTokens(payload.accessToken, payload.refreshToken);

        if (cancelled) return;

        const storeUser = backendUserToStoreUser(payload.user);
        await setSelectedUserWithMode(storeUser, 'real');

        logger.info('MainNavigator', 'Google OAuth callback: user authenticated', {
          userId: storeUser.id,
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        logger.error('MainNavigator', 'Failed to process google_auth_data', { message });
        Alert.alert(
          'שגיאת התחברות',
          'לא ניתן לעבד את תגובת גוגל. נסה שוב.',
        );
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // ─── Firebase redirect-result handler (legacy fallback) ──────────────────────
  // Kept as a fallback for environments where the backend-initiated flow is not
  // yet wired up (e.g. native builds that use Expo Auth Session).
  // On Replit preview domains, getRedirectResult will return null because
  // signInWithRedirect is no longer called — this effect exits cleanly.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;

    (async () => {
      try {
        const { app } = getFirebase();
        const auth = getAuth(app);
        const result = await getRedirectResult(auth);

        if (cancelled || !result?.user) return;

        const firebaseUser = result.user;
        logger.info('MainNavigator', 'Firebase redirect sign-in succeeded (legacy path)', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });

        let idToken: string;
        try {
          idToken = await firebaseUser.getIdToken();
        } catch (tokenErr: unknown) {
          const message = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
          logger.error('MainNavigator', 'Failed to retrieve Firebase ID token', { message });
          Alert.alert('שגיאת התחברות', 'לא ניתן לאחזר את אסימון ההזדהות. נסה שוב.');
          return;
        }

        const authService = GoogleAuthService.getInstance();
        const authResult = await authService.authenticateWithGoogle(idToken);

        if (cancelled) return;

        if (!authResult.success || !authResult.data) {
          logger.warn('MainNavigator', 'Backend Google auth failed (legacy path)', {
            error: authResult.error,
            details: authResult.details,
          });
          // Sign out of Firebase so the failed credential is not cached
          try { await firebaseSignOut(auth); } catch { /* best effort */ }
          Alert.alert(
            'שגיאת התחברות',
            'ההתחברות דרך גוגל נכשלה. ייתכן שהשרת אינו זמין כרגע — נסה שוב מאוחר יותר.',
          );
          return;
        }

        const storeUser = secureAuthUserToStoreUser(authResult.data.user);
        await setSelectedUserWithMode(storeUser, 'real');
      } catch (err: unknown) {
        if (cancelled) return;
        const code: string = (err as { code?: string })?.code ?? '';
        if (code && code !== 'auth/null-user') {
          logger.warn('MainNavigator', 'getRedirectResult error (non-fatal)', {
            code,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // ─── Debug logging ──────────────────────────────────────────────────────────
  useEffect(() => {
    logger.debug(
      'MainNavigator',
      'Render state',
      { user: selectedUser?.name ?? 'null', isLoading, isGuestMode, isAuthenticated, mode },
      { periodic: true },
    );
  }, [selectedUser, isLoading, isGuestMode, isAuthenticated, mode]);

  useFocusEffect(
    React.useCallback(() => {
      logger.debug('MainNavigator', 'Navigator focused', undefined, { periodic: true });
    }, []),
  );

  // ─── Stack key ──────────────────────────────────────────────────────────────
  const stackKey = useMemo(
    () => computeMainNavigatorStackKey(mode, isAuthenticated, isGuestMode),
    [mode, isAuthenticated, isGuestMode],
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Stack.Navigator
      key={stackKey}
      id={undefined}
      detachInactiveScreens={true}
      screenOptions={({ navigation, route }) => ({
        headerShown: route.name === 'AdminDashboard',
        header:
          route.name === 'AdminDashboard'
            ? () => (
                <TopBarNavigator
                  navigation={navigation as any}
                  hideTopBar={(route?.params as any)?.hideTopBar === true}
                />
              )
            : undefined,
      })}
    >
      {isAuthenticated || isGuestMode ? (
        // ══════════════════════════════════════════════════════════════════════
        // AUTHENTICATED STACK
        // ══════════════════════════════════════════════════════════════════════
        <Stack.Group>
          <Stack.Screen name="HomeStack" component={BottomNavigator} />
          <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
          <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
          <Stack.Screen
            name="PostsReelsScreen"
            component={PostsReelsScreenWrapper}
            options={{ cardStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="BookmarksScreen"
            component={BookmarksScreen}
            options={{ title: t('profile:menu.bookmarks'), headerTitleAlign: 'center', headerShown: true }}
          />
          <Stack.Screen
            name="UserProfileScreen"
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            component={require('../bottomBarScreens/ProfileScreen').default}
          />
          <Stack.Screen name="FollowersScreen" component={FollowersScreen} />
          <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />
          <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        </Stack.Group>
      ) : (
        // ══════════════════════════════════════════════════════════════════════
        // UNAUTHENTICATED STACK
        // ══════════════════════════════════════════════════════════════════════
        <Stack.Group>
          {Platform.OS === 'web' && mode === 'site' ? (
            <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
          ) : null}
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="InactiveScreen" component={LoginScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
