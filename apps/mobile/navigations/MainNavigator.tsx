// File overview:
// - Purpose: Root stack navigator controlling auth vs app flows, with web mode support.
// - Reached from: `App.tsx` renders `<MainNavigator />` inside `NavigationContainer`.
// - Provides: Stack with routes that depend on authentication and web mode:
//   * Authenticated: Shows 'HomeStack' (BottomNavigator tabs) and other protected screens.
//   * Unauthenticated (Site Mode): Shows 'LandingSiteScreen' as entry point.
//   * Unauthenticated (App Mode): Shows 'LoginScreen' as entry point.
// - Decides: conditionally renders screens based on `useUser()` state (`isAuthenticated`, `isGuestMode`).
// - Downstream flows:
//   - LandingSiteScreen -> toggle to app mode -> Login/Home
//   - LoginScreen -> on success/guest: state updates -> re-render allows 'HomeStack'.
// - External deps: react-navigation stack, i18n for titles, shared colors/styles.

import React, { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createStackNavigator } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import BottomNavigator from "./BottomNavigator";
import WebViewScreen from "../screens/WebViewScreen";
import PostsReelsScreenWrapper from "../components/PostsReelsScreenWrapper";
import BookmarksScreen from "../screens/BookmarksScreen";
// Removed UserProfileScreen import - it should only be accessed via HomeTabStack or SearchTabStack
import FollowersScreen from "../screens/FollowersScreen";
import DiscoverPeopleScreen from "../screens/DiscoverPeopleScreen";
import LoginScreen from "../screens/LoginScreen";
import { useUser } from '../stores/userStore';
import colors from '../globals/colors';
import styles from '../globals/styles';
import NewChatScreen from '../screens/NewChatScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import SettingsScreen from '../topBarScreens/SettingsScreen';
import ChatListScreen from '../topBarScreens/ChatListScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AboutKarmaCommunityScreen from '../topBarScreens/AboutKarmaCommunityScreen';
import OrgOnboardingScreen from '../screens/OrgOnboardingScreen';
import AdminOrgApprovalsScreen from '../screens/AdminOrgApprovalsScreen';
import OrgDashboardScreen from '../screens/OrgDashboardScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import LandingSiteScreen from '../screens/Landing/LandingSiteScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import { useWebMode } from '../stores/webModeStore';
import { logger } from '../utils/loggerService';
import TopBarNavigator from './TopBarNavigator';

import { RootStackParamList } from '../globals/types';

const Stack = createStackNavigator<RootStackParamList>();

export default function MainNavigator() {
  const { selectedUser, isLoading, isGuestMode, isAuthenticated } = useUser();
  const { t } = useTranslation(['common', 'profile']);
  const { mode } = useWebMode();

  // Log render state for debugging
  useEffect(() => {
    logger.debug('MainNavigator', 'Render state', {
      selectedUser: selectedUser?.name || 'null',
      isLoading,
      isGuestMode,
      isAuthenticated,
      mode,
    });
  }, [selectedUser, isLoading, isGuestMode, isAuthenticated, mode]);

  // Refresh data when navigator comes into focus
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('MainNavigator', 'Navigator focused');
    }, [])
  );

  // Stack Navigator key - only change when mode changes, or authentication state toggles major branches
  // This helps ensure clean transitions between Auth and Unauth states
  const stackKey = useMemo(() => `stack-${mode}-${isAuthenticated || isGuestMode ? 'auth' : 'unauth'}`, [mode, isAuthenticated, isGuestMode]);

  // Loading screen
  if (isLoading) {
    logger.debug('MainNavigator', 'Showing loading screen');
    return (
      <View style={styles.centeredScreen as any}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text style={styles.loadingText as any}>{t('common:loading')}</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={stackKey}
      id={undefined}
      detachInactiveScreens={true}
      screenOptions={({ navigation, route }) => ({
        headerShown: route.name === 'AdminDashboard' ? true : false,
        header: route.name === 'AdminDashboard' ? () => (
          <TopBarNavigator
            navigation={navigation as any}
            hideTopBar={(route?.params as any)?.hideTopBar === true}
          />
        ) : undefined,
        // Fix for aria-hidden warning: prevent focus on inactive screens
        cardStyle: Platform.OS === 'web' ? {
          // On web, ensure inactive screens don't interfere with focus
        } : undefined,
      })}
    >
      {isAuthenticated || isGuestMode ? (
        // ==================================================================
        // AUTHENTICATED STACK
        // Screens available only to logged-in users or guests
        // ==================================================================
        <Stack.Group>
          <Stack.Screen name="HomeStack" component={BottomNavigator} />

          <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
          <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />

          <Stack.Screen name="WebViewScreen" component={WebViewScreen} />

          <Stack.Screen
            name="PostsReelsScreen"
            component={PostsReelsScreenWrapper}
            options={{
              cardStyle: { backgroundColor: 'transparent' },
              presentation: 'transparentModal',
            }}
          />

          <Stack.Screen
            name="BookmarksScreen"
            component={BookmarksScreen}
            options={{
              title: t('profile:menu.bookmarks'),
              headerTitleAlign: 'center',
              headerShown: true,
            }}
          />

          {/* Removed UserProfileScreen from MainNavigator - it should only be accessed via HomeTabStack or SearchTabStack 
              to ensure bottom bar and top bar remain visible */}
          <Stack.Screen
            name="UserProfileScreen"
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            component={require('../bottomBarScreens/ProfileScreen').default}
          />
          <Stack.Screen name="FollowersScreen" component={FollowersScreen} />
          <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />

          {/* Top Bar Screens accessible from HomeTabStack headers */}
          <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />

          {/* Org & Admin Screens */}
          <Stack.Screen name="AdminOrgApprovalsScreen" component={AdminOrgApprovalsScreen} />
          <Stack.Screen name="OrgDashboardScreen" component={OrgDashboardScreen} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        </Stack.Group>
      ) : (
        // ==================================================================
        // UNAUTHENTICATED STACK
        // Screens available to users who are NOT logged in
        // ==================================================================
        <Stack.Group>
          {/* In site mode, LandingSiteScreen is the entry point */}
          {Platform.OS === 'web' && mode === 'site' ? (
            <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
          ) : null}

          {/* In app mode (or if site mode landing navigates here), LoginScreen is main */}
          <Stack.Screen name="LoginScreen" component={LoginScreen} />

          {/* Org Onboarding is part of the sign-up flow */}
          <Stack.Screen name="OrgOnboardingScreen" component={OrgOnboardingScreen} />

          {/* Legacy mapping for removed screen */}
          <Stack.Screen name="InactiveScreen" component={LoginScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}