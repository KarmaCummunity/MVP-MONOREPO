import type { ViewStyle } from 'react-native';

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

export function isGridFixedHeight(style: ViewStyle | undefined): boolean {
    return style != null;
}
