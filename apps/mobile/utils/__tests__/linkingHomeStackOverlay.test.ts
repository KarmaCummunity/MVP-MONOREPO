import { mergeOverlayNavigationStateWithHomeStack } from '../linkingHomeStackOverlay';

jest.mock('../../stores/userStore', () => ({
  useUserStore: {
    getState: jest.fn(),
  },
}));

import { useUserStore } from '../../stores/userStore';

describe('mergeOverlayNavigationStateWithHomeStack', () => {
  const mockGetState = useUserStore.getState as jest.MockedFunction<typeof useUserStore.getState>;

  beforeEach(() => {
    mockGetState.mockReturnValue({
      isGuestMode: true,
      selectedUser: null,
    } as ReturnType<typeof useUserStore.getState>);
  });

  it('returns unchanged when resolved is undefined', () => {
    expect(mergeOverlayNavigationStateWithHomeStack(undefined, {}, true)).toBeUndefined();
  });

  it('returns unchanged when allowsHomeStack is false', () => {
    const input = { routes: [{ name: 'SettingsScreen' as const }], index: 0 };
    expect(mergeOverlayNavigationStateWithHomeStack(input, {}, false)).toBe(input);
  });

  it('returns unchanged for routes that are not home-tab overlays', () => {
    const input = { routes: [{ name: 'ChatDetailScreen' as const }], index: 0 };
    expect(mergeOverlayNavigationStateWithHomeStack(input, {}, true)).toBe(input);
  });

  it('rewrites root overlay screen into HomeStack → HomeScreen stack (guest)', () => {
    const out = mergeOverlayNavigationStateWithHomeStack(
      { routes: [{ name: 'SettingsScreen' as const }], index: 0 },
      {},
      true,
    );

    expect(out?.routes?.[0]?.name).toBe('HomeStack');
    const tabState = out?.routes?.[0]?.state;
    expect(tabState?.type).toBe('tab');
    const tabRoutes = tabState?.routes;
    const tabIndex = tabState?.index ?? 0;
    expect(tabRoutes?.[tabIndex]?.name).toBe('HomeScreen');

    const homeLeafState = tabRoutes?.[tabIndex]?.state;
    expect(homeLeafState?.index).toBe(1);
    expect(homeLeafState?.routes?.[1]?.name).toBe('SettingsScreen');
  });

  it('passes through when focused route is already HomeStack', () => {
    const input = {
      routes: [{ name: 'HomeStack' as const, state: { index: 0, routes: [] } }],
      index: 0,
    };
    expect(mergeOverlayNavigationStateWithHomeStack(input, {}, true)).toBe(input);
  });
});
