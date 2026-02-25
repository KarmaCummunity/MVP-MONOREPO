// navigationPersistence.ts
// Utility for saving and loading React Navigation state
// Supports both web (localStorage) and native (AsyncStorage)
// Session-only persistence - state is cleared when app closes
// Now includes validation and versioning

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationState } from '@react-navigation/native';
import { logger } from './loggerService';
import { validateNavigationState, cleanNavigationState, checkNavigationStateVersion } from './navigationStateValidator';
import { CURRENT_NAVIGATION_STATE_VERSION } from '../types/navigation';

const LOG_SOURCE = 'NavigationPersistence';

// Storage key format: nav_state_{mode}_{userId}_{platform}
const getStorageKey = (mode: string, userId: string | null, platform: string): string => {
  const userIdPart = userId || 'guest';
  return `nav_state_${mode}_${userIdPart}_${platform}`;
};

// Debounce function to limit save frequency
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 300; // ms

/**
 * Save navigation state to persistent storage
 * Uses debouncing to avoid excessive I/O operations
 */
export const saveNavigationState = (
  state: NavigationState | undefined,
  mode: string,
  userId: string | null
): void => {
  if (!state) {
    return;
  }

  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce the save operation
  saveTimeout = setTimeout(() => {
    try {
      // Validate state before saving
      const validation = validateNavigationState(state);
      if (!validation.valid) {
        logger.warn(LOG_SOURCE, 'Navigation state validation failed, not saving', {
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }

      // Check version compatibility
      const versionCheck = checkNavigationStateVersion(state);
      if (!versionCheck.compatible) {
        logger.warn(LOG_SOURCE, 'Navigation state version incompatible, not saving', {
          error: versionCheck.error,
        });
        return;
      }

      // Clean state before saving
      const cleanedState = cleanNavigationState(state);
      if (!cleanedState) {
        logger.warn(LOG_SOURCE, 'Navigation state cleaning failed, not saving');
        return;
      }

      // Add version to state metadata
      const stateWithVersion = {
        ...cleanedState,
        _metadata: {
          version: CURRENT_NAVIGATION_STATE_VERSION,
          savedAt: new Date().toISOString(),
          mode,
          userId,
        },
      };

      const storageKey = getStorageKey(mode, userId, Platform.OS);
      const stateString = JSON.stringify(stateWithVersion);

      if (Platform.OS === 'web') {
        // Web: synchronous localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(storageKey, stateString);
          logger.debug(LOG_SOURCE, 'Navigation state saved to localStorage', {
            key: storageKey,
            stateSize: stateString.length,
            version: CURRENT_NAVIGATION_STATE_VERSION,
          }, { periodic: true });
        }
      } else {
        // Native: asynchronous AsyncStorage
        AsyncStorage.setItem(storageKey, stateString).catch((error) => {
          logger.error(LOG_SOURCE, 'Failed to save navigation state to AsyncStorage', { error });
        });
        logger.debug(LOG_SOURCE, 'Navigation state saved to AsyncStorage', {
          key: storageKey,
          stateSize: stateString.length,
          version: CURRENT_NAVIGATION_STATE_VERSION,
        }, { periodic: true });
      }
    } catch (error) {
      logger.error(LOG_SOURCE, 'Error saving navigation state', { error });
    }
  }, DEBOUNCE_DELAY);
};

/**
 * Recursively checks if navigation state contains UserProfileScreen as active route
 * This helps prevent loading state that would lead to "user not found" screen
 */
const containsActiveUserProfileScreen = (state: NavigationState): boolean => {
  if (!state || !state.routes || state.routes.length === 0) {
    return false;
  }

  const activeRoute = state.routes[state.index || 0];
  if (!activeRoute) {
    return false;
  }

  // Check if current route is UserProfileScreen
  if (activeRoute.name === 'UserProfileScreen') {
    return true;
  }

  // Recursively check nested states
  if (activeRoute.state) {
    return containsActiveUserProfileScreen(activeRoute.state as any);
  }

  return false;
};

/**
 * Load navigation state from persistent storage
 * Returns null if no state is found or if there's an error
 */
export const loadNavigationState = async (
  mode: string,
  userId: string | null
): Promise<NavigationState | null> => {
  try {
    const storageKey = getStorageKey(mode, userId, Platform.OS);
    let stateString: string | null = null;

    if (Platform.OS === 'web') {
      // Web: synchronous localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        stateString = window.localStorage.getItem(storageKey);
      }
    } else {
      // Native: asynchronous AsyncStorage
      stateString = await AsyncStorage.getItem(storageKey);
    }

    if (!stateString) {
      logger.debug(LOG_SOURCE, 'No saved navigation state found', { key: storageKey });
      return null;
    }

    let state: NavigationState;
    try {
      state = JSON.parse(stateString) as NavigationState;
    } catch (parseError) {
      logger.error(LOG_SOURCE, 'Failed to parse navigation state', { error: parseError });
      // Clear corrupted state
      await clearNavigationState(mode, userId);
      return null;
    }

    // Remove metadata if present (it's not part of NavigationState type)
    const metadata = (state as any)._metadata;
    if (metadata) {
      const { _metadata: __metadata, ...stateWithoutMetadata } = state as any;
      state = stateWithoutMetadata as NavigationState;
    }

    // Check if state contains active UserProfileScreen - if so, don't load it
    // This prevents opening "user not found" screen after data reset
    if (containsActiveUserProfileScreen(state)) {
      logger.warn(LOG_SOURCE, 'Navigation state contains active UserProfileScreen, clearing to prevent "user not found" screen', {
        key: storageKey,
        savedUserId: metadata?.userId,
        currentUserId: userId,
      });
      // Clear state with active UserProfileScreen
      await clearNavigationState(mode, userId);
      return null;
    }

    // Validate loaded state
    const validation = validateNavigationState(state);
    if (!validation.valid) {
      logger.warn(LOG_SOURCE, 'Loaded navigation state is invalid, clearing it', {
        errors: validation.errors,
        warnings: validation.warnings,
      });
      // Clear invalid state
      await clearNavigationState(mode, userId);
      return null;
    }

    // Check version compatibility
    const versionCheck = checkNavigationStateVersion(state);
    if (!versionCheck.compatible) {
      logger.warn(LOG_SOURCE, 'Loaded navigation state version is incompatible, clearing it', {
        error: versionCheck.error,
      });
      // Clear incompatible state
      await clearNavigationState(mode, userId);
      return null;
    }

    // Clean state before returning
    const cleanedState = cleanNavigationState(state);
    if (!cleanedState) {
      logger.warn(LOG_SOURCE, 'Failed to clean loaded navigation state, clearing it');
      await clearNavigationState(mode, userId);
      return null;
    }

    logger.debug(LOG_SOURCE, 'Navigation state loaded and validated from storage', {
      key: storageKey,
      stateSize: stateString.length,
    });

    return cleanedState;
  } catch (error) {
    logger.error(LOG_SOURCE, 'Error loading navigation state', { error });
    return null;
  }
};

/**
 * Clear navigation state for a specific mode and user
 * Useful when user logs out or mode changes
 */
export const clearNavigationState = async (
  mode: string,
  userId: string | null
): Promise<void> => {
  try {
    const storageKey = getStorageKey(mode, userId, Platform.OS);

    if (Platform.OS === 'web') {
      // Web: synchronous localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(storageKey);
        logger.debug(LOG_SOURCE, 'Navigation state cleared from localStorage', { key: storageKey });
      }
    } else {
      // Native: asynchronous AsyncStorage
      await AsyncStorage.removeItem(storageKey);
      logger.debug(LOG_SOURCE, 'Navigation state cleared from AsyncStorage', { key: storageKey });
    }
  } catch (error) {
    logger.error(LOG_SOURCE, 'Error clearing navigation state', { error });
  }
};

/**
 * Clear all navigation states (useful for cleanup)
 */
export const clearAllNavigationStates = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Web: remove all keys matching the pattern
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(window.localStorage);
        keys.forEach((key) => {
          if (key.startsWith('nav_state_')) {
            window.localStorage.removeItem(key);
          }
        });
        logger.debug(LOG_SOURCE, 'All navigation states cleared from localStorage');
      }
    } else {
      // Native: get all keys and remove matching ones
      const allKeys = await AsyncStorage.getAllKeys();
      const navKeys = allKeys.filter((key) => key.startsWith('nav_state_'));
      if (navKeys.length > 0) {
        await AsyncStorage.multiRemove(navKeys);
        logger.debug(LOG_SOURCE, 'All navigation states cleared from AsyncStorage', {
          count: navKeys.length,
        });
      }
    }
  } catch (error) {
    logger.error(LOG_SOURCE, 'Error clearing all navigation states', { error });
  }
};

