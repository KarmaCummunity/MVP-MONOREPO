import { StyleSheet } from 'react-native';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';

export const trumpScreenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary_2,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 20,
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  resultsHeader: {
    marginBottom: 10,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  resultsList: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  /** Matches search grid `COLUMN_GAP` in TrumpScreen — horizontal space between two cards per row. */
  columnWrapper: {
    gap: 12,
  },
  offerButton: {
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  offerButtonText: {
    color: colors.background,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
  openRequestsToggle: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  recentItemWrapper: {
    marginBottom: 8,
    width: '100%',
  },
});
