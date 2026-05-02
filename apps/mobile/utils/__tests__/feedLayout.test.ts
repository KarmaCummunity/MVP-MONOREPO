import {
  computeFeedCellWidth,
  FEED_GRID_CARD_HEIGHT_DESKTOP,
  FEED_GRID_CARD_HEIGHT_MOBILE,
} from '../feedLayout';

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
