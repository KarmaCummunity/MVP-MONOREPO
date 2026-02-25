/**
 * Styles shared by profile tab routes (Open, Closed, Tagged).
 */
import { StyleSheet } from 'react-native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';

export const tabStyles = StyleSheet.create({
  tabContentContainer: {
    paddingBottom: 20,
  },
  tabContentPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    padding: 20,
  },
  placeholderText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 15,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
});
