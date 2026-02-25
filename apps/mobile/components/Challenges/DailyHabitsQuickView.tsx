import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { db } from '../../utils/databaseService';
import { useUser } from '../../stores/userStore';
import { EditEntryModal } from './EditEntryModal';
import {
  DailyTrackerData,
  DailyTrackerChallenge,
  EntryStatus,
} from '../../globals/types';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface DailyHabitsQuickViewProps {
  onBrowseChallenges: () => void;
}

function getDateRange(mode: ViewMode): string[] {
  const today = new Date().toISOString().split('T')[0];
  const dates: string[] = [];
  if (mode === 'daily') {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    dates.push(yesterday, today);
  } else if (mode === 'weekly') {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }
  } else {
    for (let i = 30; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates;
}

export const DailyHabitsQuickView: React.FC<DailyHabitsQuickViewProps> = ({
  onBrowseChallenges,
}) => {
  const { t } = useTranslation('challenges');
  const { selectedUser: user } = useUser();
  const [data, setData] = useState<DailyTrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<DailyTrackerChallenge | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const editingRef = useRef<{ date: string; value?: number; notes?: string } | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const dateRange = getDateRange(viewMode);
  const startDate = dateRange[0];
  const endDate = dateRange[dateRange.length - 1];

  const loadTodayData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const response = await db.getDailyTrackerData(user.id, startDate, endDate);
      const payload = response?.data?.data ?? response?.data ?? response;
      if (payload && Array.isArray(payload.challenges)) {
        if (__DEV__) {
          const dates = payload.entries_by_date ? Object.keys(payload.entries_by_date) : [];
          console.log('[DailyHabitsQuickView] Data loaded:', { challenges: payload.challenges.length, dates });
          dates.forEach(date => {
            const dateEntries = payload.entries_by_date[date];
            console.log(`[DailyHabitsQuickView] Entries for ${date}:`, dateEntries);
            Object.keys(dateEntries).forEach(challengeId => {
              const entry = dateEntries[challengeId];
              console.log(`  Challenge ${challengeId}: value=${entry.value}, status=${entry.status}, notes=${entry.notes?.substring(0, 20) || 'none'}`);
            });
          });
          console.log('[DailyHabitsQuickView] Updating state with new data');
        }
        setData({ ...payload });
        if (__DEV__) console.log('[DailyHabitsQuickView] State updated with new object');
      } else {
        if (__DEV__) console.warn('[DailyHabitsQuickView] Invalid payload:', { hasPayload: !!payload, challengesIsArray: Array.isArray(payload?.challenges) });
        setData(null);
      }
    } catch (error) {
      console.error('[DailyHabitsQuickView] load error:', error);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [loadTodayData])
  );

  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    if (viewModeRef.current !== viewMode) {
      viewModeRef.current = viewMode;
      if (user?.id) loadTodayData();
    }
  }, [viewMode, user?.id, loadTodayData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTodayData();
  };

  const getCellStatus = (challengeId: string, date: string): EntryStatus => {
    if (!data?.entries_by_date[date]) return 'empty';
    const entry = data.entries_by_date[date][challengeId];
    return entry?.status ?? 'empty';
  };

  const getCellValue = (challengeId: string, date: string): number | undefined => {
    return data?.entries_by_date[date]?.[challengeId]?.value;
  };

  const handleCellPress = (challenge: DailyTrackerChallenge, date: string) => {
    const value = getCellValue(challenge.id, date);
    const notes = data?.entries_by_date[date]?.[challenge.id]?.notes;
    const currentStatus = getCellStatus(challenge.id, date);
    editingRef.current = { date, value, notes };
    setSelectedChallenge(challenge);
    setSelectedDate(date);
    setModalVisible(true);
    if (__DEV__) {
      console.log('[DailyHabitsQuickView] Opening edit:', { challengeId: challenge.id, title: challenge.title, type: challenge.type, goal_value: challenge.goal_value, goal_direction: challenge.goal_direction, date, value, notes, currentStatus });
    }
  };

  const handleSaveEntry = async (value: number, notes: string) => {
    const challengeId = selectedChallenge?.id;
    const dateToSave = selectedDate || editingRef.current?.date;
    if (!challengeId || !user?.id || !dateToSave) {
      if (__DEV__) console.warn('[DailyHabitsQuickView] Save cancelled: missing challenge/user/date', { challengeId, userId: user?.id, dateToSave });
      return;
    }
    if (__DEV__) console.log('[DailyHabitsQuickView] Saving entry:', { challengeId, date: dateToSave, value, notes });
    try {
      await db.addChallengeEntry(challengeId, {
        user_id: user.id,
        value,
        notes,
        entry_date: dateToSave,
      });
      if (__DEV__) console.log('[DailyHabitsQuickView] Save succeeded');
      editingRef.current = null;
      setModalVisible(false);
      if (__DEV__) console.log('[DailyHabitsQuickView] Modal closed, refreshing data');
      await loadTodayData();
      if (__DEV__) console.log('[DailyHabitsQuickView] Data refreshed successfully');
    } catch (err) {
      if (__DEV__) console.error('[DailyHabitsQuickView] Save error:', err);
      throw err;
    }
  };

  const currentEntry = selectedChallenge && selectedDate && data?.entries_by_date[selectedDate]?.[selectedChallenge.id];
  const modalDate = editingRef.current?.date ?? selectedDate ?? today;
  const modalExistingValue = editingRef.current !== null ? editingRef.current.value : currentEntry?.value;
  const modalExistingNotes = editingRef.current !== null ? editingRef.current.notes : currentEntry?.notes;

  const calculateOverallStreak = (): number => {
    if (!data || data.challenges.length === 0) return 0;
    return Math.max(...data.challenges.map((c) => c.participant_data?.current_streak ?? 0));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.loadingText}>{t('quickView.loading')}</Text>
        </View>
      </View>
    );
  }

  const hasDailyChallenges = data && data.challenges.length > 0;

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (viewMode === 'daily') return dateStr === today ? t('details.today') : t('details.yesterday');
    if (viewMode === 'weekly') return d.getDate().toString();
    return d.getDate().toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('quickView.title')}</Text>
        <View style={styles.toggleRow}>
          {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.toggleBtnText, viewMode === mode && styles.toggleBtnTextActive]}>
                {mode === 'daily' ? t('frequency.DAILY') : mode === 'weekly' ? t('frequency.WEEKLY') : t('frequency.MONTHLY')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {hasDailyChallenges ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {data.stats.total_success_rate != null
                    ? `${Math.round(data.stats.total_success_rate)}%`
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>{t('stats.successRate')}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{calculateOverallStreak()}</Text>
                <Text style={styles.statLabel}>{t('stats.currentStreak')}</Text>
              </View>
            </View>

            <ScrollView
              horizontal={dateRange.length > 4}
              showsHorizontalScrollIndicator={dateRange.length > 4}
              style={dateRange.length > 4 ? styles.tableScroll : undefined}
              contentContainerStyle={Platform.OS === 'web' && dateRange.length > 4 ? { minWidth: '100%' } : undefined}
            >
              <View style={[
                styles.tableWrapper,
                Platform.OS === 'web' && dateRange.length > 4 && { minWidth: dateRange.length * 60 + 120 }
              ]}>
                <View style={styles.tableHeader}>
                  <View style={styles.tableHeaderLabel} />
                  {dateRange.map((date) => (
                  <View
                    key={date}
                    style={[styles.dateCol, date === today && styles.dateColToday]}
                  >
                    <Text style={styles.dateColText}>{formatDateLabel(date)}</Text>
                    <Text style={styles.dateColSub}>{date}</Text>
                  </View>
                ))}
              </View>
              {data.challenges.map((challenge) => (
                <View key={challenge.id} style={styles.tableRow}>
                  <Text style={styles.challengeName} numberOfLines={2}>
                    {challenge.title}
                  </Text>
                  {dateRange.map((date) => {
                    const status = getCellStatus(challenge.id, date);
                    const cellValue = getCellValue(challenge.id, date);
                    
                    let displayText = '—';
                    if (cellValue !== undefined) {
                      if (challenge.type === 'BOOLEAN') {
                        displayText = status === 'success' ? '✓' : '✗';
                      } else if (challenge.type === 'NUMERIC') {
                        displayText = cellValue.toString();
                      } else if (challenge.type === 'DURATION') {
                        const hours = Math.floor(cellValue / 60);
                        const minutes = cellValue % 60;
                        displayText = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}m`;
                      }
                    }
                    
                    const iconColor =
                      status === 'success' ? '#4CAF50' : status === 'failed' ? '#F44336' : status === 'neutral' ? '#9E9E9E' : '#E0E0E0';

                    return (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.cell,
                          { backgroundColor: iconColor === '#E0E0E0' ? '#F5F5F5' : `${iconColor}18` },
                          date === today && styles.cellToday,
                        ]}
                        onPress={() => handleCellPress(challenge, date)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cellText, { color: iconColor }]} numberOfLines={1}>
                          {displayText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              </View>
            </ScrollView>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('quickView.noChallenges')}</Text>
          <Text style={styles.emptySubtext}>
            {t('quickView.noChallengesHint')}
          </Text>
          <TouchableOpacity style={styles.expandButton} onPress={onBrowseChallenges}>
            <Text style={styles.expandButtonText}>עיון באתגרים →</Text>
          </TouchableOpacity>
        </View>
      )}

      <EditEntryModal
        visible={modalVisible}
        challenge={selectedChallenge}
        date={modalDate}
        existingValue={modalExistingValue}
        existingNotes={modalExistingNotes}
        onClose={() => { editingRef.current = null; setModalVisible(false); }}
        onSave={handleSaveEntry}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  toggleBtnActive: {
    backgroundColor: '#2E7D32',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tableScroll: {
    marginBottom: 8,
    ...(Platform.OS === 'web' && {
      overflowX: 'auto' as any,
      WebkitOverflowScrolling: 'touch' as any,
    }),
  },
  tableWrapper: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderLabel: {
    width: 100,
    minWidth: 100,
  },
  dateCol: {
    width: 60,
    alignItems: 'center',
    minWidth: 60,
  },
  dateColToday: {
    backgroundColor: '#E3F2FD',
  },
  dateColText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  dateColSub: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  challengeName: {
    width: 100,
    minWidth: 100,
    fontSize: 13,
    color: '#333',
    marginEnd: 8,
  },
  cell: {
    width: 56,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cellToday: {
    borderColor: '#2196F3',
    borderWidth: 1.5,
  },
  cellText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  expandButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    textAlign: 'center',
  },
});
