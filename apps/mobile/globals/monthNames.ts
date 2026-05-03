/**
 * Hebrew month names (long form). Index 0 = January — aligns with `Date#getMonth()`.
 */
export const HEBREW_MONTH_NAMES_LONG = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
] as const;

/**
 * Formats API period `"YYYY-MM"` for Hebrew UI labels.
 */
export function formatYearMonthPeriodHebrew(period: string): string {
  const [year, monthStr] = period.split('-');
  const monthNum = Number.parseInt(monthStr, 10);
  if (!year || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return period;
  }
  return `${HEBREW_MONTH_NAMES_LONG[monthNum - 1]} ${year}`;
}
