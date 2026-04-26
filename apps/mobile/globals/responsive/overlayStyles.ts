import { getResponsiveStyleBucket } from './styleBuckets';
import { scaleSize } from './scale';

export const getResponsiveModalStyles = () => {
  const { bucket } = getResponsiveStyleBucket();

  return {
    width:
      bucket === 'largeDesktop'
        ? '40%'
        : bucket === 'desktopWeb'
          ? '50%'
          : bucket === 'tablet'
            ? '70%'
            : '80%',
    maxWidth:
      bucket === 'largeDesktop'
        ? 600
        : bucket === 'desktopWeb'
          ? 500
          : bucket === 'tablet'
            ? 400
            : undefined,
    maxHeight:
      bucket === 'largeDesktop'
        ? '85%'
        : bucket === 'desktopWeb'
          ? '80%'
          : bucket === 'tablet'
            ? '75%'
            : '70%',
    padding:
      bucket === 'largeDesktop'
        ? 40
        : bucket === 'desktopWeb'
          ? 32
          : bucket === 'tablet'
            ? 24
            : 20,
    borderRadius:
      bucket === 'largeDesktop'
        ? 18
        : bucket === 'desktopWeb'
          ? 16
          : bucket === 'tablet'
            ? 14
            : 10,
  };
};

export const getResponsiveMenuStyles = () => {
  const { bucket } = getResponsiveStyleBucket();

  return {
    minWidth:
      bucket === 'largeDesktop'
        ? 220
        : bucket === 'desktopWeb'
          ? 200
          : bucket === 'tablet'
            ? 180
            : 160,
    maxWidth:
      bucket === 'largeDesktop'
        ? 280
        : bucket === 'desktopWeb'
          ? 250
          : bucket === 'tablet'
            ? 220
            : 200,
    maxHeight:
      bucket === 'largeDesktop'
        ? 400
        : bucket === 'desktopWeb'
          ? 350
          : bucket === 'tablet'
            ? 300
            : 250,
    paddingVertical:
      bucket === 'largeDesktop'
        ? 12
        : bucket === 'desktopWeb'
          ? 10
          : bucket === 'tablet'
            ? 8
            : 6,
    paddingHorizontal:
      bucket === 'largeDesktop'
        ? 16
        : bucket === 'desktopWeb'
          ? 14
          : bucket === 'tablet'
            ? 12
            : 10,
    borderRadius:
      bucket === 'largeDesktop'
        ? 14
        : bucket === 'desktopWeb'
          ? 12
          : bucket === 'tablet'
            ? 11
            : 10,
    top:
      bucket === 'largeDesktop'
        ? 80
        : bucket === 'desktopWeb'
          ? 70
          : bucket === 'tablet'
            ? 65
            : 60,
    right:
      bucket === 'largeDesktop'
        ? 24
        : bucket === 'desktopWeb'
          ? 20
          : bucket === 'tablet'
            ? 18
            : 15,
    fontSize:
      bucket === 'largeDesktop'
        ? 18
        : bucket === 'desktopWeb'
          ? 16
          : bucket === 'tablet'
            ? 15
            : scaleSize(14),
  };
};
