import { mapBackendCommunityStatsPayload } from '../communityStatsMapping';
import { DEFAULT_STATS } from '../statsServiceTypes';

describe('mapBackendCommunityStatsPayload', () => {
  it('maps completed_tasks to completedTasks', () => {
    const out = mapBackendCommunityStatsPayload(
      { completed_tasks: { value: 42 } },
      DEFAULT_STATS,
    );
    expect(out.completedTasks).toBe(42);
  });

  it('maps item_donations and completed_rides', () => {
    const out = mapBackendCommunityStatsPayload(
      {
        item_donations: { value: 7 },
        completed_rides: { value: 3 },
      },
      DEFAULT_STATS,
    );
    expect(out.itemDonations).toBe(7);
    expect(out.completedRides).toBe(3);
  });

  it('sets rides from total_rides when present', () => {
    const out = mapBackendCommunityStatsPayload(
      { total_rides: { value: 10 }, completed_rides: { value: 4 } },
      DEFAULT_STATS,
    );
    expect(out.totalRides).toBe(10);
    expect(out.rides).toBe(10);
  });

  it('falls back rides legacy field to completed_rides when total_rides absent', () => {
    const out = mapBackendCommunityStatsPayload({ completed_rides: { value: 5 } }, DEFAULT_STATS);
    expect(out.completedRides).toBe(5);
    expect(out.rides).toBe(5);
  });

  it('ignores NaN and non-finite values', () => {
    const base = { ...DEFAULT_STATS, siteVisits: 99 };
    const out = mapBackendCommunityStatsPayload(
      { site_visits: { value: Number.NaN }, total_users: { value: 1 } },
      base,
    );
    expect(out.siteVisits).toBe(99);
    expect(out.totalUsers).toBe(1);
  });

  it('preserves zero as a valid metric', () => {
    const out = mapBackendCommunityStatsPayload({ site_visits: { value: 0 } }, DEFAULT_STATS);
    expect(out.siteVisits).toBe(0);
  });
});
