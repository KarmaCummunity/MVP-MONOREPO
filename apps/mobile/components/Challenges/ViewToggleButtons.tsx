import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ViewMode } from '../../globals/types';

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
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  buttonTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
});
