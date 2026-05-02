import {
  TAB_INITIAL_ROUTES,
  getActiveNestedParams,
  buildBottomTabBarResetPreservingOtherTabs,
  isTabNavigatorFocusedOnRoute,
  type NestedRouteLike,
} from '../bottomTabNavigationUtils';

describe('bottomTabNavigationUtils', () => {
  describe('TAB_INITIAL_ROUTES', () => {
    it('maps each tab to its stack root screen name', () => {
      expect(TAB_INITIAL_ROUTES.HomeScreen).toBe('HomeMain');
      expect(TAB_INITIAL_ROUTES.SearchTab).toBe('SearchScreen');
      expect(TAB_INITIAL_ROUTES.DonationsTab).toBe('DonationsScreen');
      expect(TAB_INITIAL_ROUTES.ProfileScreen).toBe('ProfileMain');
      expect(TAB_INITIAL_ROUTES.AdminTab).toBe('AdminDashboard');
    });
  });

  describe('getActiveNestedParams', () => {
    it('returns route.params when there is no nested navigator state', () => {
      const route: NestedRouteLike = {
        params: { hideBottomBar: true, foo: 'bar' },
      };
      expect(getActiveNestedParams(route)).toEqual({
        hideBottomBar: true,
        foo: 'bar',
      });
    });

    it('reads hideBottomBar from the deepest focused leaf', () => {
      const route: NestedRouteLike = {
        state: {
          index: 0,
          routes: [
            {
              name: 'HomeMain',
              state: {
                index: 1,
                routes: [
                  { name: 'NotificationsScreen', params: {} },
                  { name: 'SettingsScreen', params: { hideBottomBar: true } },
                ],
              },
            },
          ],
        },
      };
      expect(getActiveNestedParams(route)?.hideBottomBar).toBe(true);
    });

    it('returns undefined for undefined route', () => {
      expect(getActiveNestedParams(undefined)).toBeUndefined();
    });

    it('uses params.state when route.state is absent (hydration edge)', () => {
      const route: NestedRouteLike = {
        params: {
          state: {
            index: 0,
            routes: [{ name: 'X', params: { hideBottomBar: true } }],
          },
        },
      };
      expect(getActiveNestedParams(route)?.hideBottomBar).toBe(true);
    });

    it('falls back to route.params when nested routes array is empty', () => {
      const route: NestedRouteLike = {
        params: { fallback: true },
        state: { index: 0, routes: [] },
      };
      expect(getActiveNestedParams(route)?.fallback).toBe(true);
    });
  });

  describe('isTabNavigatorFocusedOnRoute', () => {
    it('returns true when the active tab route name matches', () => {
      const tabNavigation = {
        getState: () => ({
          index: 2,
          routes: [
            { name: 'ProfileScreen' },
            { name: 'DonationsTab' },
            { name: 'SearchTab' },
            { name: 'HomeScreen' },
          ],
        }),
      };
      expect(isTabNavigatorFocusedOnRoute(tabNavigation, 'SearchTab')).toBe(true);
    });

    it('returns false when the active tab route name differs', () => {
      const tabNavigation = {
        getState: () => ({
          index: 0,
          routes: [{ name: 'SearchTab' }, { name: 'HomeScreen' }],
        }),
      };
      expect(isTabNavigatorFocusedOnRoute(tabNavigation, 'HomeScreen')).toBe(false);
    });

    it('returns false when getState is missing', () => {
      expect(isTabNavigatorFocusedOnRoute(undefined, 'HomeScreen')).toBe(false);
    });
  });

  describe('buildBottomTabBarResetPreservingOtherTabs', () => {
    const sampleTabState = (guest: boolean) => ({
      index: 1,
      routes: [
        ...(guest
          ? []
          : [
              {
                name: 'ProfileScreen' as const,
                key: 'p1',
                state: { index: 0, routes: [{ name: 'ProfileMain' }] },
              },
            ]),
        { name: 'DonationsTab' as const, key: 'd1', state: { index: 0, routes: [{ name: 'DonationsScreen' }] } },
        { name: 'CreatePostTab' as const, key: 'c1' },
        { name: 'SearchTab' as const, key: 's1', state: { index: 0, routes: [{ name: 'SearchScreen' }] } },
        { name: 'HomeScreen' as const, key: 'h1', state: { index: 0, routes: [{ name: 'HomeMain' }] } },
      ],
    });

    it('resets one tab stack and preserves other tabs and index', () => {
      const before = sampleTabState(false);
      const result = buildBottomTabBarResetPreservingOtherTabs(before, 'SearchTab');
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.index).toBe(1);
      expect(result.routes).toHaveLength(5);
      const search = result.routes.find((r) => r.name === 'SearchTab');
      expect(search?.state).toEqual({
        index: 0,
        routes: [{ name: 'SearchScreen' }],
      });
      const donations = result.routes.find((r) => r.name === 'DonationsTab');
      expect(donations?.key).toBe('d1');
    });

    it('returns null for unknown tab names', () => {
      expect(
        buildBottomTabBarResetPreservingOtherTabs({ index: 0, routes: [] }, 'SearchTab'),
      ).toBeNull();
      expect(
        buildBottomTabBarResetPreservingOtherTabs(
          { index: 0, routes: [{ name: 'SearchTab' }] },
          'CreatePostTab',
        ),
      ).toBeNull();
    });
  });
});
