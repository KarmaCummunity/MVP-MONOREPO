import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { logger } from '../utils/loggerService';

/**
 * Emits a single non-periodic {@link logger.logScreenOpened} each time this route gains focus.
 * Keep the callback stable (screen name only) so it does not re-fire while focused when unrelated deps change.
 */
export function useLogScreenOpened(screenName: string): void {
  useFocusEffect(
    useCallback(() => {
      logger.logScreenOpened(screenName);
    }, [screenName]),
  );
}
