import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import styles from '../globals/styles';

interface ScreenWrapperProps {
  children?: React.ReactNode;
  navigation?: NavigationProp<ParamListBase>;
  hideTopBar?: boolean;
  showPosts?: boolean;
  style?: object;
}

export default function ScreenWrapper({
  children,
  navigation,
  hideTopBar = false,
  showPosts = false,
  style = {}
}: ScreenWrapperProps) {
  if (Platform.OS === 'web') {
    // Flatten styles to check for issues and enforce overrides
    const flatStyle = StyleSheet.flatten([styles.safeArea, style]);

    // Remove potentially problematic styles for web scrolling
    // We strictly enforce height: 100% to ensure FlatList inside knows its bounds
    const webSafeStyle = {
      ...flatStyle,
      height: '100%',
      minHeight: undefined, // Explicitly remove minHeight to fix double-scroll/no-scroll
      maxHeight: '100%',
      flex: 1,
      overflow: 'hidden'
    };

    return (
      <View style={webSafeStyle as any}>
        {children || null}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      {children || null}
    </SafeAreaView>
  );
}

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
    overflow: 'hidden', // Ensure no double scrollbars
  }
});
