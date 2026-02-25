// ScrollContainer.tsx
// Universal scrolling component that handles web and mobile consistently
// Automatically preserves scroll position across re-renders
import React, { MutableRefObject } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  FlatList,
  View,
  Platform,
  Dimensions,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import colors from '../globals/colors';
import { useScrollPositionWithHandler } from '../hooks/useScrollPosition';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScrollContainerProps extends Omit<ScrollViewProps, 'style' | 'contentContainerStyle'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  enableWebScrolling?: boolean;
  scrollRef?: MutableRefObject<ScrollView | null> | React.RefObject<ScrollView | FlatList> | null;
  /** Optional screen key for scroll position preservation. If not provided, uses route name automatically */
  screenKey?: string;
  /** Enable/disable scroll position preservation. Default: true */
  preserveScrollPosition?: boolean;
}

/**
 * ScrollContainer - Universal scrolling component
 * 
 * Features:
 * - Platform-specific scrolling (CSS overflow for web, ScrollView for native)
 * - Consistent behavior across all platforms
 * - Optimized performance for each platform
 * 
 * Usage:
 * ```tsx
 * <ScrollContainer>
 *   <YourContent />
 * </ScrollContainer>
 * ```
 */
export default function ScrollContainer({
  children,
  style,
  contentStyle,
  enableWebScrolling = true,
  scrollRef: externalScrollRef = null,
  screenKey: providedScreenKey,
  preserveScrollPosition = true,
  onScroll: externalOnScroll,
  ...scrollViewProps
}: ScrollContainerProps) {
  const route = useRoute();

  // Get screen key for scroll position preservation
  // Use provided key, or fallback to route name, or component name
  const screenKey = providedScreenKey || route.name || 'ScrollContainer';

  // Use scroll position preservation hook if enabled
  const { ref: preservedScrollRef, onScroll: preservedOnScroll } = useScrollPositionWithHandler(
    screenKey,
    { enabled: preserveScrollPosition }
  );

  // Use preserved ref if no external ref provided, otherwise use external ref
  const internalScrollRef = preservedScrollRef;
  const finalScrollRef = externalScrollRef || internalScrollRef;

  // Combine scroll handlers - call both preserved and external handlers
  const handleScroll = React.useCallback(
    (event: any) => {
      if (preserveScrollPosition) {
        preservedOnScroll(event);
      }
      if (externalOnScroll) {
        externalOnScroll(event);
      }
    },
    [preserveScrollPosition, preservedOnScroll, externalOnScroll]
  );

  // Ref for web View element (for scroll position on web)
  const webScrollRef = React.useRef<View | null>(null);
  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle scroll position for web - restore when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'web' && enableWebScrolling && preserveScrollPosition) {
        const restorePosition = async () => {
          try {
            const { useUserStore } = await import('../stores/userStore');
            const userId = useUserStore.getState().selectedUser?.id || null;
            const storageKey = `scroll_pos_${screenKey}_${userId || 'guest'}`;

            let savedPosition: string | null = null;
            if (typeof window !== 'undefined' && window.localStorage) {
              savedPosition = window.localStorage.getItem(storageKey);
            }

            if (savedPosition) {
              const position = parseFloat(savedPosition);
              if (!isNaN(position) && position > 0) {
                // Wait for DOM to be ready - longer delay for web
                setTimeout(() => {
                  try {
                    // Find the scrollable element in the DOM
                    const element = (webScrollRef.current as any)?._nativeNode ||
                      (webScrollRef.current as any)?.firstElementChild;

                    if (element) {
                      if (typeof element.scrollTo === 'function') {
                        element.scrollTo({ top: position, behavior: 'auto' });
                      } else if (element.scrollTop !== undefined) {
                        element.scrollTop = position;
                      }
                    }
                  } catch (error) {
                    console.warn('Failed to restore scroll position on web', error);
                  }
                }, 500);
              }
            }
          } catch (error) {
            console.warn('Error loading scroll position for web', error);
          }
        };

        restorePosition();
      }
    }, [screenKey, preserveScrollPosition, enableWebScrolling])
  );

  // Handle scroll events for web - attach event listener to DOM
  React.useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !enableWebScrolling || !preserveScrollPosition) {
      return;
    }

    let cleanupFn: (() => void) | null = null;
    // Wait a bit for DOM to be ready
    const timeoutId = setTimeout(() => {
      const element = (webScrollRef.current as any)?._nativeNode;

      if (!element) return;

      const handleScroll = () => {
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce save
        scrollTimeoutRef.current = setTimeout(async () => {
          try {
            const scrollTop = element.scrollTop || 0;

            if (scrollTop > 0) {
              const { useUserStore } = await import('../stores/userStore');
              const userId = useUserStore.getState().selectedUser?.id || null;
              const storageKey = `scroll_pos_${screenKey}_${userId || 'guest'}`;

              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(storageKey, scrollTop.toString());
              }
            }
          } catch (error) {
            console.warn('Error saving scroll position for web', error);
          }
        }, 200);
      };

      element.addEventListener('scroll', handleScroll, { passive: true });

      // Store cleanup function
      cleanupFn = () => {
        element.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [screenKey, preserveScrollPosition, enableWebScrolling]);

  const resolvedRef = finalScrollRef ? (node: ScrollView | null) => {
    if ('current' in finalScrollRef) {
      // Handle both MutableRefObject and RefObject
      (finalScrollRef as MutableRefObject<ScrollView | null>).current = node;
    }
  } : undefined;

  if (Platform.OS === 'web' && enableWebScrolling) {
    // Web: Custom scrollable container with CSS overflow
    return (
      <View
        ref={webScrollRef}
        style={[styles.webScrollContainer, style]}
        {...{ "data-scroll-container": "true" } as any}
      >
        <View style={[styles.webScrollContent, contentStyle]}>
          {children || null}
        </View>
      </View>
    );
  }

  // Native: Standard ScrollView for iOS/Android
  return (
    <ScrollView
      ref={resolvedRef}
      style={[styles.nativeScrollView, style]}
      contentContainerStyle={[styles.nativeScrollContent, contentStyle]}
      showsVerticalScrollIndicator={true}
      scrollEnabled={true}
      bounces={Platform.OS === 'ios'}
      overScrollMode={Platform.OS === 'android' ? 'auto' : undefined}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={handleScroll}
      {...scrollViewProps}
    >
      {children || null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Web: Custom scrollable container with CSS overflow - optimized for mobile web
  webScrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' && {
      overflowY: 'auto' as any,
      overflowX: 'hidden' as any,
      // Better mobile web scrolling
      WebkitOverflowScrolling: 'touch' as any,
      scrollBehavior: 'smooth' as any,
    }),
    height: '100%',
    // Remove restrictive maxHeight for mobile web
    maxHeight: '100vh' as any,
    width: '100%',
    maxWidth: '100vw' as any,
  } as any,
  webScrollContent: {
    // Much less padding on mobile web to reduce dead space
    paddingBottom: Dimensions.get('window').width <= 768 ? 20 : 40,
    // Better height calculation for mobile web
    minHeight: '100%' as any,
    width: '100%',
  },

  // Native: Standard ScrollView styles
  nativeScrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  nativeScrollContent: {
    paddingBottom: 40,
  },
});