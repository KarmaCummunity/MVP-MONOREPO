import React from 'react';
import { Text, TextInput } from 'react-native';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';
import TimeInput from './TimeInput';

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
  return (
    <>
      <Text style={s.fieldLabel}>
        {t('common:postComposer.rideOriginLabel')}
        <Text style={s.requiredStar}> *</Text>
      </Text>
      <TextInput
        style={s.input}
        placeholder={t('common:postComposer.rideFromPlaceholder')}
        value={rideFrom}
        onChangeText={onChangeRideFrom}
      />
      <Text style={s.fieldLabel}>
        {t('common:postComposer.rideDestLabel')}
        <Text style={s.requiredStar}> *</Text>
      </Text>
      <TextInput
        style={s.input}
        placeholder={t('common:postComposer.rideToPlaceholder')}
        value={rideTo}
        onChangeText={onChangeRideTo}
      />
      <Text style={s.fieldLabel}>
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
        style={[s.input, s.multiline]}
        placeholder={t('common:postComposer.rideNotesPlaceholder')}
        value={description}
        onChangeText={onChangeDescription}
        multiline
      />
    </>
  );
}
