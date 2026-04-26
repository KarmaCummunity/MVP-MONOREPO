import { useMemo, useState, useEffect } from 'react';
import { useWindowDimensions, Dimensions } from 'react-native';
import type { Orientation } from './types';
import { getScreenInfoFromDimensions, type ScreenInfo } from './screenInfo';

export const useScreenInfo = (): ScreenInfo => {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => getScreenInfoFromDimensions(width, height),
    [width, height]
  );
};

export const useOrientation = (): Orientation => {
  const { width, height } = useWindowDimensions();
  return height >= width ? 'portrait' : 'landscape';
};

/**
 * Font scale from accessibility settings (1 = default). Web may report undefined;
 * native always has a number.
 */
export const useFontScale = (): number => {
  const initial = Dimensions.get('window').fontScale ?? 1;
  const [fontScale, setFontScale] = useState(initial);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setFontScale(window.fontScale ?? 1);
    });
    return () => sub.remove();
  }, []);

  return fontScale;
};
