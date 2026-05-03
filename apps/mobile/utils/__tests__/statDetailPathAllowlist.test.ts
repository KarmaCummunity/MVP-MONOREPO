import { isAllowedStatDetailType, STAT_DETAIL_API_TYPES } from '../statDetailPathAllowlist';

describe('statDetailPathAllowlist', () => {
  it('accepts known stat types', () => {
    for (const t of STAT_DETAIL_API_TYPES) {
      expect(isAllowedStatDetailType(t)).toBe(true);
    }
  });

  it('rejects path injection attempts', () => {
    expect(isAllowedStatDetailType('../admin')).toBe(false);
    expect(isAllowedStatDetailType('itemDonations/../../etc')).toBe(false);
    expect(isAllowedStatDetailType('')).toBe(false);
  });
});
