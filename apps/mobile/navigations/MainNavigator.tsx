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
 */

import React, { useEffect, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { getAuth, getRedirectResult } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { GoogleAuthService } from '../google_auth/GoogleAuthService';

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

import { useUser } from '../stores/userStore';
import { useWebMode } from '../stores/webModeStore';
import { logger } from '../utils/loggerService';
import { RootStackParamList } from '../globals/types';
import { computeMainNavigatorStackKey } from './mainNavigatorStackKey';

const Stack = createStackNavigator<RootStackParamList>();

export default function MainNavigator() {
  // ─── Store subscriptions ────────────────────────────────────────────────────
  // `isLoading` is read for logging only. It must not gate rendering (see header).
  const { selectedUser, isLoading, isGuestMode, isAuthenticated, setSelectedUserWithMode } = useUser();
  const { mode } = useWebMode();
  const { t } = useTranslation(['common', 'profile']);

  // ─── Google redirect-result handler ─────────────────────────────────────────
  // When the user completes Google sign-in via `signInWithRedirect`, the browser
  // navigates back to this app. We call `getRedirectResult` once on mount to pick
  // up the pending credential and update the auth store. This bypasses the
  // `auth/unauthorized-domain` error that occurs with `signInWithPopup` on
  // Replit preview domains.
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
        logger.info('MainNavigator', 'Google redirect sign-in succeeded', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });

        // Extract the raw Firebase ID token and send it to the backend for
        // server-side verification. This creates a real JWT session instead
        // of a local-only user object.
        let idToken: string;
        try {
          idToken = await firebaseUser.getIdToken();
        } catch (tokenErr: any) {
          logger.error('MainNavigator', 'Failed to retrieve Firebase ID token', { message: tokenErr?.message });
          Alert.alert('שגיאת התחברות', 'לא ניתן לאחזר את אסימון ההזדהות. נסה שוב.');
          return;
        }

        const authService = GoogleAuthService.getInstance();
        const authResult = await authService.authenticateWithGoogle(idToken);

        if (cancelled) return;

        if (!authResult.success || !authResult.data) {
          logger.warn('MainNavigator', 'Backend Google auth failed', {
            error: authResult.error,
            details: authResult.details,
          });
          Alert.alert(
            'שגיאת התחברות',
            'ההתחברות דרך גוגל נכשלה. ייתכן שהשרת אינו זמין כרגע — נסה שוב מאוחר יותר.',
          );
          return;
        }

        // Use the server-verified user profile (not a locally-constructed object).
        const { user: verifiedUser } = authResult.data;
        await setSelectedUserWithMode(verifiedUser as any, 'real');
        // MainNavigator will automatically re-render and show HomeStack
        // because isAuthenticated will flip to true in the store.
      } catch (err: any) {
        if (cancelled) return;
        // `getRedirectResult` throws if there is no pending redirect — this is
        // normal on every page load that did NOT follow a `signInWithRedirect`.
        // Only log as an error if it is an unexpected code.
        const code: string = err?.code ?? '';
        if (code && code !== 'auth/null-user') {
          logger.warn('MainNavigator', 'getRedirectResult error (non-fatal)', { code, message: err?.message });
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // ─── Debug logging ──────────────────────────────────────────────────────────
  // Periodic flag prevents flooding the log storage on tight re-render loops.
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
  // Changing this key fully resets the navigator — intentional only when the user
  // crosses an auth boundary or switches web mode. `isLoading` is deliberately
  // excluded so transient background auth checks do NOT reset the navigator.
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
        // Only AdminDashboard has a visible header (it uses the shared TopBar).
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
        // Rendered when the user is logged in or browsing as a guest.
        // HomeStack is always the first (initial) screen so the bottom tabs are
        // visible immediately without an extra navigation push.
        // ══════════════════════════════════════════════════════════════════════
        <Stack.Group>
          {/* Root: bottom tab navigator + all nested tab stacks */}
          <Stack.Screen name="HomeStack" component={BottomNavigator} />

          {/* Chat flow — presented from top-bar or notification tap */}
          <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
          <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />

          {/* In-app browser */}
          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />

          {/* Full-screen posts / reels viewer — transparent modal over the tab bar */}
          <Stack.Screen
            name="PostsReelsScreen"
            component={PostsReelsScreenWrapper}
            options={{ cardStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />

          {/* Bookmarks — shown with a header */}
          <Stack.Screen
            name="BookmarksScreen"
            component={BookmarksScreen}
            options={{ title: t('profile:menu.bookmarks'), headerTitleAlign: 'center', headerShown: true }}
          />

          {/*
           * UserProfileScreen is also registered inside HomeTabStack and SearchTabStack
           * so the bottom/top bars remain visible during in-tab profile navigation.
           * This root-level registration exists only to support legacy deep links.
           */}
          <Stack.Screen
            name="UserProfileScreen"
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            component={require('../bottomBarScreens/ProfileScreen').default}
          />
          <Stack.Screen name="FollowersScreen" component={FollowersScreen} />
          <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />

          {/* Top-bar screens (Settings, Chat list, Notifications, About, Edit profile) */}
          <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />

          {/* Admin dashboard — header shown via screenOptions above */}
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        </Stack.Group>
      ) : (
        // ══════════════════════════════════════════════════════════════════════
        // UNAUTHENTICATED STACK
        // Rendered when no user session exists.
        // On web in site-mode the landing page is shown first; everywhere else
        // (or after the landing CTA) LoginScreen is the entry point.
        // ══════════════════════════════════════════════════════════════════════
        <Stack.Group>
          {/* Landing / marketing page — web + site-mode only */}
          {Platform.OS === 'web' && mode === 'site' ? (
            <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
          ) : null}

          {/* Login / registration — app-mode or after landing CTA */}
          <Stack.Screen name="LoginScreen" component={LoginScreen} />

          {/* Legacy alias kept to avoid crashes from stale persisted navigation state */}
          <Stack.Screen name="InactiveScreen" component={LoginScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
