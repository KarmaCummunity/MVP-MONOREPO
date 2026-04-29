import { CommonActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { FeedItem } from '../types/feed';

export type PostDetailNavParams = {
  postId: string;
  /** Pre-mapped feed row so the detail screen can render immediately while refreshing */
  initialItem?: FeedItem;
};

function getRouteNames(state: unknown): string[] | undefined {
  if (state && typeof state === 'object' && 'routeNames' in state) {
    const names = (state as { routeNames?: string[] }).routeNames;
    return Array.isArray(names) ? names : undefined;
  }
  return undefined;
}

/** Finds the nearest stack navigator that registers `PostDetailScreen` (tab stacks under the bottom bar). */
function findStackNavWithPostDetail(
  navigation: NavigationProp<ParamListBase>,
): NavigationProp<ParamListBase> | null {
  let current: NavigationProp<ParamListBase> | null = navigation;
  while (current) {
    const names = getRouteNames(current.getState?.());
    if (names?.includes('PostDetailScreen')) {
      return current;
    }
    current = (current.getParent?.() as NavigationProp<ParamListBase> | undefined) ?? null;
  }
  return null;
}

function findRootNavigation(
  navigation: NavigationProp<ParamListBase>,
): NavigationProp<ParamListBase> {
  let current: NavigationProp<ParamListBase> = navigation;
  while (current.getParent?.()) {
    current = current.getParent() as NavigationProp<ParamListBase>;
  }
  return current;
}

function navigatePostDetailOnStack(
  stackNav: NavigationProp<ParamListBase>,
  params: PostDetailNavParams,
): void {
  const n = stackNav as { navigate: (route: string, p: PostDetailNavParams) => void };
  n.navigate('PostDetailScreen', params);
}

/**
 * Opens post detail inside the current tab stack (bottom + top bar), or falls back to the Home tab stack.
 */
export function navigateToPostDetail(
  navigation: NavigationProp<ParamListBase>,
  params: PostDetailNavParams,
): void {
  const stackNav = findStackNavWithPostDetail(navigation);
  if (stackNav) {
    navigatePostDetailOnStack(stackNav, params);
    return;
  }

  const root = findRootNavigation(navigation);
  const rootNames = getRouteNames(root.getState?.());
  if (rootNames?.includes('HomeStack')) {
    root.dispatch(
      CommonActions.navigate({
        name: 'HomeStack',
        params: {
          screen: 'HomeScreen',
          params: {
            screen: 'PostDetailScreen',
            params,
          },
        },
      } as never),
    );
    return;
  }

  navigatePostDetailOnStack(navigation, params);
}
