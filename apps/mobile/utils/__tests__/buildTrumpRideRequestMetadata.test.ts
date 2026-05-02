import { buildTrumpRideRequestMetadata } from '../buildTrumpRideRequestMetadata';

const base = {
  fromTrim: 'Tel Aviv',
  toTrim: 'Haifa',
  departureIso: '2026-05-02T08:30:00.000Z',
  isRecurring: false,
  recurrenceFrequency: 1,
  recurrenceUnit: null as const,
  seats: 2,
  fuelMode: 'none' as const,
  fuelCapNis: 0,
  smokingPref: 'any' as const,
  genderPref: 'any' as const,
};

describe('buildTrumpRideRequestMetadata', () => {
  it('includes core locations, departure, category, seats', () => {
    const m = buildTrumpRideRequestMetadata(base);
    expect(m.category).toBe('trump');
    expect(m.ride.from_location).toBe('Tel Aviv');
    expect(m.ride.to_location).toBe('Haifa');
    expect(m.ride.departure_time).toBe(base.departureIso);
    expect(m.ride.category).toBe('trump');
    expect(m.ride.seats).toBe(2);
    expect(m.ride.is_recurring).toBeUndefined();
  });

  it('adds recurrence when enabled with unit', () => {
    const m = buildTrumpRideRequestMetadata({
      ...base,
      isRecurring: true,
      recurrenceFrequency: 2,
      recurrenceUnit: 'week',
    });
    expect(m.ride.is_recurring).toBe(true);
    expect(m.ride.recurrence_frequency).toBe(2);
    expect(m.ride.recurrence_unit).toBe('week');
  });

  it('does not set recurrence fields when unit missing', () => {
    const m = buildTrumpRideRequestMetadata({
      ...base,
      isRecurring: true,
      recurrenceFrequency: 3,
      recurrenceUnit: null,
    });
    expect(m.ride.is_recurring).toBeUndefined();
  });

  it('sets fuel cap when mode is up_to', () => {
    const m = buildTrumpRideRequestMetadata({
      ...base,
      fuelMode: 'up_to',
      fuelCapNis: 40,
    });
    expect(m.ride.fuel_participation).toBe('up_to');
    expect(m.ride.fuel_participation_max_nis).toBe(40);
  });

  it('stores trimmed notes on ride when provided', () => {
    const m = buildTrumpRideRequestMetadata({ ...base, notes: '  door to door  ' });
    expect(m.ride.notes).toBe('door to door');
  });

  it('clamps seats to 1..20', () => {
    expect(buildTrumpRideRequestMetadata({ ...base, seats: 0 }).ride.seats).toBe(1);
    expect(buildTrumpRideRequestMetadata({ ...base, seats: 99 }).ride.seats).toBe(20);
  });
});
