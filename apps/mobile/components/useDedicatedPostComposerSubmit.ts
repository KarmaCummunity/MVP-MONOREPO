import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { runComposerDedicatedSubmit, type RunComposerSubmitInput } from './createPostComposerSubmit';

type ComposeT = (key: string, options?: Record<string, string>) => string;

/** Updated every render inside the hook; submit reads the latest snapshot. */
export type DedicatedPostComposerSubmitSnapshot = Omit<
  RunComposerSubmitInput,
  'fromTrim' | 'toTrim' | 'titleTrim' | 'descriptionTrimmed' | 'cityTrimmed' | 'quantityStr' | 'amountStr'
> &
  Readonly<{
    t: ComposeT;
    closeComposer: () => void;
    rideFrom: string;
    rideTo: string;
    title: string;
    description: string;
    city: string;
    quantity: string;
    amount: string;
  }>;

export function useDedicatedPostComposerSubmit(snap: DedicatedPostComposerSubmitSnapshot): () => Promise<void> {
  const snapshotRef = useRef(snap);
  snapshotRef.current = snap;

  return useCallback(async () => {
    const s = snapshotRef.current;

    const result = await runComposerDedicatedSubmit({
      t: s.t,
      userId: s.userId,
      showTrumpRideFields: s.showTrumpRideFields,
      fromTrim: s.rideFrom.trim(),
      toTrim: s.rideTo.trim(),
      departureValid: s.departureValid,
      rideDeparture: s.rideDeparture,
      intent: s.intent,
      titleTrim: s.title.trim(),
      isRecurring: s.isRecurring,
      recurrenceUnit: s.recurrenceUnit,
      fuelMode: s.fuelMode,
      fuelCapNis: s.fuelCapNis,
      recurrenceFrequency: s.recurrenceFrequency,
      seats: s.seats,
      smokingPref: s.smokingPref,
      genderPref: s.genderPref,
      descriptionTrimmed: s.description.trim() || undefined,
      category: s.category,
      cityTrimmed: s.city.trim() || undefined,
      showQuantityField: s.showQuantityField,
      showAmountField: s.showAmountField,
      quantityStr: s.quantity,
      amountStr: s.amount,
    });

    if (result.kind !== 'success') {
      const messageKey = result.kind === 'validation' ? result.errorKey : 'common:genericTryAgain';
      Alert.alert(s.t('common:error'), s.t(messageKey));
      return;
    }

    Alert.alert(
      s.t('common:confirm'),
      s.intent === 'request'
        ? s.t('common:postComposer.requestPublished')
        : s.t('common:postComposer.givePublished'),
    );
    s.closeComposer();
  }, []);
}
