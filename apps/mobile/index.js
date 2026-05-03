// Firebase Auth / Web Crypto APIs expect `crypto.getRandomValues` (Hermes lacks it until polyfilled).
import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import App from './App';

// Initialize i18n
import './app/i18n';
console.log('🚀 index.js loaded');
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
