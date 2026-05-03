import {
  findBottomTabNavigator,
  findRootWithHomeStackRoute,
  isLikelyBottomTabNavigator,
  navigateToAuthenticatedLandingSite,
  type NavLike,
} from '../landingSiteNavigation';

describe('landingSiteNavigation', () => {
  describe('isLikelyBottomTabNavigator', () => {
    it('returns true when routes include HomeScreen', () => {
      const nav: NavLike = {
        getState: () => ({
          routes: [{ name: 'HomeScreen' }, { name: 'SearchTab' }],
          index: 0,
        }),
      };
      expect(isLikelyBottomTabNavigator(nav)).toBe(true);
    });

    it('returns false for a single stack (e.g. Search tab stack)', () => {
      const nav: NavLike = {
        getState: () => ({
          routes: [{ name: 'SearchScreen' }, { name: 'SettingsScreen' }],
          index: 0,
        }),
      };
      expect(isLikelyBottomTabNavigator(nav)).toBe(false);
    });
  });

  describe('findBottomTabNavigator', () => {
    it('walks parents from a nested stack to the tab navigator', () => {
      const tabNav: NavLike = {
        getState: () => ({
          routes: [{ name: 'HomeScreen' }, { name: 'SearchTab' }],
          index: 1,
        }),
        dispatch: jest.fn(),
      };
      const stackNav: NavLike = {
        getState: () => ({ routes: [{ name: 'SearchScreen' }], index: 0 }),
        getParent: () => tabNav,
      };
      expect(findBottomTabNavigator(stackNav)).toBe(tabNav);
    });
  });

  describe('findRootWithHomeStackRoute', () => {
    it('finds navigator whose state includes HomeStack', () => {
      const root: NavLike = {
        getState: () => ({
          routes: [{ name: 'HomeStack' }, { name: 'SettingsScreen' }],
          index: 0,
        }),
        dispatch: jest.fn(),
      };
      const leaf: NavLike = {
        getParent: () => root,
      };
      expect(findRootWithHomeStackRoute(leaf)).toBe(root);
    });
  });

  describe('navigateToAuthenticatedLandingSite', () => {
    it('on Home tab without replace, calls navigate on the stack', () => {
      const tabNav: NavLike = {
        getState: () => ({
          routes: [{ name: 'HomeScreen' }, { name: 'SearchTab' }],
          index: 0,
        }),
        dispatch: jest.fn(),
      };
      const stackNav: NavLike = {
        getState: () => ({ routes: [{ name: 'HomeMain' }], index: 0 }),
        getParent: () => tabNav,
        navigate: jest.fn(),
      };
      navigateToAuthenticatedLandingSite(stackNav as never, {});
      expect(stackNav.navigate).toHaveBeenCalledWith('LandingSiteScreen');
      expect(tabNav.dispatch).not.toHaveBeenCalled();
    });

    it('on Home tab with replaceFromTopBar, dispatches StackActions.replace', () => {
      const tabNav: NavLike = {
        getState: () => ({
          routes: [{ name: 'HomeScreen' }, { name: 'SearchTab' }],
          index: 0,
        }),
        dispatch: jest.fn(),
      };
      const stackNav: NavLike = {
        getState: () => ({ routes: [{ name: 'NotificationsScreen' }], index: 0 }),
        getParent: () => tabNav,
        dispatch: jest.fn(),
      };
      navigateToAuthenticatedLandingSite(stackNav as never, { replaceFromTopBar: true });
      expect(stackNav.dispatch).toHaveBeenCalled();
      const action = (stackNav.dispatch as jest.Mock).mock.calls[0][0] as { type: string };
      expect(action.type).toBe('REPLACE');
    });

    it('on Search tab dispatches navigate to HomeScreen with nested LandingSiteScreen', () => {
      const tabNav: NavLike = {
        getState: () => ({
          routes: [{ name: 'HomeScreen' }, { name: 'SearchTab' }],
          index: 1,
        }),
        dispatch: jest.fn(),
      };
      const stackNav: NavLike = {
        getState: () => ({ routes: [{ name: 'SearchScreen' }], index: 0 }),
        getParent: () => tabNav,
      };
      navigateToAuthenticatedLandingSite(stackNav as never, {});
      expect(tabNav.dispatch).toHaveBeenCalled();
      const action = (tabNav.dispatch as jest.Mock).mock.calls[0][0] as {
        type: string;
        payload?: { name?: string; params?: { screen?: string } };
      };
      expect(action.type).toBe('NAVIGATE');
      expect(action.payload?.name).toBe('HomeScreen');
      expect(action.payload?.params?.screen).toBe('LandingSiteScreen');
    });

    it('without tab nav but with root HomeStack, dispatches nested HomeStack navigate', () => {
      const root: NavLike = {
        getState: () => ({
          routes: [{ name: 'HomeStack' }],
          index: 0,
        }),
        dispatch: jest.fn(),
        getParent: () => undefined,
      };
      const orphan: NavLike = {
        getState: () => ({ routes: [{ name: 'SettingsScreen' }], index: 0 }),
        getParent: () => root,
      };
      navigateToAuthenticatedLandingSite(orphan as never, {});
      expect(root.dispatch).toHaveBeenCalled();
    });
  });
});
