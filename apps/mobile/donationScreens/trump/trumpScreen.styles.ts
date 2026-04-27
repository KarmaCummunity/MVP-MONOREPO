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
    paddingHorizontal: 16,
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
  columnWrapper: {
    justifyContent: 'space-between',
  },
});
