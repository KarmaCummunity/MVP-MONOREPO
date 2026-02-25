import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ViewMode } from '../../globals/types';
import colors from '../../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../../globals/constants';

interface ViewToggleButtonsProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const ViewToggleButtons: React.FC<ViewToggleButtonsProps> = ({
  currentView,
  onViewChange
}) => {
  const { t } = useTranslation('challenges');
  const views: { key: ViewMode; label: string }[] = [
    { key: 'day', label: t('viewMode.day') },
    { key: 'week', label: t('viewMode.week') },
    { key: 'month', label: t('viewMode.month') },
  ];

  return (
    <View style={styles.container}>
      {views.map((view) => (
        <TouchableOpacity
          key={view.key}
          style={[
            styles.button,
            currentView === view.key && styles.buttonActive
          ]}
          onPress={() => onViewChange(view.key)}
        >
          <Text
            style={[
              styles.buttonText,
              currentView === view.key && styles.buttonTextActive
            ]}
          >
            {view.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLighter,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    padding: LAYOUT_CONSTANTS.SPACING.XS,
    marginHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    marginVertical: LAYOUT_CONSTANTS.SPACING.SM,
  },
  button: {
    flex: 1,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: colors.background,
    ...LAYOUT_CONSTANTS.SHADOW.LIGHT,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontSize: FontSizes.body,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  buttonTextActive: {
    color: colors.success,
    fontWeight: 'bold',
  },
});
