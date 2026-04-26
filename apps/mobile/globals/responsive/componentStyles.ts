import { getResponsiveStyleBucket } from './styleBuckets';
import { scaleSize } from './scale';

export const getResponsiveButtonStyles = () => {
  const { bucket } = getResponsiveStyleBucket();

  return {
    paddingHorizontal:
      bucket === 'largeDesktop'
        ? 36
        : bucket === 'desktopWeb'
          ? 32
          : bucket === 'tablet'
            ? 28
            : 24,
    paddingVertical:
      bucket === 'largeDesktop'
        ? 18
        : bucket === 'desktopWeb'
          ? 16
          : bucket === 'tablet'
            ? 14
            : 12,
    minWidth:
      bucket === 'largeDesktop'
        ? 300
        : bucket === 'desktopWeb'
          ? 280
          : bucket === 'tablet'
            ? 240
            : 200,
    maxWidth:
      bucket === 'largeDesktop'
        ? 450
        : bucket === 'desktopWeb'
          ? 400
          : bucket === 'tablet'
            ? 360
            : '100%',
    borderRadius:
      bucket === 'largeDesktop'
        ? 15
        : bucket === 'desktopWeb'
          ? 14
          : bucket === 'tablet'
            ? 13
            : 12,
    fontSize:
      bucket === 'largeDesktop'
        ? 20
        : bucket === 'desktopWeb'
          ? 18
          : bucket === 'tablet'
            ? 17
            : scaleSize(16),
    alignSelf: 'center' as const,
  };
};

export const getResponsiveContainerStyles = () => {
  const { bucket } = getResponsiveStyleBucket();
  const pad =
    bucket === 'largeDesktop'
      ? 48
      : bucket === 'desktopWeb'
        ? 40
        : bucket === 'tablet'
          ? 32
          : 20;

  return {
    padding: pad,
    paddingHorizontal: pad,
    paddingVertical: pad,
    width: '100%' as const,
  };
};
