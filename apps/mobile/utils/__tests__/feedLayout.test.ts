import type { ViewStyle } from 'react-native';
import {
  computeFeedCellWidth,
  FEED_GRID_CARD_HEIGHT_DESKTOP,
  FEED_GRID_CARD_HEIGHT_MOBILE,
} from '../feedLayout';
import {
  resolveFeedCardRootFromBaseGrid,
  resolveFeedCardRootLayout,
  resolveGridFixedOuterStyle,
  withFeedGridContentFill,
} from '../../components/Feed/PostCard/postCardGridLayout';

describe('feedLayout & grid helpers', () => {
  it('feed constants, cell width, and grid layout helpers', () => {
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

    expect(resolveGridFixedOuterStyle(false, 320)).toBeUndefined();
    expect(resolveGridFixedOuterStyle(true, 300)).toEqual({ height: 300, minHeight: 300 });

    const c: ViewStyle = { flex: 1 };
    const g: ViewStyle = { minHeight: 1 };
    const fromBase = resolveFeedCardRootFromBaseGrid(
      { isGrid: true, gridCardHeight: 400, cardWidth: 12 },
      { container: c, gridMinHeightFallback: g },
    );
    expect(fromBase.gridFixedHeight).toBe(true);
    expect((fromBase.rootStyle as ViewStyle[])[(fromBase.rootStyle as ViewStyle[]).length - 1]).toEqual({
      width: 12,
    });

    const raw = resolveFeedCardRootLayout({
      isGrid: true,
      gridCardHeight: 400,
      cardWidth: 12,
      container: c,
      gridMinHeightFallback: g,
    });
    expect(raw.gridFixedHeight).toBe(true);

    expect((withFeedGridContentFill([c], true) as ViewStyle[]).length).toBe(2);
  });
});
