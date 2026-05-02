import type { BREAKPOINTS } from './constants';

export type BreakpointName = keyof typeof BREAKPOINTS;

export type LayoutBucket =
  | 'compact'
  | 'phone'
  | 'largePhone'
  | 'tablet'
  | 'desktop'
  | 'largeDesktop';

export type Orientation = 'portrait' | 'landscape';
