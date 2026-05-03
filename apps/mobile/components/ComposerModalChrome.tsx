import React, { RefObject } from 'react';
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import colors from '../globals/colors';
import type { PostIntent } from '../stores/postComposerStore';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';
import type { ComposerTaskFormHandle } from './ComposerTaskForm';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';
import ComposerGiveRequestToggle from './ComposerGiveRequestToggle';
import ComposerMainSlot from './ComposerMainSlot';
import TrumpRideAdvancedSection from './TrumpRideAdvancedSection';

type Styles = CreatePostComposerModalStyles;

/** Presentational chrome: backdrop, sheet, header, toggle, chips, slots, footer. */
export type ComposerModalChromeProps = Readonly<{
  styles: Styles;
  closeComposer: () => void;
  contentIsTask: boolean;
  titleText: string;
  categoryChips: readonly string[];
  category: string;
  setCategory: (c: string) => void;
  t: TFunction;
  intent: PostIntent;
  setIntent: (v: PostIntent) => void;
  taskFormRef: RefObject<ComposerTaskFormHandle | null>;
  visible: boolean;
  selectedUserId: string | undefined;
  setTaskSubmitting: (v: boolean) => void;
  showTrumpRideFields: boolean;
  showQuantityField: boolean;
  showAmountField: boolean;
  title: string;
  description: string;
  city: string;
  quantity: string;
  amount: string;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setCity: (v: string) => void;
  setQuantity: (v: string) => void;
  setAmount: (v: string) => void;
  rideFrom: string;
  rideTo: string;
  rideDeparture: Date | null;
  setRideFrom: (v: string) => void;
  setRideTo: (v: string) => void;
  setRideDeparture: (d: Date | null) => void;
  advancedOpen: boolean;
  setAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chip: (active: boolean) => StyleProp<ViewStyle>;
  recurrenceUnitLabel: (u: RecurrenceUnit) => string;
  isRecurring: boolean;
  setIsRecurring: React.Dispatch<React.SetStateAction<boolean>>;
  setRecurrenceUnit: React.Dispatch<React.SetStateAction<RecurrenceUnit | null>>;
  setRecurrenceFrequency: React.Dispatch<React.SetStateAction<number>>;
  recurrenceFrequency: number;
  recurrenceUnit: RecurrenceUnit | null;
  seats: number;
  setSeats: React.Dispatch<React.SetStateAction<number>>;
  fuelMode: 'none' | 'yes' | 'up_to';
  setFuelMode: React.Dispatch<React.SetStateAction<'none' | 'yes' | 'up_to'>>;
  fuelCapNis: string;
  setFuelCapNis: React.Dispatch<React.SetStateAction<string>>;
  smokingPref: 'no_smokers' | 'smokers_ok' | 'any';
  setSmokingPref: React.Dispatch<React.SetStateAction<'no_smokers' | 'smokers_ok' | 'any'>>;
  genderPref: 'any' | 'female' | 'male';
  setGenderPref: React.Dispatch<React.SetStateAction<'any' | 'female' | 'male'>>;
  submitRequestHighlight: boolean;
  publishDisabled: boolean;
  publishLabel: string;
  publishButtonShowsSpinner: boolean;
  onPressPublish: () => void;
}>;

export default function ComposerModalChrome(p: ComposerModalChromeProps): React.ReactElement {
  const s = p.styles;

  let toggleSlot: React.ReactNode = null;
  if (!p.contentIsTask) {
    toggleSlot = (
      <ComposerGiveRequestToggle
        styles={s}
        intent={p.intent}
        giveLabel={p.t('common:give')}
        requestLabel={p.t('common:request')}
        onGive={() => p.setIntent('give')}
        onRequest={() => p.setIntent('request')}
      />
    );
  }

  const publishInner =
    p.publishButtonShowsSpinner ? <ActivityIndicator color={colors.white} /> : <Text style={s.submitText}>{p.publishLabel}</Text>;

  return (
    <View style={[s.backdrop, Platform.OS === 'web' && s.backdropWeb]}>
      <TouchableOpacity style={s.backdropTouch} onPress={p.closeComposer} accessibilityRole="button" />
      <View style={[s.sheet, Platform.OS === 'web' && s.sheetWeb, p.contentIsTask && s.sheetTask]}>
        <View style={s.handle} />
        <View style={s.headerRow}>
          <Text style={s.title}>{p.titleText}</Text>
          <TouchableOpacity onPress={p.closeComposer}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {toggleSlot}

        <View style={s.categoriesRow}>
          {p.categoryChips.map((c) => (
            <TouchableOpacity key={c} style={[s.categoryChip, p.category === c && s.categoryChipActive]} onPress={() => p.setCategory(c)}>
              <Text style={s.categoryText}>{p.t(`donations:categories.${c}.title`, { defaultValue: c })}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ComposerMainSlot
          styles={s}
          taskFormRef={p.taskFormRef}
          visible={p.visible}
          contentIsTask={p.contentIsTask}
          selectedUserId={p.selectedUserId}
          onTaskCreated={p.closeComposer}
          setTaskSubmitting={p.setTaskSubmitting}
          guestHintMessage={p.t('common:guestLoginHint')}
          t={p.t}
          showTrumpRideFields={p.showTrumpRideFields}
          showQuantityField={p.showQuantityField}
          showAmountField={p.showAmountField}
          title={p.title}
          description={p.description}
          city={p.city}
          quantity={p.quantity}
          amount={p.amount}
          onTitleChange={p.setTitle}
          onDescriptionChange={p.setDescription}
          onCityChange={p.setCity}
          onQuantityChange={p.setQuantity}
          onAmountChange={p.setAmount}
          rideFrom={p.rideFrom}
          rideTo={p.rideTo}
          rideDeparture={p.rideDeparture}
          onRideFromChange={p.setRideFrom}
          onRideToChange={p.setRideTo}
          onRideDepartureChange={p.setRideDeparture}
        />

        <TrumpRideAdvancedSection
          styles={s}
          showTrumpRideFields={p.showTrumpRideFields}
          advancedOpen={p.advancedOpen}
          setAdvancedOpen={p.setAdvancedOpen}
          t={p.t}
          chip={p.chip}
          recurrenceUnitLabel={p.recurrenceUnitLabel}
          isRecurring={p.isRecurring}
          setIsRecurring={p.setIsRecurring}
          setRecurrenceUnit={p.setRecurrenceUnit}
          setRecurrenceFrequency={p.setRecurrenceFrequency}
          recurrenceFrequency={p.recurrenceFrequency}
          recurrenceUnit={p.recurrenceUnit}
          seats={p.seats}
          setSeats={p.setSeats}
          fuelMode={p.fuelMode}
          setFuelMode={p.setFuelMode}
          fuelCapNis={p.fuelCapNis}
          setFuelCapNis={p.setFuelCapNis}
          smokingPref={p.smokingPref}
          setSmokingPref={p.setSmokingPref}
          genderPref={p.genderPref}
          setGenderPref={p.setGenderPref}
        />

        <TouchableOpacity
          style={[s.submitBtn, p.submitRequestHighlight && s.submitRequest, p.publishDisabled && s.submitBtnDisabled]}
          onPress={p.onPressPublish}
          disabled={p.publishDisabled}
          accessibilityState={{ disabled: p.publishDisabled }}
        >
          {publishInner}
        </TouchableOpacity>
      </View>
    </View>
  );
}
