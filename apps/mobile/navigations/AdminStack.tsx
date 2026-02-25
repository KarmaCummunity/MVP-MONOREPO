// File overview:
// - Purpose: Stack navigator for admin screens (dashboard, money management, people, review) and top bar screens.
// - Reached from: `BottomNavigator` -> Tab 'AdminTab' (only visible to admins).
// - Provides: Admin dashboard and management screens, plus top bar screens (Settings, Notifications, About, Chat screens, LandingSiteScreen).
// - Header: Uses `TopBarNavigator`; can be hidden per-screen with route param `hideTopBar`.
import React from "react";
import { Platform } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminMoneyScreen from "../screens/AdminMoneyScreen";
import AdminPeopleScreen from "../screens/AdminPeopleScreen";
import AdminReviewScreen from "../screens/AdminReviewScreen";
import AdminAdminsScreen from "../screens/AdminAdminsScreen";
import AdminTasksScreen from "../screens/AdminTasksScreen";
import AdminCRMScreen from "../screens/AdminCRMScreen";
import AdminFilesScreen from "../screens/AdminFilesScreen";
import AdminTimeManagementScreen from "../screens/AdminTimeManagementScreen";
import AdminTablesScreen from "../screens/AdminTablesScreen";
import AdminTableRowsScreen from "../screens/AdminTableRowsScreen";
import ChatListScreen from "../topBarScreens/ChatListScreen";
import ChatDetailScreen from "../screens/ChatDetailScreen";
import NewChatScreen from "../screens/NewChatScreen";
import SettingsScreen from "../topBarScreens/SettingsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import AboutKarmaCommunityScreen from "../topBarScreens/AboutKarmaCommunityScreen";
import LandingSiteScreen from "../screens/Landing/LandingSiteScreen";
import DiscoverPeopleScreen from "../screens/DiscoverPeopleScreen";
import TopBarNavigator from "./TopBarNavigator";
import { AdminStackParamList } from "../globals/types";
import { logger } from "../utils/loggerService";

const Stack = createStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('AdminStack', 'Navigator focused');
    }, [])
  );

  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName="AdminDashboard"
      detachInactiveScreens={true}
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        header: () => (
          <TopBarNavigator
            navigation={navigation as any}
            hideTopBar={(route?.params as any)?.hideTopBar === true}
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
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminMoney" component={AdminMoneyScreen} />
      <Stack.Screen name="AdminPeople" component={AdminPeopleScreen} />
      <Stack.Screen name="AdminReview" component={AdminReviewScreen} />
      <Stack.Screen name="AdminAdmins" component={AdminAdminsScreen} />
      <Stack.Screen name="AdminTasks" component={AdminTasksScreen} />
      <Stack.Screen name="AdminCRM" component={AdminCRMScreen} />
      <Stack.Screen name="AdminFiles" component={AdminFilesScreen} />
      <Stack.Screen name="AdminTimeManagement" component={AdminTimeManagementScreen} />
      <Stack.Screen name="AdminTables" component={AdminTablesScreen} />
      <Stack.Screen name="AdminTableRows" component={AdminTableRowsScreen} />
      <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
      <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
      <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
      <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />
      <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
    </Stack.Navigator>
  );
}

