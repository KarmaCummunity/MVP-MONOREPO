import {
  getDonationsStackLeafScreenName,
  getFocusedDonationsLeafRouteName,
  mapDonationScreenRouteToComposerCategory,
} from '../mapDonationScreenToComposerCategory';
import type { NavigationState } from '@react-navigation/native';

describe('mapDonationScreenRouteToComposerCategory', () => {
  it('maps known donation screens', () => {
    expect(mapDonationScreenRouteToComposerCategory('TrumpScreen')).toBe('trump');
    expect(mapDonationScreenRouteToComposerCategory('MyChallengesScreen')).toBe('challenges');
    expect(mapDonationScreenRouteToComposerCategory('CommunityChallengesScreen')).toBe('challenges');
    expect(mapDonationScreenRouteToComposerCategory('ChallengeDetailsScreen')).toBe('challenges');
  });

  it('defaults unknown screens to items', () => {
    expect(mapDonationScreenRouteToComposerCategory('ItemsScreen')).toBe('items');
    expect(mapDonationScreenRouteToComposerCategory('DonationsScreen')).toBe('items');
    expect(mapDonationScreenRouteToComposerCategory(undefined)).toBe('items');
  });
});

describe('getFocusedDonationsLeafRouteName', () => {
  const itemsLeaf = { key: 'Items-1', name: 'ItemsScreen', params: {} };

  it('returns leaf route when DonationsTab is focused', () => {
    const state = {
      key: 'tab',
      index: 1,
      routeNames: ['HomeScreen', 'DonationsTab'],
      routes: [
        { key: 'h', name: 'HomeScreen' },
        {
          key: 'd',
          name: 'DonationsTab',
          state: {
            key: 'stack',
            index: 0,
            routeNames: ['ItemsScreen'],
            routes: [itemsLeaf],
          } as NavigationState,
        },
      ],
    } as unknown as NavigationState;
    expect(getFocusedDonationsLeafRouteName(state)).toBe('ItemsScreen');
  });

  it('returns undefined when another tab is focused', () => {
    const state = {
      key: 'tab',
      index: 0,
      routeNames: ['HomeScreen', 'DonationsTab'],
      routes: [
        { key: 'h', name: 'HomeScreen' },
        {
          key: 'd',
          name: 'DonationsTab',
          state: {
            index: 0,
            routes: [itemsLeaf],
          } as NavigationState,
        },
      ],
    } as unknown as NavigationState;
    expect(getFocusedDonationsLeafRouteName(state)).toBeUndefined();
  });
});

describe('getDonationsStackLeafScreenName', () => {
  it('finds DonationsTab nested under a root stack (MainNavigator-style)', () => {
    const itemsLeaf = { key: 'Items-1', name: 'ItemsScreen', params: {} };
    const root = {
      key: 'root',
      index: 0,
      routes: [
        {
          key: 'HomeStack',
          name: 'HomeStack',
          state: {
            key: 'tabs',
            index: 2,
            routes: [
              { key: 'p', name: 'ProfileScreen' },
              {
                key: 'd',
                name: 'DonationsTab',
                state: {
                  index: 0,
                  routes: [itemsLeaf],
                } as NavigationState,
              },
              { key: 'c', name: 'CreatePostTab' },
            ],
          } as NavigationState,
        },
      ],
    } as unknown as NavigationState;

    expect(getDonationsStackLeafScreenName(root)).toBe('ItemsScreen');
  });
});
