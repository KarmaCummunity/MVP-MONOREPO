import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { usePostComposerStore, PostIntent } from '../stores/postComposerStore';
import ComposerTaskForm, { type ComposerTaskFormHandle } from './ComposerTaskForm';
import TimeInput from './TimeInput';
import { buildTrumpRideRequestMetadata } from '../utils/buildTrumpRideRequestMetadata';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';

const POST_CATEGORIES = ['items', 'money', 'trump', 'knowledge', 'time', 'challenges'] as const;
const TASK_CATEGORY_SLUG = 'tasks' as const;

export default function CreatePostComposerModal(): React.ReactElement {
  const { t } = useTranslation(['common', 'donations', 'admin', 'trump']);
  const { selectedUser, isAdmin } = useUser();
  const { visible, initialCategory, initialIntent, composerMode, closeComposer } = usePostComposerStore();

  const [intent, setIntent] = useState<PostIntent>('give');
  const [category, setCategory] = useState<string>('items');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  /** Trump (rides): origin / destination / time for both give and request; notes in `description`. */
  const [rideFrom, setRideFrom] = useState('');
  const [rideTo, setRideTo] = useState('');
  const [rideDeparture, setRideDeparture] = useState<Date | null>(() => new Date());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit | null>(null);
  const [seats, setSeats] = useState(1);
  const [fuelMode, setFuelMode] = useState<'none' | 'yes' | 'up_to'>('none');
  const [fuelCapNis, setFuelCapNis] = useState('');
  const [smokingPref, setSmokingPref] = useState<'no_smokers' | 'smokers_ok' | 'any'>('any');
  const [genderPref, setGenderPref] = useState<'any' | 'female' | 'male'>('any');
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const taskFormRef = useRef<ComposerTaskFormHandle>(null);

  const categoryChips = useMemo(
    () => (isAdmin ? [...POST_CATEGORIES, TASK_CATEGORY_SLUG] : [...POST_CATEGORIES]),
    [isAdmin],
  );

  const contentIsTask = isAdmin && category === TASK_CATEGORY_SLUG;

  useEffect(() => {
    if (!visible) return;
    setIntent(initialIntent);
    setCategory(composerMode === 'task' ? TASK_CATEGORY_SLUG : initialCategory);
    setTitle('');
    setDescription('');
    setCity('');
    setRideFrom('');
    setRideTo('');
    setRideDeparture(new Date());
    setAdvancedOpen(false);
    setIsRecurring(false);
    setRecurrenceFrequency(1);
    setRecurrenceUnit(null);
    setSeats(1);
    setFuelMode('none');
    setFuelCapNis('');
    setSmokingPref('any');
    setGenderPref('any');
    setQuantity('1');
    setAmount('');
    setTaskSubmitting(false);
  }, [visible, initialCategory, initialIntent, composerMode]);

  const showAmountField = !contentIsTask && category === 'money';
  const showQuantityField = !contentIsTask && category === 'items';
  const showTrumpRideFields = !contentIsTask && category === 'trump';

  const departureValid =
    rideDeparture instanceof Date && !Number.isNaN(rideDeparture.getTime());

  const canPublishPost = showTrumpRideFields
    ? rideFrom.trim().length > 0 && rideTo.trim().length > 0 && departureValid
    : title.trim().length > 0;

  const submitPost = async () => {
    if (!selectedUser?.id) {
      Alert.alert(t('common:error'), t('common:guestLoginHint'));
      return;
    }
    const fromTrim = rideFrom.trim();
    const toTrim = rideTo.trim();
    let resolvedTitle = title.trim();
    if (showTrumpRideFields) {
      if (!fromTrim || !toTrim) {
        Alert.alert(t('common:error'), t('common:postComposer.rideRequestFromToRequired'));
        return;
      }
      if (!departureValid) {
        Alert.alert(t('common:error'), t('common:postComposer.rideTimeRequired'));
        return;
      }
      if (isRecurring && !recurrenceUnit) {
        Alert.alert(t('common:error'), t('common:postComposer.rideRecurrenceUnitRequired'));
        return;
      }
      if (fuelMode === 'up_to' && !(Number(fuelCapNis) > 0)) {
        Alert.alert(t('common:error'), t('common:postComposer.fuelCapRequired'));
        return;
      }
      if (!resolvedTitle) {
        resolvedTitle =
          intent === 'request'
            ? t('common:postComposer.rideRequestTitleTemplate', { from: fromTrim, to: toTrim })
            : t('common:postComposer.rideGiveTitleTemplate', { from: fromTrim, to: toTrim });
      }
    } else if (!resolvedTitle) {
      Alert.alert(t('common:error'), t('common:postComposer.titleRequired'));
      return;
    }

    const departureIso =
      showTrumpRideFields && departureValid
        ? rideDeparture!.toISOString()
        : new Date().toISOString();

    const trumpRideMetadata = showTrumpRideFields
      ? {
          ...buildTrumpRideRequestMetadata({
            fromTrim,
            toTrim,
            departureIso,
            isRecurring,
            recurrenceFrequency,
            recurrenceUnit,
            seats,
            fuelMode,
            fuelCapNis: Math.max(0, Number(fuelCapNis) || 0),
            smokingPref,
            genderPref,
            notes: description.trim() || undefined,
          }),
        }
      : undefined;

    try {
      await db.createDedicatedItem({
        owner_id: selectedUser.id,
        title: resolvedTitle,
        description: description.trim() || undefined,
        category,
        city: showTrumpRideFields ? fromTrim : city.trim() || undefined,
        address: showTrumpRideFields ? toTrim : undefined,
        quantity: showQuantityField ? Math.max(1, Number(quantity) || 1) : 1,
        price: showAmountField ? Math.max(0, Number(amount) || 0) : 0,
        condition: 'used',
        status: 'available',
        intent,
        ...(trumpRideMetadata ? { metadata: trumpRideMetadata } : {}),
      });

      Alert.alert(
        t('common:confirm'),
        intent === 'request' ? t('common:postComposer.requestPublished') : t('common:postComposer.givePublished'),
      );
      closeComposer();
    } catch (_e) {
      Alert.alert(t('common:error'), t('common:genericTryAgain'));
    }
  };

  const onPressPublish = () => {
    if (contentIsTask) {
      void taskFormRef.current?.submit();
      return;
    }
    void submitPost();
  };

  const titleText = useMemo(() => {
    if (contentIsTask) {
      return t('admin:tasks.newTask');
    }
    return intent === 'request' ? t('common:postComposer.requestTitle') : t('common:postComposer.giveTitle');
  }, [contentIsTask, intent, t]);

  const publishDisabled = contentIsTask ? taskSubmitting : !canPublishPost;
  const publishLabel = contentIsTask ? t('admin:tasks.create') : t('common:postComposer.publish');

  const chip = (active: boolean) => [styles.chip, active && styles.chipActive];

  const recurrenceUnitLabel = (u: RecurrenceUnit) => {
    if (u === 'day') return t('trump:ui.recurrenceDay');
    if (u === 'week') return t('trump:ui.recurrenceWeek');
    return t('trump:ui.recurrenceMonth');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeComposer}>
      <View style={[styles.backdrop, Platform.OS === 'web' && styles.backdropWeb]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={closeComposer} accessibilityRole="button" />
        <View
          style={[
            styles.sheet,
            Platform.OS === 'web' && styles.sheetWeb,
            contentIsTask && styles.sheetTask,
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{titleText}</Text>
            <TouchableOpacity onPress={closeComposer}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!contentIsTask ? (
            <View style={styles.toggleRow}>
              <TouchableOpacity style={[styles.toggleBtn, intent === 'give' && styles.toggleBtnActive]} onPress={() => setIntent('give')}>
                <Text style={styles.toggleText}>{t('common:give')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, intent === 'request' && styles.requestBtnActive]} onPress={() => setIntent('request')}>
                <Text style={styles.toggleText}>{t('common:request')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.categoriesRow}>
            {categoryChips.map((c) => (
              <TouchableOpacity key={c} style={[styles.categoryChip, category === c && styles.categoryChipActive]} onPress={() => setCategory(c)}>
                <Text style={styles.categoryText}>{t(`donations:categories.${c}.title`, { defaultValue: c })}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {contentIsTask && selectedUser?.id ? (
            <View style={styles.taskFormWrap}>
              <ComposerTaskForm
                ref={taskFormRef}
                visible={visible}
                userId={selectedUser.id}
                onCreated={closeComposer}
                onSubmittingChange={setTaskSubmitting}
              />
            </View>
          ) : contentIsTask && !selectedUser?.id ? (
            <Text style={styles.hintText}>{t('common:guestLoginHint')}</Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {showTrumpRideFields ? (
                <>
                  <Text style={styles.fieldLabel}>
                    {t('common:postComposer.rideOriginLabel')}
                    <Text style={styles.requiredStar}> *</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('common:postComposer.rideFromPlaceholder')}
                    value={rideFrom}
                    onChangeText={setRideFrom}
                  />
                  <Text style={styles.fieldLabel}>
                    {t('common:postComposer.rideDestLabel')}
                    <Text style={styles.requiredStar}> *</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('common:postComposer.rideToPlaceholder')}
                    value={rideTo}
                    onChangeText={setRideTo}
                  />
                  <Text style={styles.fieldLabel}>
                    {t('common:postComposer.rideTimeLabel')}
                    <Text style={styles.requiredStar}> *</Text>
                  </Text>
                  <TimeInput
                    value={rideDeparture ?? undefined}
                    onChange={(d) => setRideDeparture(d)}
                    label={undefined}
                    placeholder={t('common:time.now')}
                  />
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder={t('common:postComposer.rideNotesPlaceholder')}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                </>
              ) : (
                <>
                  <TextInput style={styles.input} placeholder={t('common:postComposer.title')} value={title} onChangeText={setTitle} />
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder={t('common:postComposer.description')}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                  <TextInput style={styles.input} placeholder={t('common:postComposer.city')} value={city} onChangeText={setCity} />
                </>
              )}
              {showQuantityField ? (
                <TextInput style={styles.input} placeholder={t('common:postComposer.quantity')} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
              ) : null}
              {showAmountField ? (
                <TextInput style={styles.input} placeholder={t('common:postComposer.amount')} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
              ) : null}
            </ScrollView>
          )}

          {showTrumpRideFields ? (
            <>
              <TouchableOpacity
                style={styles.advancedToggleFooter}
                onPress={() => setAdvancedOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: advancedOpen }}
              >
                <View style={styles.advancedToggleSide} />
                <Text style={styles.advancedToggleText}>{t('common:postComposer.advancedSettings')}</Text>
                <View style={styles.advancedToggleSide}>
                  <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
              {advancedOpen ? (
                <ScrollView
                  style={styles.advancedScroll}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.advancedPanel}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => {
                        const next = !isRecurring;
                        setIsRecurring(next);
                        if (!next) {
                          setRecurrenceUnit(null);
                          setRecurrenceFrequency(1);
                        }
                      }}
                    >
                      <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
                        {isRecurring ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                      </View>
                      <Text style={styles.checkboxLabel}>{t('trump:ui.recurringRide')}</Text>
                    </TouchableOpacity>

                    {isRecurring ? (
                      <View style={styles.advancedBlock}>
                        <Text style={styles.subLabel}>{t('trump:ui.recurrenceConfigLabel')}</Text>
                        <View style={styles.freqRow}>
                          <Text style={styles.freqLabel}>{t('trump:ui.recurrenceFrequencyLabel')}</Text>
                          <TextInput
                            style={styles.freqInput}
                            value={String(recurrenceFrequency)}
                            onChangeText={(x) => setRecurrenceFrequency(Math.max(1, Math.min(99, Number(x.replace(/\D/g, '')) || 1)))}
                            keyboardType="number-pad"
                          />
                        </View>
                        <Text style={styles.subLabel}>{t('trump:ui.recurrenceUnitLabel')}</Text>
                        <View style={styles.chipRow}>
                          {(['day', 'week', 'month'] as const).map((u) => (
                            <TouchableOpacity key={u} style={chip(recurrenceUnit === u)} onPress={() => setRecurrenceUnit(u)}>
                              <Text style={[styles.chipText, recurrenceUnit === u && styles.chipTextActive]}>{recurrenceUnitLabel(u)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    <Text style={styles.subLabel}>{t('common:postComposer.rideSeatsLabel')}</Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setSeats((s) => Math.max(1, s - 1))}
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{seats}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setSeats((s) => Math.min(20, s + 1))}
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.subLabel}>{t('common:postComposer.fuelParticipation')}</Text>
                    <View style={styles.chipRowWrap}>
                      {(
                        [
                          ['none', t('common:postComposer.fuelNone')] as const,
                          ['yes', t('common:postComposer.fuelYes')] as const,
                          ['up_to', t('common:postComposer.fuelUpTo')] as const,
                        ] as const
                      ).map(([mode, label]) => (
                        <TouchableOpacity key={mode} style={chip(fuelMode === mode)} onPress={() => setFuelMode(mode)}>
                          <Text style={[styles.chipText, fuelMode === mode && styles.chipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {fuelMode === 'up_to' ? (
                      <TextInput
                        style={styles.input}
                        placeholder={t('common:postComposer.fuelCapPlaceholder')}
                        value={fuelCapNis}
                        onChangeText={(x) => setFuelCapNis(x.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                    ) : null}

                    <Text style={styles.subLabel}>{t('common:postComposer.smokingPref')}</Text>
                    <View style={styles.chipRowWrap}>
                      {(
                        [
                          ['no_smokers', t('common:postComposer.smokingNo')] as const,
                          ['smokers_ok', t('common:postComposer.smokingOk')] as const,
                          ['any', t('common:postComposer.smokingAny')] as const,
                        ] as const
                      ).map(([v, label]) => (
                        <TouchableOpacity key={v} style={chip(smokingPref === v)} onPress={() => setSmokingPref(v)}>
                          <Text style={[styles.chipText, smokingPref === v && styles.chipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.subLabel}>{t('common:postComposer.genderPref')}</Text>
                    <View style={styles.chipRowWrap}>
                      {(
                        [
                          ['any', t('common:postComposer.genderAny')] as const,
                          ['female', t('common:postComposer.genderFemale')] as const,
                          ['male', t('common:postComposer.genderMale')] as const,
                        ] as const
                      ).map(([v, label]) => (
                        <TouchableOpacity key={v} style={chip(genderPref === v)} onPress={() => setGenderPref(v)}>
                          <Text style={[styles.chipText, genderPref === v && styles.chipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              ) : null}
            </>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              !contentIsTask && intent === 'request' && styles.submitRequest,
              publishDisabled && styles.submitBtnDisabled,
            ]}
            onPress={onPressPublish}
            disabled={publishDisabled}
            accessibilityState={{ disabled: publishDisabled }}
          >
            {contentIsTask && taskSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{publishLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  backdropWeb: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 2147483000,
  } as const,
  backdropTouch: { flex: 1 },
  sheet: { maxHeight: '85%', backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  sheetTask: { height: '85%', maxHeight: '85%' },
  taskFormWrap: { flex: 1, minHeight: 200, marginBottom: 4 },
  sheetWeb: { zIndex: 2147483001 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 12, backgroundColor: colors.border, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontWeight: '700', color: colors.textPrimary, fontSize: 18 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toggleBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.successLight, borderColor: colors.success },
  requestBtnActive: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  toggleText: { fontWeight: '600', color: colors.textPrimary },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.infoLight, borderColor: colors.primary },
  categoryText: { color: colors.textPrimary, fontSize: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, textAlign: 'right' },
  requiredStar: { color: colors.warning },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, color: colors.textPrimary },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  hintText: { color: colors.textSecondary, marginBottom: 12, textAlign: 'center' },
  advancedToggleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  advancedToggleSide: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedScroll: { maxHeight: 240, marginBottom: 4 },
  advancedToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  advancedPanel: { marginBottom: 8 },
  advancedBlock: { marginBottom: 12 },
  subLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 8, textAlign: 'right' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginEnd: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: 14, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  freqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  freqLabel: { fontSize: 13, color: colors.textPrimary },
  freqInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 56,
    textAlign: 'center',
    fontSize: 16,
    color: colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, justifyContent: 'flex-end' },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, justifyContent: 'flex-end' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.infoLight },
  chipText: { fontSize: 13, color: colors.textPrimary },
  chipTextActive: { fontWeight: '700', color: colors.primary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  stepperBtnText: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  stepperValue: { fontSize: 18, fontWeight: '700', minWidth: 32, textAlign: 'center', color: colors.textPrimary },
  submitBtn: { marginTop: 8, backgroundColor: colors.success, paddingVertical: 12, borderRadius: 12, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  submitRequest: { backgroundColor: colors.warning },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: colors.white, fontWeight: '700' },
});
