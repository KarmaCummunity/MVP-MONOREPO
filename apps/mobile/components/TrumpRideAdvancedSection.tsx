import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';
import TrumpRideAdvancedPanel, { TrumpRideAdvancedFooter } from './TrumpRideAdvancedPanel';
import type { StyleProp, ViewStyle } from 'react-native';
import type { TFunction } from 'i18next';

type Styles = CreatePostComposerModalStyles;

export type TrumpRideAdvancedSectionProps = Readonly<{
  styles: Styles;
  showTrumpRideFields: boolean;
  advancedOpen: boolean;
  setAdvancedOpen: Dispatch<SetStateAction<boolean>>;
  t: TFunction;
  chip: (active: boolean) => StyleProp<ViewStyle>;
  recurrenceUnitLabel: (u: RecurrenceUnit) => string;
  isRecurring: boolean;
  setIsRecurring: Dispatch<SetStateAction<boolean>>;
  setRecurrenceUnit: Dispatch<SetStateAction<RecurrenceUnit | null>>;
  setRecurrenceFrequency: Dispatch<SetStateAction<number>>;
  recurrenceFrequency: number;
  recurrenceUnit: RecurrenceUnit | null;
  seats: number;
  setSeats: Dispatch<SetStateAction<number>>;
  fuelMode: 'none' | 'yes' | 'up_to';
  setFuelMode: Dispatch<SetStateAction<'none' | 'yes' | 'up_to'>>;
  fuelCapNis: string;
  setFuelCapNis: Dispatch<SetStateAction<string>>;
  smokingPref: 'no_smokers' | 'smokers_ok' | 'any';
  setSmokingPref: Dispatch<SetStateAction<'no_smokers' | 'smokers_ok' | 'any'>>;
  genderPref: 'any' | 'female' | 'male';
  setGenderPref: Dispatch<SetStateAction<'any' | 'female' | 'male'>>;
}>;

export default function TrumpRideAdvancedSection(props: TrumpRideAdvancedSectionProps): React.ReactElement | null {
  if (!props.showTrumpRideFields) return null;

  return (
    <>
      <TrumpRideAdvancedFooter
        styles={props.styles}
        advancedOpen={props.advancedOpen}
        setAdvancedOpen={props.setAdvancedOpen}
        t={props.t}
      />
      {props.advancedOpen ? (
        <TrumpRideAdvancedPanel
          styles={props.styles}
          chip={props.chip}
          recurrenceUnitLabel={props.recurrenceUnitLabel}
          t={props.t}
          isRecurring={props.isRecurring}
          setIsRecurring={props.setIsRecurring}
          setRecurrenceUnit={props.setRecurrenceUnit}
          setRecurrenceFrequency={props.setRecurrenceFrequency}
          recurrenceFrequency={props.recurrenceFrequency}
          recurrenceUnit={props.recurrenceUnit}
          seats={props.seats}
          setSeats={props.setSeats}
          fuelMode={props.fuelMode}
          setFuelMode={props.setFuelMode}
          fuelCapNis={props.fuelCapNis}
          setFuelCapNis={props.setFuelCapNis}
          smokingPref={props.smokingPref}
          setSmokingPref={props.setSmokingPref}
          genderPref={props.genderPref}
          setGenderPref={props.setGenderPref}
        />
      ) : null}
    </>
  );
}
