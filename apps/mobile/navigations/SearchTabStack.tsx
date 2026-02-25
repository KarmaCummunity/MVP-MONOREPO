// File overview:
// - Purpose: Stack navigator for the Search tab.
// - Reached from: `BottomNavigator` -> Tab 'SearchTab'.
// - Provides: Routes for Search, UserProfile, Followers, DiscoverPeople, ChatList, Notifications, About, Settings.
// - Header: Replaces default header with `TopBarNavigator`.
// - Params of interest: Optional `userId` for profile/followers; no initial params for Search.
// - External deps: react-navigation stack, TopBarNavigator, shared screens.
import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';

import SearchScreen from '../bottomBarScreens/SearchScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import FollowersScreen from '../screens/FollowersScreen';
import DiscoverPeopleScreen from '../screens/DiscoverPeopleScreen';
import ChatListScreen from '../topBarScreens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import NewChatScreen from '../screens/NewChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AboutKarmaCommunityScreen from '../topBarScreens/AboutKarmaCommunityScreen';
import SettingsScreen from '../topBarScreens/SettingsScreen';
import LandingSiteScreen from '../screens/Landing/LandingSiteScreen';
import TopBarNavigator from './TopBarNavigator';
import { logger } from '../utils/loggerService';

type SearchTabStackParamList = {
  SearchScreen: { q?: string } | undefined;
  UserProfileScreen: { userId?: string } | undefined;
  FollowersScreen: { userId?: string } | undefined;
  DiscoverPeopleScreen: undefined;
  ChatListScreen: undefined;
  ChatDetailScreen: { chatId?: string } | undefined;
  NewChatScreen: undefined;
  NotificationsScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  LandingSiteScreen: undefined;
  SettingsScreen: undefined;
};

const Stack = createStackNavigator<SearchTabStackParamList>();

export default function SearchTabStack(): React.ReactElement {
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('SearchTabStack', 'Navigator focused');
    }, [])
  );

  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName="SearchScreen"
      detachInactiveScreens={true}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: () => <TopBarNavigator navigation={navigation as any} />,
        // Fix for aria-hidden warning: prevent focus on inactive screens
        // detachInactiveScreens already handles this, but we keep cardStyle for web compatibility
        cardStyle: Platform.OS === 'web' ? {
          // On web, ensure inactive screens don't interfere with focus
          // This prevents elements in hidden screens from receiving focus
        } : undefined,
      })}
    >
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
      <Stack.Screen name="FollowersScreen" component={FollowersScreen} />
      <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />
      <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
      <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
      <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
      <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    </Stack.Navigator>
  );
}


