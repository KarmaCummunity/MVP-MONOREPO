import React, { useState } from 'react';
import { Text, TextInput, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';
import TimeInput from './TimeInput';
import colors from '../globals/colors';

type Styles = CreatePostComposerModalStyles;

export type TrumpRideBasicFieldsProps = Readonly<{
  styles: Styles;
  t: (key: string) => string;
  rideFrom: string;
  rideTo: string;
  rideDeparture: Date | null;
  description: string;
  onChangeRideFrom: (v: string) => void;
  onChangeRideTo: (v: string) => void;
  onChangeRideDeparture: (d: Date | null) => void;
  onChangeDescription: (v: string) => void;
}>;

export default function TrumpRideBasicFields({
  styles: s,
  t,
  rideFrom,
  rideTo,
  rideDeparture,
  description,
  onChangeRideFrom,
  onChangeRideTo,
  onChangeRideDeparture,
  onChangeDescription,
}: TrumpRideBasicFieldsProps): React.ReactElement {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const textAlign: TextStyle['textAlign'] = isRTL ? 'right' : 'left';
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getFieldStyle = (fieldName: string) => [
    s.input,
    { textAlign },
    focusedField === fieldName && s.inputFocused
  ];

  const labelStyle = [s.fieldLabel, !isRTL && s.fieldLabelLtr];

  return (
    <>
      <Text style={labelStyle}>
        {t('common:postComposer.rideOriginLabel')}
        <Text style={s.requiredStar}> *</Text>
      </Text>
      <TextInput
        style={getFieldStyle('rideFrom')}
        placeholder={t('common:postComposer.rideFromPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        value={rideFrom}
        onChangeText={onChangeRideFrom}
        onFocus={() => setFocusedField('rideFrom')}
        onBlur={() => setFocusedField(null)}
      />
      <Text style={labelStyle}>
        {t('common:postComposer.rideDestLabel')}
        <Text style={s.requiredStar}> *</Text>
      </Text>
      <TextInput
        style={getFieldStyle('rideTo')}
        placeholder={t('common:postComposer.rideToPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        value={rideTo}
        onChangeText={onChangeRideTo}
        onFocus={() => setFocusedField('rideTo')}
        onBlur={() => setFocusedField(null)}
      />
      <Text style={labelStyle}>
        {t('common:postComposer.rideTimeLabel')}
        <Text style={s.requiredStar}> *</Text>
      </Text>
      <TimeInput
        value={rideDeparture ?? undefined}
        onChange={(d) => onChangeRideDeparture(d)}
        label={undefined}
        placeholder={t('common:time.now')}
      />
      <TextInput
        style={[getFieldStyle('description'), s.multiline]}
        placeholder={t('common:postComposer.rideNotesPlaceholder')}
        placeholderTextColor={colors.textTertiary}
        value={description}
        onChangeText={onChangeDescription}
        onFocus={() => setFocusedField('description')}
        onBlur={() => setFocusedField(null)}
        multiline
      />
    </>
  );
}

