// File overview:
// - Purpose: Stack navigator for the Home tab.
// - Reached from: `BottomNavigator` -> Tab 'HomeScreen'.
// - Provides: Custom header via `TopBarNavigator` that can be hidden with route param `hideTopBar`; initial route 'HomeMain'.
// - Screens: HomeMain (HomeScreen), ChatList, ChatDetail, Notifications, About, Settings, Bookmarks, UserProfile, Followers, PostsReels (modal), WebView.
// - Params of interest: `hideTopBar`, `showPosts` passed by HomeScreen to control header and content.
// - External deps: react-navigation stack, TopBarNavigator wrapper.
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';

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

import TopBarNavigator from './TopBarNavigator';
import { useWebMode } from '../stores/webModeStore';
import { logger } from '../utils/loggerService';
import { useUser } from '../stores/userStore';
import CommunityStatsScreen from '../screens/CommunityStatsScreen';

type HomeTabStackParamList = {
  HomeMain: undefined;
  LandingSiteScreen: undefined;
  ChatListScreen: undefined;
  ChatDetailScreen: { chatId?: string } | undefined;
  NewChatScreen: undefined;
  NotificationsScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  SettingsScreen: undefined;
  BookmarksScreen: undefined;
  PostsReelsScreen: undefined;
  CommunityStatsScreen: undefined;
  WebViewScreen: { url?: string } | undefined;
  UserProfileScreen: { userId: string; userName: string; characterData?: any } | undefined;
  FollowersScreen: { userId?: string } | undefined;
  DiscoverPeopleScreen: undefined;
};

const Stack = createStackNavigator<HomeTabStackParamList>();

export default function HomeTabStack(): React.ReactElement {
  const { mode } = useWebMode();
  const { resetHomeScreenTrigger } = useUser();
  const navigation = useNavigation();
  const previousTriggerRef = useRef(resetHomeScreenTrigger);

  // Determine initial route based on web mode
  const initialRouteName = (typeof window !== 'undefined' && mode === 'site')
    ? "LandingSiteScreen"
    : "HomeMain";

  logger.debug('HomeTabStack', 'Rendering with initial route', { initialRouteName, mode, resetHomeScreenTrigger });

  // Listen to resetHomeScreenTrigger and reset navigation to HomeMain
  useEffect(() => {
    // Only act if trigger actually changed (not on initial mount)
    if (previousTriggerRef.current !== resetHomeScreenTrigger && resetHomeScreenTrigger > 0) {
      logger.debug('HomeTabStack', 'resetHomeScreenTrigger changed, resetting to HomeMain', {
        previousTrigger: previousTriggerRef.current,
        currentTrigger: resetHomeScreenTrigger,
        platform: Platform.OS
      });

      try {
        // Reset navigation stack to HomeMain
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'HomeMain' }],
          })
        );

        logger.debug('HomeTabStack', 'Navigation reset to HomeMain completed', {
          platform: Platform.OS,
          trigger: resetHomeScreenTrigger
        });
      } catch (error) {
        logger.error('HomeTabStack', 'Error resetting navigation to HomeMain', {
          error,
          platform: Platform.OS,
          trigger: resetHomeScreenTrigger
        });
      }

      // Update ref to current trigger value
      previousTriggerRef.current = resetHomeScreenTrigger;
    }
  }, [resetHomeScreenTrigger, navigation]);

  return (
    <Stack.Navigator
      id="HomeTabStack"
      initialRouteName={initialRouteName as keyof HomeTabStackParamList}
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
        // Fix for aria-hidden warning: prevent focus on inactive screens
        // detachInactiveScreens already handles this, but we keep cardStyle for web compatibility
        cardStyle: Platform.OS === 'web' ? {
          // On web, ensure inactive screens don't interfere with focus
          // This prevents elements in hidden screens from receiving focus
        } : undefined,
      })}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
      <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
      <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
      <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="BookmarksScreen" component={BookmarksScreen} />
      <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
      <Stack.Screen name="FollowersScreen" component={FollowersScreen} />
      <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />
      <Stack.Screen name="CommunityStatsScreen" component={CommunityStatsScreen} />
      <Stack.Screen
        name="PostsReelsScreen"
        component={PostsReelsScreenWrapper}
        options={{
          presentation: 'transparentModal',
          cardStyle: { backgroundColor: 'transparent' },
          headerShown: false,
        }}
      />
      <Stack.Screen name="WebViewScreen" component={WebViewScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}


