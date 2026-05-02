import { type StyleProp, type ViewStyle } from 'react-native';
import type { BaseCardProps } from './types';

/**
 * Middle section grows between header and actions in fixed-height grid cards (no gray gap).
 * Single export — duplicates across card StyleSheets trigger Sonar duplication.
 */
export const feedCardContentGridFillStyle: ViewStyle = {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0
};

/**
 * Fixed outer dimensions for feed grid cells — keeps rows aligned and avoids flex filler gaps.
 */
export function resolveGridFixedOuterStyle(
    isGrid: boolean,
    gridCardHeight?: number
): ViewStyle | undefined {
    if (!isGrid || gridCardHeight == null) {
        return undefined;
    }
    return { height: gridCardHeight, minHeight: gridCardHeight };
}

/** `gridOuterFixed` + `gridFixedHeight` for feed cards (avoids repeated two-liner in each card). */
export function getFeedGridSizing(isGrid: boolean, gridCardHeight?: number) {
    const gridOuterFixed = resolveGridFixedOuterStyle(isGrid, gridCardHeight);
    return {
        gridOuterFixed,
        gridFixedHeight: gridOuterFixed != null
    };
}

/** Append shared grid fill when the card uses a fixed grid height. */
export function withFeedGridContentFill(
    baseStyles: (ViewStyle | false | null | undefined)[],
    gridFixedHeight: boolean
): StyleProp<ViewStyle> {
    return [...baseStyles, gridFixedHeight && feedCardContentGridFillStyle];
}

/** Container + grid fallback styles present on every feed card StyleSheet. */
export interface FeedCardGridRootStyles {
    container: ViewStyle;
    gridMinHeightFallback: ViewStyle;
}

/**
 * Same root layout as `resolveFeedCardRootLayout` but folds repeated `isGrid` / `gridCardHeight` /
 * `cardWidth` + `styles.container` / `styles.gridContainer` wiring into one call site.
 */
export function resolveFeedCardRootFromBaseGrid(
    grid: Pick<BaseCardProps, 'isGrid' | 'gridCardHeight' | 'cardWidth'>,
    cardStyles: FeedCardGridRootStyles,
    modifiers?: (ViewStyle | false | null | undefined)[]
): { rootStyle: StyleProp<ViewStyle>; gridFixedHeight: boolean } {
    return resolveFeedCardRootLayout({
        isGrid: grid.isGrid,
        gridCardHeight: grid.gridCardHeight,
        cardWidth: grid.cardWidth,
        container: cardStyles.container,
        gridMinHeightFallback: cardStyles.gridMinHeightFallback,
        modifiers
    });
}

/** Root layout for feed cards: combines grid sizing + container style array (single call site per card). */
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
        modifiers: parts.modifiers
    });
    return { rootStyle, gridFixedHeight };
}

/** Root `View` style array shared by feed post cards (grid min-height vs fixed height). */
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
        { width: parts.cardWidth }
    ];
}
