// Purpose: Bottom sheet (80% height) for feed sort/filter options on the home posts screen.
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../globals/colors';
import type { FeedFilterState, FeedSortMode } from '../../utils/feedFilters';
import { DEFAULT_FEED_FILTER_STATE } from '../../utils/feedFilters';

const SHEET_HEIGHT_RATIO = 0.8;

interface FeedFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  value: FeedFilterState;
  onChange: (next: FeedFilterState) => void;
}

const FeedFilterSheet: React.FC<FeedFilterSheetProps> = ({
  visible,
  onClose,
  value,
  onChange,
}) => {
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;
  const sheetMaxH = screenH * SHEET_HEIGHT_RATIO;

  const patch = useCallback((partial: Partial<FeedFilterState>) => {
    onChange({ ...value, ...partial });
  }, [value, onChange]);

  const setSort = useCallback((sortMode: FeedSortMode) => {
    patch({ sortMode });
  }, [patch]);

  const reset = useCallback(() => {
    onChange({ ...DEFAULT_FEED_FILTER_STATE });
  }, [onChange]);

  const sortRow = (mode: FeedSortMode, label: string, hint?: string) => {
    const selected = value.sortMode === mode;
    return (
      <TouchableOpacity
        key={mode}
        style={[styles.sortRow, selected && styles.sortRowSelected]}
        onPress={() => setSort(mode)}
        activeOpacity={0.75}
      >
        <View style={styles.sortRowTextWrap}>
          <Text style={[styles.sortLabel, selected && styles.sortLabelSelected]}>{label}</Text>
          {hint ? <Text style={styles.sortHint}>{hint}</Text> : null}
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        ) : (
          <Ionicons name="ellipse-outline" size={22} color={colors.border} />
        )}
      </TouchableOpacity>
    );
  };

  const toggleRow = (
    key: keyof Pick<FeedFilterState, 'onlyOpenPosts' | 'verifiedAuthorsOnly' | 'includeTasks' | 'includeRides' | 'includeItemsAndDonations'>,
    label: string,
    hint?: string,
  ) => {
    const on = Boolean(value[key]);
    return (
      <View style={styles.toggleRow} key={String(key)}>
        <View style={styles.toggleTextWrap}>
          <Text style={styles.toggleLabel}>{label}</Text>
          {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
        </View>
        <Switch
          value={on}
          onValueChange={(v) => patch({ [key]: v } as Partial<FeedFilterState>)}
          trackColor={{ false: colors.border, true: colors.backgroundSecondary }}
          thumbColor={colors.white}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: sheetMaxH,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.handleBar} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>סינון ומיון</Text>
            <TouchableOpacity onPress={reset} hitSlop={12}>
              <Text style={styles.resetText}>איפוס</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>מיון</Text>
            {sortRow('date', 'לפי תאריך', 'החדשים ביותר למעלה')}
            {sortRow('engagement', 'לפי מעורבות', 'לייקים והערות')}
            {sortRow('relevance', 'לפי התאמה', 'שילוב מעורבות ועדכניות')}

            <Text style={[styles.sectionTitle, styles.sectionSpaced]}>סינון</Text>
            {toggleRow('onlyOpenPosts', 'רק פוסטים פתוחים', 'משימות, נסיעות ופריטים שעדיין זמינים')}
            {toggleRow('verifiedAuthorsOnly', 'רק מיוצרים מאומתים', 'משתמשים עם אימות אימייל')}

            <Text style={[styles.sectionTitle, styles.sectionSpaced]}>סוג תוכן</Text>
            {toggleRow('includeTasks', 'הצג משימות')}
            {toggleRow('includeRides', 'הצג נסיעות')}
            {toggleRow('includeItemsAndDonations', 'הצג פריטים ותרומות')}
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneButtonText}>סיום</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'right',
  },
  sectionSpaced: {
    marginTop: 20,
  },
  sortRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  sortRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundSecondary,
  },
  sortRowTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sortLabelSelected: {
    color: colors.primary,
  },
  sortHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toggleTextWrap: {
    flex: 1,
    paddingLeft: 12,
    alignItems: 'flex-end',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  toggleHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  doneButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default React.memo(FeedFilterSheet);
