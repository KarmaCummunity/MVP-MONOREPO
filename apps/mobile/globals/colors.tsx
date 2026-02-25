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
};

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


  // Specific Overrides for exact matches if needed
  // (Adding missing keys found in previous file to ensure no crashes)
  backgroundSecondary_2: palette.greyLight,
  backgroundSecondaryPink: palette.greyLight,
  borderFocus: palette.tealLight,

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

  // Custom/Legacy colors for specific panels
  legacyMediumPurple: '#9333ea',
  legacyMediumYellow: '#facc15',
};

export default colors;
