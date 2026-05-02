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
