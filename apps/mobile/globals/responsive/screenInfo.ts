import { Dimensions } from 'react-native';
import { BREAKPOINTS } from './constants';
import type { LayoutBucket, Orientation } from './types';
import { isWeb } from './platform';

export type ScreenInfo = {
  width: number;
  height: number;
  shortest: number;
  longest: number;
  /** Width used for breakpoint buckets (shortest side on native, width on web) */
  layoutWidth: number;
  layoutBucket: LayoutBucket;
  isCompact: boolean;
  isMobile: boolean;
  isSmallPhone: boolean;
  isLargePhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  orientation: Orientation;
};

const bucketFromLayoutWidth = (layoutWidth: number): LayoutBucket => {
  if (layoutWidth < BREAKPOINTS.MOBILE) return 'compact';
  if (layoutWidth < BREAKPOINTS.SMALL_PHONE) return 'phone';
  if (layoutWidth < BREAKPOINTS.LARGE_PHONE) return 'largePhone';
  if (layoutWidth < BREAKPOINTS.TABLET) return 'tablet';
  if (layoutWidth < BREAKPOINTS.DESKTOP) return 'desktop';
  return 'largeDesktop';
};

/**
 * Snapshot of window metrics and layout flags. On native, buckets use the
 * shortest window side so landscape phones stay in phone buckets, not tablet.
 */
export const getScreenInfoFromDimensions = (
  width: number,
  height: number
): ScreenInfo => {
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const layoutWidth = isWeb ? width : shortest;
  const layoutBucket = bucketFromLayoutWidth(layoutWidth);
  const orientation: Orientation = height >= width ? 'portrait' : 'landscape';

  const isCompact = layoutBucket === 'compact';
  const isSmallPhone = layoutBucket === 'phone';
  const isLargePhone = layoutBucket === 'largePhone';
  const isTablet = layoutBucket === 'tablet';
  const isDesktop = isWeb && layoutBucket === 'desktop';
  const isLargeDesktop = isWeb && layoutBucket === 'largeDesktop';

  const isMobile = isCompact || isSmallPhone;

  return {
    width,
    height,
    shortest,
    longest,
    layoutWidth,
    layoutBucket,
    isCompact,
    isMobile,
    isSmallPhone,
    isLargePhone,
    isTablet,
    isDesktop,
    isLargeDesktop,
    orientation,
  };
};

export const getScreenInfo = (): ScreenInfo => {
  const { width, height } = Dimensions.get('window');
  return getScreenInfoFromDimensions(width, height);
};

export const getOrientation = (): Orientation => getScreenInfo().orientation;

export const isPortrait = (): boolean => getOrientation() === 'portrait';
export const isLandscape = (): boolean => getOrientation() === 'landscape';
