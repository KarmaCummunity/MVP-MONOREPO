import { checkNavigationGuards } from '../navigationGuards';

describe('navigationGuards', () => {
  describe('redirect targets for root stack reset', () => {
    it('redirects guest ProfileTab navigate to HomeStack (not nested HomeScreen)', async () => {
      const result = await checkNavigationGuards(
        { type: 'navigate', routeName: 'ProfileTab' },
        { isAuthenticated: true, isGuestMode: true, isAdmin: false },
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.redirectTo).toBe('HomeStack');
      }
    });

    it('redirects non-admin AdminTab navigate to HomeStack', async () => {
      const result = await checkNavigationGuards(
        { type: 'navigate', routeName: 'AdminTab' },
        { isAuthenticated: true, isGuestMode: false, isAdmin: false },
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.redirectTo).toBe('HomeStack');
      }
    });
  });
});
