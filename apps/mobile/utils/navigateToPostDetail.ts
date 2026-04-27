import { CommonActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { FeedItem } from '../types/feed';

export type PostDetailNavParams = {
  postId: string;
  /** Pre-mapped feed row so the detail screen can render immediately while refreshing */
  initialItem?: FeedItem;
};

/**
 * Opens the root-level Post detail screen from any navigator (tabs, modals, nested stacks).
 */
export function navigateToPostDetail(
  navigation: NavigationProp<ParamListBase>,
  params: PostDetailNavParams,
): void {
  const { postId, initialItem } = params;
  try {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'PostDetailScreen',
        params: { postId, initialItem },
      } as never),
    );
  } catch {
    navigation.navigate('PostDetailScreen' as never, { postId, initialItem } as never);
  }
}
