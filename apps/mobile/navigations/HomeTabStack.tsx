/**
 * HomeTabStack
 *
 * Stack navigator mounted inside the "HomeScreen" bottom tab.
 * It is the initial tab shown when the user enters the authenticated area.
 *
 * Header strategy
 * ───────────────
 * Every screen in this stack renders the shared <TopBarNavigator>.  Individual
 * screens can suppress it by passing `{ hideTopBar: true }` in their route params,
 * or request the posts-toggle to be visible via `{ showPosts: true }`.
 *
 * Screen inventory
 * ────────────────
 *   HomeMain            – posts feed (HomeScreen) — always the initial route
 *   PostDetailScreen    – single-post expansion
 *   LandingSiteScreen   – marketing landing (shown to authenticated users who tap it)
 *   ChatListScreen / ChatDetailScreen / NewChatScreen  – messaging flow
 *   NotificationsScreen – notification centre
 *   AboutKarmaCommunityScreen / SettingsScreen / BookmarksScreen  – utility screens
 *   UserProfileScreen / FollowersScreen / DiscoverPeopleScreen   – social graph
 *   CommunityStatsScreen – aggregate community statistics
 *   PostsReelsScreen    – full-screen reels viewer (transparent modal)
 *   WebViewScreen       – in-app browser (no header)
 *
 * detachInactiveScreens
 * ─────────────────────
 * Always `true` (the default). Keeping it `false` on mobile-web was an attempted
 * fix for focus issues, but it caused a different problem: all screen components
 * stay alive simultaneously, and when the parent navigator remounts (e.g. after
 * an auth state change) they all re-render at once, producing the white-flash.
 *
 * Data flow
 * ─────────
 *   BottomNavigator → HomeTabStack → HomeScreen (HomeMain)
 *                                 ↘ (other screens via navigation.push / navigate)
 */

import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../bottomBarScreens/HomeScreen';
import ChatListScreen from '../topBarScreens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import NewChatScreen from '../screens/NewChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AboutKarmaCommunityScreen from '../topBarScreens/AboutKarmaCommunityScreen';
import SettingsScreen from '../topBarScreens/SettingsScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import PostsReelsScreenWrapper from '../components/PostsReelsScreenWrapper';
import WebViewScreen from '../screens/WebViewScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowersScreen from '../screens/FollowersScreen';
import DiscoverPeopleScreen from '../screens/DiscoverPeopleScreen';
import LandingSiteScreen from '../screens/Landing/LandingSiteScreen';
import CommunityStatsScreen from '../screens/CommunityStatsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import TopBarNavigator from './TopBarNavigator';

import { HomeTabStackParamList } from '../globals/types';

const Stack = createStackNavigator<HomeTabStackParamList>();

export default function HomeTabStack(): React.ReactElement {
  return (
    <Stack.Navigator
      id="HomeTabStack"
      initialRouteName="HomeMain"
      // Always detach inactive screens. Keeping them mounted (detachInactiveScreens=false)
      // was causing all screens to re-render simultaneously during parent remounts,
      // which produced the white-flash on the Home tab on mobile web.
      detachInactiveScreens={true}
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        header: () => (
          <TopBarNavigator
            navigation={navigation as any}
            hideTopBar={(route?.params as any)?.hideTopBar === true}
            showPosts={(route?.params as any)?.showPosts === true}
          />
        ),
        // On web, keep cardStyle minimal — over-specifying it interferes with
        // the stack's z-index stacking and can produce transparent gaps.
        cardStyle: Platform.OS === 'web' ? {} : undefined,
      })}
    >
      {/* ── Primary screen ─────────────────────────────────────────────────── */}
      <Stack.Screen name="HomeMain" component={HomeScreen} />

      {/* ── Content screens ────────────────────────────────────────────────── */}
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
      <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />

      {/* ── Messaging flow ─────────────────────────────────────────────────── */}
      <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
      <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
      <Stack.Screen name="NewChatScreen" component={NewChatScreen} />

      {/* ── Utility screens ────────────────────────────────────────────────── */}
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="BookmarksScreen" component={BookmarksScreen} />
      <Stack.Screen name="CommunityStatsScreen" component={CommunityStatsScreen} />

      {/* ── Social graph ───────────────────────────────────────────────────── */}
      <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
      <Stack.Screen name="FollowersScreen" component={FollowersScreen} />
      <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />

      {/* ── Modal overlays ─────────────────────────────────────────────────── */}
      <Stack.Screen
        name="PostsReelsScreen"
        component={PostsReelsScreenWrapper}
        options={{
          presentation: 'transparentModal',
          cardStyle: { backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="WebViewScreen"
        component={WebViewScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
