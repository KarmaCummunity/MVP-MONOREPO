// Artist Palette & Design System (60-30-10 Rule)
// 60% Primary (Neutral/Backgrounds): White, Light Teals/Greys
// 30% Secondary (Brand/Identity): Teals (#16808C, #0DA6A6)
// 10% Accent (CTA/Bold): Deep Brown (#591E08)

const palette = {
  tealDark: '#16808C',    // Primary Brand
  tealLight: '#0DA6A6',   // Secondary Brand
  greenBright: '#B8DB80', // Bright pleasant green that complements the teal
  brownDeep: '#591E08',   // Accent / CTA
  greyMedium: '#B4BEBF',  // Neutral / Borders
  greyLight: '#D0D8D9',   // Backgrounds / Surfaces
  white: '#FFFFFF',
  black: '#000000',
  errorRed: '#D32F2F',    // Keeping semantic red for critical errors

  /** --- Mobile audit: shared literals → single source (habits, feed, admin) --- */
  destructiveRed: '#c0392b',
  habitGreenDark: '#2E7D32',
  materialGreen: '#4CAF50',
  materialRed: '#F44336',
  materialBlue: '#2196F3',
  materialOrange: '#FF9800',
  neutralWarmGray: '#9E9E9E',
  borderLight: '#E0E0E0',
  borderLighter: '#E8E8E8',
  textBodyNeutral: '#333333',
  textMutedNeutral: '#666666',
  textHintNeutral: '#999999',
  gray400: '#BDBDBD',
  grayMeta: '#888888',
  surfaceCanvas: '#F5F5F5',
  surfaceMuted: '#F9F9F9',
  surfaceStripe: '#F0F0F0',
  surfacePaperAlt: '#FAFAFA',
  surfaceBlueTint: '#E3F2FD',
  surfaceGreenTint: '#E8F5E9',
  surfaceGreenPale: '#F1F8E9',
  surfaceRedPale: '#FFEBEE',
  surfaceAlice: '#F0F8FF',
  surfaceGrayBlue: '#F3F4F6',
  surfaceGrayBlueBorder: '#E6E8EB',
  adminTealSoft: '#e6fffa',
  adminRoseSoft: '#fff5f5',
  folderBarTint: '#eeeeff',
  adminNeutralBorder: '#dddddd',
  adminNeutralBg: '#eeeeee',
  devBannerGreen: '#66BB6A',
  devBannerBgTint: '#E8F5E9',
  googleCharcoal: '#3C4043',
  googleBorder: '#E1E4E8',
  googleSurfaceLight: '#F8F9FA',
  googleTrustTint: '#F1F8F1',
  updateBannerStart: '#667eea',
  updateBannerEnd: '#764ba2',
};

/** Modal / frosted bar scrims — exported so style sheets avoid flaky `colors` key inference. */
export const SCRIM_BLACK_40 = 'rgba(0,0,0,0.4)' as const;
export const SCRIM_WHITE_95 = 'rgba(255, 255, 255, 0.95)' as const;

const colors = {
  // --- Core Theme ---
  primary: palette.tealDark,
  secondary: palette.tealLight,
  accent: palette.brownDeep,
  greenBright: palette.greenBright, // Bright pleasant green

  // --- Backgrounds (60%) ---
  background: palette.white,
  backgroundPrimary: palette.white,
  backgroundSecondary: palette.greyLight,
  backgroundTertiary: palette.greyMedium,
  cardBackground: palette.white,
  modalBackground: palette.white,

  // --- Text ---
  textPrimary: palette.brownDeep,      // Stylish Dark Brown for main text
  textSecondary: palette.tealDark,     // Teal for subtitles/secondary
  textTertiary: palette.greyMedium,
  textDisabled: palette.greyMedium,
  textInverse: palette.white,
  textPlaceholder: palette.greyMedium,

  // --- UI Elements ---
  border: palette.greyMedium,
  borderSecondary: palette.greyLight,
  borderAccent: palette.tealLight,


  // Buttons
  buttonPrimary: palette.tealDark,
  buttonPrimaryPressed: palette.tealLight,
  buttonSecondary: palette.greyLight,
  buttonSecondaryPressed: palette.greyMedium,
  buttonText: palette.white,
  buttonDisabled: palette.greyMedium,

  // Inputs
  inputBackground: palette.white,
  inputBorder: palette.greyMedium,
  inputBorderFocus: palette.tealLight,
  inputText: palette.brownDeep,

  // Navigation
  navigationBackground: palette.white,
  navigationActive: palette.tealDark,
  navigationInactive: palette.greyMedium,
  bottomNavActive: palette.tealDark,
  bottomNavInactive: palette.greyMedium,

  // Status
  success: palette.tealDark, // Teal works as success
  successLight: palette.greyLight, // Light success background
  error: palette.errorRed,   // Distinct error
  errorLight: palette.greyLight, // Light error background
  info: palette.tealLight,
  infoLight: palette.greyLight, // Light info background
  warning: palette.brownDeep, // Warning color
  warningLight: palette.greyLight, // Light warning background

  // --- Domain Specific ---

  // Money / Donation
  moneyFormBackground: palette.greyLight,
  moneyCardBackground: palette.white,
  moneyButtonBackground: palette.tealDark,
  moneyHeader: palette.tealDark,
  donationMoney: palette.tealDark,
  donationTime: palette.tealLight,
  donationKnowledge: palette.brownDeep,
  donationItems: palette.greyMedium,

  // Chat
  chatSent: palette.tealDark,
  chatReceived: palette.greyLight,
  chatText: palette.brownDeep,

  // Category Cards
  categoryCardBackground: palette.greyLight,
  categoryIconBackground: palette.white,
  categoryBorder: palette.tealDark,

  // Utility
  white: palette.white,
  black: palette.black,
  transparent: 'transparent',

  // --- Legacy / Compatibility (Mapped to new palette where possible) ---
  pink: palette.tealDark,         // Remapped
  pinkLight: palette.tealLight,   // Remapped
  pinkDark: palette.tealDark,  // Added
  blue: palette.tealDark,
  blueLight: palette.tealLight, // Added
  blueDark: palette.tealDark,   // Added
  green: palette.tealLight,     // Added
  orange: palette.brownDeep,
  orangeLight: palette.greyLight, // Added
  orangeDark: palette.brownDeep,  // Added

  // Legacy Aliases (Legacy names mapped to new palette)
  legacyGreen: palette.tealDark,
  legacyBlue: palette.tealDark,
  legacyRed: palette.errorRed,
  legacyDarkRed: palette.errorRed, // Added
  legacyLightGray: palette.greyLight,
  legacyDarkGray: palette.brownDeep,
  legacyLightGreen: '#dcfce7',
  legacyLightBlue: '#dbeafe',
  legacyLightOrange: '#ffedd5',
  legacyLightPink: '#fce7f3',
  legacyLightPurple: '#f3e8ff',
  legacyLightRed: '#fee2e2',
  legacyLightYellow: '#fef9c3',


  // Specific Overrides for exact matches if needed
  // (Adding missing keys found in previous file to ensure no crashes)
  backgroundSecondary_2: palette.greyLight,
  backgroundSecondaryPink: palette.greyLight,
  borderFocus: palette.tealLight,
  offWhite: '#F8F9FA',

  // Money Specifics (Preserving keys)
  moneyFormBorder: palette.greyMedium,
  moneyInputBackground: palette.white,
  moneyButtonSelected: palette.tealLight,
  moneyHistoryAmount: palette.tealDark,
  moneyStatusBackground: palette.greyLight,
  moneyStatusText: palette.tealDark,

  // Search / Header
  searchBackground: palette.greyLight,
  searchBorder: palette.greyMedium,
  searchText: palette.brownDeep,
  searchPlaceholder: palette.greyMedium,
  headerBackground: palette.white,
  headerTitleText: palette.brownDeep,
  menuBackground: palette.white,
  menuText: palette.brownDeep,
  menuBorder: palette.greyMedium,
  toggleActive: palette.tealDark,
  toggleInactive: palette.greyMedium,
  toggleBackground: palette.greyLight, // Added
  toggleText: palette.brownDeep,       // Added

  // Dropdown
  dropdownBackground: palette.white,
  dropdownBorder: palette.greyMedium,
  dropdownText: palette.brownDeep,
  dropdownPlaceholder: palette.greyMedium,
  dropdownOptionBorder: palette.greyLight, // Added

  // Bubbles
  bubbleBackground: palette.tealLight,
  bubbleBackgroundSelected: palette.tealDark,
  bubbleTextDefault: palette.brownDeep,
  bubbleTextSelected: palette.white,
  bubbleBorderDefault: palette.white,
  bubbleBorderSelected: palette.brownDeep,

  // Chat
  messageBackground: palette.greyLight, // Added
  messageShadow: palette.greyMedium,    // Added

  // Shadows
  shadow: palette.black,        // Default shadow color
  shadowLight: palette.black,   // Light shadow color
  shadowDark: palette.black,    // Dark shadow color

  // Overlays & scrims (avoid scattered rgba literals in screens)
  overlayBlack60: 'rgba(0,0,0,0.6)',
  overlayBlack50: 'rgba(0,0,0,0.5)',
  overlayBlack40: SCRIM_BLACK_40,
  overlayBlack30: 'rgba(0,0,0,0.3)',
  overlayBlack15: 'rgba(0,0,0,0.15)',
  overlayBlack10: 'rgba(0, 0, 0, 0.1)',
  overlayBlack05: 'rgba(0,0,0,0.05)',
  overlayBlack06: 'rgba(0,0,0,0.06)',
  overlayWhite85: 'rgba(255, 255, 255, 0.85)',

  // Neutral panel typography (donation quick panels / sliders)
  textNeutralDark85: 'rgba(44,44,44,0.85)',
  textNeutralDark90: 'rgba(44,44,44,0.9)',
  textNeutralMuted75: 'rgba(102,102,102,0.75)',
  textNeutralMuted70: 'rgba(102,102,102,0.7)',

  // Bit / info chip (brand teal; replaces legacy material blue tints)
  bitInfoBackground: 'rgba(22, 128, 140, 0.12)',
  bitInfoBorder: 'rgba(22, 128, 140, 0.35)',
  bitInfoText: 'rgba(22, 128, 140, 0.9)',

  // Custom/Legacy colors for specific panels
  legacyMediumPurple: '#9333ea',
  legacyMediumYellow: '#facc15',

  // --- Centralized tokens (colors-issues audit): habits, Material-style UI, admin ---
  destructiveAction: palette.destructiveRed,
  habitAccentGreen: palette.habitGreenDark,
  materialSuccess: palette.materialGreen,
  materialError: palette.materialRed,
  materialInfoBlue: palette.materialBlue,
  materialWarningOrange: palette.materialOrange,
  neutralWarmGray: palette.neutralWarmGray,
  neutralTextTitle: palette.textBodyNeutral,
  neutralTextBody: palette.textMutedNeutral,
  neutralTextCaption: palette.textHintNeutral,
  neutralBorderStrong: palette.borderLight,
  neutralBorderSoft: palette.borderLighter,
  surfaceCanvas: palette.surfaceCanvas,
  surfaceMutedPanel: palette.surfaceMuted,
  surfaceStripe: palette.surfaceStripe,
  surfaceElevated: palette.surfacePaperAlt,
  surfaceBlueTint: palette.surfaceBlueTint,
  surfaceGreenTint: palette.surfaceGreenTint,
  surfaceGreenPale: palette.surfaceGreenPale,
  surfaceRedPale: palette.surfaceRedPale,
  surfaceAliceBlue: palette.surfaceAlice,
  surfaceGrayBlue: palette.surfaceGrayBlue,
  surfaceGrayBlueBorder: palette.surfaceGrayBlueBorder,
  grayMutedStrong: palette.gray400,
  textMeta: palette.grayMeta,
  adminStatusActiveBg: palette.adminTealSoft,
  adminStatusInactiveBg: palette.adminRoseSoft,
  adminNeutralBorder: palette.adminNeutralBorder,
  adminNeutralSurface: palette.adminNeutralBg,
  folderBarBackground: palette.folderBarTint,
  devBannerGreen: palette.devBannerGreen,
  devBannerBackground: palette.devBannerBgTint,
  googleCharcoal: palette.googleCharcoal,
  googleButtonBorder: palette.googleBorder,
  googleButtonSurfaceHover: palette.googleSurfaceLight,
  googleTrustHighlight: palette.googleTrustTint,
  updateBannerGradientStart: palette.updateBannerStart,
  updateBannerGradientEnd: palette.updateBannerEnd,

  // Extra overlays & effects (feed cards, canvas, landing)
  overlayBlack45: 'rgba(0,0,0,0.45)',
  overlayBlack35: 'rgba(0,0,0,0.35)',
  overlayBlack25: 'rgba(0,0,0,0.25)',
  overlayBlack20: 'rgba(0,0,0,0.2)',
  overlayBlack08: 'rgba(0,0,0,0.08)',
  overlayWhite25: 'rgba(255, 255, 255, 0.25)',
  overlayWhite80: 'rgba(255, 255, 255, 0.8)',
  overlayWhite92: 'rgba(255, 255, 255, 0.92)',
  overlayWhite95: SCRIM_WHITE_95,
  overlayWhite98: 'rgba(255, 255, 255, 0.98)',
  overlayWhiteTransparent: 'rgba(255, 255, 255, 0)',
  overlayGreenAccent10: 'rgba(0, 200, 83, 0.1)',
  primaryLegacyBlue08: 'rgba(76, 126, 255, 0.08)',
  accentPink08: 'rgba(255, 107, 157, 0.08)',
  landingRoyalBlueTint05: 'rgba(65, 105, 225, 0.05)',
  landingPinkTint08: 'rgba(255, 192, 203, 0.08)',
  feedCardShadow: 'rgba(0, 0, 0, 0.1)',
  feedDimOverlay: 'rgba(0, 0, 0, 0.35)',
  feedTextShadow: 'rgba(0, 0, 0, 0.8)',
  communityCardShadow: 'rgba(0,0,0,0.08)',
  rideCardShadowSoft: 'rgba(0, 0, 0, 0.06)',
  bubbleCanvasStroke: 'rgba(10, 22, 48, 0.7)',
  bubbleCanvasStrokeSoft: 'rgba(10, 22, 48, 0.55)',
  bubbleCanvasFill: 'rgba(255, 255, 255, 0.98)',
  bubbleCanvasFillSoft: 'rgba(255, 255, 255, 0.92)',
  shadowBubbleStrong: 'rgba(0, 0, 0, 0.22)',
  shadowBubbleSoft: 'rgba(0, 0, 0, 0.18)',
};

export default colors;
