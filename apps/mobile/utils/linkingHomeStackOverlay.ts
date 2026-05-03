/**
 * Deep-link state repair for screens that are registered on both the root stack and inside
 * HomeTabStack. Root-level URLs (e.g. /settings) used to resolve to a root route above
 * HomeStack, which hides BottomNavigator after refresh on web.
 */

import type { NavigationState, PartialState } from '@react-navigation/native';
import type { BottomTabNavigatorParamList } from '../globals/types';
import { KC_ORGANIZATION_ROOT_EMAIL } from './org.constants';
import { useUserStore } from '../stores/userStore';

/** Names must match MainNavigator + HomeTabStack screen names. */
const HOME_TAB_OVERLAY_ROUTE_NAMES = new Set<string>([
  'SettingsScreen',
  'NotificationsScreen',
  'ChatListScreen',
  'AboutKarmaCommunityScreen',
  'BookmarksScreen',
  'DiscoverPeopleScreen',
]);

type TabRouteName = keyof BottomTabNavigatorParamList;

function computeIsAdminFromStore(): boolean {
  const { selectedUser } = useUserStore.getState();
  if (!selectedUser) return false;
  const emailKey = (selectedUser.email || '').toLowerCase();
  if (emailKey === KC_ORGANIZATION_ROOT_EMAIL.toLowerCase()) return true;
  const roles = Array.isArray(selectedUser.roles) ? selectedUser.roles : [];
  return (
    roles.includes('admin') ||
    roles.includes('super_admin') ||
    roles.includes('org_admin')
  );
}

function getFocusedRootRouteName(
  state: PartialState<NavigationState> | undefined,
): string | undefined {
  if (!state?.routes?.length) return undefined;
  const index =
    typeof state.index === 'number' ? state.index : Math.max(0, state.routes.length - 1);
  return state.routes[index]?.name;
}

function buildHomeStackStateWithHomeTabLeaf(
  leafName: string,
  leafParams: Record<string, unknown> | undefined,
): PartialState<NavigationState> {
  const { isGuestMode } = useUserStore.getState();
  const isAdmin = computeIsAdminFromStore();

  const profileTabs = isGuestMode
    ? []
    : [
        {
          name: 'ProfileScreen' as TabRouteName,
          state: {
            routes: [{ name: 'ProfileMain' }],
            index: 0,
          },
        },
      ];

  const adminTail = isAdmin
    ? [
        {
          name: 'AdminTab' as TabRouteName,
          state: {
            routes: [{ name: 'AdminDashboard' }],
            index: 0,
          },
        },
      ]
    : [];

  const leafRoute =
    leafParams && Object.keys(leafParams).length > 0
      ? { name: leafName, params: leafParams }
      : { name: leafName };

  const tabRoutes = [
    ...profileTabs,
    {
      name: 'DonationsTab' as TabRouteName,
      state: {
        routes: [{ name: 'DonationsScreen' }],
        index: 0,
      },
    },
    { name: 'CreatePostTab' as TabRouteName },
    {
      name: 'SearchTab' as TabRouteName,
      state: {
        routes: [{ name: 'SearchScreen' }],
        index: 0,
      },
    },
    {
      name: 'HomeScreen' as TabRouteName,
      state: {
        routes: [{ name: 'HomeMain' }, leafRoute],
        index: 1,
      },
    },
    ...adminTail,
  ];

  const homeTabIndex = tabRoutes.findIndex((r) => r.name === 'HomeScreen');
  const safeIndex = Math.max(0, homeTabIndex);

  return {
    type: 'stack',
    routes: [
      {
        name: 'HomeStack',
        state: {
          type: 'tab',
          routes: tabRoutes,
          index: safeIndex,
        },
      },
    ],
    index: 0,
  };
}

/**
 * When `getStateFromPath` yields a root-level "overlay" screen, rewrite navigation state so the
 * screen sits inside HomeTabStack on the Home tab — matching in-app navigation from TopBarNavigator.
 */
export function mergeOverlayNavigationStateWithHomeStack(
  resolved: PartialState<NavigationState> | undefined,
  _options: unknown,
  allowsHomeStack: boolean,
): PartialState<NavigationState> | undefined {
  if (!resolved || !allowsHomeStack) return resolved;

  const focusedName = getFocusedRootRouteName(resolved);
  if (!focusedName || !HOME_TAB_OVERLAY_ROUTE_NAMES.has(focusedName)) return resolved;

  const idx =
    typeof resolved.index === 'number' ? resolved.index : Math.max(0, resolved.routes.length - 1);
  const focusedRoute = resolved.routes[idx];

  // Already under HomeStack (nested linking config)
  if (focusedRoute?.name === 'HomeStack') return resolved;

  const overlayRoute = resolved.routes?.find((r) => r.name === focusedName);
  const rawParams = overlayRoute?.params;
  const leafParams =
    rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams)
      ? (rawParams as Record<string, unknown>)
      : undefined;

  return buildHomeStackStateWithHomeTabLeaf(focusedName, leafParams);
}
