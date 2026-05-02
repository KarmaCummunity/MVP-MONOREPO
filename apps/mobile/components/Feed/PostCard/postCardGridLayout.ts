import type { StyleProp, ViewStyle } from 'react-native';

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
