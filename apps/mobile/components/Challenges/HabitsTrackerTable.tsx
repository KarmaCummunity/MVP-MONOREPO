import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { HabitsTrackerCell } from './HabitsTrackerCell';
import { DailyTrackerData, ViewMode } from '../../globals/types';

interface HabitsTrackerTableProps {
  data: DailyTrackerData;
  viewMode: ViewMode;
  dateRange: string[];
  onCellPress: (challengeId: string, date: string) => void;
}

export const HabitsTrackerTable: React.FC<HabitsTrackerTableProps> = ({
  data,
  viewMode,
  dateRange,
  onCellPress,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    
    if (viewMode === 'day') {
      return date.toLocaleDateString('he-IL', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
    
    if (viewMode === 'week') {
      return date.toLocaleDateString('he-IL', { 
        weekday: 'short', 
        day: 'numeric' 
      });
    }
    
    // month
    return date.getDate().toString();
  };

  const getCellStatus = (challengeId: string, date: string) => {
    const entry = data.entries_by_date[date]?.[challengeId];
    return entry?.status || 'empty';
  };

  const getCellValue = (challengeId: string, date: string) => {
    const entry = data.entries_by_date[date]?.[challengeId];
    return entry?.value;
  };

  if (data.challenges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>אין אתגרים יומיים פעילים</Text>
        <Text style={styles.emptySubtext}>הצטרף לאתגרים יומיים כדי להתחיל במעקב</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.horizontalScroll}
    >
      <View style={styles.table}>
        {/* Header Row - Dates */}
        <View style={styles.headerRow}>
          <View style={styles.challengeNameColumn}>
            <Text style={styles.headerText}>אתגר</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesContainer}
          >
            {dateRange.map((date) => (
              <View key={date} style={styles.dateHeader}>
                <Text style={[
                  styles.dateHeaderText,
                  date === today && styles.dateHeaderTextToday
                ]}>
                  {formatDateHeader(date)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Challenge Rows */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {data.challenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeRow}>
              <View style={styles.challengeNameColumn}>
                <Text style={styles.challengeName} numberOfLines={2}>
                  {challenge.title}
                </Text>
                {(challenge.participant_data?.current_streak ?? 0) > 0 && (
                  <Text style={styles.streakBadge}>
                    🔥 {challenge.participant_data?.current_streak}
                  </Text>
                )}
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cellsContainer}
              >
                {dateRange.map((date) => (
                  <HabitsTrackerCell
                    key={`${challenge.id}-${date}`}
                    challengeType={challenge.type}
                    value={getCellValue(challenge.id, date)}
                    status={getCellStatus(challenge.id, date)}
                    isToday={date === today}
                    onPress={() => onCellPress(challenge.id, date)}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  horizontalScroll: {
    flex: 1,
  },
  table: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  challengeNameColumn: {
    width: 150,
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  datesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  dateHeader: {
    width: 50,
    padding: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  dateHeaderTextToday: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  challengeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 70,
  },
  challengeName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  streakBadge: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  cellsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
