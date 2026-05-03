import { formatYearMonthPeriodHebrew } from '../monthNames';

describe('formatYearMonthPeriodHebrew', () => {
  it('formats YYYY-MM with Hebrew month name', () => {
    expect(formatYearMonthPeriodHebrew('2025-03')).toBe('מרץ 2025');
  });

  it('returns raw string when period is invalid', () => {
    expect(formatYearMonthPeriodHebrew('bad')).toBe('bad');
    expect(formatYearMonthPeriodHebrew('2025-13')).toBe('2025-13');
  });
});
