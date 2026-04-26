import { getResponsiveStyleBucket } from './styleBuckets';
import { scaleSize } from './scale';
import { pick4 } from './responsiveStylePresets';

export const getResponsiveModalStyles = () => {
  const { bucket } = getResponsiveStyleBucket();

  return {
    width: pick4(bucket, '80%', '70%', '50%', '40%'),
    maxWidth: pick4(bucket, undefined, 400, 500, 600),
    maxHeight: pick4(bucket, '70%', '75%', '80%', '85%'),
    padding: pick4(bucket, 20, 24, 32, 40),
    borderRadius: pick4(bucket, 10, 14, 16, 18),
  };
};

export const getResponsiveMenuStyles = () => {
  const { bucket } = getResponsiveStyleBucket();

  return {
    minWidth: pick4(bucket, 160, 180, 200, 220),
    maxWidth: pick4(bucket, 200, 220, 250, 280),
    maxHeight: pick4(bucket, 250, 300, 350, 400),
    paddingVertical: pick4(bucket, 6, 8, 10, 12),
    paddingHorizontal: pick4(bucket, 10, 12, 14, 16),
    borderRadius: pick4(bucket, 10, 11, 12, 14),
    top: pick4(bucket, 60, 65, 70, 80),
    right: pick4(bucket, 15, 18, 20, 24),
    fontSize: pick4(bucket, scaleSize(14), 15, 16, 18),
  };
};
