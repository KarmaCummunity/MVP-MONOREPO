import type { ViewStyle } from 'react-native';
import {
  computeFeedCellWidth,
  FEED_GRID_CARD_HEIGHT_DESKTOP,
  FEED_GRID_CARD_HEIGHT_MOBILE,
} from '../feedLayout';
import {
  resolveFeedCardRootLayout,
  resolveFeedGridCardRoot,
  resolveGridFixedOuterStyle,
  withFeedGridContentFill,
} from '../../components/Feed/PostCard/postCardGridLayout';

const mockSheet = { container: { flex: 1 } as ViewStyle, gridContainer: { minHeight: 1 } as ViewStyle };

describe('feedLayout & grid', () => {
  it('constants, width, and layout helpers', () => {
    expect(FEED_GRID_CARD_HEIGHT_MOBILE).toBeGreaterThan(0);
    expect(FEED_GRID_CARD_HEIGHT_DESKTOP).toBeGreaterThan(0);
    expect(
      computeFeedCellWidth({ windowWidth: 400, horizontalPadding: 16, numColumns: 2, columnGap: 8 }),
    ).toBe(180);
    expect(resolveGridFixedOuterStyle(false, 320)).toBeUndefined();
    expect(resolveGridFixedOuterStyle(true, 300)).toEqual({ height: 300, minHeight: 300 });

    const r = resolveFeedGridCardRoot(
      { isGrid: true, gridCardHeight: 400, cardWidth: 12 },
      mockSheet,
    );
    expect(r.gridFixedHeight).toBe(true);
    expect((r.rootStyle as ViewStyle[]).pop()).toEqual({ width: 12 });

    expect(
      (
        resolveFeedCardRootLayout({
          isGrid: true,
          gridCardHeight: 400,
          cardWidth: 12,
          container: mockSheet.container,
          gridMinHeightFallback: mockSheet.gridContainer,
        }).gridFixedHeight
      ),
    ).toBe(true);

    expect((withFeedGridContentFill([mockSheet.container], true) as ViewStyle[]).length).toBe(2);
  });
});
