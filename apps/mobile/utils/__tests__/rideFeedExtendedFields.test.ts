import {
  mergeFeedRideExtended,
  rideExtendedFromRideBlock,
  rideExtendedFromRideDataJoin,
} from '../rideFeedExtendedFields';

describe('rideExtendedFromRideBlock', () => {
  it('maps trump composer fields', () => {
    const ext = rideExtendedFromRideBlock({
      notes: 'Call when arriving',
      is_recurring: true,
      recurrence_frequency: 2,
      recurrence_unit: 'week',
      fuel_participation: 'up_to',
      fuel_participation_max_nis: 30,
      smoking_preference: 'no_smokers',
      gender_preference: 'female',
    });
    expect(ext?.notes).toBe('Call when arriving');
    expect(ext?.isRecurring).toBe(true);
    expect(ext?.recurrenceFrequency).toBe(2);
    expect(ext?.recurrenceUnit).toBe('week');
    expect(ext?.fuelParticipation).toBe('up_to');
    expect(ext?.fuelMaxNis).toBe(30);
    expect(ext?.smokingPreference).toBe('no_smokers');
    expect(ext?.genderPreference).toBe('female');
  });

  it('does not coerce object recurrence_unit to a string', () => {
    const block: Record<string, unknown> = {
      is_recurring: true,
      recurrence_frequency: 1,
      recurrence_unit: { not: 'valid' },
    };
    const ext = rideExtendedFromRideBlock(block);
    expect(ext?.isRecurring).toBe(true);
    expect(ext?.recurrenceUnit).toBeUndefined();
  });
});

describe('rideExtendedFromRideDataJoin', () => {
  it('parses requirements and rides.metadata JSON', () => {
    const ext = rideExtendedFromRideDataJoin({
      description: 'Back seat free',
      requirements: 'no-smoking, pets-allowed',
      metadata: JSON.stringify({
        is_recurring: true,
        recurrence_frequency: 1,
        recurrence_unit: 'day',
        preferences: { no_smoking: true, pets_allowed: true },
      }),
    });
    expect(ext?.notes).toBe('Back seat free');
    expect(ext?.requirementCodes).toEqual(['no-smoking', 'pets-allowed']);
    expect(ext?.isRecurring).toBe(true);
    expect(ext?.preferences?.noSmoking).toBe(true);
    expect(ext?.preferences?.petsAllowed).toBe(true);
  });

  it('accepts metadata as object (pg driver)', () => {
    const ext = rideExtendedFromRideDataJoin({
      metadata: { is_recurring: true, recurrence_unit: 'month', recurrence_frequency: 1 },
    });
    expect(ext?.isRecurring).toBe(true);
    expect(ext?.recurrenceUnit).toBe('month');
  });

  it('ignores object recurrence_unit in metadata', () => {
    const ext = rideExtendedFromRideDataJoin({
      metadata: JSON.stringify({
        is_recurring: true,
        recurrence_unit: { bad: true },
      }),
    });
    expect(ext?.isRecurring).toBe(true);
    expect(ext?.recurrenceUnit).toBeUndefined();
  });
});

describe('mergeFeedRideExtended', () => {
  it('merges blocks with b overriding scalar fields', () => {
    const m = mergeFeedRideExtended(
      { notes: 'A', fuelParticipation: 'none' },
      { smokingPreference: 'any', notes: 'B' },
    );
    expect(m?.notes).toBe('B');
    expect(m?.fuelParticipation).toBe('none');
    expect(m?.smokingPreference).toBe('any');
  });
});
