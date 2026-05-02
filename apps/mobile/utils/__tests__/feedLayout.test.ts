import type { ViewStyle } from 'react-native';
import {
  computeFeedCellWidth,
  FEED_GRID_CARD_HEIGHT_DESKTOP,
  FEED_GRID_CARD_HEIGHT_MOBILE,
} from '../feedLayout';
import {
  composeFeedCardContainerStyle,
  getFeedGridSizing,
  resolveGridFixedOuterStyle,
  withFeedGridContentFill,
} from '../../components/Feed/PostCard/postCardGridLayout';

describe('feedLayout & grid helpers', () => {
  it('feed exports and cell width', () => {
    expect(FEED_GRID_CARD_HEIGHT_MOBILE).toBeGreaterThan(0);
    expect(FEED_GRID_CARD_HEIGHT_DESKTOP).toBeGreaterThan(0);
    expect(
      computeFeedCellWidth({
        windowWidth: 400,
        horizontalPadding: 16,
        numColumns: 2,
        columnGap: 8,
      }),
    ).toBe(180);
  });

  it('grid sizing helpers', () => {
    expect(resolveGridFixedOuterStyle(false, 320)).toBeUndefined();
    expect(resolveGridFixedOuterStyle(true, undefined)).toBeUndefined();
    expect(resolveGridFixedOuterStyle(true, 300)).toEqual({ height: 300, minHeight: 300 });
    expect(getFeedGridSizing(true, 100).gridFixedHeight).toBe(true);
    expect(getFeedGridSizing(true, undefined).gridFixedHeight).toBe(false);
    const c: ViewStyle = { flex: 1 };
    const g: ViewStyle = { minHeight: 1 };
    const arr2 = withFeedGridContentFill([c], true) as ViewStyle[];
    expect(arr2.length).toBe(2);
    const arr = composeFeedCardContainerStyle({
      container: c,
      gridMinHeightFallback: g,
      isGrid: true,
      gridOuterFixed: undefined,
      cardWidth: 12,
    }) as ViewStyle[];
    expect(arr[arr.length - 1]).toEqual({ width: 12 });
  });
});

