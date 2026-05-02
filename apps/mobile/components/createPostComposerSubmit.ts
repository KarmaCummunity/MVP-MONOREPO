import { db } from '../utils/databaseService';
import type { PostIntent } from '../stores/postComposerStore';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';
import { buildTrumpRideRequestMetadata } from '../utils/buildTrumpRideRequestMetadata';
import { validateComposePostSubmission } from './createPostComposerValidation';

type ComposerTranslate = (key: string, options?: Record<string, string>) => string;

export type RunComposerSubmitInput = Readonly<{
  t: ComposerTranslate;
  userId: string | undefined | null;
  showTrumpRideFields: boolean;
  fromTrim: string;
  toTrim: string;
  departureValid: boolean;
  rideDeparture: Date | null;
  intent: PostIntent;
  titleTrim: string;
  isRecurring: boolean;
  recurrenceUnit: RecurrenceUnit | null;
  fuelMode: 'none' | 'yes' | 'up_to';
  fuelCapNis: string;
  recurrenceFrequency: number;
  seats: number;
  smokingPref: 'no_smokers' | 'smokers_ok' | 'any';
  genderPref: 'any' | 'female' | 'male';
  descriptionTrimmed: string | undefined;
  category: string;
  cityTrimmed: string | undefined;
  showQuantityField: boolean;
  showAmountField: boolean;
  quantityStr: string;
  amountStr: string;
}>;

export type RunComposerSubmitResult =
  | { kind: 'validation'; errorKey: string }
  | { kind: 'network' }
  | { kind: 'success' };

export async function runComposerDedicatedSubmit(input: RunComposerSubmitInput): Promise<RunComposerSubmitResult> {
  const validated = validateComposePostSubmission(input.t, {
    userId: input.userId ?? null,
    showTrumpRideFields: input.showTrumpRideFields,
    fromTrim: input.fromTrim,
    toTrim: input.toTrim,
    departureValid: input.departureValid,
    rideDeparture: input.rideDeparture,
    intent: input.intent,
    titleTrim: input.titleTrim,
    isRecurring: input.isRecurring,
    recurrenceUnit: input.recurrenceUnit,
    fuelMode: input.fuelMode,
    fuelCapNis: input.fuelCapNis,
  });

  if (!validated.ok) {
    return { kind: 'validation', errorKey: validated.errorKey };
  }

  const ownerId = input.userId;
  if (!ownerId) {
    return { kind: 'validation', errorKey: 'common:guestLoginHint' };
  }

  const { resolvedTitle, departureIsoFrom } = validated;
  const departureIso = departureIsoFrom.toISOString();

  const trumpRideMetadata = input.showTrumpRideFields
    ? {
        ...buildTrumpRideRequestMetadata({
          fromTrim: input.fromTrim,
          toTrim: input.toTrim,
          departureIso,
          isRecurring: input.isRecurring,
          recurrenceFrequency: input.recurrenceFrequency,
          recurrenceUnit: input.recurrenceUnit,
          seats: input.seats,
          fuelMode: input.fuelMode,
          fuelCapNis: Math.max(0, Number(input.fuelCapNis) || 0),
          smokingPref: input.smokingPref,
          genderPref: input.genderPref,
          notes: input.descriptionTrimmed,
        }),
      }
    : undefined;

  try {
    await db.createDedicatedItem({
      owner_id: ownerId,
      title: resolvedTitle,
      description: input.descriptionTrimmed,
      category: input.category,
      city: input.showTrumpRideFields ? input.fromTrim : input.cityTrimmed,
      address: input.showTrumpRideFields ? input.toTrim : undefined,
      quantity: input.showQuantityField ? Math.max(1, Number(input.quantityStr) || 1) : 1,
      price: input.showAmountField ? Math.max(0, Number(input.amountStr) || 0) : 0,
      condition: 'used',
      status: 'available',
      intent: input.intent,
      ...(trumpRideMetadata ? { metadata: trumpRideMetadata } : {}),
    });
    return { kind: 'success' };
  } catch {
    return { kind: 'network' };
  }
}
