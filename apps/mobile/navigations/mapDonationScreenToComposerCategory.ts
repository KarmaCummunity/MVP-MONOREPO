// Maps DonationsStack screen names to CreatePostComposerModal category slugs.
import type { NavigationState } from '@react-navigation/native';

function findNavigatorStateForRouteNamed(
  root: NavigationState | undefined,
  routeName: string,
): NavigationState | undefined {
  if (!root?.routes?.length) return undefined;
  for (const r of root.routes) {
    if (r.name === routeName && r.state) {
      return r.state as NavigationState;
    }
  }
  for (const r of root.routes) {
    if (r.state) {
      const nested = findNavigatorStateForRouteNamed(r.state as NavigationState, routeName);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * Active DonationsStack screen name, from any navigation root that contains DonationsTab
 * (e.g. main stack wrapping the bottom tab navigator).
 */
export function getDonationsStackLeafScreenName(rootState: NavigationState | undefined): string | undefined {
  const stack = findNavigatorStateForRouteNamed(rootState, 'DonationsTab');
  if (!stack?.routes?.length) return undefined;
  const leaf = stack.routes[stack.index ?? 0];
  return typeof leaf?.name === 'string' ? leaf.name : undefined;
}

/** When the bottom tab navigator state is already the root (e.g. unit tests). */
export function getFocusedDonationsLeafRouteName(
  tabNavigatorState: NavigationState | undefined,
): string | undefined {
  if (!tabNavigatorState?.routes?.length) return undefined;
  const current = tabNavigatorState.routes[tabNavigatorState.index ?? 0];
  if (current?.name !== 'DonationsTab') return undefined;
  const stack = current.state as NavigationState | undefined;
  if (!stack?.routes?.length) return undefined;
  const leaf = stack.routes[stack.index ?? 0];
  return typeof leaf?.name === 'string' ? leaf.name : undefined;
}

export function mapDonationScreenRouteToComposerCategory(screen: string | undefined): string {
  if (!screen) return 'items';
  switch (screen) {
    case 'MoneyScreen':
      return 'money';
    case 'KnowledgeScreen':
      return 'knowledge';
    case 'TrumpScreen':
      return 'trump';
    case 'TimeScreen':
      return 'time';
    case 'MyChallengesScreen':
    case 'CommunityChallengesScreen':
    case 'ChallengeDetailsScreen':
    case 'ChallengeStatisticsScreen':
    case 'MyCreatedChallengesScreen':
      return 'challenges';
    default:
      return 'items';
  }
}
