// Unit tests for the SSoT AuthSessionService client pipeline.
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the apiService used internally for one-shot canonical id resolution.
// `mock`-prefixed names are required by jest's hoisting rules for jest.mock factories.
// Typed as `any` to allow flexible return shapes across tests without bloating the suite.
const mockResolveUserId: jest.Mock<any> = jest.fn() as any;
const mockGetUserById: jest.Mock<any> = jest.fn() as any;

jest.mock('../../utils/apiService', () => ({
  __esModule: true,
  apiService: {
    resolveUserId: mockResolveUserId,
    getUserById: mockGetUserById,
    getAuthToken: jest.fn(),
  },
}));

// Mock the project logger (called freely throughout the service).
jest.mock('../../utils/loggerService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the database service so any indirect import does not pull native code.
jest.mock('../../utils/databaseService', () => ({
  db: { listOrgApplications: jest.fn(async () => []) },
  DatabaseService: { clearLocalCollections: jest.fn(async () => undefined) },
}));

// In-memory AsyncStorage backing for deterministic tests.
// Prefixed with `mock` so jest.mock factories can reference it (jest convention).
const mockMemoryStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) =>
      mockMemoryStorage.has(key) ? mockMemoryStorage.get(key)! : null,
    ),
    setItem: jest.fn(async (key: string, value: string) => {
      mockMemoryStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockMemoryStorage.delete(key);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      for (const k of keys) mockMemoryStorage.delete(k);
    }),
    multiGet: jest.fn(async (keys: string[]) =>
      keys.map((k) => [k, mockMemoryStorage.has(k) ? mockMemoryStorage.get(k)! : null]),
    ),
    multiSet: jest.fn(async (entries: [string, string][]) => {
      for (const [k, v] of entries) mockMemoryStorage.set(k, v);
    }),
    clear: jest.fn(async () => {
      mockMemoryStorage.clear();
    }),
    getAllKeys: jest.fn(async () => Array.from(mockMemoryStorage.keys())),
  },
}));

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-1234567890ab';

import { AuthSessionService, STORAGE_KEYS } from '../AuthSessionService';
import {
  isCanonicalUserProfileUuid,
  asUserProfileId,
} from '../userProfileId';

beforeEach(() => {
  mockMemoryStorage.clear();
  mockResolveUserId.mockReset();
  mockGetUserById.mockReset();
  AuthSessionService.__resetForTests();
});

describe('userProfileId guard', () => {
  it('isCanonicalUserProfileUuid accepts any well-formed UUID and rejects firebase-style ids', () => {
    expect(isCanonicalUserProfileUuid(VALID_UUID)).toBe(true);
    // Postgres uuid_generate_v4() output (v4 UUID).
    expect(isCanonicalUserProfileUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    // v1 UUID (still a valid UUID — must be accepted).
    expect(isCanonicalUserProfileUuid('e4eaaaf2-d142-11e1-b3e4-080027620cdd')).toBe(true);
    // Uppercase form.
    expect(isCanonicalUserProfileUuid('A1B2C3D4-E5F6-4A7B-8C9D-1234567890AB')).toBe(true);
    // Non-UUID identifiers used to slip through previously.
    expect(isCanonicalUserProfileUuid('FbU1d28CharsGoogleStyleUid12')).toBe(false);
    expect(isCanonicalUserProfileUuid('not-a-uuid')).toBe(false);
    expect(isCanonicalUserProfileUuid('')).toBe(false);
    expect(isCanonicalUserProfileUuid(undefined)).toBe(false);
    // Firebase UID (28 alphanumerics, no dashes).
    expect(isCanonicalUserProfileUuid('abcDEF123456789012345678901234')).toBe(false);
    expect(asUserProfileId(VALID_UUID)).toBe(VALID_UUID);
    expect(() => asUserProfileId('firebase-uid-123')).toThrow();
  });
});

describe('AuthSessionService.establishSession', () => {
  it('happy path: persists tokens + user when id is already canonical UUID', async () => {
    const session = await AuthSessionService.establishSession({
      user: {
        id: VALID_UUID,
        email: 'Alice@Example.com',
        name: 'Alice',
        roles: ['user'],
      },
      tokens: { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 3600 },
      authMode: 'real',
    });

    expect(session.id).toBe(VALID_UUID);
    expect(session.email).toBe('alice@example.com');
    expect(mockMemoryStorage.get(STORAGE_KEYS.jwtAccess)).toBe('access-1');
    expect(mockMemoryStorage.get(STORAGE_KEYS.jwtRefresh)).toBe('refresh-1');
    expect(mockMemoryStorage.get(STORAGE_KEYS.authMode)).toBe('real');
    const persistedUser = JSON.parse(mockMemoryStorage.get(STORAGE_KEYS.user)!);
    expect(persistedUser.id).toBe(VALID_UUID);
    expect(mockResolveUserId).not.toHaveBeenCalled();
  });

  it('resolves non-canonical id via server before establishing the session', async () => {
    mockResolveUserId.mockImplementation(async () => ({ success: true, user: { id: VALID_UUID } }));
    
    AuthSessionService.__resetForTests();
    const session = await AuthSessionService.establishSession({
      user: {
        id: 'firebase-uid-123', // non-canonical
        email: 'bob@example.com',
        roles: ['user'],
      },
      resolutionHints: { firebaseUid: 'firebase-uid-123', email: 'bob@example.com' },
    });
    expect(session.id).toBe(VALID_UUID);
    expect(mockResolveUserId).toHaveBeenCalledTimes(1);
  });

  it('throws if the server cannot resolve a canonical id', async () => {
    mockResolveUserId.mockResolvedValueOnce({ success: false });
    
    AuthSessionService.__resetForTests();
    await expect(
      AuthSessionService.establishSession({
        user: { id: 'firebase-uid-xyz', email: 'c@example.com' },
        resolutionHints: { firebaseUid: 'firebase-uid-xyz' },
      }),
    ).rejects.toThrow(/canonical user_profiles\.id/);
  });

  it('refuses synthetic guest_* ids — they must NOT hit resolve', async () => {
    
    AuthSessionService.__resetForTests();
    await expect(
      AuthSessionService.establishSession({
        user: { id: 'guest_local_1', email: 'guest@example.com' },
      }),
    ).rejects.toThrow(/canonical user_profiles\.id/);
    expect(mockResolveUserId).not.toHaveBeenCalled();
  });
});

describe('AuthSessionService.restoreSession', () => {
  it('returns unauthenticated state when nothing is persisted', async () => {
    
    AuthSessionService.__resetForTests();
    const state = await AuthSessionService.restoreSession();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('restores a previously persisted canonical session', async () => {
    
    AuthSessionService.__resetForTests();
    mockMemoryStorage.set(
      STORAGE_KEYS.user,
      JSON.stringify({ id: VALID_UUID, email: 'a@b.com', name: 'A', roles: ['user'] }),
    );
    mockMemoryStorage.set(STORAGE_KEYS.authMode, 'real');
    const state = await AuthSessionService.restoreSession();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe(VALID_UUID);
  });

  it('hard-fails session when persisted id is non-canonical and resolution fails', async () => {
    mockResolveUserId.mockResolvedValueOnce({ success: false });
    
    AuthSessionService.__resetForTests();
    mockMemoryStorage.set(
      STORAGE_KEYS.user,
      JSON.stringify({ id: 'firebase-uid-stale', email: 'stale@x.com', roles: ['user'] }),
    );
    mockMemoryStorage.set(STORAGE_KEYS.authMode, 'real');
    mockMemoryStorage.set(STORAGE_KEYS.firebaseUid, 'firebase-uid-stale');

    const state = await AuthSessionService.restoreSession();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    // Storage should be wiped by clearSession.
    expect(mockMemoryStorage.get(STORAGE_KEYS.user)).toBeUndefined();
    expect(mockMemoryStorage.get(STORAGE_KEYS.authMode)).toBeUndefined();
  });

  it('clears session when access token is expired and no refresh token exists', async () => {
    
    AuthSessionService.__resetForTests();
    mockMemoryStorage.set(
      STORAGE_KEYS.user,
      JSON.stringify({ id: VALID_UUID, email: 'a@b.com', roles: ['user'] }),
    );
    mockMemoryStorage.set(STORAGE_KEYS.authMode, 'real');
    mockMemoryStorage.set(STORAGE_KEYS.jwtAccess, 'expired-token');
    mockMemoryStorage.set(STORAGE_KEYS.jwtExpiresAt, String(Date.now() - 60_000));

    const state = await AuthSessionService.restoreSession();
    expect(state.isAuthenticated).toBe(false);
    expect(mockMemoryStorage.get(STORAGE_KEYS.jwtAccess)).toBeUndefined();
  });
});

describe('AuthSessionService.clearSession', () => {
  it('clears all auth-related AsyncStorage keys', async () => {
    
    AuthSessionService.__resetForTests();
    mockMemoryStorage.set(STORAGE_KEYS.user, '{}');
    mockMemoryStorage.set(STORAGE_KEYS.authMode, 'real');
    mockMemoryStorage.set(STORAGE_KEYS.jwtAccess, 'tok');
    mockMemoryStorage.set(STORAGE_KEYS.jwtRefresh, 'r');
    mockMemoryStorage.set(STORAGE_KEYS.firebaseUid, 'fb');
    await AuthSessionService.clearSession();
    expect(mockMemoryStorage.size).toBe(0);
  });
});
