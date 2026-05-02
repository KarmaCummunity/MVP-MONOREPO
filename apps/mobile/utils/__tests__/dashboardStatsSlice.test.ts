import { parseDashboardMetricsSlice } from '../dashboardStatsSlice';

describe('parseDashboardMetricsSlice', () => {
  it('returns null for null or non-object input', () => {
    expect(parseDashboardMetricsSlice(null)).toBeNull();
    expect(parseDashboardMetricsSlice(undefined)).toBeNull();
  });

  it('parses string and number fields', () => {
    const slice = parseDashboardMetricsSlice({
      tasks_open: '2',
      tasks_in_progress: 1,
      posts_total: '10',
      avg_posts_per_user: '1.25',
    });
    expect(slice).not.toBeNull();
    expect(slice!.tasks_open).toBe(2);
    expect(slice!.tasks_in_progress).toBe(1);
    expect(slice!.posts_total).toBe(10);
    expect(slice!.avg_posts_per_user).toBe(1.25);
  });

  it('treats invalid numbers as zero', () => {
    const slice = parseDashboardMetricsSlice({
      tasks_total: 'not-a-number',
      posts_open: Number.NaN,
    });
    expect(slice!.tasks_total).toBe(0);
    expect(slice!.posts_open).toBe(0);
  });
});
