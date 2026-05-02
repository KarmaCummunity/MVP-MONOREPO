/** Dashboard metrics row from `apiService.getDashboardStats()` when successful. */
export type DashboardMetricsRow = Record<string, string | number | null | undefined>;

export type DashboardSlice = {
  tasks_open: number;
  tasks_in_progress: number;
  tasks_done: number;
  tasks_total: number;
  admins_count: number;
  regular_users_count: number;
  total_users: number;
  total_volunteer_hours: number;
  avg_hours_per_user: number;
  current_month_hours: number;
  posts_total: number;
  posts_open: number;
  posts_closed: number;
  avg_posts_per_user: number;
};

function toFiniteNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalizes dashboard API metrics into numbers for the community stats UI.
 */
export function parseDashboardMetricsSlice(metrics: DashboardMetricsRow | null | undefined): DashboardSlice | null {
  if (!metrics || typeof metrics !== 'object') {
    return null;
  }

  return {
    tasks_open: toFiniteNumber(metrics.tasks_open),
    tasks_in_progress: toFiniteNumber(metrics.tasks_in_progress),
    tasks_done: toFiniteNumber(metrics.tasks_done),
    tasks_total: toFiniteNumber(metrics.tasks_total),
    admins_count: toFiniteNumber(metrics.admins_count),
    regular_users_count: toFiniteNumber(metrics.regular_users_count),
    total_users: toFiniteNumber(metrics.total_users),
    total_volunteer_hours: toFiniteNumber(metrics.total_volunteer_hours),
    avg_hours_per_user: toFiniteNumber(metrics.avg_hours_per_user),
    current_month_hours: toFiniteNumber(metrics.current_month_hours),
    posts_total: toFiniteNumber(metrics.posts_total),
    posts_open: toFiniteNumber(metrics.posts_open),
    posts_closed: toFiniteNumber(metrics.posts_closed),
    avg_posts_per_user: toFiniteNumber(metrics.avg_posts_per_user),
  };
}
