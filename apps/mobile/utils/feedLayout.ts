/**
 * Fixed outer height for post cards in the 2-column feed grid (`PostsReelsScreen`).
 * Using one height per breakpoint avoids uneven rows (FlatList stretches the shorter cell)
 * and removes gray gaps from `flex:1` filler inside cards.
 */
export const FEED_GRID_CARD_HEIGHT_MOBILE = 320;
export const FEED_GRID_CARD_HEIGHT_DESKTOP = 420;

/**
 * Feed grid cell width for multi-column lists (PostsReelsScreen).
 * On web, `Dimensions.get('window').width` can be 0 before first layout — callers must clamp.
 */
export function computeFeedCellWidth(params: {
  windowWidth: number;
  horizontalPadding: number;
  numColumns: number;
  columnGap: number;
}): number {
  const { windowWidth, horizontalPadding, numColumns, columnGap } = params;
  const safeWidth = Math.max(1, windowWidth);
  const available = Math.max(1, safeWidth - horizontalPadding * 2);
  if (numColumns <= 1) {
    return available;
  }
  const gapTotal = columnGap * (numColumns - 1);
  return Math.max(1, (available - gapTotal) / numColumns);
}
