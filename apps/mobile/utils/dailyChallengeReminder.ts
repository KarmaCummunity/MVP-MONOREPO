// Client-side reminder for challenges missing today's entry in the daily tracker grid.
import i18n from '../app/i18n';
import { db, getDailyChallengeReminderLastEmittedDate, setDailyChallengeReminderLastEmittedDate } from './databaseService';
import { sendLocalNotification } from './notificationService';
import type { DailyTrackerData } from '../globals/types';

type TrackerRefreshListener = () => void;
const trackerRefreshListeners = new Set<TrackerRefreshListener>();

export const subscribeDailyChallengeTrackerRefresh = (listener: TrackerRefreshListener): (() => void) => {
  trackerRefreshListeners.add(listener);
  return () => trackerRefreshListeners.delete(listener);
};

export const emitDailyChallengeTrackerRefresh = (): void => {
  trackerRefreshListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('dailyChallengeTrackerRefresh listener error:', e);
    }
  });
};

/** YYYY-MM-DD in device local timezone (matches DailyHabitsQuickView). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function countChallengesMissingTodayEntry(
  payload: DailyTrackerData | null | undefined,
  todayStr: string
): number {
  if (!payload?.challenges?.length) return 0;
  let n = 0;
  for (const ch of payload.challenges) {
    const status = payload.entries_by_date?.[todayStr]?.[ch.id]?.status ?? 'empty';
    if (status === 'empty') n++;
  }
  return n;
}

export async function getPendingDailyReportCount(userId: string): Promise<number> {
  const todayStr = toLocalDateString(new Date());
  try {
    const response = await db.getDailyTrackerData(userId, todayStr, todayStr);
    const payload = (response?.data?.data ?? response?.data ?? response) as DailyTrackerData | undefined;
    if (!payload || !Array.isArray(payload.challenges)) return 0;
    return countChallengesMissingTodayEntry(payload, todayStr);
  } catch (error) {
    console.warn('getPendingDailyReportCount failed:', error);
    return 0;
  }
}

/** One local push per calendar day while there are pending daily reports (optional nudge). */
export async function maybeEmitDailyChallengeLocalPushOnceToday(
  userId: string,
  pendingCount: number
): Promise<void> {
  if (pendingCount <= 0) return;
  const todayStr = toLocalDateString(new Date());
  const last = await getDailyChallengeReminderLastEmittedDate(userId);
  if (last === todayStr) return;
  const title = i18n.t('notifications:dailyChallengeReminder.pushTitle', { count: pendingCount });
  const body = i18n.t('notifications:dailyChallengeReminder.pushBody', { count: pendingCount });
  await sendLocalNotification(title, body, { navigateTo: 'MyChallengesScreen', scrollToDailyTracker: true }, 'daily_challenge_reminder');
  await setDailyChallengeReminderLastEmittedDate(userId, todayStr);
}
