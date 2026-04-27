import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-crypto', () => ({
  randomUUID: jest
    .fn()
    .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
    .mockReturnValueOnce('22222222-2222-4222-8222-222222222222'),
}));

import { generateId } from '../id';

describe('generateId', () => {
  it('prefixes a v4 UUID and yields distinct values per call', () => {
    const a = generateId('msg');
    const b = generateId('msg');
    expect(a).toBe('msg_11111111-1111-4111-8111-111111111111');
    expect(b).toBe('msg_22222222-2222-4222-8222-222222222222');
    expect(a).not.toBe(b);
  });
});
