import { I18nManager } from 'react-native';
import { isWeb } from './platform';

type Align = 'left' | 'right' | 'center';

export const biDiTextAlign = (mobileDefault: Align = 'right'): Align => {
  if (isWeb) {
    if (mobileDefault === 'left') return 'right';
    if (mobileDefault === 'right') return 'left';
    return 'center';
  }
  return mobileDefault;
};

export const marginStartEnd = (mobileStart: number = 0, mobileEnd: number = 0) => {
  const isRTL = I18nManager.isRTL;
  const resolvedStart = isRTL ? mobileEnd : mobileStart;
  const resolvedEnd = isRTL ? mobileStart : mobileEnd;
  if (isWeb) {
    return { marginLeft: resolvedEnd, marginRight: resolvedStart };
  }
  return { marginLeft: resolvedStart, marginRight: resolvedEnd };
};

export const paddingStartEnd = (mobileStart: number = 0, mobileEnd: number = 0) => {
  const isRTL = I18nManager.isRTL;
  const resolvedStart = isRTL ? mobileEnd : mobileStart;
  const resolvedEnd = isRTL ? mobileStart : mobileEnd;
  if (isWeb) {
    return { paddingLeft: resolvedEnd, paddingRight: resolvedStart };
  }
  return { paddingLeft: resolvedStart, paddingRight: resolvedEnd };
};

export const rowDirection = (mobileDefault: 'row' | 'row-reverse' = 'row') => {
  if (isWeb) {
    return mobileDefault === 'row' ? 'row-reverse' : 'row';
  }
  return mobileDefault;
};
