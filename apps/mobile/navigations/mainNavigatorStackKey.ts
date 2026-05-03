/**
 * Pure derivation of React Navigation `key` for MainNavigator's Stack.Navigator.
 * Changing key resets navigator state when switching auth branch or web mode — tested so regressions are caught.
 */

import type { WebMode } from '../stores/webModeStore';

/**
 * @returns Stable key: `stack-{mode}-{auth|unauth}` — must match previous inline useMemo in MainNavigator.
 */
export function computeMainNavigatorStackKey(
  mode: WebMode,
  isAuthenticated: boolean,
  isGuestMode: boolean,
): string {
  const branch = isAuthenticated || isGuestMode ? 'auth' : 'unauth';
  return `stack-${mode}-${branch}`;
}
