import { type StyleProp, type ViewStyle } from 'react-native';

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
