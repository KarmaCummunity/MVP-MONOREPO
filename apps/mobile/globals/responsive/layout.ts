import { useMemo } from 'react';
import type { LayoutBucket } from './types';
import type { PlatformKind } from './platform';
import type { ScreenInfo } from './screenInfo';
import { useScreenInfo } from './hooks';
import { getPlatformKind } from './platform';

const LAYOUT_TIER_ORDER: LayoutBucket[] = [
  'compact',
  'phone',
  'largePhone',
  'tablet',
  'desktop',
  'largeDesktop',
];

export type ResponsiveByLayout<T> = { default: T } & Partial<
  Record<LayoutBucket, T>
>;

export type ResponsiveByPlatform<T> = { default: T } & Partial<
  Record<PlatformKind, T>
>;

/** Mobile-first: walk tiers up to current bucket; last defined value wins. */
export const pickByLayout = <T>(
  map: ResponsiveByLayout<T>,
  info: ScreenInfo
): T => {
  let value = map.default;
  for (const tier of LAYOUT_TIER_ORDER) {
    if (map[tier] !== undefined) {
      value = map[tier] as T;
    }
    if (tier === info.layoutBucket) break;
  }
  return value;
};

export const pickByPlatform = <T>(
  map: ResponsiveByPlatform<T>,
  platform: PlatformKind
): T => map[platform] ?? map.default;

/**
 * Layout-first (mobile-first tiers), then optional per-platform override
 * for the same semantic value.
 */
export const pickResponsive = <T>(
  layout: ResponsiveByLayout<T>,
  info: ScreenInfo,
  platformOverride?: ResponsiveByPlatform<T>
): T => {
  const base = pickByLayout(layout, info);
  if (!platformOverride) return base;
  const p = getPlatformKind();
  if (platformOverride[p] !== undefined) {
    return platformOverride[p] as T;
  }
  return platformOverride.default !== undefined
    ? platformOverride.default
    : base;
};

export const useResponsiveByLayout = <T>(map: ResponsiveByLayout<T>): T => {
  const info = useScreenInfo();
  return useMemo(() => pickByLayout(map, info), [map, info]);
};

export const useResponsivePick = <T>(
  layout: ResponsiveByLayout<T>,
  platformOverride?: ResponsiveByPlatform<T>
): T => {
  const info = useScreenInfo();
  return useMemo(
    () => pickResponsive(layout, info, platformOverride),
    [layout, info, platformOverride]
  );
};
