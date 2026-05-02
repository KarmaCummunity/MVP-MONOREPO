/**
 * Pure helpers for bottom-tab navigation (nested params + stack reset payload).
 * Keeps BottomNavigator thin and enables Jest coverage without mounting navigators.
 */

/** Leaf route name for each tab's stack when resetting on re-press (same mechanism for all tabs). */
export const TAB_INITIAL_ROUTES: Readonly<Record<string, string>> = {
  HomeScreen: 'HomeMain',
  SearchTab: 'SearchScreen',
  DonationsTab: 'DonationsScreen',
  ProfileScreen: 'ProfileMain',
  AdminTab: 'AdminDashboard',
};

/** Minimal route shape from react-navigation (recursive nested state). */
export type NestedRouteLike = {
  state?: { index?: number; routes?: NestedRouteLike[] };
  params?: Record<string, unknown> & {
    state?: { index?: number; routes?: NestedRouteLike[] };
  };
};

/**
 * Walks to the focused leaf in a tab route and returns its params (e.g. hideBottomBar).
 * Mirrors previous inline logic in BottomNavigator screenOptions.
 */
export function getActiveNestedParams(
  route: NestedRouteLike | undefined,
): Record<string, unknown> | undefined {
  if (!route) return undefined;
  const state = route.state ?? route.params?.state;
  if (!state) return route.params as Record<string, unknown> | undefined;
  const nestedRoute = state.routes?.[state.index ?? 0];
  if (nestedRoute) return getActiveNestedParams(nestedRoute as NestedRouteLike);
  return route.params as Record<string, unknown> | undefined;
}

/**
 * Whether the bottom tab navigator's **selected** tab matches `routeName`.
 * Prefer this over `navigation.isFocused()` inside `tabPress` listeners on Web, where
 * `isFocused()` has been observed to disagree with the actual selected tab (wrong `preventDefault`).
 */
export function isTabNavigatorFocusedOnRoute(
  tabNavigation: {
    getState?: () => { index?: number; routes?: Array<{ name?: string }> };
  } | undefined,
  routeName: string,
): boolean {
  if (!tabNavigation?.getState) return false;
  const state = tabNavigation.getState();
  const route = state.routes?.[state.index ?? 0];
  return route?.name === routeName;
}

/** Single route entry inside a tab navigator's `routes` array (minimal shape for reset). */
export type TabNavigatorRouteState = {
  name: string;
  key?: string;
  params?: Record<string, unknown>;
  state?: { index?: number; routes?: Array<{ name: string; key?: string }> };
};

/**
 * Builds a **bottom tab navigator** `CommonActions.reset` payload that resets **one** tab's
 * nested stack to its initial screen while **preserving all other tabs** and the active tab index.
 *
 * Important: resetting with only one route (see previous `buildTabStackResetPayload`) removes every
 * other tab from state → blank web views and “lost” Donations/Search tabs.
 */
export function buildBottomTabBarResetPreservingOtherTabs(
  tabBarState: { index?: number; routes?: TabNavigatorRouteState[] },
  tabRouteName: string,
): { index: number; routes: TabNavigatorRouteState[] } | null {
  const initialRoute = TAB_INITIAL_ROUTES[tabRouteName];
  if (!initialRoute) return null;

  const routes = tabBarState.routes;
  if (!Array.isArray(routes) || routes.length === 0) return null;

  const targetNames = new Set(routes.map((r) => r.name));
  if (!targetNames.has(tabRouteName)) return null;

  const nextRoutes = routes.map((r) => {
    if (r.name !== tabRouteName) return r;
    return {
      ...r,
      state: {
        index: 0,
        routes: [{ name: initialRoute }],
      },
    };
  });

  const idx =
    typeof tabBarState.index === 'number' &&
    tabBarState.index >= 0 &&
    tabBarState.index < nextRoutes.length
      ? tabBarState.index
      : 0;

  return { index: idx, routes: nextRoutes };
}
