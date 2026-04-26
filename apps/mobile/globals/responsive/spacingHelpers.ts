import { getResponsiveStyleBucket } from './styleBuckets';
import { scaleSize } from './scale';

export const responsiveSpacing = (
  mobile: number,
  tablet?: number,
  desktop?: number
): number => {
  const { bucket } = getResponsiveStyleBucket();

  if (bucket === 'largeDesktop' && desktop !== undefined) {
    return Math.round(desktop * 1.2);
  }
  if (bucket === 'desktopWeb' && desktop !== undefined) return desktop;
  if (bucket === 'desktop' && desktop !== undefined) return desktop;
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
  if (bucket === 'desktopWeb' && desktop !== undefined) return desktop;
  if (bucket === 'desktop' && desktop !== undefined) return desktop;
  if (bucket === 'tablet' && tablet !== undefined) return tablet;
  return scaleSize(mobile);
};

export const responsiveWidth = (
  mobilePercent: number,
  maxWidth?: number
): number | string => {
  const { info, bucket } = getResponsiveStyleBucket();
  const calculatedWidth = (info.width * mobilePercent) / 100;

  if (bucket === 'desktopWeb' && maxWidth) {
    return Math.min(calculatedWidth, maxWidth);
  }
  if (bucket === 'desktop' && maxWidth) {
    return Math.min(calculatedWidth, maxWidth);
  }
  return calculatedWidth;
};

export const responsivePadding = (
  mobile: number | { horizontal?: number; vertical?: number },
  tablet?: number | { horizontal?: number; vertical?: number },
  desktop?: number | { horizontal?: number; vertical?: number }
) => {
  const { bucket } = getResponsiveStyleBucket();

  let result: { horizontal?: number; vertical?: number } = {};

  if (bucket === 'largeDesktop' && desktop !== undefined) {
    result =
      typeof desktop === 'number'
        ? {
            horizontal: Math.round(desktop * 1.2),
            vertical: Math.round(desktop * 1.2),
          }
        : {
            horizontal: desktop.horizontal
              ? Math.round(desktop.horizontal * 1.2)
              : undefined,
            vertical: desktop.vertical
              ? Math.round(desktop.vertical * 1.2)
              : undefined,
          };
  } else if (bucket === 'desktopWeb' && desktop !== undefined) {
    result =
      typeof desktop === 'number'
        ? { horizontal: desktop, vertical: desktop }
        : desktop;
  } else if (bucket === 'desktop' && desktop !== undefined) {
    result =
      typeof desktop === 'number'
        ? { horizontal: desktop, vertical: desktop }
        : desktop;
  } else if (bucket === 'tablet' && tablet !== undefined) {
    result =
      typeof tablet === 'number'
        ? { horizontal: tablet, vertical: tablet }
        : tablet;
  } else {
    result =
      typeof mobile === 'number'
        ? { horizontal: mobile, vertical: mobile }
        : mobile;
  }

  return {
    paddingHorizontal: result.horizontal ?? 0,
    paddingVertical: result.vertical ?? 0,
  };
};
