import {
  computeFeedCellWidth,
  FEED_GRID_CARD_HEIGHT_DESKTOP,
  FEED_GRID_CARD_HEIGHT_MOBILE,
} from '../feedLayout';

describe('feedLayout', () => {
  it('exports and computeFeedCellWidth', () => {
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
});
