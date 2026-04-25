/**
 * Ensures the in-app user id matches user_profiles.id (canonical UUID).
 * Call after login / session restore when id might still be a Firebase UID, email key, or legacy value.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './loggerService';

/** Minimal user shape for id normalization (avoids circular import with userStore). */
export type UserWithCanonicalId = { id: string; email: string };

const CANONICAL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalUserProfileUuid(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return CANONICAL_UUID_RE.test(id.trim());
}

/** Local-only session users (not in user_profiles); never call resolve APIs for these. */
export function isLocalSyntheticUserId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') return false;
  const t = id.trim().toLowerCase();
  return t.startsWith('guest_') || t.startsWith('demo_');
}

/**
 * Returns a copy of `user` with `id` set to the server user_profiles UUID when possible.
 * On failure, returns the original user (server-side resolution may still apply).
 */
export async function ensureUserProfileUuid<T extends UserWithCanonicalId>(user: T): Promise<T> {
  if (isCanonicalUserProfileUuid(user.id) || isLocalSyntheticUserId(user.id)) {
    return user;
  }

  const { apiService } = await import('../src/api/api.service');

  try {
    const byIdentifier = await apiService.getUserById(user.id);
    const data = byIdentifier.data as { id?: string } | undefined;
    if (byIdentifier.success && data?.id && isCanonicalUserProfileUuid(data.id)) {
      logger.info('UserProfileId', 'Normalized user id via getUserById', {
        hadNonUuidId: true,
      });
      return { ...user, id: data.id } as T;
    }
  } catch (error) {
    logger.warn('UserProfileId', 'getUserById failed during id normalization', {
      error: String(error),
    });
  }

  const email = (user.email || '').trim().toLowerCase();
  if (email) {
    try {
      const resolved = await apiService.resolveUserId({ email });
      const respUser = (resolved as { user?: { id?: string } }).user;
      if (resolved.success && respUser?.id && isCanonicalUserProfileUuid(respUser.id)) {
        logger.info('UserProfileId', 'Normalized user id via resolveUserId(email)');
        return { ...user, id: respUser.id } as T;
      }
    } catch (error) {
      logger.warn('UserProfileId', 'resolveUserId(email) failed during id normalization', {
        error: String(error),
      });
    }
  }

  try {
    const firebaseUid = await AsyncStorage.getItem('firebase_user_id');
    if (firebaseUid) {
      const resolved = await apiService.resolveUserId({
        firebase_uid: firebaseUid,
        email: email || undefined,
      });
      const respUser = (resolved as { user?: { id?: string } }).user;
      if (resolved.success && respUser?.id && isCanonicalUserProfileUuid(respUser.id)) {
        logger.info('UserProfileId', 'Normalized user id via resolveUserId(firebase_uid)');
        return { ...user, id: respUser.id } as T;
      }
    }
  } catch (error) {
    logger.warn('UserProfileId', 'resolveUserId(firebase_uid) failed during id normalization', {
      error: String(error),
    });
  }

  logger.error('UserProfileId', 'Could not resolve user id to profile UUID; API calls may fail', {
    idLength: user.id?.length ?? 0,
  });
  return user;
}
