import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';

const { width } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 2000,
  onHide,
}) => {
  const [translateY] = useState(() => new Animated.Value(100));
  const [opacity] = useState(() => new Animated.Value(0));
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
  const shouldRender = visible || isAnimatingOut;

  /* eslint-disable react-hooks/set-state-in-effect -- Toast exit animation requires keeping mounted until animation completes */
  useEffect(() => {
    if (visible) {
      setIsAnimatingOut(false);
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      // Hide after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 100,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start(() => {
          setIsAnimatingOut(false);
          onHide?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      /* Exit animation: must keep mounted until animation completes */
      setIsAnimatingOut(true);
      // Hide immediately
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setIsAnimatingOut(false);
      });
    }
  }, [visible, duration, translateY, opacity, onHide]);

  if (!shouldRender) {
    return null;
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { backgroundColor: getBackgroundColor() }]}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100, // Increased to be above tab bar
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
    pointerEvents: 'none',
  },
  toast: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: width - 40,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Toast;



