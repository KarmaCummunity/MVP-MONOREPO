/**
 * Responsive layout API: breakpoints, screen info, scaling, and view selection.
 * Implementation is split under `globals/responsive/` (file size limits).
 */

export { BREAKPOINTS, SCALE_BASELINE_WIDTH } from './responsive/constants';
export type { BreakpointName, LayoutBucket, Orientation } from './responsive/types';

export {
  isWeb,
  isIOS,
  isAndroid,
  getPlatformKind,
} from './responsive/platform';
export type { PlatformKind } from './responsive/platform';

export {
  getScreenInfo,
  getScreenInfoFromDimensions,
  getOrientation,
  isPortrait,
  isLandscape,
  type ScreenInfo,
} from './responsive/screenInfo';

export {
  useScreenInfo,
  useOrientation,
  useFontScale,
} from './responsive/hooks';

export {
  scaleSize,
  vw,
  vh,
  isMobileWeb,
  isTabletWeb,
  isDesktopWeb,
} from './responsive/scale';

export {
  biDiTextAlign,
  marginStartEnd,
  paddingStartEnd,
  rowDirection,
} from './responsive/bidi';

export {
  pickByLayout,
  pickByPlatform,
  pickResponsive,
  useResponsiveByLayout,
  useResponsivePick,
  type ResponsiveByLayout,
  type ResponsiveByPlatform,
} from './responsive/layout';

export {
  responsiveSpacing,
  responsiveFontSize,
  responsiveWidth,
  responsivePadding,
} from './responsive/spacingHelpers';

export {
  getResponsiveButtonStyles,
  getResponsiveContainerStyles,
} from './responsive/componentStyles';

export {
  getResponsiveModalStyles,
  getResponsiveMenuStyles,
} from './responsive/overlayStyles';

export { getLoginSidePanelWidth } from './responsive/panelHelpers';
