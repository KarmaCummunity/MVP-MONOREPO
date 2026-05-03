import { Dimensions, Platform } from 'react-native';
import { SCALE_BASELINE_WIDTH } from './constants';
import { BREAKPOINTS } from './constants';
import { getScreenInfo } from './screenInfo';
import { isWeb } from './platform';

export const scaleSize = (size: number) => {
  const { width, height } = Dimensions.get('window');
  const baseline = SCALE_BASELINE_WIDTH;

  if (Platform.OS === 'web') {
    const { layoutWidth } = getScreenInfo();
    const isMobileWebViewport =
      layoutWidth <= BREAKPOINTS.LARGE_PHONE && width / height < 1.2;

    if (isMobileWebViewport) {
      const mobileFactor = Math.min(Math.max(width / baseline, 0.9), 1.4);
      return Math.round(size * mobileFactor);
    }
    const desktopFactor = Math.min(Math.max(width / 1024, 0.8), 1.2);
    return Math.round(size * desktopFactor);
  }

  const factor = Math.min(Math.max(width / baseline, 0.85), 1.25);
  return Math.round(size * factor);
};

export const vw = (percent: number) =>
  Dimensions.get('window').width * (percent / 100);

export const vh = (percent: number) =>
  Dimensions.get('window').height * (percent / 100);

export const isMobileWeb = () => {
  if (!isWeb) return false;
  const { width, height, layoutWidth } = getScreenInfo();
  return layoutWidth <= BREAKPOINTS.LARGE_PHONE && width / height < 1.5;
};

export const isTabletWeb = () => {
  if (!isWeb) return false;
  const { layoutWidth } = getScreenInfo();
  return (
    layoutWidth > BREAKPOINTS.LARGE_PHONE &&
    layoutWidth <= BREAKPOINTS.TABLET
  );
};

export const isDesktopWeb = () => {
  if (!isWeb) return false;
  const { layoutWidth } = getScreenInfo();
  return layoutWidth > BREAKPOINTS.TABLET;
};
