import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';

type Styles = CreatePostComposerModalStyles;

export type TrumpRideAdvancedPanelOuterProps = Readonly<{
  styles: Styles;
  advancedOpen: boolean;
  setAdvancedOpen: Dispatch<SetStateAction<boolean>>;
  t: (key: string) => string;
}>;

export type TrumpRideAdvancedPanelInnerProps = Readonly<{
  styles: Styles;
  chip: (active: boolean) => StyleProp<ViewStyle>;
  recurrenceUnitLabel: (u: RecurrenceUnit) => string;
  t: (key: string, options?: Record<string, string>) => string;

  isRecurring: boolean;
  setIsRecurring: (v: boolean) => void;
  setRecurrenceUnit: (u: RecurrenceUnit | null) => void;
  setRecurrenceFrequency: (n: number) => void;

  recurrenceFrequency: number;
  recurrenceUnit: RecurrenceUnit | null;

  seats: number;
  setSeats: (updater: (s: number) => number) => void;

  fuelMode: 'none' | 'yes' | 'up_to';
  setFuelMode: (m: 'none' | 'yes' | 'up_to') => void;
  fuelCapNis: string;
  setFuelCapNis: (s: string) => void;

  smokingPref: 'no_smokers' | 'smokers_ok' | 'any';
  setSmokingPref: (v: 'no_smokers' | 'smokers_ok' | 'any') => void;

  genderPref: 'any' | 'female' | 'male';
  setGenderPref: (v: 'any' | 'female' | 'male') => void;
}>;

export function TrumpRideAdvancedFooter({
  styles: s,
  advancedOpen,
  setAdvancedOpen,
  t,
}: TrumpRideAdvancedPanelOuterProps): React.ReactElement {
  return (
    <TouchableOpacity
      style={s.advancedToggleFooter}
      onPress={() => setAdvancedOpen((o) => !o)}
      accessibilityRole="button"
      accessibilityState={{ expanded: advancedOpen }}
    >
      <View style={s.advancedToggleSide} />
      <Text style={s.advancedToggleText}>{t('common:postComposer.advancedSettings')}</Text>
      <View style={s.advancedToggleSide}>
        <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

export default function TrumpRideAdvancedPanel(props: TrumpRideAdvancedPanelInnerProps): React.ReactElement {
  const {
    styles: s,
    chip,
    recurrenceUnitLabel,
    t,
    isRecurring,
    setIsRecurring,
    setRecurrenceUnit,
    setRecurrenceFrequency,
    recurrenceFrequency,
    recurrenceUnit,
    seats,
    setSeats,
    fuelMode,
    setFuelMode,
    fuelCapNis,
    setFuelCapNis,
    smokingPref,
    setSmokingPref,
    genderPref,
    setGenderPref,
  } = props;

  return (
    <ScrollView
      style={s.advancedScroll}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      <View style={s.advancedPanel}>
        <TouchableOpacity
          style={s.checkboxRow}
          onPress={() => {
            const next = !isRecurring;
            setIsRecurring(next);
            if (!next) {
              setRecurrenceUnit(null);
              setRecurrenceFrequency(1);
            }
          }}
        >
          <View style={[s.checkbox, isRecurring && s.checkboxChecked]}>
            {isRecurring ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
          </View>
          <Text style={s.checkboxLabel}>{t('trump:ui.recurringRide')}</Text>
        </TouchableOpacity>

        {isRecurring ? (
          <View style={s.advancedBlock}>
            <Text style={s.subLabel}>{t('trump:ui.recurrenceConfigLabel')}</Text>
            <View style={s.freqRow}>
              <Text style={s.freqLabel}>{t('trump:ui.recurrenceFrequencyLabel')}</Text>
              <TextInput
                style={s.freqInput}
                value={String(recurrenceFrequency)}
                onChangeText={(x) =>
                  setRecurrenceFrequency(Math.max(1, Math.min(99, Number(x.replaceAll(/\D/g, '')) || 1)))
                }
                keyboardType="number-pad"
              />
            </View>
            <Text style={s.subLabel}>{t('trump:ui.recurrenceUnitLabel')}</Text>
            <View style={s.chipRow}>
              {(['day', 'week', 'month'] as const).map((u) => (
                <TouchableOpacity key={u} style={chip(recurrenceUnit === u)} onPress={() => setRecurrenceUnit(u)}>
                  <Text style={[s.chipText, recurrenceUnit === u && s.chipTextActive]}>{recurrenceUnitLabel(u)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={s.subLabel}>{t('common:postComposer.rideSeatsLabel')}</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity style={s.stepperBtn} onPress={() => setSeats((v) => Math.max(1, v - 1))} accessibilityRole="button">
            <Text style={s.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.stepperValue}>{seats}</Text>
          <TouchableOpacity style={s.stepperBtn} onPress={() => setSeats((v) => Math.min(20, v + 1))} accessibilityRole="button">
            <Text style={s.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.subLabel}>{t('common:postComposer.fuelParticipation')}</Text>
        <View style={s.chipRowWrap}>
          {(
            [
              ['none', t('common:postComposer.fuelNone')] as const,
              ['yes', t('common:postComposer.fuelYes')] as const,
              ['up_to', t('common:postComposer.fuelUpTo')] as const,
            ] as const
          ).map(([mode, label]) => (
            <TouchableOpacity key={mode} style={chip(fuelMode === mode)} onPress={() => setFuelMode(mode)}>
              <Text style={[s.chipText, fuelMode === mode && s.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {fuelMode === 'up_to' ? (
          <TextInput
            style={s.input}
            placeholder={t('common:postComposer.fuelCapPlaceholder')}
            value={fuelCapNis}
            onChangeText={(x) => setFuelCapNis(x.replaceAll(/\D/g, ''))}
            keyboardType="number-pad"
          />
        ) : null}

        <Text style={s.subLabel}>{t('common:postComposer.smokingPref')}</Text>
        <View style={s.chipRowWrap}>
          {(
            [
              ['no_smokers', t('common:postComposer.smokingNo')] as const,
              ['smokers_ok', t('common:postComposer.smokingOk')] as const,
              ['any', t('common:postComposer.smokingAny')] as const,
            ] as const
          ).map(([v, label]) => (
            <TouchableOpacity key={v} style={chip(smokingPref === v)} onPress={() => setSmokingPref(v)}>
              <Text style={[s.chipText, smokingPref === v && s.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.subLabel}>{t('common:postComposer.genderPref')}</Text>
        <View style={s.chipRowWrap}>
          {(
            [
              ['any', t('common:postComposer.genderAny')] as const,
              ['female', t('common:postComposer.genderFemale')] as const,
              ['male', t('common:postComposer.genderMale')] as const,
            ] as const
          ).map(([v, label]) => (
            <TouchableOpacity key={v} style={chip(genderPref === v)} onPress={() => setGenderPref(v)}>
              <Text style={[s.chipText, genderPref === v && s.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
