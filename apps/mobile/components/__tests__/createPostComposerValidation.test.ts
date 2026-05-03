import { isTrumpFuelCapInvalid } from '../createPostComposerValidation';

describe('isTrumpFuelCapInvalid', () => {
  it('returns false when fuel mode is not up_to', () => {
    expect(isTrumpFuelCapInvalid('none', '')).toBe(false);
    expect(isTrumpFuelCapInvalid('yes', '')).toBe(false);
  });

  it('returns true for empty, non-numeric, NaN, zero, or negative cap', () => {
    expect(isTrumpFuelCapInvalid('up_to', '')).toBe(true);
    expect(isTrumpFuelCapInvalid('up_to', '0')).toBe(true);
    expect(isTrumpFuelCapInvalid('up_to', '-1')).toBe(true);
    expect(isTrumpFuelCapInvalid('up_to', 'abc')).toBe(true);
  });

  it('returns false for positive finite cap', () => {
    expect(isTrumpFuelCapInvalid('up_to', '50')).toBe(false);
  });
});
