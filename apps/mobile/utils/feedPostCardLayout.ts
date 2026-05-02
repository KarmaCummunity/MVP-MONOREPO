import type { StyleProp, ViewStyle } from 'react-native';

/** Flex stack between header and actions when grid uses fixed outer height (no gray gap). */
export const feedCardContentGridFillStyle: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  minHeight: 0,
};

export function resolveGridFixedOuterStyle(
  isGrid: boolean,
  gridCardHeight?: number,
): ViewStyle | undefined {
  if (!isGrid || gridCardHeight == null) {
    return undefined;
  }
  return { height: gridCardHeight, minHeight: gridCardHeight };
}

function getFeedGridSizing(isGrid: boolean, gridCardHeight?: number) {
  const gridOuterFixed = resolveGridFixedOuterStyle(isGrid, gridCardHeight);
  return {
    gridOuterFixed,
    gridFixedHeight: gridOuterFixed != null,
  };
}

export function withFeedGridContentFill(
  baseStyles: (ViewStyle | false | null | undefined)[],
  gridFixedHeight: boolean,
): StyleProp<ViewStyle> {
  return [...baseStyles, gridFixedHeight && feedCardContentGridFillStyle];
}

/** `styles` from each feed card StyleSheet (shared keys). */
export type FeedCardSheetForRoot = { container: ViewStyle; gridContainer: ViewStyle };

export function resolveFeedGridCardRoot(
  p: { isGrid: boolean; gridCardHeight?: number; cardWidth: number },
  s: FeedCardSheetForRoot,
  ...modifiers: (ViewStyle | false | null | undefined)[]
): { rootStyle: StyleProp<ViewStyle>; gridFixedHeight: boolean } {
  return resolveFeedCardRootLayout({
    isGrid: p.isGrid,
    gridCardHeight: p.gridCardHeight,
    cardWidth: p.cardWidth,
    container: s.container,
    gridMinHeightFallback: s.gridContainer,
    modifiers: modifiers.length ? (modifiers.filter((m) => m) as ViewStyle[]) : undefined,
  });
}

export function resolveFeedCardRootLayout(parts: {
  isGrid: boolean;
  gridCardHeight?: number;
  cardWidth: number;
  container: ViewStyle;
  gridMinHeightFallback: ViewStyle;
  modifiers?: (ViewStyle | false | null | undefined)[];
}): { rootStyle: StyleProp<ViewStyle>; gridFixedHeight: boolean } {
  const { gridOuterFixed, gridFixedHeight } = getFeedGridSizing(parts.isGrid, parts.gridCardHeight);
  const rootStyle = composeFeedCardContainerStyle({
    container: parts.container,
    gridMinHeightFallback: parts.gridMinHeightFallback,
    isGrid: parts.isGrid,
    gridOuterFixed,
    cardWidth: parts.cardWidth,
    modifiers: parts.modifiers,
  });
  return { rootStyle, gridFixedHeight };
}

export function composeFeedCardContainerStyle(parts: {
  container: ViewStyle;
  gridMinHeightFallback: ViewStyle;
  isGrid: boolean;
  gridOuterFixed: ViewStyle | undefined;
  cardWidth: number;
  modifiers?: (ViewStyle | false | null | undefined)[];
}): StyleProp<ViewStyle> {
  const hasFixedHeight = parts.gridOuterFixed != null;
  return [
    parts.container,
    parts.isGrid && !hasFixedHeight && parts.gridMinHeightFallback,
    ...(parts.modifiers ?? []),
    parts.gridOuterFixed,
    { width: parts.cardWidth },
  ];
}

/**
 * Main body (between header and action bar): `cardContent` + optional variant styles + grid fill.
 * Single entry for all post card types — avoids duplicated `withFeedGridContentFill` call sites.
 */
export function feedCardMainAreaStyle(
  gridFixedHeight: boolean,
  cardContent: ViewStyle,
  ...variantOrExtra: (ViewStyle | false | null | undefined)[]
): StyleProp<ViewStyle> {
  const stack: (ViewStyle | false | null | undefined)[] = [cardContent, ...variantOrExtra];
  return withFeedGridContentFill(stack, gridFixedHeight);
}
