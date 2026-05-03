import React, { RefObject } from 'react';
import { View, Text } from 'react-native';
import type { CreatePostComposerModalStyles } from './createPostComposerModalStyles';
import ComposerNonTaskFormScroll from './ComposerNonTaskFormScroll';
import ComposerTaskForm, { type ComposerTaskFormHandle } from './ComposerTaskForm';
import type { TFunction } from 'i18next';

type Styles = CreatePostComposerModalStyles;

export type ComposerMainSlotProps = Readonly<{
  styles: Styles;
  taskFormRef: RefObject<ComposerTaskFormHandle | null>;
  visible: boolean;
  contentIsTask: boolean;
  selectedUserId: string | undefined;
  onTaskCreated: () => void;
  setTaskSubmitting: (v: boolean) => void;
  guestHintMessage: string;
  t: TFunction;
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

export default function ComposerMainSlot({
  styles: s,
  taskFormRef,
  visible,
  contentIsTask,
  selectedUserId,
  onTaskCreated,
  setTaskSubmitting,
  guestHintMessage,
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
}: ComposerMainSlotProps): React.ReactElement {
  if (contentIsTask && selectedUserId) {
    return (
      <View style={s.taskFormWrap}>
        <ComposerTaskForm
          ref={taskFormRef}
          visible={visible}
          userId={selectedUserId}
          onCreated={onTaskCreated}
          onSubmittingChange={setTaskSubmitting}
        />
      </View>
    );
  }
  if (contentIsTask && !selectedUserId) {
    return <Text style={s.hintText}>{guestHintMessage}</Text>;
  }
  return (
    <ComposerNonTaskFormScroll
      styles={s}
      t={t}
      showTrumpRideFields={showTrumpRideFields}
      showQuantityField={showQuantityField}
      showAmountField={showAmountField}
      title={title}
      description={description}
      city={city}
      quantity={quantity}
      amount={amount}
      onTitleChange={onTitleChange}
      onDescriptionChange={onDescriptionChange}
      onCityChange={onCityChange}
      onQuantityChange={onQuantityChange}
      onAmountChange={onAmountChange}
      rideFrom={rideFrom}
      rideTo={rideTo}
      rideDeparture={rideDeparture}
      onRideFromChange={onRideFromChange}
      onRideToChange={onRideToChange}
      onRideDepartureChange={onRideDepartureChange}
    />
  );
}
