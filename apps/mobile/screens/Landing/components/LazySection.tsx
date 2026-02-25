/**
 * @file LazySection Component
 * @description Lazy loading wrapper for sections with intersection observer
 * @module Landing/Components
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import colors from '../../../globals/colors';
import type { LazySectionProps } from '../types';
import { IS_WEB, LAZY_LOADING } from '../constants';

/**
 * LazySection Component
 * Wrapper that implements lazy loading for section components
 * On web, sections load immediately to ensure DOM elements exist for navigation
 * On native, uses IntersectionObserver for performance optimization
 * 
 * @component
 * @example
 * ```tsx
 * <LazySection section={ProblemsSection} />
 * ```
 */
export const LazySection: React.FC<LazySectionProps> = ({ 
  section: SectionComponent, 
  ...props 
}) => {
  // On web, load immediately to ensure DOM elements exist for navigation
  const [isVisible, setIsVisible] = useState(IS_WEB);
  const ref = useRef<View>(null);

  useEffect(() => {
    // On web, sections are loaded immediately
    if (IS_WEB) {
      return;
    }

    // For native platforms, use lazy loading with IntersectionObserver
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        // Start loading when the section is 100px away from viewport
        rootMargin: LAZY_LOADING.ROOT_MARGIN,
      }
    );

    if (ref.current) {
      observer.observe(ref.current as any);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current as any);
      }
    };
  }, []);

  return (
    <View ref={ref} style={{ minHeight: LAZY_LOADING.MIN_HEIGHT }}>
      {isVisible ? (
        <SectionComponent {...props} />
      ) : (
        <ActivityIndicator 
          size="large" 
          color={colors.info} 
          style={{ marginVertical: 50 }} 
        />
      )}
    </View>
  );
};
