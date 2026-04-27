import { getScreenInfoFromDimensions } from '../screenInfo';
import { pickByLayout, pickByPlatform, pickResponsive } from '../layout';

jest.mock('../platform', () => ({
  isWeb: false,
  getPlatformKind: () => 'ios' as const,
}));

describe('pickByLayout', () => {
  it('returns default when no tier overrides', () => {
    const info = getScreenInfoFromDimensions(400, 800);
    expect(pickByLayout({ default: 'a' }, info)).toBe('a');
  });

  it('applies mobile-first overrides up to current bucket', () => {
    const info = getScreenInfoFromDimensions(900, 800);
    expect(info.layoutBucket).toBe('tablet');
    const v = pickByLayout(
      { default: 1, phone: 2, tablet: 3, desktop: 4 },
      info
    );
    expect(v).toBe(3);
  });
});

describe('pickByPlatform', () => {
  it('falls back to default when platform key missing', () => {
    expect(pickByPlatform({ default: 10, android: 20 }, 'ios')).toBe(10);
  });

  it('uses explicit platform value', () => {
    expect(pickByPlatform({ default: 10, web: 30 }, 'web')).toBe(30);
  });
});

describe('pickResponsive', () => {
  it('merges layout pick with platform override for current platform', () => {
    const info = getScreenInfoFromDimensions(400, 800);
    const v = pickResponsive(
      { default: 'layout' },
      info,
      { ios: 'ios-override' }
    );
    expect(v).toBe('ios-override');
  });
});
