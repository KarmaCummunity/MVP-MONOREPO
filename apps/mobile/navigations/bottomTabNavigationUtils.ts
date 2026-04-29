/**
 * Pure helpers for bottom-tab navigation (nested params + stack reset payload).
 * Keeps BottomNavigator thin and enables Jest coverage without mounting navigators.
 */

/** Leaf route name for each tab's stack when resetting on re-press (Home uses store trigger instead). */
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

/**
 * Returns the `CommonActions.reset` payload for popping a tab's stack to its initial route
 * when the user re-taps the same tab. Returns null if the tab has no reset mapping.
 */
export function buildTabStackResetPayload(tabRouteName: string): {
  index: 0;
  routes: Array<{ name: string; state: { routes: Array<{ name: string }> } }>;
} | null {
  const initialRoute = TAB_INITIAL_ROUTES[tabRouteName];
  if (!initialRoute) return null;
  return {
    index: 0,
    routes: [
      {
        name: tabRouteName,
        state: {
          routes: [{ name: initialRoute }],
        },
      },
    ],
  };
}
