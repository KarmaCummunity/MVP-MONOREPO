import {
  donationIdFromSyntheticFeedId,
  isLegacyTimestampItemId,
  isUuid,
  isValidDedicatedItemId,
} from '../feedPostEntityIds';

describe('feedPostEntityIds', () => {
  it('isUuid accepts v4 shape', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('isLegacyTimestampItemId detects millis-like ids', () => {
    expect(isLegacyTimestampItemId('1715000000000')).toBe(true);
    expect(isLegacyTimestampItemId('33333333-3333-3333-3333-333333333333')).toBe(false);
  });

  it('donationIdFromSyntheticFeedId parses donation_ prefix', () => {
    const id = '44444444-4444-4444-4444-444444444444';
    expect(donationIdFromSyntheticFeedId(`donation_${id}`)).toBe(id);
    expect(donationIdFromSyntheticFeedId(undefined)).toBeUndefined();
    expect(donationIdFromSyntheticFeedId('donation_not-uuid')).toBeUndefined();
  });

  it('isValidDedicatedItemId rejects legacy timestamp', () => {
    expect(isValidDedicatedItemId('1715000000000')).toBe(false);
    expect(isValidDedicatedItemId('abc')).toBe(true);
  });
});
