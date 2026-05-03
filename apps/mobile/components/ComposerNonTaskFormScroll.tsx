import React, { useState } from 'react';
import { ScrollView, TextInput, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';
import TrumpRideBasicFields from './TrumpRideBasicFields';
import colors from '../globals/colors';

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
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const textAlign: TextStyle['textAlign'] = isRTL ? 'right' : 'left';
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getFieldStyle = (fieldName: string) => [
    s.input,
    { textAlign },
    focusedField === fieldName && s.inputFocused
  ];

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
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
          <TextInput 
            style={getFieldStyle('title')} 
            placeholder={t('common:postComposer.title')} 
            placeholderTextColor={colors.textTertiary}
            value={title} 
            onChangeText={onTitleChange} 
            onFocus={() => setFocusedField('title')}
            onBlur={() => setFocusedField(null)}
          />
          <TextInput
            style={[getFieldStyle('description'), s.multiline]}
            placeholder={t('common:postComposer.description')}
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={onDescriptionChange}
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
            multiline
          />
          <TextInput 
            style={getFieldStyle('city')} 
            placeholder={t('common:postComposer.city')} 
            placeholderTextColor={colors.textTertiary}
            value={city} 
            onChangeText={onCityChange} 
            onFocus={() => setFocusedField('city')}
            onBlur={() => setFocusedField(null)}
          />
        </>
      )}
      {showQuantityField ? (
        <TextInput
          style={getFieldStyle('quantity')}
          placeholder={t('common:postComposer.quantity')}
          placeholderTextColor={colors.textTertiary}
          value={quantity}
          onChangeText={onQuantityChange}
          onFocus={() => setFocusedField('quantity')}
          onBlur={() => setFocusedField(null)}
          keyboardType="number-pad"
        />
      ) : null}
      {showAmountField ? (
        <TextInput 
          style={getFieldStyle('amount')} 
          placeholder={t('common:postComposer.amount')} 
          placeholderTextColor={colors.textTertiary}
          value={amount} 
          onChangeText={onAmountChange} 
          onFocus={() => setFocusedField('amount')}
          onBlur={() => setFocusedField(null)}
          keyboardType="number-pad" 
        />
      ) : null}
    </ScrollView>
  );
}

