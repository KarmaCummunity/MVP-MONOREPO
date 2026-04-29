import type { NavigationState } from '@react-navigation/native';
import { getActiveNavigationScreenChain } from '../getActiveNavigationScreenChain';

describe('getActiveNavigationScreenChain', () => {
  it('returns empty array for undefined', () => {
    expect(getActiveNavigationScreenChain(undefined)).toEqual([]);
  });

  it('returns single route when no nested state', () => {
    const state = {
      index: 0,
      routes: [{ key: 'a', name: 'Home' }],
    } as NavigationState;
    expect(getActiveNavigationScreenChain(state)).toEqual(['Home']);
  });

  it('follows active branch through nested navigators', () => {
    const state = {
      index: 0,
      routes: [
        {
          key: 'root',
          name: 'Main',
          state: {
            index: 1,
            routes: [
              { key: 't0', name: 'TabA' },
              {
                key: 't1',
                name: 'TabB',
                state: {
                  index: 0,
                  routes: [{ key: 's0', name: 'Settings' }],
                },
              },
            ],
          },
        },
      ],
    } as unknown as NavigationState;

    expect(getActiveNavigationScreenChain(state)).toEqual(['Main', 'TabB', 'Settings']);
  });

  it('uses outer route when nested state is missing', () => {
    const state = {
      index: 0,
      routes: [{ key: 'm', name: 'Modal' }],
    } as NavigationState;
    expect(getActiveNavigationScreenChain(state)).toEqual(['Modal']);
  });
});
