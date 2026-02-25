// utils/navigationGuards.ts
// Navigation guards system - checks conditions before navigation
// Ensures users can only navigate to routes they're allowed to access

import {
  NavigationGuard,
  NavigationGuardContext,
  GuardResult,
  QueuedNavigationAction,
} from '../types/navigation';
import { logger } from './loggerService';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isValidRouteName } from './navigationStateValidator';

const LOG_SOURCE = 'NavigationGuards';

/**
 * Guard: Check if route exists
 */
const routeExistsGuard: NavigationGuard = {
  name: 'routeExists',
  priority: 100, // High priority - check first
  check: (action: QueuedNavigationAction): GuardResult => {
    if (action.type === 'navigate' || action.type === 'replace') {
      const routeName = action.routeName;
      if (!routeName || typeof routeName !== 'string') {
        return {
          allowed: false,
          reason: 'Route name is invalid',
        };
      }

      // Basic check - route name should not be empty
      if (routeName.trim().length === 0) {
        return {
          allowed: false,
          reason: 'Route name cannot be empty',
        };
      }

      // Note: We don't check against VALID_ROUTES_MAP here because routes can be nested
      // The actual route validation happens in navigationStateValidator
    }

    return { allowed: true };
  },
};

/**
 * Guard: Check if user can access ProfileScreen (not in guest mode)
 */
const profileScreenGuard: NavigationGuard = {
  name: 'profileScreen',
  priority: 50,
  check: (action: QueuedNavigationAction, context: NavigationGuardContext): GuardResult => {
    if (action.type === 'navigate' || action.type === 'replace') {
      if (action.routeName === 'ProfileScreen' || action.routeName === 'ProfileTab') {
        if (context.isGuestMode) {
          return {
            allowed: false,
            reason: 'Profile screen is not available in guest mode',
            redirectTo: 'HomeScreen',
          };
        }
      }
    }

    return { allowed: true };
  },
};

/**
 * Guard: Check if user can access AdminTab (must be admin)
 */
const adminTabGuard: NavigationGuard = {
  name: 'adminTab',
  priority: 50,
  check: (action: QueuedNavigationAction, context: NavigationGuardContext): GuardResult => {
    if (action.type === 'navigate' || action.type === 'replace') {
      if (action.routeName === 'AdminTab' || action.routeName === 'AdminDashboard') {
        if (!context.isAdmin) {
          return {
            allowed: false,
            reason: 'Admin screens are only available to administrators',
            redirectTo: 'HomeScreen',
          };
        }
      }
    }

    return { allowed: true };
  },
};

/**
 * Guard: Check if user can access authenticated routes
 */
const authenticatedRouteGuard: NavigationGuard = {
  name: 'authenticatedRoute',
  priority: 40,
  check: (action: QueuedNavigationAction, context: NavigationGuardContext): GuardResult => {
    // Routes that require authentication (not guest mode)
    const authenticatedRoutes = [
      'EditProfileScreen',
      'OrgOnboardingScreen',
      'OrgDashboardScreen',
    ];

    if (action.type === 'navigate' || action.type === 'replace') {
      if (authenticatedRoutes.includes(action.routeName)) {
        if (context.isGuestMode || !context.isAuthenticated) {
          return {
            allowed: false,
            reason: 'This screen requires authentication',
            redirectTo: 'LoginScreen',
          };
        }
      }
    }

    return { allowed: true };
  },
};

/**
 * Guard: Check if user can access LoginScreen (should redirect if already authenticated)
 */
const loginScreenGuard: NavigationGuard = {
  name: 'loginScreen',
  priority: 30,
  check: (action: QueuedNavigationAction, context: NavigationGuardContext): GuardResult => {
    if (action.type === 'navigate' || action.type === 'replace') {
      if (action.routeName === 'LoginScreen') {
        // If user is authenticated, redirect to HomeStack
        if (context.isAuthenticated && !context.isGuestMode) {
          return {
            allowed: false,
            reason: 'User is already authenticated',
            redirectTo: 'HomeStack',
          };
        }
      }
    }

    return { allowed: true };
  },
};

/**
 * Guard: Check if user can access LandingSiteScreen (should redirect if authenticated)
 */
const landingSiteScreenGuard: NavigationGuard = {
  name: 'landingSiteScreen',
  priority: 30,
  check: (action: QueuedNavigationAction, context: NavigationGuardContext): GuardResult => {
    if (action.type === 'navigate' || action.type === 'replace') {
      if (action.routeName === 'LandingSiteScreen') {
        // If user is authenticated or in guest mode, redirect to HomeStack
        if (context.isAuthenticated || context.isGuestMode) {
          return {
            allowed: false,
            reason: 'User is already authenticated or in guest mode',
            redirectTo: 'HomeStack',
          };
        }
      }
    }

    return { allowed: true };
  },
};

/**
 * Guard: Check if reset action is valid
 */
const resetActionGuard: NavigationGuard = {
  name: 'resetAction',
  priority: 90,
  check: (action: QueuedNavigationAction): GuardResult => {
    if (action.type === 'reset') {
      if (!action.routes || !Array.isArray(action.routes) || action.routes.length === 0) {
        return {
          allowed: false,
          reason: 'Reset action must have at least one route',
        };
      }

      if (typeof action.index !== 'number' || action.index < 0 || action.index >= action.routes.length) {
        return {
          allowed: false,
          reason: 'Reset action index is out of bounds',
        };
      }

      // Validate route names
      for (const route of action.routes) {
        if (!route.name || typeof route.name !== 'string') {
          return {
            allowed: false,
            reason: 'Reset action routes must have valid names',
          };
        }
      }
    }

    return { allowed: true };
  },
};

/**
 * All guards in priority order (higher priority = checked first)
 */
const allGuards: NavigationGuard[] = [
  resetActionGuard,
  routeExistsGuard,
  profileScreenGuard,
  adminTabGuard,
  authenticatedRouteGuard,
  loginScreenGuard,
  landingSiteScreenGuard,
].sort((a, b) => b.priority - a.priority); // Sort by priority descending

/**
 * Check navigation action against all guards
 */
export const checkNavigationGuards = async (
  action: QueuedNavigationAction,
  context: NavigationGuardContext
): Promise<GuardResult> => {
  logger.debug(LOG_SOURCE, 'Checking navigation guards', {
    actionType: action.type,
    routeName: (action as any).routeName,
    context: {
      isAuthenticated: context.isAuthenticated,
      isGuestMode: context.isGuestMode,
      isAdmin: context.isAdmin,
    },
  });

  // Check each guard in priority order
  for (const guard of allGuards) {
    try {
      const result = await guard.check(action, context);
      if (!result.allowed) {
        logger.warn(LOG_SOURCE, 'Navigation guard blocked action', {
          guardName: guard.name,
          reason: result.reason,
          redirectTo: result.redirectTo,
        });
        return result;
      }
    } catch (error) {
      logger.error(LOG_SOURCE, 'Navigation guard error', {
        guardName: guard.name,
        error,
      });
      // If guard throws error, allow navigation (fail open)
      // In production, you might want to fail closed instead
    }
  }

  logger.debug(LOG_SOURCE, 'All navigation guards passed');
  return { allowed: true };
};

/**
 * Get guard context from current app state
 * This is a helper function - components should pass their own context
 * based on their useUser() and useWebMode() hooks
 */
export const getGuardContext = (
  isAuthenticated: boolean = false,
  isGuestMode: boolean = false,
  isAdmin: boolean = false,
  mode?: 'site' | 'app'
): NavigationGuardContext => {
  return {
    isAuthenticated,
    isGuestMode,
    isAdmin,
    mode,
  };
};








