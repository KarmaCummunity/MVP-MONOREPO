import type { FeedItem } from '../types/feed';

/**
 * Profile Open/Closed tabs: reopen from post menu and notify parent to refetch.
 */
export async function runProfileReopenPostMenuAction(
  item: FeedItem,
  onSuccess?: () => void,
): Promise<void> {
  const { reopenFeedPostWithUiFeedback } = await import('./reopenFeedPost');
  const ok = await reopenFeedPostWithUiFeedback(item);
  if (ok) {
    onSuccess?.();
  }
}
