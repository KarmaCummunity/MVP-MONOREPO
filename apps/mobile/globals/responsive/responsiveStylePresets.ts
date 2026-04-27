import type { ResponsiveStyleBucket } from './styleBuckets';

/** Pick a numeric value per layout bucket (no branching in callers). */
export const pick4 = <T>(
  bucket: ResponsiveStyleBucket,
  phone: T,
  tablet: T,
  desktopWeb: T,
  largeDesktop: T
): T => {
  const map: Record<ResponsiveStyleBucket, T> = {
    phone,
    tablet,
    desktopWeb,
    desktop: desktopWeb,
    largeDesktop,
  };
  return map[bucket];
};
