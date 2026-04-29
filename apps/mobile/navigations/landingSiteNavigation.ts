/**
 * Typed navigation to the marketing / site landing screen for authenticated users.
 * `LandingSiteScreen` is registered only on `HomeTabStack` (SRS §4.4 dedupe); callers from
 * other tabs or the root stack must use this helper instead of `navigate('LandingSiteScreen')`.
 */

import { CommonActions, StackActions } from '@react-navigation/native';
import { logger } from '../utils/loggerService';

const LOG = 'nav:LandingSite';

const BOTTOM_TAB_ROUTE_NAMES = new Set([
  'HomeScreen',
  'SearchTab',
  'DonationsTab',
  'CreatePostTab',
  'ProfileScreen',
  'AdminTab',
]);

export type NavLike = {
  getState?: () => { routes?: { name?: string }[]; index?: number } | undefined;
  getParent?: () => NavLike | undefined;
  dispatch?: (action: unknown) => void;
  navigate?: (name: string, params?: unknown) => void;
};

export function isLikelyBottomTabNavigator(nav: NavLike | null | undefined): boolean {
  if (!nav?.getState) return false;
  const state = nav.getState();
  const routes = state?.routes;
  if (!Array.isArray(routes) || routes.length === 0) return false;
  return routes.some((r) => r?.name != null && BOTTOM_TAB_ROUTE_NAMES.has(r.name));
}

/** Walk parents until the bottom tab navigator (Home / Search / …) is found. */
export function findBottomTabNavigator(navigation: NavLike | null | undefined): NavLike | null {
  let nav: NavLike | undefined = navigation ?? undefined;
  let depth = 0;
  while (nav && depth < 16) {
    if (isLikelyBottomTabNavigator(nav)) return nav;
    nav = nav.getParent?.() ?? undefined;
    depth += 1;
  }
  return null;
}

/** Root stack navigator that owns the `HomeStack` route (authenticated MainNavigator). */
export function findRootWithHomeStackRoute(navigation: NavLike | null | undefined): NavLike | null {
  let nav: NavLike | undefined = navigation ?? undefined;
  let depth = 0;
  while (nav && depth < 20) {
    const state = nav.getState?.();
    const routes = state?.routes;
    if (Array.isArray(routes) && routes.some((r) => r?.name === 'HomeStack')) {
      return nav;
    }
    nav = nav.getParent?.() ?? undefined;
    depth += 1;
  }
  return null;
}

export type NavigateToAuthenticatedLandingSiteOptions = {
  /**
   * When true and the focused tab is Home, use stack replace (top bar mutual exclusivity).
   * Ignored when the user is on another tab (we switch tab + navigate instead).
   */
  replaceFromTopBar?: boolean;
};

/**
 * Open `LandingSiteScreen` inside `HomeTabStack` for logged-in / guest-in-app users.
 * @param navigation — Any React Navigation object with `getParent` / `dispatch` / `navigate` (typed loosely to avoid stack param assignability issues).
 */
export function navigateToAuthenticatedLandingSite(
  navigation: unknown,
  options?: NavigateToAuthenticatedLandingSiteOptions,
): void {
  const nav = navigation as NavLike;
  const replaceFromTopBar = options?.replaceFromTopBar === true;

  const tabNav = findBottomTabNavigator(nav);
  if (tabNav?.getState && tabNav.dispatch) {
    const state = tabNav.getState();
    const idx = typeof state?.index === 'number' ? state.index : 0;
    const currentTab = state?.routes?.[idx]?.name;

    if (currentTab === 'HomeScreen') {
      const inner = nav;
      if (replaceFromTopBar && inner.dispatch) {
        inner.dispatch(StackActions.replace('LandingSiteScreen', {}));
        return;
      }
      inner.navigate?.('LandingSiteScreen');
      return;
    }

    tabNav.dispatch(
      CommonActions.navigate({
        name: 'HomeScreen',
        params: { screen: 'LandingSiteScreen' },
      }) as never,
    );
    return;
  }

  const rootNav = findRootWithHomeStackRoute(nav);
  if (rootNav?.dispatch) {
    rootNav.dispatch(
      CommonActions.navigate({
        name: 'HomeStack',
        params: {
          screen: 'HomeScreen',
          params: { screen: 'LandingSiteScreen' },
        },
      }) as never,
    );
    return;
  }

  logger.warn(LOG, 'Skipped navigate — no Bottom tab or root stack with HomeStack in parent chain', undefined, {
    periodic: true,
  });
}
