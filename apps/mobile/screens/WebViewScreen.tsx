// File overview:
// - Purpose: Open external JGive site; on web opens a new tab, on native renders inside WebView.
// - Reached from: Various CTA routes as 'WebViewScreen'.
// - Params: None used; URL is constant within file.
// - External deps: `react-native-webview`, react-navigation for back navigation on web.
// screens/WebViewScreen.tsx
import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  Text, // Needed for loading message on web
  TouchableOpacity // Added for retry button
} from 'react-native';

// Re-import WebView for native platforms (iOS/Android)
import { WebView } from 'react-native-webview';

// useNavigation is still needed for navigating back on the web side
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
// WebBrowser is no longer needed as we are using WebView for native.
// import * as WebBrowser from 'expo-web-browser';

interface WebViewScreenProps {
  // If you want to pass the URL as a prop, you would define it here
  // For example: route: { params?: { url?: string } };
}

const J_GIVE_URL = "https://www.jgive.com/"; // The URL you want to open

const WebViewScreen: React.FC<WebViewScreenProps> = (
  // If you pass URL as a prop, uncomment this line:
  // { route }
) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // Conditional logic for Web platform only
  useEffect(() => {
    if (Platform.OS === 'web') {
      // For web, jgive.com refuses to connect within an iframe due to security policies.
      // The only reliable way to open it on web is in a new browser tab.
      window.open(J_GIVE_URL, '_blank');
      // After opening, navigate back in the app's history
      navigation.goBack();
    }
    // No need for WebBrowser.openBrowserAsync() on native here,
    // as the WebView component handles native rendering below.
  }, [navigation]);

  // Render a loading indicator for the web, as it immediately opens a new tab and navigates back
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.info} />
          <Text style={styles.loadingText}>
            Opening JGive in a new browser tab...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render the WebView for iOS and Android
  const renderLoading = () => (
    <View style={styles.nativeLoadingContainer}>
      <ActivityIndicator size="large" color={colors.info} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: J_GIVE_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={renderLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white, // Or your app's background color
  },
  webview: {
    flex: 1,
  },
  // This loading container is for when the WebView itself is loading on native
  nativeLoadingContainer: {
    position: 'absolute',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white, // Match your screen background
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999, // Ensure it's on top
  },
  // This loading container is for the web version (briefly shown before new tab opens)
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 10,
    fontSize: FontSizes.medium,
    color: colors.textPrimary, // Use your app's primary text color
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  errorText: {
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
     retryButton: {
     backgroundColor: colors.secondary,
     paddingVertical: 10,
     paddingHorizontal: 20,
     borderRadius: 8,
   },
  retryButtonText: {
    color: colors.white,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
});

export default WebViewScreen;