import { StyleSheet, Dimensions, Platform } from "react-native";
import colors from "./colors";
import { 
  biDiTextAlign, 
  rowDirection, 
  scaleSize, 
  getScreenInfo, 
  getResponsiveButtonStyles,
  getResponsiveContainerStyles,
  getResponsiveModalStyles,
  getResponsiveMenuStyles,
  responsiveSpacing,
  responsiveFontSize,
  responsiveWidth,
  BREAKPOINTS
} from "./responsive";
import { FontSizes, LAYOUT_CONSTANTS } from "./constants";

// TODO: CRITICAL - This styles file is extremely long (601+ lines). Split into themed modules:
//   - baseStyles.ts for common/global styles
//   - componentStyles.ts for reusable component styles
//   - layoutStyles.ts for layout-specific styles
//   - utilityStyles.ts for utility classes
// TODO: Remove duplicate style definitions and create proper style inheritance
// TODO: Implement proper theming system with light/dark mode support
// TODO: Add comprehensive TypeScript interfaces for all style objects
// TODO: Remove hardcoded values and use design token system
// TODO: Implement proper responsive breakpoint system
// TODO: Add comprehensive style validation and linting
// TODO: Create proper style documentation and usage guidelines
// TODO: Remove unused styles throughout the application
// TODO: Implement proper cross-platform style optimization


// Helper function to convert color string to rgba string
const colorToRgba = (color: string, opacity: number): string => {
  // Safety check: if color is undefined or null, use black
  if (!color || typeof color !== 'string') {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  
  // If color is already rgba/rgb, extract RGB values
  if (color.startsWith('rgba(')) {
    const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (matches) {
      return `rgba(${matches[1]}, ${matches[2]}, ${matches[3]}, ${opacity})`;
    }
  }
  
  // If color is hex (#RRGGBB or #RGB)
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // Fallback to black with opacity
  return `rgba(0, 0, 0, ${opacity})`;
};

// Helper function to create shadow styles that work on both web and mobile
// TODO: Extract this utility function to separate utilities file
// TODO: Replace 'any' types with proper TypeScript interfaces
// TODO: Add proper cross-platform shadow validation
// TODO: Implement shadow presets for consistent usage
// TODO: Add proper performance optimization for shadow rendering
export const createShadowStyle = (
  shadowColor: string,
  shadowOffset: { width: number; height: number },
  shadowOpacity: number,
  shadowRadius: number
) => {
  if (Platform.OS === 'web') {
    const rgbaColor = colorToRgba(shadowColor, shadowOpacity);
    return {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px ${rgbaColor}`,
    } as any; // TODO: Replace any with proper web style type
  }
  return {
    shadowColor,
    shadowOffset,
    shadowOpacity,
    shadowRadius,
    elevation: Math.max(1, Math.round(shadowRadius)),
  } as any; // TODO: Replace any with proper native style type
};


export const styles = StyleSheet.create({
  /**
   * Container for the bottom navigation bar.
   * Flexes to take available space and aligns content to the bottom.
   */
  container_bottom_nav: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: 'transparent',
  },
  /**
   * Style for a subtitle text.
   * Centers the text and sets a black color.
   */
  subTitle: {
    fontSize: 15,
    color: colors.black,
    textAlign: "center",
  },
  /**
   * Container for the top bar of the screen.
   * Uses transparent background, aligns items, and adds horizontal padding.
   */
  container_top_bar: {
    backgroundColor: colors.backgroundSecondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  /**
   * Generic content container that centers its children both vertically and horizontally.
   */
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  /**
   * Safe area view style with a white background for the entire screen.
   */
  safeArea: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  /**
   * Style for a scroll view, allowing it to take up available space.
   */
  scrollView: {
    flex: 1,
    marginBottom: 20,
    paddingBottom: Platform.OS === 'web' ? 60 : 200, // Much less padding on web
    backgroundColor: colors.warningLight,
  },
  /**
   * Header container with row layout, space between content, and bottom border.
   */
  header: {
    flexDirection: rowDirection('row'),
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  /**
   * Style for the main title in the header.
   */
  headerTitle: {
    fontSize: scaleSize(20),
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  /**
   * Container for left-aligned header icons.
   */
  headerIconsLeft: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'space-between',
  },
  /**
   * Container for right-aligned header icons.
   */
  headerIconsRight: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'space-between',
  },
  /**
   * Content style for scrollable areas with top and bottom padding.
   */
  scrollViewContent: {
    paddingBottom: Platform.OS === 'web' ? 80 : 240, // Much less padding on web
    paddingTop: 12,
  },
  /**
   * Style for individual icons, providing horizontal margin and font size.
   */
  icon: {
    marginHorizontal: 6,
    fontSize: scaleSize(22),
  },
  /**
   * General section container with padding.
   */
  sectionContainer: {
    padding: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  /**
   * Main section container that fills available space with a light background.
   */
  mainSectionContainer: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
  },
  /**
   * Title style for sections, bold and centered.
   */
  sectionTitle: {
    fontSize: scaleSize(18),
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    paddingBottom: 0,
  },
  /**
   * Container for recent buttons, arranged with space around them, light orange background, and rounded corners.
   */
  recentButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.warningLight,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  /**
   * Style for individual recent buttons, with white background, padding, rounded corners, and shadow.
   */
  recentButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    ...createShadowStyle(colors.black, { width: 0, height: 2 }, 0.1, 3),
  },
  /**
   * Text style for recent buttons.
   */
  recentButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  /**
   * Grid container for all categories, with wrap functionality, centered content, light orange background, and rounded corners.
   */
  allCategoriesGrid: {
    // flex:  1,
    marginBottom: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 0,
    height: 800,
  },
  contentWrapperPadded: {
    backgroundColor: colors.warningLight,
    // paddingVertical: 10, // Vertical padding inside this wrapper
    // We're letting localStyles.container handle paddingHorizontal
    // If this view needs a background, define it here.
  },
  /**
   * Style for individual category buttons, making them square, centered, with white background, rounded corners, and shadow.
   */
  categoryButton: {
    backgroundColor: colors.white,
    width: '25%',
    height: '20%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    margin: 10,
    ...createShadowStyle(colors.black, { width: 0, height: 2 }, 0.1, 3),
  },
  /**
   * Text style for category buttons, centered.
   */
  categoryButtonText: {
    fontSize: scaleSize(14),
    fontWeight: 'bold',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  /**
   * Bottom navigation bar style with row layout, space around items, white background, and top border.
   */
  bottomNav: {
    flexDirection: rowDirection('row'),
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    paddingVertical: 10,
  },
  /**
   * Style for individual items in the bottom navigation.
   */
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * Icon style for bottom navigation items.
   */
  bottomNavIcon: {
    fontSize: scaleSize(20),
  },
  /**
   * Text style for bottom navigation items.
   */
  bottomNavText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  /**
   * Container for the special center icon in the bottom navigation.
   * Features an orange background, circular shape, lifted position, border, and shadow.
   */
  bottomNavCenterIconContainer: {
    backgroundColor: colors.accent,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    borderWidth: 4,
    borderColor: colors.surfaceVariant, // Match screen background color
    ...createShadowStyle(colors.black, { width: 0, height: 4 }, 0.2, 5),
  },
  /**
   * Icon style for the center icon in the bottom navigation.
   */
  bottomNavCenterIcon: {
    fontSize: 30,
    color: colors.white,
  },
  /**
   * Container for search and filter elements with a light orange background.
   */
  searchFilterContainer: {
    padding: 15,
    backgroundColor: colors.warningLight,
  },
  /**
   * Search box style with white background, rounded corners, and right alignment.
   */
  searchBox: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  /**
   * Text style within the search box.
   */
  searchText: {
    fontSize: scaleSize(16),
    fontWeight: 'bold',
    color: colors.warning,
  },
  /**
   * Container for search input fields, arranged in a row.
   */
  searchInputs: {
    flexDirection: rowDirection('row'),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /**
   * Style for individual search input fields, with white background, rounded corners, and right-aligned text.
   */
  searchInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 8,
    marginHorizontal: 5,
    textAlign: biDiTextAlign('right'),
  },
  /**
   * Style for search icons.
   */
  searchIcon: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  /**
   * Container for filter buttons, arranged with space around, light orange background, and rounded bottom corners.
   */
  filterButtonsContainer: {
    flexDirection: rowDirection('row'),
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: colors.warningLight,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  /**
   * Style for individual filter buttons, with orange background, rounded corners, and padding.
   */
  filterButton: {
    backgroundColor: colors.pinkDeep,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  /**
   * Text style for filter buttons.
   */
  filterButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  /**
   * Input section container with white background and padding.
   */
  inputSection: {
    padding: 15,
    backgroundColor: colors.white,
  },
  /**
   * Style for an input field row, with right alignment for content.
   */
  inputField: {
    flexDirection: rowDirection('row'),
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 15,
  },
  /**
   * Style for input field labels.
   */
  inputLabel: {
    fontSize: scaleSize(16),
    marginRight: 10,
    fontWeight: 'bold',
  },
  /**
   * Style for a dropdown component, with border, padding, and centered content.
   */
  dropdown: {
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60%',
  },
  /**
   * Generic section style with light orange background, margin, and rounded corners.
   */
  section: {
    padding: 15,
    backgroundColor: colors.warningLight,
    marginTop: 10,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  /**
   * Card style with row layout, white background, rounded corners, padding, and shadow.
   */
  card: {
    flexDirection: rowDirection('row'),
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    ...createShadowStyle(colors.black, { width: 0, height: 2 }, 0.1, 3),
  },
  /**
   * Style for images within cards, circular and with left margin.
   */
  cardImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 15,
  },
  /**
   * Content style for cards, aligning text to the right.
   */
  cardContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  /**
   * Title style for cards.
   */
  cardTitle: {
    fontSize: scaleSize(16),
    fontWeight: 'bold',
    marginBottom: 5,
  },
  /**
   * Description style for cards.
   */
  cardDescription: {
    fontSize: 14,
    color: 'gray', // Keeping this as a literal as no specific gray color is defined in Colors for this
  },
  /**
   * Main container style, aligning content to the bottom and with an off-white background.
   */
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        alignSelf: "stretch", // Use full width on web
        width: "100%", // Full width
        maxWidth: "100vw", // Use viewport width
        minHeight: "100vh", // Ensure full height
      },
    }),
    backgroundColor: colors.background,
  },
  /**
   * Scroll container with padding for content.
   */
  scrollContainer: {
    padding: 20,
    flex: 1,
    paddingTop: 60,
  },
  /**
   * Top section style, centering its content.
   */
  topSection: {
    alignItems: 'center',
  },
  /**
   * Main title style, bold, black, and centered.
   */
  title: {
    fontSize: scaleSize(32),
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  /**
   * Top bar title style for navigation headers.
   */
  topBarTitle: {
    fontSize: scaleSize(18),
    fontWeight: '600',
    color: colors.topNavTitle,
    textAlign: 'center',
  },
  /**
   * Subtitle style, with specific color and centered.
   */
  subtitle: {
    fontSize: scaleSize(18),
    color: colors.textSecondary, // Keeping this as a literal as no specific gray color is defined in Colors for this
    marginBottom: 20,
    textAlign: 'center',
  },
  /**
   * Description text style, with specific color, line height, and right alignment.
   */
  description: {
    fontSize: scaleSize(16),
    color: colors.textPrimary, // Keeping this as a literal as no specific gray color is defined in Colors for this
    lineHeight: 24,
    textAlign: biDiTextAlign('right'),
  },
  /**
   * Bottom section container with padding, top border, and pink background.
   */
  bottomSection: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
  /**
   * Button style with dark pink background, padding, rounded corners, and centered content.
   * Note: Use getResponsiveButtonStyles() for dynamic responsive values in components
   */
  button: {
    alignSelf: "center", // Make container as small as needed
    backgroundColor: colors.pinkDeep,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 400,
  },
  /**
   * Text style for buttons.
   * Note: Use responsiveFontSize() for dynamic responsive font sizes in components
   */
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  /**
   * Logo image style, centered and with specific dimensions.
   */
  logo: {
    width: 180,
    height: 180,
    marginTop: 20,
    justifyContent: "center",
    alignSelf: 'center',
  },
  /**
   * Form container style with vibrant orange background, padding, rounded corners, and centered.
   */
  formContainer: {
    width: '90%',
    height: '60%',
    backgroundColor: colors.accent,
    padding: 24,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'center',
  },
  /**
   * Input field style within forms, with peach background, padding, rounded corners, and white text.
   */
  input: {
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 20,
    marginBottom: 12,
    color: colors.white,
  },
  /**
   * Style for password hint text, black, right-aligned, and underlined.
   */
  passwordHint: {
    color: colors.black,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 16,
    textDecorationLine: 'underline',
  },
  /**
   * Row for buttons, with reverse direction and space between them.
   */
  buttonsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  /**
   * Style for a primary button.
   */
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  /**
   * Style for a secondary button.
   */
  secondaryButton: {
    backgroundColor: colors.warningLight,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  /**
   * Style for "or" text, centered and bold.
   */
  orText: {
    textAlign: 'center',
    color: colors.black,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  /**
   * Row for social media icons, distributed evenly.
   */
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  /**
   * Wrapper for top content, ensuring it pushes subsequent content downwards and starts from the top.
   */
  topContentWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  loadingText: {
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
  },
  errorText: {
    color: "red",
    fontSize: 18,
    textAlign: "center",
  },
  /**
   * Generic centered full-screen container for loading/empty states.
   */
  centeredScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  /**
   * Row container for top-bar icon groups with platform/orientation-aware direction.
   */
  topBarIconsRow: {
    flexDirection: rowDirection('row'),
    // Use margin between children instead of gap for broader RN compatibility
    // Consumers should add marginHorizontal on child buttons if needed
  },
  /**
   * Touchable area for top-bar icons.
   */
  topBarIconButton: {
    padding: LAYOUT_CONSTANTS.SPACING.XS,
  },
  /**
   * Title container within top bar.
   */
  topBarTitleContainer: {
    alignItems: 'center',
  },
  /**
   * Badge indicator for unread notifications count on top bar icon.
   */
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
    ...LAYOUT_CONSTANTS.SHADOW.LIGHT,
  },
  /**
   * Text inside the notification badge.
   */
  notificationBadgeText: {
    color: colors.white,
    fontSize: FontSizes.extraSmall,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default styles;