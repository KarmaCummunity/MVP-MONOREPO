import type { PostIntent } from '../stores/postComposerStore';
import type { RecurrenceUnit } from '../utils/buildTrumpRideRequestMetadata';

type ComposerTranslate = (key: string, options?: Record<string, string>) => string;

/** True when fuel cap must be filled but is missing or invalid (matches NaN behavior of prior `!(Number(...) > 0)`). */
export function isTrumpFuelCapInvalid(fuelMode: 'none' | 'yes' | 'up_to', fuelCapNis: string): boolean {
  if (fuelMode !== 'up_to') return false;
  const cap = Number(fuelCapNis);
  return !Number.isFinite(cap) || cap <= 0;
}

export type ComposePostValidated =
  | { ok: true; resolvedTitle: string; departureIsoFrom: Date }
  | { ok: false; errorKey: string };

type ValidationParams = Readonly<{
  userId?: string | null;
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
}>;

function guestErrorKey(userId: string | null | undefined): string | null {
  return userId ? null : 'common:guestLoginHint';
}

function trumpRouteErrorKey(fromTrim: string, toTrim: string): string | null {
  if (!fromTrim || !toTrim) return 'common:postComposer.rideRequestFromToRequired';
  return null;
}

function trumpScheduleErrorKey(departureValid: boolean, rideDeparture: Date | null): string | null {
  if (!departureValid) return 'common:postComposer.rideTimeRequired';
  if (!(rideDeparture instanceof Date) || Number.isNaN(rideDeparture.getTime())) {
    return 'common:postComposer.rideTimeRequired';
  }
  return null;
}

function trumpRecurrenceErrorKey(isRecurring: boolean, recurrenceUnit: RecurrenceUnit | null): string | null {
  if (isRecurring && !recurrenceUnit) return 'common:postComposer.rideRecurrenceUnitRequired';
  return null;
}

function trumpFuelErrorKey(fuelMode: 'none' | 'yes' | 'up_to', fuelCapNis: string): string | null {
  if (isTrumpFuelCapInvalid(fuelMode, fuelCapNis)) return 'common:postComposer.fuelCapRequired';
  return null;
}

function resolveTrumpTitle(
  t: ComposerTranslate,
  intent: PostIntent,
  titleTrim: string,
  fromTrim: string,
  toTrim: string,
): string {
  if (titleTrim) return titleTrim;
  return intent === 'request'
    ? t('common:postComposer.rideRequestTitleTemplate', { from: fromTrim, to: toTrim })
    : t('common:postComposer.rideGiveTitleTemplate', { from: fromTrim, to: toTrim });
}

function validateTrumpSubmission(t: ComposerTranslate, p: ValidationParams): ComposePostValidated {
  const g = guestErrorKey(p.userId);
  if (g) return { ok: false, errorKey: g };

  const r1 = trumpRouteErrorKey(p.fromTrim, p.toTrim);
  if (r1) return { ok: false, errorKey: r1 };

  const r2 = trumpScheduleErrorKey(p.departureValid, p.rideDeparture);
  if (r2) return { ok: false, errorKey: r2 };

  const r3 = trumpRecurrenceErrorKey(p.isRecurring, p.recurrenceUnit);
  if (r3) return { ok: false, errorKey: r3 };

  const r4 = trumpFuelErrorKey(p.fuelMode, p.fuelCapNis);
  if (r4) return { ok: false, errorKey: r4 };

  const dep = p.rideDeparture;
  if (!(dep instanceof Date)) {
    return { ok: false, errorKey: 'common:postComposer.rideTimeRequired' };
  }
  const resolvedTitle = resolveTrumpTitle(t, p.intent, p.titleTrim, p.fromTrim, p.toTrim);
  return { ok: true, resolvedTitle, departureIsoFrom: dep };
}

function validateNonTrumpSubmission(p: ValidationParams): ComposePostValidated {
  const g = guestErrorKey(p.userId);
  if (g) return { ok: false, errorKey: g };
  if (!p.titleTrim) return { ok: false, errorKey: 'common:postComposer.titleRequired' };
  return { ok: true, resolvedTitle: p.titleTrim, departureIsoFrom: new Date() };
}

export function validateComposePostSubmission(
  t: ComposerTranslate,
  params: ValidationParams,
): ComposePostValidated {
  if (params.showTrumpRideFields) {
    return validateTrumpSubmission(t, params);
  }
  return validateNonTrumpSubmission(params);
}
