export type RecurrenceUnit = 'day' | 'week' | 'month';

export type FuelParticipationMode = 'none' | 'yes' | 'up_to';

export type SmokingPreference = 'no_smokers' | 'smokers_ok' | 'any';

export type GenderPreference = 'any' | 'female' | 'male';

export type BuildTrumpRideRequestMetadataInput = Readonly<{
  fromTrim: string;
  toTrim: string;
  departureIso: string;
  isRecurring: boolean;
  recurrenceFrequency: number;
  recurrenceUnit: RecurrenceUnit | null;
  seats: number;
  fuelMode: FuelParticipationMode;
  fuelCapNis: number;
  smokingPref: SmokingPreference;
  genderPref: GenderPreference;
  /** Stored on `metadata.ride.notes` (mirrors post description for trump items). */
  notes?: string;
}>;

/** Builds `metadata` fragment for dedicated-item ride requests (trump + request). */
export function buildTrumpRideRequestMetadata(input: BuildTrumpRideRequestMetadataInput): {
  ride: Record<string, unknown>;
  category: string;
} {
  const ride: Record<string, unknown> = {
    from_location: input.fromTrim,
    to_location: input.toTrim,
    departure_time: input.departureIso,
    category: 'trump',
  };

  const seats = Math.max(1, Math.min(20, Math.trunc(Number(input.seats) || 1)));
  ride.seats = seats;

  if (typeof input.notes === 'string' && input.notes.trim()) {
    ride.notes = input.notes.trim();
  }

  if (input.isRecurring && input.recurrenceUnit) {
    ride.is_recurring = true;
    ride.recurrence_frequency = Math.max(1, Math.min(99, Math.trunc(input.recurrenceFrequency) || 1));
    ride.recurrence_unit = input.recurrenceUnit;
  }

  ride.fuel_participation = input.fuelMode;
  if (input.fuelMode === 'up_to') {
    ride.fuel_participation_max_nis = Math.max(0, input.fuelCapNis);
  }

  ride.smoking_preference = input.smokingPref;
  ride.gender_preference = input.genderPref;

  return { ride, category: 'trump' };
}
