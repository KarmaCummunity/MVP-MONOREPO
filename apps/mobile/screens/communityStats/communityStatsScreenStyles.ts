import { Dimensions, Platform, StyleSheet } from 'react-native';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';

const width = Dimensions.get('window').width;
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 768;
const isLargeScreen = width >= 768;

function getResponsiveCardWidth(): number {
  if (isLargeScreen) return (width - 64 - 24) / 3;
  if (isMediumScreen) return (width - 48 - 16) / 2;
  return (width - 32 - 12) / 2;
}

function getResponsivePadding(): number {
  if (isLargeScreen) return 24;
  if (isMediumScreen) return 20;
  return 16;
}

function getResponsiveFontSize(base: number): number {
  if (isSmallScreen) return base * 0.9;
  if (isLargeScreen) return base * 1.1;
  return base;
}

const responsivePadding = getResponsivePadding();
const cardWidth = getResponsiveCardWidth();

export const communityStatsScreenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: getResponsiveFontSize(FontSizes.body),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  hero: {
    paddingHorizontal: responsivePadding,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  heroKicker: {
    fontSize: getResponsiveFontSize(FontSizes.small),
    color: colors.textSecondary,
    textAlign: 'right',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 6,
    fontSize: getResponsiveFontSize(FontSizes.heading1),
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  sectionBlock: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: responsivePadding,
  },
  sectionHeading: {
    fontSize: getResponsiveFontSize(FontSizes.heading3),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
    marginTop: 8,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 10 : 14,
  },
  statCardOuter: {
    width: cardWidth,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.neutralBorderSoft,
  },
  statAccentBar: {
    height: 3,
    width: '100%',
  },
  statItem: {
    padding: isSmallScreen ? 14 : 18,
    alignItems: 'center',
    minHeight: isSmallScreen ? 112 : 128,
    justifyContent: 'center',
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: getResponsiveFontSize(FontSizes.heading2),
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: getResponsiveFontSize(FontSizes.small),
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  postsPanel: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutralBorderSoft,
    gap: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  postMini: {
    flex: 1,
    backgroundColor: colors.surfaceGrayBlue || colors.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceGrayBlueBorder || colors.border,
  },
  postMiniValue: {
    fontSize: getResponsiveFontSize(FontSizes.heading3),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  postMiniLabel: {
    marginTop: 6,
    fontSize: getResponsiveFontSize(FontSizes.small),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export const communityStatsIconSize = isSmallScreen ? 22 : 26;
