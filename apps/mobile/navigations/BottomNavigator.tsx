// File overview:
// - Purpose: Bottom tab navigator hosting main tabs: Home, Search, Donations, Profile (hidden in guest mode).
// - Reached from: `MainNavigator` route 'HomeStack'.
// - Provides: Tab bar with custom styling, responsive insets, icons per route; hides tab bar when nested route sets `hideBottomBar` param.
// - Reads from context: `useUser()` -> `isGuestMode`, `resetHomeScreen()` used on Home tab press.
// - Child stacks: `HomeTabStack`, `SearchTabStack`, `DonationsStack`, `ProfileTabStack`.
// - Navigation params pattern: nested screens can pass `{ hideBottomBar: true }` to hide tab bar; Home tab press triggers reset via context.
// - External deps: react-navigation/bottom-tabs, Ionicons, responsive helpers, colors/constants.
// BottomNavigator.tsx

// TODO: Extract complex animation logic to custom hooks (usePulseAnimation, useTabBarAnimation)
// TODO: Add comprehensive TypeScript interfaces for all navigation types
// TODO: Implement proper accessibility for tab navigation
// TODO: Add comprehensive error handling for navigation failures  
// TODO: Remove hardcoded animation values and use constants
// TODO: Implement proper tab badge system for notifications/updates
// TODO: Add comprehensive performance optimization with React.memo
// TODO: Remove 'use strict' directive - not needed in modern JavaScript
// TODO: Add comprehensive unit tests for all navigation logic
// TODO: Implement proper deep linking support for tab navigation
'use strict';
import React from "react";
import { Platform, Animated, Easing, View, StyleSheet } from "react-native";
import { createBottomTabNavigator, BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, CommonActions } from "@react-navigation/native";
import HomeTabStack from "./HomeTabStack";
import SearchTabStack from "./SearchTabStack";
import ProfileTabStack from "./ProfileTabStack";
import DonationsStack from "./DonationsStack";
import AdminStack from "./AdminStack";
import BookmarksScreen from "../screens/BookmarksScreen";
import SettingsScreen from "../topBarScreens/SettingsScreen";
import ChatListScreen from "../topBarScreens/ChatListScreen";
import AboutKarmaCommunityScreen from "../topBarScreens/AboutKarmaCommunityScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import colors from "../globals/colors"; // Adjust path if needed
import { vw, getScreenInfo, isLandscape } from "../globals/responsive";
import { LAYOUT_CONSTANTS } from "../globals/constants";
import { useUser } from "../stores/userStore";
import { useWebMode } from "../stores/webModeStore";
import { logger } from "../utils/loggerService";

// Define the type for your bottom tab navigator's route names and their parameters.
export type BottomTabNavigatorParamList = {
  DonationsTab: undefined;
  HomeScreen: undefined;
  SearchTab: undefined;
  ProfileScreen: undefined;
  AdminTab: undefined;
  SettingsScreen: undefined;
  ChatListScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  NotificationsScreen: undefined;
};

// Create an instance of the Bottom Tab Navigator with its parameter list type
const Tab = createBottomTabNavigator<BottomTabNavigatorParamList>();

// Animated icon for Donations tab when not focused
// TODO: Extract this component to separate file (components/AnimatedTabIcon.tsx)
// TODO: Add proper cleanup for animations on unmount
// TODO: Implement proper animation performance optimization
// TODO: Add proper accessibility for animated elements
const DonationsPulseIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => {
  const ring1 = React.useRef(new Animated.Value(0)).current;
  const ring2 = React.useRef(new Animated.Value(0)).current;
  const ring3 = React.useRef(new Animated.Value(0)).current;

  const runPulse = React.useCallback((anim: Animated.Value, delayMs: number) => {
    return Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );
  }, []);

  React.useEffect(() => {
    const a1 = runPulse(ring1, 0);
    const a2 = runPulse(ring2, 500);
    const a3 = runPulse(ring3, 1000);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [ring1, ring2, ring3, runPulse]);

  const containerSize = size * 1.6;
  const ringBaseStyle = {
    width: containerSize,
    height: containerSize,
    borderRadius: containerSize / 2,
    borderColor: color,
  } as const;

  const ringStyleFrom = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] }),
    transform: [
      {
        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.35] }),
      },
    ],
  });

  return (
    <View style={[styles.pulseContainer, { width: containerSize, height: containerSize }]}
      pointerEvents="none"
      accessibilityElementsHidden>
      <Animated.View style={[styles.ring, ringBaseStyle, ringStyleFrom(ring1)]} />
      <Animated.View style={[styles.ring, ringBaseStyle, ringStyleFrom(ring2)]} />
      <Animated.View style={[styles.ring, ringBaseStyle, ringStyleFrom(ring3)]} />
      <Ionicons name="heart-outline" size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  pulseContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
  },
});

/**
 * BottomNavigator Component.
 *
 * This component sets up the main bottom tab navigation for the application.
 * It defines the screens accessible via the tab bar, their icons, and the
 * overall styling and behavior of the tab bar itself, including responsive
 * positioning and shadow effects.
 *
 * @returns {React.FC} A React component rendering the Bottom Tab Navigator.
 */
export default function BottomNavigator(): React.ReactElement {
  const { isGuestMode, resetHomeScreen, isAdmin, refreshUserRoles, isAuthenticated } = useUser();
  const { mode } = useWebMode();
  const navigation = useNavigation();

  // Refresh data when navigator comes into focus
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('BottomNavigator', 'Navigator focused');
      // Refresh user roles when navigator comes into focus to detect admin changes
      if (isAuthenticated && !isGuestMode) {
        refreshUserRoles();
      }
    }, [isAuthenticated, isGuestMode, refreshUserRoles])
  );



  /**
   * Helper function to determine the Ionicons name based on the route and focus state.
   * @param {string} routeName - The name of the current route.
   * @param {boolean} focused - True if the tab is currently focused.
   * @returns {string} The Ionicons icon name (e.g., "home" or "home-outline").
   */
  const getTabBarIconName = (routeName: keyof BottomTabNavigatorParamList, focused: boolean): keyof typeof Ionicons.glyphMap => {
    switch (routeName) {
      case "HomeScreen":
        return focused ? "home" : "home-outline";
      case "SearchTab":
        return focused ? "search" : "search-outline";
      case "DonationsTab":
        return focused ? "heart" : "heart-outline";
      case "ProfileScreen":
        return focused ? "person" : "person-outline";
      case "AdminTab":
        return focused ? "shield" : "shield-outline";
      default:
        return "help-circle-outline";
    }
  };

  const getActiveNestedParams = (route: any): Record<string, any> | undefined => {
    const state = route.state ?? route.params?.state;
    if (!state) return route.params;
    const nestedRoute = state.routes?.[state.index ?? 0];
    if (nestedRoute) return getActiveNestedParams(nestedRoute);
    return route.params;
  };

  // Map tab route names to their initial stack route names
  const TAB_INITIAL_ROUTES: Record<string, string> = {
    HomeScreen: 'HomeMain',
    SearchTab: 'SearchScreen',
    DonationsTab: 'DonationsScreen',
    ProfileScreen: 'ProfileMain',
    AdminTab: 'AdminDashboard',
  };

  const handleTabPress = (e: any, navigation: any, routeName: string) => {
    // Only act if the tab is already focused
    if (navigation.isFocused()) {
      const initialRoute = TAB_INITIAL_ROUTES[routeName];
      if (initialRoute) {
        logger.debug('BottomNavigator', `Tab ${routeName} pressed while focused - resetting stack to ${initialRoute}`);

        e.preventDefault();

        // Special handling for Home logic (refresh/reset via store)
        if (routeName === 'HomeScreen') {
          resetHomeScreen();
        }

        // Perform a deep reset of the tab's stack
        // This resets the Tab Navigator history to just this tab, with the stack reset to initial route
        navigation.dispatch(CommonActions.reset({
          index: 0,
          routes: [{
            name: routeName,
            state: {
              routes: [{ name: initialRoute }]
            }
          }]
        }));
      }
    }
  };

  return (
    <Tab.Navigator
      id={undefined}
      initialRouteName="HomeScreen"
      screenOptions={({ route }): BottomTabNavigationOptions => {
        const activeParams = getActiveNestedParams(route as any) || {};
        const hideBottomBar = activeParams.hideBottomBar === true;
        const hideDueToSiteMode = (typeof window !== 'undefined' && mode === 'site');
        const shouldHideTabBar = hideBottomBar || hideDueToSiteMode;
        const { isTablet, isDesktop } = getScreenInfo();
        const landscape = isLandscape();
        const horizontalInset = isDesktop ? vw(20) : isTablet ? vw(10) : LAYOUT_CONSTANTS.SPACING.MD;
        const barHeight = landscape ? 40 : (isDesktop ? 56 : isTablet ? 54 : 46);
        return ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number; }) => {
            if (route.name === "DonationsTab") {
              return focused ? (
                <Ionicons name="heart" size={size} color={color} />
              ) : (
                <DonationsPulseIcon size={size} color={color} />
              );
            }
            const iconName = getTabBarIconName(route.name, focused);
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.bottomNavActive,
          tabBarInactiveTintColor: colors.bottomNavInactive,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: "absolute",
            left: horizontalInset,
            right: horizontalInset,
            borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.XLARGE,
            elevation: LAYOUT_CONSTANTS.SHADOW.MEDIUM.elevation,
            height: barHeight,
            backgroundColor: colors.cardBackground,
            display: shouldHideTabBar ? 'none' as const : 'flex' as const,
          },
        });
      }}
    >
      {!isGuestMode && (
        <Tab.Screen
          name="ProfileScreen"
          component={ProfileTabStack}
          listeners={({ navigation, route }) => ({
            tabPress: (e) => handleTabPress(e, navigation, route.name),
          })}
        />
      )}
      <Tab.Screen
        name="DonationsTab"
        component={DonationsStack}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => handleTabPress(e, navigation, route.name),
        })}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchTabStack}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => handleTabPress(e, navigation, route.name),
        })}
      />
      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminStack}
          listeners={({ navigation, route }) => ({
            tabPress: (e) => handleTabPress(e, navigation, route.name),
          })}
        />
      )}
      <Tab.Screen
        name="HomeScreen"
        component={HomeTabStack}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => handleTabPress(e, navigation, route.name),
        })}
      />

    </Tab.Navigator>
  );
}