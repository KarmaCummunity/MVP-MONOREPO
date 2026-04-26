import { getScreenInfo } from './screenInfo';

export const getLoginSidePanelWidth = () => {
  const info = getScreenInfo();
  if (info.isDesktop) return 400;
  if (info.isTablet) return 350;
  return info.width * 0.85;
};
