import { computeFeedCellWidth } from '../feedLayout';

describe('computeFeedCellWidth', () => {
  it('returns positive width when window width is 0 (web bootstrap)', () => {
    expect(
      computeFeedCellWidth({
        windowWidth: 0,
        horizontalPadding: 8,
        numColumns: 2,
        columnGap: 8,
      }),
    ).toBeGreaterThan(0);
  });

  it('matches two-column math for a typical phone width', () => {
    const w = 390;
    const pad = 8;
    const gap = 8;
    const available = w - pad * 2;
    const expected = (available - gap) / 2;
    expect(
      computeFeedCellWidth({
        windowWidth: w,
        horizontalPadding: pad,
        numColumns: 2,
        columnGap: gap,
      }),
    ).toBeCloseTo(expected, 5);
  });
});
