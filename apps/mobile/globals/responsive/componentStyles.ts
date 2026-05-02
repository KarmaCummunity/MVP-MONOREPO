import { getResponsiveStyleBucket } from './styleBuckets';
import { scaleSize } from './scale';
import { pick4 } from './responsiveStylePresets';

export const getResponsiveButtonStyles = () => {
  const { bucket } = getResponsiveStyleBucket();

  return {
    paddingHorizontal: pick4(bucket, 24, 28, 32, 36),
    paddingVertical: pick4(bucket, 12, 14, 16, 18),
    minWidth: pick4(bucket, 200, 240, 280, 300),
    maxWidth: pick4(bucket, '100%', 360, 400, 450),
    borderRadius: pick4(bucket, 12, 13, 14, 15),
    fontSize: pick4(bucket, scaleSize(16), 17, 18, 20),
    alignSelf: 'center' as const,
  };
};

export const getResponsiveContainerStyles = () => {
  const { bucket } = getResponsiveStyleBucket();
  const pad = pick4(bucket, 20, 32, 40, 48);

  return {
    padding: pad,
    paddingHorizontal: pad,
    paddingVertical: pad,
    width: '100%' as const,
  };
};
