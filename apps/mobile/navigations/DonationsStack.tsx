// File overview:
// - Purpose: Stack navigator for the Donations tab and all donation categories.
// - Reached from: `BottomNavigator` -> Tab 'DonationsTab'.
// - Provides: Entry 'DonationsScreen' plus many category screens (money, time, knowledge, items, etc.).
// - Header: Uses `TopBarNavigator`; can be hidden per-screen with route param `hideTopBar`.
// - Params: Category screens typically have no required params; navigation is by route name.
// - External deps: react-navigation stack, TopBarNavigator, category screens in `donationScreens/`.
import React from "react";
import { Platform } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import DonationsScreen from "../bottomBarScreens/DonationsScreen";
import MoneyScreen from "../donationScreens/MoneyScreen";
import TimeScreen from "../donationScreens/TimeScreen";
import KnowledgeScreen from "../donationScreens/KnowledgeScreen";
import TrumpScreen from "../donationScreens/TrumpScreen";
import FoodScreen from "../donationScreens/FoodScreen";
import HousingScreen from "../donationScreens/HousingScreen";
import ItemsScreen from "../donationScreens/ItemsScreen";
import CommunityChallengesScreen from "../donationScreens/CommunityChallengesScreen";
import ChallengeDetailsScreen from "../screens/ChallengeDetailsScreen";
import ChallengeStatisticsScreen from "../screens/ChallengeStatisticsScreen";
import MyChallengesScreen from "../screens/MyChallengesScreen";
import MyCreatedChallengesScreen from "../screens/MyCreatedChallengesScreen";
import ChatListScreen from "../topBarScreens/ChatListScreen";
import ChatDetailScreen from "../screens/ChatDetailScreen";
import NewChatScreen from "../screens/NewChatScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import AboutKarmaCommunityScreen from "../topBarScreens/AboutKarmaCommunityScreen";
import SettingsScreen from "../topBarScreens/SettingsScreen";
import DiscoverPeopleScreen from "../screens/DiscoverPeopleScreen";
import LandingSiteScreen from "../screens/Landing/LandingSiteScreen";
import TopBarNavigator from "./TopBarNavigator";
import { DonationsStackParamList } from "../globals/types";
import { logger } from "../utils/loggerService";

const Stack = createStackNavigator<DonationsStackParamList>();

export default function DonationsStack() {
  // Refresh data when navigator comes into focus
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('DonationsStack', 'Navigator focused');
      // This will trigger re-renders of child screens when needed
    }, [])
  );

  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName="DonationsScreen"
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
      <Stack.Screen name="DonationsScreen" component={DonationsScreen} />
      <Stack.Screen name="MoneyScreen" component={MoneyScreen} />
      <Stack.Screen name="ItemsScreen" component={ItemsScreen} />
      <Stack.Screen name="TimeScreen" component={TimeScreen} />
      <Stack.Screen name="KnowledgeScreen" component={KnowledgeScreen} />
      <Stack.Screen name="TrumpScreen" component={TrumpScreen} />
      <Stack.Screen name="FoodScreen" component={FoodScreen} />
      <Stack.Screen name="HousingScreen" component={HousingScreen} />
      <Stack.Screen name="CommunityChallengesScreen" component={CommunityChallengesScreen} />
      <Stack.Screen name="ChallengeDetailsScreen" component={ChallengeDetailsScreen} />
      <Stack.Screen name="ChallengeStatisticsScreen" component={ChallengeStatisticsScreen} />
      <Stack.Screen name="MyChallengesScreen" component={MyChallengesScreen} />
      <Stack.Screen name="MyCreatedChallengesScreen" component={MyCreatedChallengesScreen} />
      <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
      <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
      <Stack.Screen name="NewChatScreen" component={NewChatScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="AboutKarmaCommunityScreen" component={AboutKarmaCommunityScreen} />
      <Stack.Screen name="LandingSiteScreen" component={LandingSiteScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="DiscoverPeopleScreen" component={DiscoverPeopleScreen} />
    </Stack.Navigator>
  );
}
