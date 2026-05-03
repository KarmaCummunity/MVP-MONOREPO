/**
 * @file navigateToAppModeFromLanding
 * @description Single implementation: switch web mode to app and reset stack to login or home.
 * Used by landing hero and other landing CTAs to avoid Sonar duplication.
 */

import { logger } from '../../utils/loggerService';
import { navigationQueue } from '../../utils/navigationQueue';
import { checkNavigationGuards } from '../../utils/navigationGuards';

export type LandingAppModeUserContext = {
  isAuthenticated: boolean;
  isGuestMode: boolean;
  isAdmin: boolean;
};

/**
 * Sets app mode and navigates to HomeStack (signed in / guest) or LoginScreen.
 */
export async function navigateToAppModeFromLanding(
  setMode: (mode: 'app' | 'site') => void,
  user: LandingAppModeUserContext,
  logSource: string
): Promise<void> {
  logger.info(logSource, 'Navigate to app mode', {
    isAuthenticated: user.isAuthenticated,
    isGuestMode: user.isGuestMode,
  });
  setMode('app');
  const targetRoute = user.isAuthenticated || user.isGuestMode ? 'HomeStack' : 'LoginScreen';
  const guardContext = {
    ...user,
    mode: 'app' as const,
  };
  const guardResult = await checkNavigationGuards(
    {
      type: 'reset',
      index: 0,
      routes: [{ name: targetRoute }],
    },
    guardContext
  );
  if (!guardResult.allowed) {
    if (guardResult.redirectTo) {
      await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
    }
    return;
  }
  await navigationQueue.reset(0, [{ name: targetRoute }], 2);
}
