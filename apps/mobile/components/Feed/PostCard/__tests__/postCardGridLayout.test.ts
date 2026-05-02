import { isGridFixedHeight, resolveGridFixedOuterStyle } from '../postCardGridLayout';

describe('postCardGridLayout', () => {
  it('returns undefined when not grid or no height', () => {
    expect(resolveGridFixedOuterStyle(false, 320)).toBeUndefined();
    expect(resolveGridFixedOuterStyle(true, undefined)).toBeUndefined();
  });

  it('returns fixed height style when grid height provided', () => {
    expect(resolveGridFixedOuterStyle(true, 300)).toEqual({ height: 300, minHeight: 300 });
  });

  it('isGridFixedHeight mirrors resolved style presence', () => {
    expect(isGridFixedHeight(undefined)).toBe(false);
    expect(isGridFixedHeight({ height: 1, minHeight: 1 })).toBe(true);
  });
});
