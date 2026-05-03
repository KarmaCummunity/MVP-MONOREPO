// File overview:
// - Purpose: Bottom tab navigator hosting main tabs: Home, Search, Donations, Profile (hidden in guest mode).
// - Reached from: `MainNavigator` route 'HomeStack'.
// - Provides: Tab bar with custom styling, responsive insets, icons per route; hides tab bar when nested route sets `hideBottomBar` param.
// - Reads from context: `useUser()` -> `isGuestMode`; tab re-press resets the active tab's nested stack via `buildBottomTabBarResetPreservingOtherTabs` (preserves all tabs — same UX as native bottom bar). Mobile Web tab bar uses safe-area `paddingBottom` + `useWindowDimensions` for resize.
// - Child stacks: `HomeTabStack`, `SearchTabStack`, `DonationsStack` (DonationsTab only), `CreatePostTabPlaceholder`, `ProfileTabStack`.
// - Navigation params pattern: nested screens can pass `{ hideBottomBar: true }` to hide tab bar.
// - External deps: react-navigation/bottom-tabs, Ionicons, responsive helpers, colors/constants; pure tab helpers in `bottomTabNavigationUtils.ts`.
// BottomNavigator.tsx

import React from "react";
import { Animated, Easing, View, StyleSheet, Platform, Pressable, useWindowDimensions } from "react-native";
import { createBottomTabNavigator, BottomTabNavigationOptions, BottomTabBarButtonProps, BottomTabBar } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, CommonActions, useNavigationState } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NavigationState } from "@react-navigation/native";
import type { EdgeInsets } from "react-native-safe-area-context";
import HomeTabStack from "./HomeTabStack";
import SearchTabStack from "./SearchTabStack";
import ProfileTabStack from "./ProfileTabStack";
import DonationsStack from "./DonationsStack";
import AdminStack from "./AdminStack";
import colors from "../globals/colors"; // Adjust path if needed
import { vw, getScreenInfo, isLandscape } from "../globals/responsive";
import { LAYOUT_CONSTANTS } from "../globals/constants";
import { useUser } from "../stores/userStore";
import { useWebMode } from "../stores/webModeStore";
import { logger } from "../utils/loggerService";
import CreatePostComposerModal from "../components/CreatePostComposerModal";
import {
  usePostComposerStore,
  type PostIntent,
  type ComposerContentMode,
} from "../stores/postComposerStore";
import {
  getDonationsStackLeafScreenName,
  mapDonationScreenRouteToComposerCategory,
} from "./mapDonationScreenToComposerCategory";
import {
  getActiveNestedParams,
  buildBottomTabBarResetPreservingOtherTabs,
  isTabNavigatorFocusedOnRoute,
  TAB_INITIAL_ROUTES,
  type NestedRouteLike,
} from "./bottomTabNavigationUtils";
import { findBottomTabNavigator, type NavLike } from "./landingSiteNavigation";
import type { BottomTabNavigatorParamList } from "../globals/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Create an instance of the Bottom Tab Navigator with its parameter list type
const Tab = createBottomTabNavigator<BottomTabNavigatorParamList>();

function getTabBarIconName(
  routeName: keyof BottomTabNavigatorParamList,
  focused: boolean,
): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case "HomeScreen":
      return focused ? "home" : "home-outline";
    case "CreatePostTab":
      return "add-circle";
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
}

const pulseStyles = StyleSheet.create({
  pulseContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
  },
});

// Animated icon for Donations tab when not focused
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
    <View
      style={[
        pulseStyles.pulseContainer,
        { width: containerSize, height: containerSize, pointerEvents: 'none' },
      ]}
      accessibilityElementsHidden>
      <Animated.View style={[pulseStyles.ring, ringBaseStyle, ringStyleFrom(ring1)]} />
      <Animated.View style={[pulseStyles.ring, ringBaseStyle, ringStyleFrom(ring2)]} />
      <Animated.View style={[pulseStyles.ring, ringBaseStyle, ringStyleFrom(ring3)]} />
      <Ionicons name="heart-outline" size={size} color={color} />
    </View>
  );
};

/** Middle tab never renders a scene (composer opens from tab bar); avoids a second DonationsStack instance. */
function CreatePostTabPlaceholder(): null {
  return null;
}

/**
 * Renders the bottom tab bar with the AdminTab route filtered out so it never
 * occupies visual space. The active index is recalculated after filtering so
 * BottomTabBar never tries to read `routes[index]` for a missing route.
 */
function BottomTabBarWithoutAdmin(props: React.ComponentProps<typeof BottomTabBar>): React.ReactElement {
  const { state } = props;
  const adminIndex = state.routes.findIndex((r) => r.name === 'AdminTab');
  const filteredRoutes = state.routes.filter((r) => r.name !== 'AdminTab');

  let newIndex = state.index;
  if (adminIndex !== -1) {
    if (state.index === adminIndex) {
      // When on AdminTab (which is filtered out), point index to HomeScreen
      const homeIdx = filteredRoutes.findIndex((r) => r.name === 'HomeScreen');
      newIndex = Math.max(0, homeIdx);
    } else if (state.index > adminIndex) {
      // Shift index down when AdminTab was before the currently active tab
      newIndex--;
    }
  }

  const filteredState = {
    ...state,
    routes: filteredRoutes,
    index: newIndex,
  } as typeof state;
  return <BottomTabBar {...props} state={filteredState} />;
}

function hideDueToSiteMode(mode: string): boolean {
  return globalThis.window !== undefined && mode === "site";
}

function getHorizontalInset(): number {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  if (isLargeDesktop || isDesktop) return vw(18);
  if (isTablet) return vw(10);
  return LAYOUT_CONSTANTS.SPACING.MD;
}

function getBottomTabBarHeight(landscape: boolean, isDesktop: boolean, isTablet: boolean, isLargeDesktop: boolean): number {
  if (landscape) return 44;
  if (isLargeDesktop || isDesktop) return 64;
  if (isTablet) return 60;
  return 56; // Increased for a more premium, spacious look
}

/** Default tab bar buttons use flex-start; align icons toward the bar bottom so the pill sits tighter to the screen edge. */
function bottomAlignedTabBarButton(props: BottomTabBarButtonProps): React.ReactElement {
  const { style, ...rest } = props;
  return (
    <PlatformPressable
      {...rest}
      style={[
        style,
        {
          justifyContent: "center", // Center vertically in the bar
          alignItems: "center",
          paddingBottom: 4,
        },
      ]}
    />
  );
}

function tabBarZIndexWhenVisible(shouldHideTabBar: boolean): { zIndex: number } | Record<string, never> {
  if (shouldHideTabBar) {
    return {};
  }
  const zIndex = Platform.OS === "web" ? 20000 : 20;
  return { zIndex };
}

function webTabBarPointerStyles(shouldHideTabBar: boolean): Record<string, unknown> {
  if (Platform.OS !== "web" || shouldHideTabBar) {
    return {};
  }
  return {
    touchAction: "manipulation" as const,
    WebkitTouchCallout: "none" as const,
  };
}

type BottomNavigatorTabBarIconProps = Readonly<{
  routeName: keyof BottomTabNavigatorParamList;
  focused: boolean;
  color: string;
  size: number;
}>;

function BottomNavigatorTabBarIcon({
  routeName,
  focused,
  color,
  size,
}: BottomNavigatorTabBarIconProps): React.ReactElement {
  if (routeName === "DonationsTab") {
    return focused ? (
      <Ionicons name="heart" size={size} color={color} />
    ) : (
      <DonationsPulseIcon size={size} color={color} />
    );
  }
  const iconName = getTabBarIconName(routeName, focused);
  return <Ionicons name={iconName} size={size} color={color} />;
}

type ComposerOpenArg = {
  intent?: PostIntent;
  category?: string;
  mode?: ComposerContentMode;
};

/** Maps tab press context to composer store payload (no nested ternaries). */
function buildComposerOpenParams(isAdmin: boolean, composerCategory: string): ComposerOpenArg {
  if (isAdmin) {
    return { intent: "give", category: composerCategory, mode: "task" };
  }
  if (composerCategory === "trump") {
    return { intent: "request", category: "trump" };
  }
  return { intent: "give", category: composerCategory };
}

function createPostTabBarButton(options: {
  isAdmin: boolean;
  composerCategory: string;
  openComposer: (params?: ComposerOpenArg) => void;
  t: (key: string) => string;
}) {
  const { isAdmin, composerCategory, openComposer, t } = options;

  return function PostTabBarButton(props: BottomTabBarButtonProps): React.ReactElement {
    const p = props as Record<string, unknown>;
    const delayLongPress = p.delayLongPress as number | undefined;
    const { style: tabStyle, accessibilityState, testID } = p as BottomTabBarButtonProps;
    const composerParams = buildComposerOpenParams(isAdmin, composerCategory);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isAdmin ? t("accessibility.createPostAdmin") : t("accessibility.createPostUser")}
        accessibilityState={accessibilityState}
        testID={testID}
        delayLongPress={delayLongPress}
        onPress={() => openComposer(composerParams)}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        style={({ pressed }) => [
          tabStyle,
          {
            marginTop: -16, // Elevated slightly more for a professional look
            marginBottom: 0,
            justifyContent: "center",
            alignItems: "center",
            minWidth: 64,
            minHeight: 56,
            paddingBottom: 4,
          },
          Platform.OS === "web" && ({ cursor: "pointer" } as const),
          Platform.OS === "web" && pressed ? { opacity: 0.88 } : null,
        ]}
      >
        <Ionicons name="add-circle" size={54} color={colors.primary} />
      </Pressable>
    );
  };
}

function computeBottomTabScreenOptions(
  route: NestedRouteLike & { name: keyof BottomTabNavigatorParamList },
  mode: string,
  insets: EdgeInsets,
): BottomTabNavigationOptions {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const activeParams = getActiveNestedParams(route) || {};
  const hideBottomBar = activeParams.hideBottomBar === true;
  const siteModeHidesBar = hideDueToSiteMode(mode);
  const shouldHideTabBar = hideBottomBar || siteModeHidesBar;
  const horizontalInset = getHorizontalInset();
  const landscape = isLandscape();
  const barHeight = getBottomTabBarHeight(landscape, isDesktop, isTablet, isLargeDesktop);
  const routeName = route.name;

  return {
    headerShown: false,
    tabBarIcon: ({ focused, color, size }) => (
      <BottomNavigatorTabBarIcon
        routeName={routeName}
        focused={focused}
        color={color}
        size={size + 4} // Slightly larger for better visibility and premium feel
      />
    ),
    tabBarActiveTintColor: colors.bottomNavActive,
    tabBarInactiveTintColor: colors.bottomNavInactive,
    tabBarShowLabel: false,
    tabBarButton: bottomAlignedTabBarButton,
    tabBarStyle: {
      position: "absolute",
      left: horizontalInset,
      right: horizontalInset,
      bottom: Math.max(insets.bottom, 12), // Float the bar above the bottom for a modern dock look
      borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.XLARGE,
      elevation: LAYOUT_CONSTANTS.SHADOW.MEDIUM.elevation,
      height: barHeight,
      paddingHorizontal: 24, // Equalize gaps from edges and between icons
      backgroundColor: colors.cardBackground,
      borderTopWidth: 0, // Remove the default top border for a cleaner look
      display: shouldHideTabBar ? ("none" as const) : ("flex" as const),
      ...tabBarZIndexWhenVisible(shouldHideTabBar),
      ...webTabBarPointerStyles(shouldHideTabBar),
    },
  };
}

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
  const { isGuestMode, isAdmin } = useUser();
  const { mode } = useWebMode();
  /** Re-subscribe on viewport resize so mobile-web tab bar insets stay correct when rotating / chrome hides. */
  useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { openComposer } = usePostComposerStore();
  const composerCategory = useNavigationState((rootState) =>
    mapDonationScreenRouteToComposerCategory(
      getDonationsStackLeafScreenName(rootState as unknown as NavigationState | undefined),
    ),
  );

  const { t } = useTranslation('common');

  const createPostTabBarButtonEl = React.useMemo(
    () =>
      createPostTabBarButton({
        isAdmin,
        composerCategory,
        openComposer,
        t,
      }),
    [isAdmin, composerCategory, openComposer, t],
  );

  // Log when the navigator receives focus (periodic to avoid log spam).
  // NOTE: refreshUserRoles() removed from here — calling it on every tab focus
  // caused unnecessary re-renders and is handled elsewhere in the auth flow.
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('BottomNavigator', 'Navigator focused', undefined, { periodic: true });
    }, []),
  );

  const handleTabPress = (e: any, navigation: any, routeName: string) => {
    const initialRoute = TAB_INITIAL_ROUTES[routeName];
    if (!initialRoute) return;

    // `getParent()` alone can be the root stack (route `HomeStack`) on some RN/web versions — then
    // dispatching `navigate('HomeScreen')` fails ("was not handled by any navigator"). Walk parents.
    const tabNavigation =
      findBottomTabNavigator(navigation as NavLike) ?? navigation.getParent?.();
    const isThisTabSelected =
      typeof tabNavigation?.getState === "function"
        ? isTabNavigatorFocusedOnRoute(tabNavigation, routeName)
        : navigation.isFocused();

    if (isThisTabSelected) {
      if (!tabNavigation?.getState || typeof tabNavigation.dispatch !== 'function') {
        logger.warn(
          'BottomNavigator',
          'nav: same tab re-press — no tab navigator for reset',
          { routeName },
          { periodic: true },
        );
        return;
      }

      // NavLike.getState is typed minimally; reset() needs full navigator fields (key, type, routeNames, stale).
      const tabBarState = tabNavigation.getState() as NavigationState;
      const resetPayload = buildBottomTabBarResetPreservingOtherTabs(
        tabBarState,
        routeName,
      );
      if (!resetPayload) return;

      logger.debug(
        'BottomNavigator',
        'nav: same tab re-press — reset nested stack to initial route (tabs preserved)',
        { routeName, initialRoute },
        { periodic: true },
      );

      e.preventDefault();

      tabNavigation.dispatch(CommonActions.reset(resetPayload));
    }
  };

  return (
    <>
    <Tab.Navigator
      id={undefined}
      initialRouteName="HomeScreen"
      tabBar={BottomTabBarWithoutAdmin}
      screenOptions={({ route }): BottomTabNavigationOptions =>
        computeBottomTabScreenOptions(
          route as NestedRouteLike & { name: keyof BottomTabNavigatorParamList },
          mode,
          insets,
        )
      }
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
        name="CreatePostTab"
        component={CreatePostTabPlaceholder}
        options={{
          tabBarButton: createPostTabBarButtonEl,
        }}
        listeners={{
          tabPress: (e) => e.preventDefault(),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchTabStack}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => handleTabPress(e, navigation, route.name),
        })}
      />
      <Tab.Screen
        name="HomeScreen"
        component={HomeTabStack}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => handleTabPress(e, navigation, route.name),
        })}
      />
      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminStack}
          options={{ 
            tabBarButton: () => null,
          }}
          listeners={({ navigation, route }) => ({
            tabPress: (e) => handleTabPress(e, navigation, route.name),
          })}
        />
      )}
    </Tab.Navigator>
    <CreatePostComposerModal />
    </>
  );
}
