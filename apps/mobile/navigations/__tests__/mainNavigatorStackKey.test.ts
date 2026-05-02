import { computeMainNavigatorStackKey } from '../mainNavigatorStackKey';

describe('computeMainNavigatorStackKey', () => {
  it('uses auth branch when authenticated', () => {
    expect(computeMainNavigatorStackKey('app', true, false)).toBe('stack-app-auth');
  });

  it('uses auth branch when guest (guest counts as in-app session)', () => {
    expect(computeMainNavigatorStackKey('app', false, true)).toBe('stack-app-auth');
  });

  it('uses unauth branch when logged out and not guest', () => {
    expect(computeMainNavigatorStackKey('app', false, false)).toBe('stack-app-unauth');
  });

  it('embeds web mode in key so site vs app remounts stack', () => {
    expect(computeMainNavigatorStackKey('site', false, false)).toBe('stack-site-unauth');
    expect(computeMainNavigatorStackKey('app', false, false)).toBe('stack-app-unauth');
  });
});
