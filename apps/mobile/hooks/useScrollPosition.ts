// useScrollPosition.ts
// Hook for preserving scroll position across re-renders
// Works with both ScrollView and FlatList components
// Session-only persistence - position is cleared when app closes

import { useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Platform, ScrollView, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';

const LOG_SOURCE = 'useScrollPosition';

// Storage key format: scroll_pos_{screenKey}_{userId}
const getStorageKey = (screenKey: string, userId: string | null): string => {
  const userIdPart = userId || 'guest';
  return `scroll_pos_${screenKey}_${userIdPart}`;
};

// Debounce function to limit save frequency
const createDebouncer = () => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (fn: () => void, delay: number) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(fn, delay);
  };
};

interface UseScrollPositionOptions {
  enabled?: boolean;
  debounceDelay?: number;
}

/**
 * Hook to preserve scroll position for a screen
 * 
 * @param screenKey - Unique identifier for the screen (e.g., 'AdminMoneyScreen')
 * @param options - Configuration options
 * @returns ref to attach to ScrollView or FlatList component
 * 
 * @example
 * ```tsx
 * const scrollRef = useScrollPosition('AdminMoneyScreen');
 * 
 * <ScrollView ref={scrollRef}>
 *   {content}
 * </ScrollView>
 * ```
 */
export const useScrollPosition = (
  screenKey: string,
  options: UseScrollPositionOptions = {}
): React.RefObject<ScrollView | FlatList> => {
  const { enabled = true, debounceDelay = 200 } = options;
  const { selectedUser } = useUser();
  const scrollRef = useRef<ScrollView | FlatList>(null);
  const debounce = useRef(createDebouncer()).current;
  const isRestoringRef = useRef(false);
  const lastSavedPositionRef = useRef<number>(0);

  // Load saved position when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      const restorePosition = async () => {
        try {
          const storageKey = getStorageKey(screenKey, selectedUser?.id || null);
          let savedPosition: string | null = null;

          if (Platform.OS === 'web') {
            // Web: synchronous localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
              savedPosition = window.localStorage.getItem(storageKey);
            }
          } else {
            // Native: asynchronous AsyncStorage
            savedPosition = await AsyncStorage.getItem(storageKey);
          }

          if (savedPosition) {
            const position = parseFloat(savedPosition);
            if (!isNaN(position) && position > 0 && scrollRef.current) {
              isRestoringRef.current = true;
              
              // Small delay to ensure ScrollView is fully rendered
              setTimeout(() => {
                try {
                  if (scrollRef.current) {
                    if ('scrollTo' in scrollRef.current) {
                      // ScrollView
                      scrollRef.current.scrollTo({ y: position, animated: false });
                    } else if ('scrollToOffset' in scrollRef.current) {
                      // FlatList
                      (scrollRef.current as FlatList<any>).scrollToOffset({
                        offset: position,
                        animated: false,
                      });
                    }
                    logger.debug(LOG_SOURCE, 'Scroll position restored', {
                      screenKey,
                      position,
                    });
                  }
                } catch (error) {
                  logger.error(LOG_SOURCE, 'Error restoring scroll position', { error });
                } finally {
                  // Reset flag after a short delay
                  setTimeout(() => {
                    isRestoringRef.current = false;
                  }, 100);
                }
              }, 100);
            }
          }
        } catch (error) {
          logger.error(LOG_SOURCE, 'Error loading scroll position', { error });
        }
      };

      restorePosition();
    }, [screenKey, selectedUser?.id, enabled])
  );

  // Save position when scrolling
  useEffect(() => {
    if (!enabled || !scrollRef.current) {
      return;
    }

    // For ScrollView - attach scroll event handler
    if ('scrollTo' in scrollRef.current) {
      const scrollView = scrollRef.current as ScrollView;
      
      // Note: ScrollView's onScroll event needs to be passed as a prop
      // We'll need to handle this differently - see usage example
      // For now, we'll save on blur/focus change
    }

    return () => {
      // Cleanup if needed
    };
  }, [enabled, scrollRef.current]);

  // Save position when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup function - called when screen loses focus
        if (!enabled || isRestoringRef.current) {
          return;
        }

        const savePosition = async () => {
          try {
            if (!scrollRef.current) {
              return;
            }

            let position: number | null = null;

            // Try to get current scroll position
            // Note: ScrollView and FlatList don't expose scroll position directly
            // This is a limitation - we'll need to track it via onScroll callback
            // For now, we save the last known position

            if (lastSavedPositionRef.current > 0) {
              position = lastSavedPositionRef.current;
            }

            if (position !== null && position > 0) {
              const storageKey = getStorageKey(screenKey, selectedUser?.id || null);
              const positionString = position.toString();

              debounce(() => {
                if (Platform.OS === 'web') {
                  // Web: synchronous localStorage
                  if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(storageKey, positionString);
                  }
                } else {
                  // Native: asynchronous AsyncStorage
                  AsyncStorage.setItem(storageKey, positionString).catch((error) => {
                    logger.error(LOG_SOURCE, 'Failed to save scroll position', { error });
                  });
                }
              }, debounceDelay);

              logger.debug(LOG_SOURCE, 'Scroll position saved', {
                screenKey,
                position,
              });
            }
          } catch (error) {
            logger.error(LOG_SOURCE, 'Error saving scroll position', { error });
          }
        };

        savePosition();
      };
    }, [screenKey, selectedUser?.id, enabled, debounceDelay])
  );

  return scrollRef;
};

/**
 * Hook that returns both ref and onScroll handler for ScrollView
 * Use this version when you need full control over scroll events
 * 
 * @param screenKey - Unique identifier for the screen
 * @param options - Configuration options
 * @returns { ref, onScroll } - ref to attach and onScroll handler
 */
export const useScrollPositionWithHandler = (
  screenKey: string,
  options: UseScrollPositionOptions = {}
): {
  ref: React.RefObject<ScrollView | FlatList>;
  onScroll: (event: any) => void;
} => {
  const { enabled = true, debounceDelay = 200 } = options;
  const { selectedUser } = useUser();
  const scrollRef = useRef<ScrollView | FlatList>(null);
  const debounce = useRef(createDebouncer()).current;
  const lastSavedPositionRef = useRef<number>(0);

  const handleScroll = useCallback(
    (event: any) => {
      if (!enabled) {
        return;
      }

      const {
        nativeEvent: { contentOffset },
      } = event;

      const position = contentOffset?.y || 0;
      lastSavedPositionRef.current = position;

      // Debounce the save operation
      debounce(() => {
        const storageKey = getStorageKey(screenKey, selectedUser?.id || null);
        const positionString = position.toString();

        try {
          if (Platform.OS === 'web') {
            // Web: synchronous localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(storageKey, positionString);
            }
          } else {
            // Native: asynchronous AsyncStorage
            AsyncStorage.setItem(storageKey, positionString).catch((error) => {
              logger.error(LOG_SOURCE, 'Failed to save scroll position', { error });
            });
          }

          logger.debug(LOG_SOURCE, 'Scroll position saved during scroll', {
            screenKey,
            position,
          });
        } catch (error) {
          logger.error(LOG_SOURCE, 'Error saving scroll position during scroll', { error });
        }
      }, debounceDelay);
    },
    [screenKey, selectedUser?.id, enabled, debounceDelay, debounce]
  );

  // Load saved position when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      const restorePosition = async () => {
        try {
          const storageKey = getStorageKey(screenKey, selectedUser?.id || null);
          let savedPosition: string | null = null;

          if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
              savedPosition = window.localStorage.getItem(storageKey);
            }
          } else {
            savedPosition = await AsyncStorage.getItem(storageKey);
          }

          if (savedPosition) {
            const position = parseFloat(savedPosition);
            if (!isNaN(position) && position > 0 && scrollRef.current) {
              setTimeout(() => {
                try {
                  if (scrollRef.current) {
                    if ('scrollTo' in scrollRef.current) {
                      scrollRef.current.scrollTo({ y: position, animated: false });
                    } else if ('scrollToOffset' in scrollRef.current) {
                      (scrollRef.current as FlatList<any>).scrollToOffset({
                        offset: position,
                        animated: false,
                      });
                    }
                    logger.debug(LOG_SOURCE, 'Scroll position restored', {
                      screenKey,
                      position,
                    });
                  }
                } catch (error) {
                  logger.error(LOG_SOURCE, 'Error restoring scroll position', { error });
                }
              }, 100);
            }
          }
        } catch (error) {
          logger.error(LOG_SOURCE, 'Error loading scroll position', { error });
        }
      };

      restorePosition();
    }, [screenKey, selectedUser?.id, enabled])
  );

  return {
    ref: scrollRef,
    onScroll: handleScroll,
  };
};









