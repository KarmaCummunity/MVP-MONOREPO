import { getResponsiveStyleBucket } from './styleBuckets';
import type { ResponsiveStyleBucket } from './styleBuckets';
import { scaleSize } from './scale';

type PaddingInput = number | { horizontal?: number; vertical?: number };

const toPaddingObject = (
  p: PaddingInput
): { horizontal?: number; vertical?: number } =>
  typeof p === 'number' ? { horizontal: p, vertical: p } : { ...p };

const scalePaddingObject = (
  p: { horizontal?: number; vertical?: number },
  factor: number
): { horizontal?: number; vertical?: number } => ({
  horizontal:
    p.horizontal !== undefined ? Math.round(p.horizontal * factor) : undefined,
  vertical:
    p.vertical !== undefined ? Math.round(p.vertical * factor) : undefined,
});

const isDesktopBucket = (bucket: ResponsiveStyleBucket): boolean =>
  bucket === 'desktopWeb' || bucket === 'desktop';

const paddingFromBucket = (
  bucket: ResponsiveStyleBucket,
  mobile: PaddingInput,
  tablet?: PaddingInput,
  desktop?: PaddingInput
): { horizontal?: number; vertical?: number } => {
  if (bucket === 'largeDesktop' && desktop !== undefined) {
    return scalePaddingObject(toPaddingObject(desktop), 1.2);
  }
  if (isDesktopBucket(bucket) && desktop !== undefined) {
    return toPaddingObject(desktop);
  }
  if (bucket === 'tablet' && tablet !== undefined) {
    return toPaddingObject(tablet);
  }
  return toPaddingObject(mobile);
};

export const responsiveSpacing = (
  mobile: number,
  tablet?: number,
  desktop?: number
): number => {
  const { bucket } = getResponsiveStyleBucket();

  if (bucket === 'largeDesktop' && desktop !== undefined) {
    return Math.round(desktop * 1.2);
  }
  if (isDesktopBucket(bucket) && desktop !== undefined) return desktop;
  if (bucket === 'tablet' && tablet !== undefined) return tablet;
  return mobile;
};

export const responsiveFontSize = (
  mobile: number,
  tablet?: number,
  desktop?: number
): number => {
  const { bucket } = getResponsiveStyleBucket();

  if (bucket === 'largeDesktop' && desktop !== undefined) {
    return Math.round(desktop * 1.1);
  }
  if (isDesktopBucket(bucket) && desktop !== undefined) return desktop;
  if (bucket === 'tablet' && tablet !== undefined) return tablet;
  return scaleSize(mobile);
};

export const responsiveWidth = (
  mobilePercent: number,
  maxWidth?: number
): number | string => {
  const { info, bucket } = getResponsiveStyleBucket();
  const calculatedWidth = (info.width * mobilePercent) / 100;

  if (isDesktopBucket(bucket) && maxWidth) {
    return Math.min(calculatedWidth, maxWidth);
  }
  return calculatedWidth;
};

export const responsivePadding = (
  mobile: PaddingInput,
  tablet?: PaddingInput,
  desktop?: PaddingInput
) => {
  const { bucket } = getResponsiveStyleBucket();
  const result = paddingFromBucket(bucket, mobile, tablet, desktop);

  return {
    paddingHorizontal: result.horizontal ?? 0,
    paddingVertical: result.vertical ?? 0,
  };
};
