import { Dimensions, Platform, I18nManager, ScaledSize } from 'react-native';

// TODO: Add comprehensive TypeScript interfaces for all responsive utilities
// TODO: Implement proper breakpoint system with named breakpoints
// TODO: Add comprehensive device detection (iPhone models, Android variants)
// TODO: Create responsive hook system with proper subscription management
// TODO: Add comprehensive orientation change handling
// TODO: Implement proper accessibility scaling support
// TODO: Add comprehensive performance optimization for responsive calculations
// TODO: Create proper responsive testing and validation tools
// TODO: Add comprehensive documentation for responsive design patterns
// TODO: Implement proper responsive image and asset management

// Breakpoint constants for responsive design
export const BREAKPOINTS = {
  MOBILE: 360,
  SMALL_PHONE: 480,
  LARGE_PHONE: 768,
  TABLET: 1024,
  DESKTOP: 1440,
  LARGE_DESKTOP: 1920,
} as const;

// Screen info helpers - Enhanced with better breakpoint detection
export const getScreenInfo = () => {
  const { width, height } = Dimensions.get('window');
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);

  const isMobile = width < BREAKPOINTS.SMALL_PHONE;
  const isSmallPhone = width >= BREAKPOINTS.MOBILE && width < BREAKPOINTS.SMALL_PHONE;
  const isLargePhone = width >= BREAKPOINTS.SMALL_PHONE && width < BREAKPOINTS.LARGE_PHONE;
  const isTablet = width >= BREAKPOINTS.LARGE_PHONE && width < BREAKPOINTS.TABLET;
  const isDesktop = Platform.OS === 'web' && width >= BREAKPOINTS.TABLET && width < BREAKPOINTS.DESKTOP;
  const isLargeDesktop = Platform.OS === 'web' && width >= BREAKPOINTS.DESKTOP;

  return {
    width,
    height,
    shortest,
    longest,
    isMobile,
    isSmallPhone,
    isLargePhone,
    isTablet,
    isDesktop,
    isLargeDesktop,
  };
};

export type Orientation = 'portrait' | 'landscape';

export const getOrientation = (): Orientation => {
  const { width, height } = Dimensions.get('window');
  return height >= width ? 'portrait' : 'landscape';
};

export const isPortrait = () => getOrientation() === 'portrait';
export const isLandscape = () => getOrientation() === 'landscape';

// React hook to track orientation at runtime
export const useOrientation = (): Orientation => {
  const { width, height } = Dimensions.get('window');
  // Basic, lightweight: any change in window dims implies orientation change
  return height >= width ? 'portrait' : 'landscape';
};

// Enhanced scale based on iPhone 11 baseline width (414) with better mobile web support
// TODO: Make baseline configurable and support multiple device baselines
// TODO: Add proper scale caching to improve performance
// TODO: Implement proper scale testing across different devices
// TODO: Add scale limits and validation to prevent extreme scaling
export const scaleSize = (size: number) => {
  const { width, height } = Dimensions.get('window');
  const baseline = 414; // TODO: Move to constants file

  // For web, use better mobile detection and scaling
  if (Platform.OS === 'web') {
    // Check if it's a mobile browser based on viewport size
    const isMobileWeb = width <= 768 && (width / height < 1.2); // Portrait-ish mobile

    if (isMobileWeb) {
      // More aggressive scaling for mobile web to ensure readability
      const mobileFactor = Math.min(Math.max(width / baseline, 0.9), 1.4);
      return Math.round(size * mobileFactor);
    } else {
      // Desktop web - moderate scaling
      const desktopFactor = Math.min(Math.max(width / 1024, 0.8), 1.2);
      return Math.round(size * desktopFactor);
    }
  }

  // Original scaling for native mobile
  const factor = Math.min(Math.max(width / baseline, 0.85), 1.25);
  return Math.round(size * factor);
};

export const vw = (percent: number) => Dimensions.get('window').width * (percent / 100);
export const vh = (percent: number) => Dimensions.get('window').height * (percent / 100);

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Enhanced web platform detection
export const isMobileWeb = () => {
  if (!isWeb) return false;
  const { width, height } = Dimensions.get('window');
  return width <= 768 && (width / height < 1.5); // Mobile web viewport
};

export const isTabletWeb = () => {
  if (!isWeb) return false;
  const { width, height } = Dimensions.get('window');
  return width > 768 && width <= 1024;
};

export const isDesktopWeb = () => {
  if (!isWeb) return false;
  const { width } = Dimensions.get('window');
  return width > 1024;
};

// Per requirement: on web, left/right should be flipped relative to mobile (mainly texts)
// We assume app is RTL on mobile; web should visually invert left/right for texts and inline spacing
type Align = 'left' | 'right' | 'center';

export const biDiTextAlign = (mobileDefault: Align = 'right'): Align => {
  if (isWeb) {
    if (mobileDefault === 'left') return 'right';
    if (mobileDefault === 'right') return 'left';
    return 'center';
  }
  // Mobile respects RTL via I18nManager; but we follow requested behavior and keep given default for mobile
  return mobileDefault;
};

export const marginStartEnd = (mobileStart: number = 0, mobileEnd: number = 0) => {
  // On web invert start/end
  const isRTL = I18nManager.isRTL;
  const resolvedStart = isRTL ? mobileEnd : mobileStart;
  const resolvedEnd = isRTL ? mobileStart : mobileEnd;
  if (isWeb) {
    // invert
    return { marginLeft: resolvedEnd, marginRight: resolvedStart };
  }
  return { marginLeft: resolvedStart, marginRight: resolvedEnd };
};

export const paddingStartEnd = (mobileStart: number = 0, mobileEnd: number = 0) => {
  const isRTL = I18nManager.isRTL;
  const resolvedStart = isRTL ? mobileEnd : mobileStart;
  const resolvedEnd = isRTL ? mobileStart : mobileEnd;
  if (isWeb) {
    return { paddingLeft: resolvedEnd, paddingRight: resolvedStart };
  }
  return { paddingLeft: resolvedStart, paddingRight: resolvedEnd };
};

export const rowDirection = (mobileDefault: 'row' | 'row-reverse' = 'row') => {
  // For rows, keep mobile default; invert for web to mirror
  if (isWeb) {
    return mobileDefault === 'row' ? 'row-reverse' : 'row';
  }
  return mobileDefault;
};

// Responsive spacing function - returns spacing based on screen size
export const responsiveSpacing = (
  mobile: number,
  tablet?: number,
  desktop?: number
): number => {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

  if (isLargeDesktop && desktop !== undefined) return Math.round(desktop * 1.2);
  if (isDesktopWeb && desktop !== undefined) return desktop;
  if (isDesktop && desktop !== undefined) return desktop;
  if (isTablet && tablet !== undefined) return tablet;
  return mobile;
};

// Responsive font size function
export const responsiveFontSize = (
  mobile: number,
  tablet?: number,
  desktop?: number
): number => {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

  if (isLargeDesktop && desktop !== undefined) return Math.round(desktop * 1.1);
  if (isDesktopWeb && desktop !== undefined) return desktop;
  if (isDesktop && desktop !== undefined) return desktop;
  if (isTablet && tablet !== undefined) return tablet;
  return scaleSize(mobile);
};

// Responsive width function - returns width based on screen size with optional max width
export const responsiveWidth = (
  mobilePercent: number,
  maxWidth?: number
): number | string => {
  const { width, isDesktop, isLargeDesktop } = getScreenInfo();
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;
  const calculatedWidth = (width * mobilePercent) / 100;

  if (isDesktopWeb && maxWidth) {
    return Math.min(calculatedWidth, maxWidth);
  }
  if (isDesktop && maxWidth) {
    return Math.min(calculatedWidth, maxWidth);
  }
  return calculatedWidth;
};

// Responsive button styles helper - returns button style props
export const getResponsiveButtonStyles = () => {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

  return {
    paddingHorizontal: isLargeDesktop ? 36 : isDesktopWeb ? 32 : isTablet ? 28 : 24,
    paddingVertical: isLargeDesktop ? 18 : isDesktopWeb ? 16 : isTablet ? 14 : 12,
    minWidth: isLargeDesktop ? 300 : isDesktopWeb ? 280 : isTablet ? 240 : 200,
    maxWidth: isLargeDesktop ? 450 : isDesktopWeb ? 400 : isTablet ? 360 : '100%',
    borderRadius: isLargeDesktop ? 15 : isDesktopWeb ? 14 : isTablet ? 13 : 12,
    fontSize: isLargeDesktop ? 20 : isDesktopWeb ? 18 : isTablet ? 17 : scaleSize(16),
    alignSelf: 'center' as const,
  };
};

// Responsive container styles helper - returns container style props
export const getResponsiveContainerStyles = () => {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

  return {
    padding: isLargeDesktop ? 48 : isDesktopWeb ? 40 : isTablet ? 32 : 20,
    paddingHorizontal: isLargeDesktop ? 48 : isDesktopWeb ? 40 : isTablet ? 32 : 20,
    paddingVertical: isLargeDesktop ? 48 : isDesktopWeb ? 40 : isTablet ? 32 : 20,
    width: '100%',
  };
};

// Responsive modal styles helper
export const getResponsiveModalStyles = () => {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

  return {
    width: isLargeDesktop ? '40%' : isDesktopWeb ? '50%' : isTablet ? '70%' : '80%',
    maxWidth: isLargeDesktop ? 600 : isDesktopWeb ? 500 : isTablet ? 400 : undefined,
    maxHeight: isLargeDesktop ? '85%' : isDesktopWeb ? '80%' : isTablet ? '75%' : '70%',
    padding: isLargeDesktop ? 40 : isDesktopWeb ? 32 : isTablet ? 24 : 20,
    borderRadius: isLargeDesktop ? 18 : isDesktopWeb ? 16 : isTablet ? 14 : 10,
  };
};

// Responsive menu styles helper - for dropdown menus
export const getResponsiveMenuStyles = () => {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

  return {
    minWidth: isLargeDesktop ? 220 : isDesktopWeb ? 200 : isTablet ? 180 : 160,
    maxWidth: isLargeDesktop ? 280 : isDesktopWeb ? 250 : isTablet ? 220 : 200,
    maxHeight: isLargeDesktop ? 400 : isDesktopWeb ? 350 : isTablet ? 300 : 250,
    paddingVertical: isLargeDesktop ? 12 : isDesktopWeb ? 10 : isTablet ? 8 : 6,
    paddingHorizontal: isLargeDesktop ? 16 : isDesktopWeb ? 14 : isTablet ? 12 : 10,
    borderRadius: isLargeDesktop ? 14 : isDesktopWeb ? 12 : isTablet ? 11 : 10,
    top: isLargeDesktop ? 80 : isDesktopWeb ? 70 : isTablet ? 65 : 60,
    right: isLargeDesktop ? 24 : isDesktopWeb ? 20 : isTablet ? 18 : 15,
    fontSize: isLargeDesktop ? 18 : isDesktopWeb ? 16 : isTablet ? 15 : scaleSize(14),
  };
};

// Return the width for the login side panel
export const getLoginSidePanelWidth = () => {
  const { width, isDesktop, isTablet } = getScreenInfo();
  if (isDesktop) return 400;
  if (isTablet) return 350;
  return width * 0.85;
};

// Responsive padding function - returns padding object
export const responsivePadding = (
  mobile: number | { horizontal?: number; vertical?: number },
  tablet?: number | { horizontal?: number; vertical?: number },
  desktop?: number | { horizontal?: number; vertical?: number }
) => {
  const { isTablet, isDesktop, isLargeDesktop } = getScreenInfo();
  const { width } = Dimensions.get('window');
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;

  let result: { horizontal?: number; vertical?: number } = {};

  if (isLargeDesktop && desktop !== undefined) {
    result = typeof desktop === 'number'
      ? { horizontal: Math.round(desktop * 1.2), vertical: Math.round(desktop * 1.2) }
      : {
        horizontal: desktop.horizontal ? Math.round(desktop.horizontal * 1.2) : undefined,
        vertical: desktop.vertical ? Math.round(desktop.vertical * 1.2) : undefined
      };
  } else if (isDesktopWeb && desktop !== undefined) {
    result = typeof desktop === 'number'
      ? { horizontal: desktop, vertical: desktop }
      : desktop;
  } else if (isDesktop && desktop !== undefined) {
    result = typeof desktop === 'number'
      ? { horizontal: desktop, vertical: desktop }
      : desktop;
  } else if (isTablet && tablet !== undefined) {
    result = typeof tablet === 'number'
      ? { horizontal: tablet, vertical: tablet }
      : tablet;
  } else {
    result = typeof mobile === 'number'
      ? { horizontal: mobile, vertical: mobile }
      : mobile;
  }

  return {
    paddingHorizontal: result.horizontal ?? 0,
    paddingVertical: result.vertical ?? 0,
  };
};


