import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ChallengeType, EntryStatus } from '../../globals/types';

interface HabitsTrackerCellProps {
  challengeType: ChallengeType;
  value?: number;
  status: EntryStatus;
  isToday?: boolean;
  onPress: () => void;
}

export const HabitsTrackerCell: React.FC<HabitsTrackerCellProps> = ({
  challengeType,
  value,
  status,
  isToday = false,
  onPress
}) => {
  const getStatusIcon = (): string => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✗';
      case 'neutral':
        return '–';
      case 'empty':
        return '—';
      default:
        return '—';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'neutral':
        return '#9E9E9E';
      case 'empty':
        return '#E0E0E0';
      default:
        return '#E0E0E0';
    }
  };

  const formatValue = (): string => {
    if (status === 'empty' || value === undefined) {
      return getStatusIcon();
    }

    if (challengeType === 'BOOLEAN') {
      return getStatusIcon();
    }

    if (challengeType === 'DURATION') {
      // Convert minutes to hours:minutes format
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}m`;
    }

    // NUMERIC
    return value.toString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        { backgroundColor: getStatusColor() + '20' },
        isToday && styles.cellToday
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.cellText,
          { color: getStatusColor() },
          status === 'empty' && styles.cellTextEmpty
        ]}
      >
        {formatValue()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cellToday: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  cellText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cellTextEmpty: {
    color: '#BDBDBD',
  },
});
