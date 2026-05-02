import type { ViewStyle } from 'react-native';
import {
  computeFeedCellWidth,
  FEED_GRID_CARD_HEIGHT_DESKTOP,
  FEED_GRID_CARD_HEIGHT_MOBILE,
} from '../feedLayout';
import {
  composeFeedCardContainerStyle,
  resolveGridFixedOuterStyle,
} from '../../components/Feed/PostCard/postCardGridLayout';

describe('feedLayout', () => {
  it('exports positive grid card heights for fixed feed rows', () => {
    expect(FEED_GRID_CARD_HEIGHT_MOBILE).toBeGreaterThan(0);
    expect(FEED_GRID_CARD_HEIGHT_DESKTOP).toBeGreaterThan(0);
  });

  it('computeFeedCellWidth accounts for padding and column gap', () => {
    const w = computeFeedCellWidth({
      windowWidth: 400,
      horizontalPadding: 16,
      numColumns: 2,
      columnGap: 8,
    });
    expect(w).toBe(180);
  });
});

describe('postCardGridLayout (with feedLayout suite)', () => {
  it('resolveGridFixedOuterStyle returns undefined when not applicable', () => {
    expect(resolveGridFixedOuterStyle(false, 320)).toBeUndefined();
    expect(resolveGridFixedOuterStyle(true, undefined)).toBeUndefined();
  });

  it('resolveGridFixedOuterStyle returns fixed height when grid + height', () => {
    expect(resolveGridFixedOuterStyle(true, 300)).toEqual({ height: 300, minHeight: 300 });
  });

  it('composeFeedCardContainerStyle includes width and optional grid min height', () => {
    const c: ViewStyle = { flex: 1 };
    const g: ViewStyle = { minHeight: 1 };
    const noFixed = composeFeedCardContainerStyle({
      container: c,
      gridMinHeightFallback: g,
      isGrid: true,
      gridOuterFixed: undefined,
      cardWidth: 12,
    });
    const arr = noFixed as ViewStyle[];
    expect(Array.isArray(arr)).toBe(true);
    expect(arr[arr.length - 1]).toEqual({ width: 12 });
  });
});
