import React from 'react';
import { ScrollView, TextInput } from 'react-native';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';
import TrumpRideBasicFields from './TrumpRideBasicFields';

type Styles = CreatePostComposerModalStyles;

export type ComposerNonTaskFormScrollProps = Readonly<{
  styles: Styles;
  t: (key: string, options?: { defaultValue?: string }) => string;
  showTrumpRideFields: boolean;
  showQuantityField: boolean;
  showAmountField: boolean;
  title: string;
  description: string;
  city: string;
  quantity: string;
  amount: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onQuantityChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  rideFrom: string;
  rideTo: string;
  rideDeparture: Date | null;
  onRideFromChange: (v: string) => void;
  onRideToChange: (v: string) => void;
  onRideDepartureChange: (d: Date | null) => void;
}>;

export default function ComposerNonTaskFormScroll({
  styles: s,
  t,
  showTrumpRideFields,
  showQuantityField,
  showAmountField,
  title,
  description,
  city,
  quantity,
  amount,
  onTitleChange,
  onDescriptionChange,
  onCityChange,
  onQuantityChange,
  onAmountChange,
  rideFrom,
  rideTo,
  rideDeparture,
  onRideFromChange,
  onRideToChange,
  onRideDepartureChange,
}: ComposerNonTaskFormScrollProps): React.ReactElement {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
      {showTrumpRideFields ? (
        <TrumpRideBasicFields
          styles={s}
          t={t as (key: string) => string}
          rideFrom={rideFrom}
          rideTo={rideTo}
          rideDeparture={rideDeparture}
          description={description}
          onChangeRideFrom={onRideFromChange}
          onChangeRideTo={onRideToChange}
          onChangeRideDeparture={onRideDepartureChange}
          onChangeDescription={onDescriptionChange}
        />
      ) : (
        <>
          <TextInput style={s.input} placeholder={t('common:postComposer.title')} value={title} onChangeText={onTitleChange} />
          <TextInput
            style={[s.input, s.multiline]}
            placeholder={t('common:postComposer.description')}
            value={description}
            onChangeText={onDescriptionChange}
            multiline
          />
          <TextInput style={s.input} placeholder={t('common:postComposer.city')} value={city} onChangeText={onCityChange} />
        </>
      )}
      {showQuantityField ? (
        <TextInput
          style={s.input}
          placeholder={t('common:postComposer.quantity')}
          value={quantity}
          onChangeText={onQuantityChange}
          keyboardType="number-pad"
        />
      ) : null}
      {showAmountField ? (
        <TextInput style={s.input} placeholder={t('common:postComposer.amount')} value={amount} onChangeText={onAmountChange} keyboardType="number-pad" />
      ) : null}
    </ScrollView>
  );
}
