/**
 * Allowed `statType` path segments for GET /api/stats/details/:statType.
 * Must stay in sync with StatsDetailModal + StatsController switch cases.
 */
export const STAT_DETAIL_API_TYPES = [
  'siteVisits',
  'totalUsers',
  'totalMoneyDonated',
  'itemDonations',
  'completedRides',
  'uniqueDonors',
  'recurringDonationsAmount',
  'completedTasks',
] as const;

export type StatDetailApiType = (typeof STAT_DETAIL_API_TYPES)[number];

const ALLOWED = new Set<string>(STAT_DETAIL_API_TYPES);

export function isAllowedStatDetailType(statType: string): statType is StatDetailApiType {
  return ALLOWED.has(statType);
}
