import { Platform } from 'react-native';
import { logger } from '../../utils/loggerService';
import type { ProfileScreenRouteParams } from './profileScreenTypes';

export const PROFILE_SCREEN_PARAMS_STORAGE_KEY = 'profileScreenParams';

function isWebRuntime(): boolean {
  return Platform.OS === 'web' && globalThis.window !== undefined;
}

/**
 * Merges manual/route params with Web localStorage restore/persist (SSR-safe).
 */
export function resolveProfileRouteParams(
  manualParams: ProfileScreenRouteParams | undefined,
  routeParams: ProfileScreenRouteParams | undefined,
): ProfileScreenRouteParams | undefined {
  let merged = manualParams ?? routeParams;

  if (!isWebRuntime()) {
    return merged;
  }

  if (!merged && !manualParams) {
    try {
      const stored = globalThis.window.localStorage.getItem(PROFILE_SCREEN_PARAMS_STORAGE_KEY);
      if (stored) {
        merged = JSON.parse(stored) as ProfileScreenRouteParams;
        logger.debug('ProfileScreenContent', 'Restored params from localStorage', { merged });
      }
    } catch (error) {
      console.warn('Failed to restore params from localStorage:', error);
    }
    return merged;
  }

  if (merged?.userId) {
    try {
      globalThis.window.localStorage.setItem(
        PROFILE_SCREEN_PARAMS_STORAGE_KEY,
        JSON.stringify({
          userId: merged.userId,
          userName: merged.userName,
        }),
      );
    } catch (error) {
      console.warn('Failed to save params to localStorage:', error);
    }
  }

  return merged;
}

export function clearProfileRouteParamsFromStorage(): void {
  if (!isWebRuntime()) {
    return;
  }
  try {
    globalThis.window.localStorage.removeItem(PROFILE_SCREEN_PARAMS_STORAGE_KEY);
  } catch (error) {
    logger.debug('ProfileScreenContent', 'localStorage.removeItem failed', { error });
  }
}

/** Persist minimal identifiers after a successful remote profile load (Web refresh restore). */
export function persistProfileUserIdSnapshot(userId: string, userName: string): void {
  if (!isWebRuntime()) {
    return;
  }
  try {
    globalThis.window.localStorage.setItem(
      PROFILE_SCREEN_PARAMS_STORAGE_KEY,
      JSON.stringify({ userId, userName }),
    );
  } catch (error) {
    logger.debug('ProfileScreenContent', 'persistProfileUserIdSnapshot failed', { error });
  }
}
