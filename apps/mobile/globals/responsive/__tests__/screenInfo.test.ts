import { getScreenInfoFromDimensions } from '../screenInfo';

jest.mock('../platform', () => ({
  isWeb: false,
}));

describe('getScreenInfoFromDimensions (native layoutWidth = shortest side)', () => {
  it('classifies landscape phone by shortest side, not long edge', () => {
    const info = getScreenInfoFromDimensions(844, 390);
    expect(info.layoutWidth).toBe(390);
    expect(info.layoutBucket).toBe('phone');
    expect(info.isTablet).toBe(false);
  });

  it('classifies standard portrait phone width', () => {
    const info = getScreenInfoFromDimensions(375, 812);
    expect(info.layoutWidth).toBe(375);
    expect(info.layoutBucket).toBe('phone');
  });
});
