import { Platform } from 'react-native';
import { BREAKPOINTS } from './constants';
import { getScreenInfo, type ScreenInfo } from './screenInfo';

export const isDesktopWebWidth = (width: number) =>
  Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

/** Which preset block legacy helpers use (order matches original if/else chain). */
export type ResponsiveStyleBucket =
  | 'phone'
  | 'tablet'
  | 'desktopWeb'
  | 'desktop'
  | 'largeDesktop';

export const getResponsiveStyleBucket = (): {
  info: ScreenInfo;
  isDesktopWeb: boolean;
  bucket: ResponsiveStyleBucket;
} => {
  const info = getScreenInfo();
  const isDesktopWeb = isDesktopWebWidth(info.width);
  if (info.isLargeDesktop) {
    return { info, isDesktopWeb, bucket: 'largeDesktop' };
  }
  if (isDesktopWeb) {
    return { info, isDesktopWeb, bucket: 'desktopWeb' };
  }
  if (info.isDesktop) {
    return { info, isDesktopWeb, bucket: 'desktop' };
  }
  if (info.isTablet) {
    return { info, isDesktopWeb, bucket: 'tablet' };
  }
  return { info, isDesktopWeb, bucket: 'phone' };
};
