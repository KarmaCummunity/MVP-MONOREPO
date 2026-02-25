// utils/navigationStateValidator.ts
// Navigation state validation and versioning
// Ensures navigation state is valid before saving/loading

import { NavigationState } from '@react-navigation/native';
import {
  NavigationStateValidationResult,
  NavigationStateVersion,
  VALID_ROUTES_MAP,
} from '../types/navigation';
import { logger } from './loggerService';

const LOG_SOURCE = 'NavigationStateValidator';

// Maximum size for navigation state (in bytes)
const MAX_STATE_SIZE = 100 * 1024; // 100KB

/**
 * Validates navigation state structure
 */
export const validateNavigationState = (
  state: NavigationState | null | undefined
): NavigationStateValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!state) {
    return { valid: false, errors: ['Navigation state is null or undefined'], warnings: [] };
  }

  // Check basic structure
  if (!state.routes || !Array.isArray(state.routes)) {
    errors.push('Navigation state must have a routes array');
    return { valid: false, errors, warnings };
  }

  if (state.routes.length === 0) {
    errors.push('Navigation state must have at least one route');
    return { valid: false, errors, warnings };
  }

  if (typeof state.index !== 'number' || state.index < 0 || state.index >= state.routes.length) {
    errors.push(`Navigation state index (${state.index}) is out of bounds for routes array (length: ${state.routes.length})`);
    return { valid: false, errors, warnings };
  }

  // Check state size
  try {
    const stateString = JSON.stringify(state);
    const stateSize = new Blob([stateString]).size;
    if (stateSize > MAX_STATE_SIZE) {
      warnings.push(`Navigation state size (${stateSize} bytes) exceeds recommended limit (${MAX_STATE_SIZE} bytes)`);
    }
  } catch {
    warnings.push('Could not calculate navigation state size');
  }

  // Validate routes recursively
  const validateRoute = (route: any, stackName: string = 'RootStack', depth: number = 0): void => {
    if (depth > 10) {
      errors.push('Navigation state has too many nested levels (max 10)');
      return;
    }

    if (!route || typeof route !== 'object') {
      errors.push(`Route at depth ${depth} is not a valid object`);
      return;
    }

    if (!route.name || typeof route.name !== 'string') {
      errors.push(`Route at depth ${depth} is missing a valid name`);
      return;
    }

    // Check if route name is valid for the current stack
    const validRoutes = VALID_ROUTES_MAP[stackName] || [];
    if (validRoutes.length > 0 && !validRoutes.includes(route.name)) {
      warnings.push(`Route "${route.name}" is not in the standard route list for ${stackName}`);
    }

    // Validate nested state
    if (route.state) {
      if (!route.state.routes || !Array.isArray(route.state.routes)) {
        errors.push(`Route "${route.name}" has invalid nested state`);
        return;
      }

      if (route.state.index !== undefined) {
        if (typeof route.state.index !== 'number' ||
          route.state.index < 0 ||
          route.state.index >= route.state.routes.length) {
          errors.push(`Route "${route.name}" has invalid nested state index`);
          return;
        }
      }

      // Determine nested stack name based on route name
      let nestedStackName = stackName;
      if (route.name === 'HomeStack' || route.name === 'HomeScreen') {
        nestedStackName = 'HomeTabStack';
      } else if (route.name === 'SearchTab') {
        nestedStackName = 'SearchTabStack';
      } else if (route.name === 'ProfileScreen') {
        nestedStackName = 'ProfileTabStack';
      } else if (route.name === 'DonationsTab') {
        nestedStackName = 'DonationsStack';
      } else if (route.name === 'AdminTab') {
        nestedStackName = 'AdminStack';
      } else if (route.name === 'BottomTab') {
        nestedStackName = 'BottomTab';
      }

      // Validate nested routes
      route.state.routes.forEach((nestedRoute: any, _nestedIndex: number) => {
        validateRoute(nestedRoute, nestedStackName, depth + 1);
      });
    }
  };

  // Validate all routes
  state.routes.forEach((route, _index) => {
    validateRoute(route, 'RootStack', 0);
  });

  const valid = errors.length === 0;

  if (!valid) {
    logger.warn(LOG_SOURCE, 'Navigation state validation failed', { errors, warnings });
  } else if (warnings.length > 0) {
    logger.debug(LOG_SOURCE, 'Navigation state validation passed with warnings', { warnings });
  }

  return { valid, errors, warnings };
};

/**
 * Checks if navigation state version is compatible
 */
export const checkNavigationStateVersion = (
  state: NavigationState | null | undefined
): { compatible: boolean; version?: NavigationStateVersion; error?: string } => {
  if (!state) {
    return { compatible: false, error: 'State is null or undefined' };
  }

  // Check for version in state (stored in route params or state key)
  // For now, we'll be lenient and accept states without version (backward compatibility)
  // In the future, we can add version checking here

  return { compatible: true };
};

/**
 * Validates and cleans navigation state
 * Removes invalid routes and fixes common issues
 */
export const cleanNavigationState = (
  state: NavigationState | null | undefined
): NavigationState | null => {
  if (!state) {
    return null;
  }

  const validation = validateNavigationState(state);
  if (!validation.valid) {
    logger.warn(LOG_SOURCE, 'Cannot clean invalid navigation state', { errors: validation.errors });
    return null;
  }

  // For now, return state as-is if valid
  // In the future, we can add cleaning logic here (e.g., remove invalid routes, fix indices)
  return state;
};

/**
 * Checks if a route name is valid
 */
export const isValidRouteName = (routeName: string, stackName: string = 'RootStack'): boolean => {
  const validRoutes = VALID_ROUTES_MAP[stackName] || [];
  return validRoutes.includes(routeName);
};

/**
 * Gets all valid route names for a stack
 */
export const getValidRouteNames = (stackName: string): string[] => {
  return VALID_ROUTES_MAP[stackName] || [];
};








