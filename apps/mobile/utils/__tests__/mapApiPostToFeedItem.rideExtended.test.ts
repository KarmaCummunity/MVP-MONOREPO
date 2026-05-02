import { mapApiPostToFeedItem } from '../mapApiPostToFeedItem';

describe('mapApiPostToFeedItem rideExtended (trump donation)', () => {
  it('maps metadata.ride extras for donation posts', () => {
    const row = {
      id: 'p-trump-1',
      post_type: 'donation',
      title: 'בקשת טרמפ',
      description: 'הערות משתמש',
      likes: '0',
      comments: '0',
      is_liked: false,
      created_at: '2026-01-01T12:00:00.000Z',
      author: { id: 'u1', name: 'U', avatar_url: '', email_verified: false },
      metadata: {
        intent: 'request',
        category: 'trump',
        item_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        ride: {
          from_location: 'A',
          to_location: 'B',
          departure_time: '2026-01-02T09:00:00.000Z',
          seats: 2,
          is_recurring: true,
          recurrence_frequency: 1,
          recurrence_unit: 'week',
          fuel_participation: 'up_to',
          fuel_participation_max_nis: 25,
          smoking_preference: 'no_smokers',
          gender_preference: 'any',
          notes: 'הערות משתמש',
        },
      },
    };
    const item = mapApiPostToFeedItem(row);
    expect(item.from).toBe('A');
    expect(item.to).toBe('B');
    expect(item.intent).toBe('request');
    expect(item.rideExtended?.isRecurring).toBe(true);
    expect(item.rideExtended?.recurrenceUnit).toBe('week');
    expect(item.rideExtended?.fuelParticipation).toBe('up_to');
    expect(item.rideExtended?.fuelMaxNis).toBe(25);
    expect(item.rideExtended?.smokingPreference).toBe('no_smokers');
    expect(item.rideExtended?.notes).toBe('הערות משתמש');
  });
});
