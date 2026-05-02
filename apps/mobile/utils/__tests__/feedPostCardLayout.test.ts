import type { ViewStyle } from 'react-native';
import {
  composeFeedCardContainerStyle,
  feedCardMainAreaStyle,
  resolveFeedCardRootLayout,
  resolveFeedGridCardRoot,
  resolveGridFixedOuterStyle,
  withFeedGridContentFill,
} from '../feedPostCardLayout';

const sheet = {
  container: { flex: 1 } as ViewStyle,
  gridContainer: { minHeight: 10 } as ViewStyle,
};

describe('feedPostCardLayout', () => {
  it('resolveGridFixedOuterStyle', () => {
    expect(resolveGridFixedOuterStyle(true, 100)).toEqual({ height: 100, minHeight: 100 });
    expect(resolveGridFixedOuterStyle(false, 100)).toBeUndefined();
  });

  it('resolveFeedGridCardRoot', () => {
    const { rootStyle, gridFixedHeight } = resolveFeedGridCardRoot(
      { isGrid: true, gridCardHeight: 50, cardWidth: 99 },
      sheet,
    );
    expect(gridFixedHeight).toBe(true);
    const arr = rootStyle as ViewStyle[];
    expect(arr[arr.length - 1]).toEqual({ width: 99 });
  });

  it('feedCardMainAreaStyle adds fill when grid fixed height', () => {
    const s = feedCardMainAreaStyle(true, { flex: 1 }, { opacity: 0.5 });
    expect(Array.isArray(s)).toBe(true);
    expect((s as ViewStyle[]).length).toBeGreaterThanOrEqual(2);
  });

  it('composeFeedCardContainerStyle with modifiers', () => {
    const out = composeFeedCardContainerStyle({
      container: sheet.container,
      gridMinHeightFallback: sheet.gridContainer,
      isGrid: true,
      gridOuterFixed: undefined,
      cardWidth: 12,
      modifiers: [{ opacity: 0 }],
    });
    expect((out as ViewStyle[]).includes(sheet.gridContainer)).toBe(true);
  });

  it('resolveFeedCardRootLayout', () => {
    expect(
      resolveFeedCardRootLayout({
        isGrid: true,
        gridCardHeight: 30,
        cardWidth: 1,
        container: sheet.container,
        gridMinHeightFallback: sheet.gridContainer,
      }).gridFixedHeight,
    ).toBe(true);
  });

  it('withFeedGridContentFill', () => {
    expect((withFeedGridContentFill([sheet.container], true) as ViewStyle[]).length).toBe(2);
  });
});
