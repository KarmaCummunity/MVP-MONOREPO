/**
 * Recent activity rows shown on the profile screen (own profile only).
 */
export type ProfileRecentActivityType =
  | 'post'
  | 'item'
  | 'donation'
  | 'ride'
  | 'task_post'
  | 'task';

export type ProfileRecentActivity = Readonly<{
  id: string;
  type: ProfileRecentActivityType;
  title: string;
  /** Relative label after formatting (e.g. "לפני 5 דקות") */
  time: string;
  icon: string;
  color: string;
  rawData?: unknown;
  subtype?: string;
}>;
