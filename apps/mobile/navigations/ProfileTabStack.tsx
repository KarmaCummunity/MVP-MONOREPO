// File overview:
// - Purpose: Stack navigator for the Profile tab.
// - Reached from: `BottomNavigator` -> Tab 'ProfileScreen' (hidden when guest mode is active).
// - Provides: Routes for Profile, Settings, ChatList, Notifications, About.
// - Header: Uses `TopBarNavigator` for a consistent top bar across the app.
// - Params: None for initial route; other screens use their own optional params.
// - External deps: react-navigation stack, TopBarNavigator, common top-bar screens.
import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';

import ProfileScreen from '../bottomBarScreens/ProfileScreen';
import SettingsScreen from '../topBarScreens/SettingsScreen';
import ChatListScreen from '../topBarScreens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import NewChatScreen from '../screens/NewChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AboutKarmaCommunityScreen from '../topBarScreens/AboutKarmaCommunityScreen';
import DiscoverPeopleScreen from '../screens/DiscoverPeopleScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import LandingSiteScreen from '../screens/Landing/LandingSiteScreen';
import TopBarNavigator from './TopBarNavigator';
import { logger } from '../utils/loggerService';
import { useUser } from '../stores/userStore';

type ProfileTabStackParamList = {
  ProfileMain: { userId?: string } | undefined;
  SettingsScreen: undefined;
  ChatListScreen: undefined;
  ChatDetailScreen: { chatId?: string } | undefined;
  NewChatScreen: undefined;
  NotificationsScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  LandingSiteScreen: undefined;
  DiscoverPeopleScreen: undefined;
  EditProfileScreen: undefined;
};

const Stack = createStackNavigator<ProfileTabStackParamList>();

export default function ProfileTabStack(): React.ReactElement {
  const { selectedUser } = useUser();

  useFocusEffect(
    React.useCallback(() => {
      logger.debug('ProfileTabStack', 'Navigator focused');
    }, [])
  );

  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName="ProfileMain"
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
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        initialParams={selectedUser?.id ? { userId: selectedUser.id } : undefined}
      />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
      <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
      <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
      <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
      <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}


