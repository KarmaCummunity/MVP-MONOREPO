import type { NavigationState, PartialState } from '@react-navigation/native';

/**
 * Walks the active branch of the navigation tree (root index → nested index …)
 * and returns route names from outermost to the focused leaf.
 */
export function getActiveNavigationScreenChain(
  state: NavigationState | PartialState<NavigationState> | undefined
): string[] {
  const chain: string[] = [];
  let current: NavigationState | PartialState<NavigationState> | undefined = state;

  while (current && typeof current.index === 'number') {
    const routes = current.routes;
    const idx = current.index;
    if (!routes || idx < 0 || idx >= routes.length) break;

    const route = routes[idx];
    if (!route?.name) break;

    chain.push(route.name);
    current = route.state as NavigationState | PartialState<NavigationState> | undefined;
  }

  return chain;
}
